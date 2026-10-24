import { Server, Room, ServerError, type Client } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import type { IncomingMessage } from "node:http";
import { isIP } from "node:net";
import type { UserIdentity } from "@moyeotable/contracts";
import { GAMES } from "@moyeotable/game-core/catalog";
import type { TableRepository } from "@moyeotable/db";
import type { Authenticator, AuthenticatedIdentity } from "./auth.js";
import { id, object, exact, publicError, ServiceError } from "./errors.js";
import { TableService } from "./service.js";

export interface ServerConfiguration {
  host: string;
  port: number;
  webOrigins: string[];
  auth: Authenticator;
  repository: TableRepository;
  /** Exactly one isolated reverse proxy must be the only externally reachable entry. */
  trustProxy?: 1;
}
export async function startServer(configuration: ServerConfiguration) {
  const { auth, repository } = configuration;
  await repository.checkHealth();
  if (
    auth.mode === "local" &&
    !["127.0.0.1", "::1", "localhost"].includes(configuration.host)
  )
    throw new Error("Local guest auth requires a loopback host");
  const service = new TableService(repository);
  const allowedOrigin = (origin: string | undefined | null) =>
    !origin || configuration.webOrigins.includes(origin);
  const limiter = new Map<string, { count: number; until: number }>();
  function rateLimit(key: string, limit: number, window = 10_000) {
    const current = limiter.get(key);
    if (!current || current.until <= Date.now()) {
      limiter.set(key, { count: 1, until: Date.now() + window });
      if (limiter.size > 5000)
        for (const [entry, value] of limiter)
          if (value.until <= Date.now()) limiter.delete(entry);
    } else if (++current.count > limit) throw new ServiceError("RATE_LIMITED");
  }
  function clientIp(request: IncomingMessage) {
    if (configuration.trustProxy === 1) {
      const forwarded = request.headers["x-forwarded-for"];
      const closest = (Array.isArray(forwarded) ? forwarded.join(",") : forwarded)?.split(",").at(-1)?.trim();
      if (closest && isIP(closest)) return closest;
    }
    return request.socket.remoteAddress ?? "unknown";
  }
  class TableRoom extends Room {
    private tableId = "";
    private unsubscribe: (() => void) | undefined;
    private readonly expiryTimers = new Map<
      string,
      ReturnType<typeof setTimeout>
    >();
    maxClients = Math.max(...GAMES.map((game) => game.maxPlayers)) * 4;
    maxMessagesPerSecond = 200;
    async onCreate(options: { tableId?: unknown }) {
      this.tableId = id(options.tableId);
      // No GameState or Schema: all outgoing game data is a player projection.
      this.unsubscribe = service.subscribe(this.tableId, () => {
        void this.sendViews();
      });
      this.onMessage("sync", (client) => {
        try {
          this.assertSession(client);
          rateLimit(`socket:${(client.auth as UserIdentity).id}`, 300);
          void this.sendView(client);
        } catch (error) { client.send("error", publicError(error)); }
      });
      this.onMessage("table_command", (client, command: unknown) => {
        void this.execute(client, command, "table");
      });
      this.onMessage("game_command", (client, command: unknown) => {
        void this.execute(client, command, "game");
      });
    }
    async onAuth(
      _client: Client,
      options: { tableId?: unknown; accessToken?: unknown },
    ) {
      try {
        if (id(options.tableId) !== this.tableId)
          throw new ServiceError("NOT_MEMBER");
        const user = await auth.verify(options.accessToken);
        await service.view(this.tableId, user.id);
        return user;
      } catch (error) {
        const failure = publicError(error);
        if (["AUTH_UNAVAILABLE", "SAVE_FAILED"].includes(failure.code))
          throw new ServerError(503, failure.code);
        throw new ServerError(401, "UNAUTHENTICATED_OR_NOT_MEMBER");
      }
    }
    onJoin(client: Client) {
      service.connected(this.tableId, (client.auth as UserIdentity).id, 1);
      const expiresAt = (client.auth as AuthenticatedIdentity).expiresAt;
      if (expiresAt !== undefined) {
        const timer = setTimeout(
          () => client.leave(4001, "AUTH_EXPIRED"),
          Math.max(0, expiresAt - Date.now()),
        );
        timer.unref();
        this.expiryTimers.set(client.sessionId, timer);
      }
      void this.sendView(client);
    }
    onLeave(client: Client) {
      clearTimeout(this.expiryTimers.get(client.sessionId));
      this.expiryTimers.delete(client.sessionId);
      service.connected(this.tableId, (client.auth as UserIdentity).id, -1);
    }
    onDispose() {
      this.unsubscribe?.();
      for (const timer of this.expiryTimers.values()) clearTimeout(timer);
      this.expiryTimers.clear();
    }
    private assertSession(client: Client) {
      const expiresAt = (client.auth as AuthenticatedIdentity).expiresAt;
      if (expiresAt !== undefined && expiresAt <= Date.now()) {
        client.leave(4001, "AUTH_EXPIRED");
        throw new ServiceError("UNAUTHENTICATED");
      }
    }
    private async sendView(client: Client) {
      try {
        this.assertSession(client);
        client.send(
          "view",
          await service.view(this.tableId, (client.auth as UserIdentity).id),
        );
      } catch (error) {
        if (error instanceof ServiceError && error.code === "NOT_MEMBER") {
          client.leave();
          return;
        }
        client.send("error", publicError(error));
      }
    }
    private async sendViews() {
      await Promise.all(this.clients.map((client) => this.sendView(client)));
    }
    private async execute(
      client: Client,
      command: unknown,
      kind: "table" | "game",
    ) {
      let commandId: string | undefined;
      try {
        this.assertSession(client);
        const user = client.auth as UserIdentity;
        rateLimit(`socket:${user.id}`, 300);
        commandId = id(object(command).commandId);
        const ack =
          kind === "table"
            ? await service.tableCommand(this.tableId, user.id, command)
            : await service.gameCommand(this.tableId, user.id, command);
        client.send("ack", ack);
        if (kind === "table" && object(command).type === "LEAVE") {
          client.leave();
          return;
        }
        // Duplicate ACKs also come with the current view, useful after a lost ACK.
        await this.sendView(client);
      } catch (error) {
        client.send("error", publicError(error, commandId));
        if (error instanceof ServiceError && error.code === "VERSION_CONFLICT")
          await this.sendView(client);
      }
    }
  }
  const server = new Server({
    greet: false,
    gracefullyShutdown: false,
    auth: false,
    transport: new WebSocketTransport({
      maxPayload: 16 * 1024,
      beforeUpgrade(request) {
        if (!allowedOrigin(request.headers.get("origin")))
          return new globalThis.Response(null, { status: 403 });
      },
    }),
    express(app) {
      app.disable("x-powered-by");
      if (configuration.trustProxy === 1) app.set("trust proxy", 1);
      app.use((req: Request, res: Response, next: NextFunction) => {
        if (!allowedOrigin(req.headers.origin)) {
          res.status(403).json({
            error: {
              code: "FORBIDDEN_ORIGIN",
              message: "허용되지 않은 연결이에요.",
            },
          });
          return;
        }
        if (req.headers.origin)
          res.setHeader("Access-Control-Allow-Origin", req.headers.origin);
        res.setHeader("Vary", "Origin");
        res.setHeader(
          "Access-Control-Allow-Headers",
          "Authorization, Content-Type",
        );
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.setHeader("Cache-Control", "no-store");
        if (req.method === "OPTIONS") {
          res.sendStatus(204);
          return;
        }
        next();
      });
      app.use(express.json({ limit: "16kb" }));
      app.get("/health", (_req, res) => {
        res.json({ ok: true, authMode: auth.mode, gameKey: "star-trails", games: GAMES });
      });
      app.get("/readyz", async (_req, res) => {
        try {
          await repository.checkHealth();
          res.json({ ok: true });
        } catch {
          res.status(503).json({ ok: false });
        }
      });
      const route =
        (action: (req: Request, res: Response) => Promise<unknown>) =>
        async (req: Request, res: Response) => {
          try {
            await action(req, res);
          } catch (error) {
            const result = publicError(error);
            res
              .status(
                result.code === "UNAUTHENTICATED"
                  ? 401
                  : result.code === "TABLE_NOT_FOUND"
                    ? 404
                    : result.code === "SAVE_FAILED" ||
                        result.code === "AUTH_UNAVAILABLE"
                      ? 503
                      : result.code === "RATE_LIMITED"
                        ? 429
                        : 400,
              )
              .json({ error: result });
          }
        };
      const user = (req: Request) =>
        auth.verify(req.headers.authorization?.replace(/^Bearer /, ""));
      app.post(
        "/auth/guest",
        route(async (req, res) => {
          if (!auth.issueGuest || !["local", "guest"].includes(auth.mode))
            throw new ServiceError("UNAUTHENTICATED");
          if (auth.mode === "guest") rateLimit(`guest:${clientIp(req)}`, 20, 60_000);
          const body = object(req.body);
          exact(body, ["nickname"]);
          res.json(auth.issueGuest(body.nickname));
        }),
      );
      app.get(
        "/tables",
        route(async (req, res) => {
          res.json({ tables: await service.list((await user(req)).id) });
        }),
      );
      app.post(
        "/tables",
        route(async (req, res) => {
          res.status(201).json(await service.create(await user(req), req.body));
        }),
      );
      app.get(
        "/tables/:id",
        route(async (req, res) => {
          res.json({
            table: (await service.view(id(req.params.id), (await user(req)).id))
              .table,
          });
        }),
      );
      app.post(
        "/tables/:id/join",
        route(async (req, res) => {
          res.json(
            await service.join(id(req.params.id), await user(req), req.body),
          );
        }),
      );
      app.post(
        "/tables/:id/invite",
        route(async (req, res) => {
          res.json(
            await service.invite(id(req.params.id), (await user(req)).id),
          );
        }),
      );
      app.use(
        (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
          res.status(400).json({
            error: publicError(
              error instanceof SyntaxError
                ? new ServiceError("INVALID_INPUT")
                : error,
            ),
          });
        },
      );
    },
  });
  // All joins for one durable table share a room. Duplicate room races still
  // share the service's serialized command queue and compare-and-swap storage.
  server.define("table", TableRoom).filterBy(["tableId"]);
  await server.listen(configuration.port, configuration.host);
  // Colyseus 0.18 routes matchmaking before Express. Gate the installed native
  // request handlers so origin and rate checks also cover matchmaking/readyz,
  // and count each HTTP request exactly once.
  const httpServer = server.transport.server!;
  const requestListeners = httpServer.listeners("request");
  httpServer.removeAllListeners("request");
  httpServer.on("request", (req, res) => {
    const rawOrigin = req.headers.origin;
    const origin = typeof rawOrigin === "string" ? rawOrigin : undefined;
    if (!allowedOrigin(origin)) {
      res.writeHead(403, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      res.end(JSON.stringify({ error: { code: "FORBIDDEN_ORIGIN", message: "허용되지 않은 연결이에요." } }));
      return;
    }
    const path = (req.url ?? "/").split("?")[0];
    if (path !== "/health" && path !== "/__healthcheck" && req.method !== "OPTIONS") {
      try { rateLimit(`http:${clientIp(req)}`, 300); }
      catch (error) {
        res.writeHead(429, { "Content-Type": "application/json", "Cache-Control": "no-store", ...(origin ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {}) });
        res.end(JSON.stringify({ error: publicError(error) }));
        return;
      }
    }
    for (const listener of requestListeners) listener.call(httpServer, req, res);
  });
  const clockTimer = setInterval(() => { void service.tick(); }, 1_000);
  clockTimer.unref();
  const address = server.transport.server!.address();
  const port =
    typeof address === "object" && address ? address.port : configuration.port;
  return {
    server,
    service,
    port,
    async close() {
      clearInterval(clockTimer);
      await service.close();
      await server.gracefullyShutdown(false);
      await repository.close();
    },
  };
}
