"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Client, type Room } from "@colyseus/sdk";
import { MotionConfig } from "motion/react";
import Image from "next/image";
import { webImage } from "../lib/web-assets";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Bot,
  Check,
  Copy,
  Flag,
  Link2,
  LogOut,
  Plus,
  Settings2,
  Users,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import type {
  CommandAck,
  CommandError,
  RoomView,
  TableCommand,
  TableView,
} from "@moyeotable/contracts";
import { AUTH_EXPIRED_CLOSE_CODE } from "@moyeotable/contracts";
import {
  GAME_CATALOG,
  GAMES,
  isGameKey,
  type GameKey,
} from "@moyeotable/game-core/catalog";
import {
  api,
  ApiError,
  getSupabase,
  readLocalSession,
  SERVER_URL,
  type IdentitySession,
} from "../lib/client";
import { Home } from "./home";
import { Busy, Logo, Modal, RulesContent, SuitIcon } from "./primitives";
import { GameBoard, ResultPanel } from "./game-board";
import {
  MultiGameBoard,
  MultiResultPanel,
  ExtraRules,
} from "./multigame-board";
import type { GameAction } from "./game-ui";
type Dialog =
  | "create"
  | "join"
  | "login"
  | "rules"
  | "settings"
  | "resign"
  | "invite"
  | "leave"
  | null;
type PendingAction = "create" | "list" | "join";

function parseInvite(text: string) {
  try {
    const url = new URL(text, window.location.origin);
    const tableId = url.searchParams.get("table");
    const inviteToken = url.searchParams.get("invite");
    if (tableId && inviteToken) return { tableId, inviteToken };
  } catch {
    /* Invalid links receive the same actionable message. */
  }
  throw new Error(
    "초대 링크 전체를 붙여넣어 주세요. 친구에게 받은 링크에 테이블과 초대 정보가 있어야 해요.",
  );
}

export function MoyeotableApp() {
  const [session, setSession] = useState<IdentitySession | null>(null);
  const [authMode, setAuthMode] = useState<
    "local" | "guest" | "supabase" | "offline"
  >("offline");
  const [screen, setScreen] = useState<"home" | "lobby" | "table">("home");
  const [tableId, setTableId] = useState<string | null>(null);
  const [view, setView] = useState<RoomView | null>(null);
  const [tables, setTables] = useState<TableView[]>([]);
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [nickname, setNickname] = useState("");
  const [title, setTitle] = useState("우리의 작은 테이블");
  const [selectedGame, setSelectedGame] = useState<GameKey>("star-trails");
  const [rulesGame, setRulesGame] = useState<GameKey>("star-trails");
  const [inviteInput, setInviteInput] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [inviteTableId, setInviteTableId] = useState("");
  const [email, setEmail] = useState("");
  const [mailSent, setMailSent] = useState(false);
  const roomRef = useRef<Room | null>(null);
  const pendingAction = useRef<PendingAction>("list");
  const pending = useRef<{
    id: string;
    timer: ReturnType<typeof setTimeout>;
    onAccepted?: () => void;
  } | null>(null);
  const joining = useRef(false);
  const previousGame = useRef<string>("");
  const activeGameName =
    screen === "table" && view && view.table.id === tableId
      ? GAME_CATALOG[view.gameKey].name
      : null;
  useEffect(() => {
    document.title = activeGameName
      ? `링구링구 - ${activeGameName}`
      : "링구링구";
  }, [activeGameName]);

  useEffect(() => {
    if (!view) return;
    const current = `${view.table.id}:${view.gameKey}`;
    if (
      previousGame.current.startsWith(`${view.table.id}:`) &&
      previousGame.current !== current
    ) {
      setInviteUrl("");
      setInviteTableId("");
    }
    previousGame.current = current;
  }, [view?.table.id, view?.gameKey]);

  useEffect(() => {
    let live = true;
    let unsubscribe: (() => void) | undefined;
    const params = new URLSearchParams(window.location.search);
    if (params.get("table")) {
      if (params.get("invite")) {
        setInviteInput(window.location.href);
        setDialog("join");
      } else {
        setTableId(params.get("table"));
        setScreen("table");
      }
    }
    void api<{ authMode: "local" | "guest" | "supabase" }>("/health")
      .then(async (health) => {
        if (!live) return;
        setAuthMode(health.authMode);
        if (health.authMode === "local" || health.authMode === "guest") {
          const local = readLocalSession();
          if (local) {
            try {
              await api("/tables", local.accessToken);
              if (live) {
                setSession(local);
                setNickname(local.user.nickname);
              }
            } catch (e) {
              if (live && e instanceof ApiError && e.status === 401) {
                sessionStorage.removeItem("moyeotable.session");
                setDialog("login");
              } else if (live) {
                // A network outage must not replace an existing guest identity.
                setSession(local);
                setNickname(local.user.nickname);
                setError(
                  "연결 확인이 늦어지고 있어요. 기존 자리로 다시 연결합니다.",
                );
              }
            }
          } else if (params.get("table") && !params.get("invite")) {
            pendingAction.current = "join";
            setDialog("login");
          }
        } else {
          sessionStorage.removeItem("moyeotable.session");
          const sb = getSupabase();
          const subscription = sb?.auth.onAuthStateChange((_event, auth) => {
            if (!live) return;
            if (auth) {
              const user = {
                id: auth.user.id,
                nickname: auth.user.user_metadata?.nickname || "탐험가",
              };
              setSession({ accessToken: auth.access_token, user });
              setNickname(user.nickname);
              setDialog((current) => (current === "login" ? null : current));
            } else {
              setSession(null);
              setView(null);
              setConnected(false);
              setTables([]);
              if (params.get("table") && !params.get("invite"))
                setDialog("login");
            }
          });
          unsubscribe = () => subscription?.data.subscription.unsubscribe();
        }
      })
      .catch(() => {
        if (live) setAuthMode("offline");
      });
    return () => {
      live = false;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    const expire = () => {
      sessionStorage.removeItem("moyeotable.session");
      setSession(null);
      setView(null);
      setTables([]);
      setConnected(false);
      setError("로그인 시간이 끝났어요. 다시 로그인해 주세요.");
      setDialog("login");
    };
    window.addEventListener("moyeotable:session-expired", expire);
    return () =>
      window.removeEventListener("moyeotable:session-expired", expire);
  }, []);

  const clearPending = useCallback(() => {
    if (pending.current) clearTimeout(pending.current.timer);
    pending.current = null;
    setBusy(false);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(timeout);
  }, [toast]);
  useEffect(() => {
    const back = () => {
      const id = new URLSearchParams(location.search).get("table");
      setTableId(id);
      setScreen(id ? "table" : "home");
    };
    window.addEventListener("popstate", back);
    return () => window.removeEventListener("popstate", back);
  }, []);

  useEffect(() => {
    if (!session || !tableId) {
      setConnected(false);
      setView(null);
      return;
    }
    let live = true;
    let room: Room | undefined;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let retryDelay = 1000;
    function scheduleRetry() {
      if (!live) return;
      if (retry) clearTimeout(retry);
      retry = setTimeout(connect, retryDelay + Math.random() * 500);
      retryDelay = Math.min(retryDelay * 2, 15000);
    }
    setView(null);
    setConnected(false);
    async function connect() {
      try {
        const next = await new Client(SERVER_URL).joinOrCreate("table", {
          tableId,
          accessToken: session!.accessToken,
        });
        if (!live) {
          void next.leave();
          return;
        }
        room = next;
        roomRef.current = next;
        setConnected(true);
        setError("");
        next.onMessage("view", (data: RoomView) => {
          if (live) {
            retryDelay = 1000;
            setView(data);
            setConnected(true);
          }
        });
        next.onMessage("ack", (ack: CommandAck) => {
          if (pending.current?.id === ack.commandId) {
            const onAccepted = pending.current.onAccepted;
            clearPending();
            onAccepted?.();
          }
        });
        next.onMessage("error", (err: CommandError) => {
          if (live) {
            clearPending();
            setError(err.message);
          }
        });
        next.onError(() => {
          if (live) {
            setConnected(false);
            setError("연결이 불안정해요. 테이블을 다시 연결합니다.");
          }
        });
        next.onLeave((code) => {
          if (live) {
            setConnected(false);
            clearPending();
            if (code === AUTH_EXPIRED_CLOSE_CODE) {
              const sb = getSupabase();
              if (sb) {
                void sb.auth
                  .refreshSession()
                  .then(({ error: refreshError }) => {
                    if (!live) return;
                    if (
                      refreshError &&
                      refreshError.status &&
                      refreshError.status < 500
                    ) {
                      window.dispatchEvent(
                        new Event("moyeotable:session-expired"),
                      );
                    } else if (refreshError) {
                      setError(
                        "로그인 연결이 늦어지고 있어요. 기존 자리로 다시 연결합니다.",
                      );
                      scheduleRetry();
                    }
                  })
                  .catch(() => {
                    if (live) scheduleRetry();
                  });
              } else {
                window.dispatchEvent(new Event("moyeotable:session-expired"));
              }
              return;
            }
            scheduleRetry();
          }
        });
        next.send("sync", {});
      } catch (e) {
        if (live) {
          setConnected(false);
          if (
            (e as { code?: number }).code === 401 ||
            (e instanceof Error && e.message.includes("UNAUTHENTICATED"))
          ) {
            try {
              await api("/tables", session!.accessToken);
              if (live) {
                setError(
                  "이 테이블에 참여할 수 없어요. 친구에게 초대 링크를 받아 주세요.",
                );
                setDialog("join");
              }
            } catch (probeError) {
              // Only a confirmed 401 expires the identity. An outage retries
              // the same member and table when the server is available again.
              if (
                live &&
                !(probeError instanceof ApiError && probeError.status === 401)
              ) {
                setError(
                  "연결 확인이 늦어지고 있어요. 기존 자리로 다시 연결합니다.",
                );
                scheduleRetry();
              }
            }
            return;
          }
          setError("테이블에 연결하지 못했어요. 잠시 뒤 다시 연결합니다.");
          scheduleRetry();
        }
      }
    }
    void connect();
    return () => {
      live = false;
      if (retry) clearTimeout(retry);
      if (roomRef.current === room) roomRef.current = null;
      void room?.leave();
      clearPending();
    };
  }, [session, tableId, clearPending]);

  async function ensureSession(): Promise<IdentitySession> {
    if (session) return session;
    const health = await api<{ authMode: "local" | "guest" | "supabase" }>(
      "/health",
    );
    setAuthMode(health.authMode);
    if (health.authMode === "supabase") {
      setDialog("login");
      throw new Error("이메일로 로그인하면 테이블에 참여할 수 있어요.");
    }
    const cached = readLocalSession();
    if (cached) {
      await api("/tables", cached.accessToken);
      setSession(cached);
      setNickname(cached.user.nickname);
      return cached;
    }
    if (nickname.trim().length < 2)
      throw new Error("친구에게 보여줄 이름을 2글자 이상 입력해 주세요.");
    const identity = await api<IdentitySession>("/auth/guest", undefined, {
      nickname: nickname.trim(),
    });
    sessionStorage.setItem("moyeotable.session", JSON.stringify(identity));
    setSession(identity);
    return identity;
  }
  function openDialog(value: Dialog) {
    setError("");
    if (value === "rules") setRulesGame(view?.gameKey ?? selectedGame);
    setDialog(value);
  }
  function navigateHome() {
    setTableId(null);
    setView(null);
    setScreen("home");
    setError("");
    history.pushState(null, "", "/");
  }
  function enterTable(id: string) {
    setTableId(id);
    setScreen("table");
    setDialog(null);
    setError("");
    history.pushState(null, "", `?table=${encodeURIComponent(id)}`);
  }
  async function loadTables(identity = session) {
    if (!identity) {
      pendingAction.current = "list";
      openDialog("login");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await api<{ tables: TableView[] }>(
        "/tables",
        identity.accessToken,
      );
      setTables(data.tables);
      setTableId(null);
      setView(null);
      setScreen("lobby");
      history.pushState(null, "", "/");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  async function createTable(event: FormEvent) {
    event.preventDefault();
    if (joining.current) return;
    joining.current = true;
    setLoading(true);
    setError("");
    try {
      pendingAction.current = "create";
      const identity = await ensureSession();
      const data = await api<{ table: TableView; inviteToken: string }>(
        "/tables",
        identity.accessToken,
        { title: title.trim(), gameKey: selectedGame },
      );
      setInviteTableId(data.table.id);
      setInviteUrl(
        `${location.origin}/?table=${data.table.id}&invite=${data.inviteToken}`,
      );
      enterTable(data.table.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      joining.current = false;
      setLoading(false);
    }
  }
  async function joinTable(event: FormEvent) {
    event.preventDefault();
    if (joining.current) return;
    joining.current = true;
    setLoading(true);
    setError("");
    try {
      const parsed = parseInvite(inviteInput);
      pendingAction.current = "join";
      const identity = await ensureSession();
      await api(`/tables/${parsed.tableId}/join`, identity.accessToken, {
        inviteToken: parsed.inviteToken,
      });
      enterTable(parsed.tableId);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      joining.current = false;
      setLoading(false);
    }
  }
  async function login(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (authMode === "supabase") {
        const sb = getSupabase();
        if (!sb)
          throw new Error(
            "로그인 설정이 아직 연결되지 않았어요. 운영자에게 문의해 주세요.",
          );
        const { error: err } = await sb.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: window.location.href,
            data: { nickname: nickname.trim() },
          },
        });
        if (err) throw err;
        setMailSent(true);
      } else {
        const identity = await ensureSession();
        if (tableId) {
          setDialog(null);
        } else if (pendingAction.current === "create") {
          setDialog("create");
        } else if (pendingAction.current === "join") {
          setDialog("join");
        } else {
          setDialog(null);
          await loadTables(identity);
        }
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function send(
    type: "table_command" | "game_command",
    data: Record<string, unknown>,
    onAccepted?: () => void,
  ) {
    if (!roomRef.current || !connected || pending.current) return;
    const commandId = crypto.randomUUID();
    const envelope = { ...data, commandId };
    setBusy(true);
    setError("");
    const currentRoom = roomRef.current;
    currentRoom.send(type, envelope);
    pending.current = {
      id: commandId,
      onAccepted,
      timer: setTimeout(() => {
        if (pending.current?.id !== commandId) return;
        if (roomRef.current === currentRoom) {
          currentRoom.send(type, envelope);
          currentRoom.send("sync", {});
        }
        pending.current = {
          id: commandId,
          onAccepted,
          timer: setTimeout(() => {
            if (pending.current?.id === commandId) {
              clearPending();
              setError(
                "승인 확인이 늦어지고 있어요. 최신 상태를 확인한 뒤 다시 선택해 주세요.",
              );
              roomRef.current?.send("sync", {});
            }
          }, 8000),
        };
      }, 6000),
    };
  }
  function tableCommand(type: TableCommand["type"], ready?: boolean) {
    if (view)
      send("table_command", {
        type,
        expectedRevision: view.table.revision,
        ...(ready !== undefined ? { ready } : {}),
      });
  }
  function leaveTable() {
    if (!view || view.table.status === "PLAYING") return;
    send(
      "table_command",
      {
        type: "LEAVE",
        expectedRevision: view.table.revision,
      },
      () => {
        const departedTableId = view.table.id;
        setDialog(null);
        setTableId(null);
        setView(null);
        setScreen("lobby");
        setTables((current) =>
          current.filter((table) => table.id !== departedTableId),
        );
        history.pushState(null, "", "/");
        setInviteUrl("");
        setInviteTableId("");
        setToast("테이블에서 나왔어요. 새 초대 링크로 다시 만날 수 있어요.");
        void loadTables();
      },
    );
  }
  function gameCommand(command: GameAction) {
    if (view?.game && view.table.sessionId)
      send("game_command", {
        protocolVersion: 1,
        tableId: view.table.id,
        sessionId: view.table.sessionId,
        expectedVersion: view.game.version,
        ...command,
      });
  }
  async function invite() {
    if (!session || !view) return;
    setLoading(true);
    setError("");
    try {
      const data = await api<{ inviteToken: string }>(
        `/tables/${view.table.id}/invite`,
        session.accessToken,
        {},
      );
      setInviteTableId(view.table.id);
      setInviteUrl(
        `${location.origin}/?table=${view.table.id}&invite=${data.inviteToken}`,
      );
      openDialog("invite");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setToast("초대 링크를 복사했어요. 친구에게 보내 주세요.");
    } catch {
      setError("자동 복사가 어려워요. 아래 링크를 선택해서 복사해 주세요.");
      setDialog("invite");
    }
  }
  async function logout() {
    await getSupabase()?.auth.signOut();
    sessionStorage.removeItem("moyeotable.session");
    setSession(null);
    setNickname("");
    setDialog(null);
    navigateHome();
  }

  const me = view?.table.members.find((m) => m.userId === session?.user.id);
  const isHost = view?.table.hostId === session?.user.id;
  const metadata = GAME_CATALOG[view?.gameKey ?? selectedGame];
  const allReady =
    view &&
    view.table.members.length >= metadata.minPlayers &&
    view.table.members.length <= metadata.maxPlayers &&
    view.table.members.every((m) => m.ready && m.connected);
  const inGame = screen === "table" && view?.table.status === "PLAYING";
  const animalTheme =
    screen !== "home" && (view?.gameKey ?? selectedGame) === "star-trails";

  return (
    <MotionConfig reducedMotion="user">
      <div
        className={`app ${inGame ? "in-game" : ""} ${animalTheme ? "star-animal-theme" : ""}`}
      >
        <a className="skip-link" href="#main-content">
          본문으로 건너뛰기
        </a>
        <header className="site-header page-width">
          <button
            className="brand-button"
            onClick={navigateHome}
            aria-label="링구링구 홈"
          >
            <Logo />
          </button>
          <nav aria-label="주 메뉴">
            <a
              href="/#games"
              onClick={(event) => {
                if (screen !== "home") {
                  event.preventDefault();
                  navigateHome();
                  setTimeout(
                    () => document.getElementById("games")?.scrollIntoView(),
                    20,
                  );
                }
              }}
            >
              게임 둘러보기
            </a>
            <button
              className={screen === "lobby" ? "nav-active" : ""}
              onClick={() => void loadTables()}
            >
              내 테이블
            </button>
            <button onClick={() => openDialog("rules")}>이용 가이드</button>
          </nav>
          <div className="header-right">
            {session ? (
              <button
                className="profile-button"
                onClick={() => openDialog("settings")}
              >
                <span className="avatar small-avatar">
                  {session.user.nickname.slice(0, 1)}
                </span>
                <span>{session.user.nickname}</span>
                <Settings2 size={16} />
              </button>
            ) : (
              <button
                className="button header-cta"
                onClick={() => openDialog("create")}
              >
                함께 시작하기 <ArrowUpRight size={16} />
              </button>
            )}
          </div>
        </header>
        {error && !dialog && (
          <div className="error-banner page-width" role="alert">
            <span>{error}</span>
            <button
              className="icon-button"
              onClick={() => setError("")}
              aria-label="오류 안내 닫기"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <main id="main-content">
          {screen === "home" && (
            <Home
              onCreate={(key) => {
                if (isGameKey(key)) setSelectedGame(key);
                openDialog("create");
              }}
              onJoin={() => openDialog("join")}
              onRules={(key) => {
                setRulesGame(isGameKey(key) ? key : "star-trails");
                setError("");
                setDialog("rules");
              }}
            />
          )}
          {screen === "lobby" && (
            <section className="lobby-page page-width">
              <div className="section-heading">
                <div>
                  <h1>다시 만나서 반가워요.</h1>
                  <p>
                    {session?.user.nickname}님, 오늘도 즐거운 한 판을 시작해
                    볼까요?
                  </p>
                </div>
                <button
                  className="button primary"
                  onClick={() => openDialog("create")}
                >
                  <Plus size={18} /> 새 테이블
                </button>
              </div>
              <div className="table-list">
                {tables.map((table) => (
                  <button
                    className="table-list-item"
                    key={table.id}
                    onClick={() => enterTable(table.id)}
                  >
                    <div className="table-list-art">
                      <SuitIcon suit="dusk" />
                    </div>
                    <div>
                      <span className="small-label" role="status">
                        {table.status === "PLAYING"
                          ? "게임 진행 중"
                          : table.status === "RESULT"
                            ? "한 판 완료"
                            : "다음 한 판을 기다려요"}
                      </span>
                      <h2>{table.title}</h2>
                      <p>
                        <Users size={15} />
                        {table.members.map((m) => m.nickname).join(", ")}{" "}
                        <span>
                          {table.members.length}/
                          {GAME_CATALOG[table.gameKey].maxPlayers}명 /{" "}
                          {GAME_CATALOG[table.gameKey].name}
                        </span>
                      </p>
                    </div>
                    <ArrowUpRight size={22} />
                  </button>
                ))}
                <button
                  className="new-table-tile"
                  onClick={() => openDialog("create")}
                >
                  <span>
                    <Plus size={28} />
                  </span>
                  <strong>
                    {tables.length
                      ? "또 다른 모임을 위한 자리"
                      : "아직 비어 있는 나의 테이블"}
                  </strong>
                  <p>친구와 함께할 첫 테이블을 열어 보세요.</p>
                  <span className="text-button">
                    테이블 만들기 <ArrowRight size={16} />
                  </span>
                </button>
              </div>
              <button
                className="text-button"
                onClick={() => openDialog("join")}
              >
                <Link2 size={17} /> 초대 링크로 들어가기
              </button>
            </section>
          )}
          {screen === "table" && (
            <section
              className={`table-page page-width ${inGame ? "playing" : ""}`}
            >
              <div className="table-heading">
                <div>
                  <button
                    className="back-button"
                    onClick={() => void loadTables()}
                  >
                    <ArrowLeft size={15} /> 내 테이블
                  </button>
                  <h1>
                    {view?.table.title || "테이블에 연결하고 있어요"}
                    <span className={`connection ${connected ? "online" : ""}`}>
                      {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
                      <span>{connected ? "연결됨" : "재연결 중"}</span>
                    </span>
                  </h1>
                </div>
                <div className="table-tools">
                  <button
                    className="icon-button bordered"
                    onClick={() => openDialog("rules")}
                    aria-label="게임 규칙"
                  >
                    <BookOpen size={19} />
                  </button>
                  <button
                    className="icon-button bordered"
                    onClick={() => openDialog("settings")}
                    aria-label="설정"
                  >
                    <Settings2 size={19} />
                  </button>
                </div>
              </div>
              {!view && (
                <div className="loading-table">
                  <Busy text="자리를 준비하고 있어요" />
                  {!session && (
                    <button
                      className="button primary"
                      onClick={() => openDialog("login")}
                    >
                      이름 정하고 입장하기
                    </button>
                  )}
                </div>
              )}
              {view?.table.status === "LOBBY" && (
                <div className="waiting-layout">
                  <div className="waiting-main">
                    <div className="waiting-intro">
                      <h2>우리의 다음 한 판</h2>
                      <p>
                        {metadata.minPlayers === metadata.maxPlayers
                          ? metadata.minPlayers
                          : `${metadata.minPlayers}~${metadata.maxPlayers}`}
                        명이 함께할 수 있어요. 모두 준비하면 시작해요.
                      </p>
                    </div>
                    <div className="seats">
                      {Array.from(
                        { length: metadata.maxPlayers },
                        (_, index) => index,
                      ).map((index) => {
                        const member = view.table.members.find(
                          (m) => m.seat === index,
                        );
                        return (
                          <div
                            className={`seat ${member ? "occupied-seat" : "empty-seat"}`}
                            key={index}
                          >
                            {member ? (
                              <>
                                <span className={`seat-avatar seat-${index}`}>
                                  {member.control === "bot" ? (
                                    <Bot size={28} />
                                  ) : (
                                    member.nickname.slice(0, 1)
                                  )}
                                </span>
                                <h3>
                                  {member.nickname}
                                  {member.userId === session?.user.id && (
                                    <small>나</small>
                                  )}
                                </h3>
                                <span className="seat-role">
                                  {member.control === "bot"
                                    ? "연습 봇 · 중간 난이도"
                                    : member.userId === view.table.hostId
                                      ? "테이블 호스트"
                                      : "탐험 메이트"}
                                </span>
                                {member.control === "bot" && isHost && (
                                  <button
                                    className="text-button bot-remove"
                                    disabled={!connected || busy}
                                    aria-label={`${member.nickname} 내보내기`}
                                    onClick={() =>
                                      send("table_command", {
                                        type: "REMOVE_BOT",
                                        userId: member.userId,
                                        expectedRevision: view.table.revision,
                                      })
                                    }
                                  >
                                    자리 비우기
                                  </button>
                                )}
                                <span
                                  className={`ready-status ${member.ready ? "ready" : ""}`}
                                >
                                  {member.ready ? (
                                    <>
                                      <Check size={15} /> 준비 완료
                                    </>
                                  ) : member.connected ? (
                                    "잠시 쉬어 가는 중"
                                  ) : (
                                    "다시 연결하는 중"
                                  )}
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="seat-avatar empty">
                                  <Plus size={28} />
                                </span>
                                <h3>친구의 자리</h3>
                                <p>함께할 사람을 초대해 보세요.</p>
                                <button
                                  className="text-button"
                                  disabled={!isHost || loading}
                                  onClick={() => void invite()}
                                >
                                  <Link2 size={15} /> 초대 링크 만들기
                                </button>
                                {isHost && (
                                  <button
                                    className="button secondary add-bot"
                                    disabled={!connected || busy}
                                    aria-label={`${index + 1}번 자리에 연습 봇 추가`}
                                    onClick={() => tableCommand("ADD_BOT")}
                                  >
                                    <Bot size={17} /> 연습 봇 추가
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {isHost && (
                      <p className="waiting-hint bot-hint">
                        <Bot size={16} /> 혼자서도 시작할 수 있어요. 빈자리에
                        중간 난이도 봇을 추가해 보세요.
                      </p>
                    )}
                    <div className="waiting-bottom">
                      <div>
                        <span>
                          {view.table.members.filter((m) => m.ready).length} /{" "}
                          {view.table.members.length}
                        </span>{" "}
                        준비 완료
                      </div>
                      <div>
                        <button
                          className={`button ${me?.ready ? "secondary" : "primary"}`}
                          disabled={!connected || busy}
                          onClick={() => tableCommand("READY", !me?.ready)}
                        >
                          {me?.ready ? (
                            <>
                              <Check size={18} /> 준비 완료 · 취소
                            </>
                          ) : (
                            "준비"
                          )}
                        </button>
                        {isHost && (
                          <button
                            className="button primary"
                            disabled={!allReady || busy}
                            onClick={() => tableCommand("START")}
                          >
                            {view.gameKey === "star-trails"
                              ? "탐험 시작"
                              : "게임 시작"}{" "}
                            <ArrowRight size={17} />
                          </button>
                        )}
                      </div>
                    </div>
                    {!isHost && (
                      <p className="waiting-hint">
                        준비를 마치면 호스트가 게임을 시작해요.
                      </p>
                    )}
                  </div>
                  <aside className="waiting-game">
                    <div
                      className={`waiting-game-art ${animalTheme ? "lost-pets-cover" : ""}`}
                    >
                      {animalTheme ? (
                        <Image
                          src={webImage(metadata.art)}
                          alt="2부터 10까지 3×3으로 놓인 동물 카드와 오른쪽의 ×2 수달 카드"
                          width={960}
                          height={648}
                          sizes="(max-width: 760px) 90vw, 320px"
                        />
                      ) : (
                        <Image
                          src={webImage(metadata.art)}
                          alt={`${metadata.name} 게임 아트`}
                          width={1000}
                          height={850}
                          sizes="(max-width: 760px) 90vw, 320px"
                        />
                      )}
                    </div>
                    <div>
                      <h2>{metadata.name}</h2>
                      <span className="game-meta">
                        <Users size={14} />{" "}
                        {metadata.minPlayers === metadata.maxPlayers
                          ? metadata.minPlayers
                          : `${metadata.minPlayers}~${metadata.maxPlayers}`}
                        명
                      </span>
                      <p>{metadata.description}</p>
                      <button
                        className="text-button"
                        onClick={() => openDialog("rules")}
                      >
                        시작 전에 규칙 보기 <ArrowRight size={16} />
                      </button>
                    </div>
                    <div className="invite-block">
                      <Link2 size={20} />
                      <p>친구와 함께하면 더 즐거워요.</p>
                      <button
                        className="button secondary full"
                        disabled={
                          !isHost ||
                          loading ||
                          view.table.members.length >= metadata.maxPlayers
                        }
                        onClick={() =>
                          inviteUrl && inviteTableId === view.table.id
                            ? void copyInvite()
                            : void invite()
                        }
                      >
                        {view.table.members.length >= metadata.maxPlayers ? (
                          "모든 자리가 찼어요"
                        ) : (
                          <>
                            <Copy size={16} /> 초대 링크 복사
                          </>
                        )}
                      </button>
                    </div>
                  </aside>
                </div>
              )}
              {view && view.table.status !== "PLAYING" && (
                <label className="field game-switcher">
                  다음에 함께할 게임
                  <select
                    aria-label="다음에 함께할 게임"
                    value={view.gameKey}
                    disabled={!isHost || busy || !connected}
                    onChange={(event) => {
                      if (isGameKey(event.target.value))
                        send("table_command", {
                          type: "SELECT_GAME",
                          gameKey: event.target.value,
                          expectedRevision: view.table.revision,
                        });
                    }}
                  >
                    {GAMES.map((game) => (
                      <option
                        key={game.key}
                        value={game.key}
                        disabled={view.table.members.length > game.maxPlayers}
                      >
                        {game.name} ·{" "}
                        {game.minPlayers === game.maxPlayers
                          ? game.minPlayers
                          : `${game.minPlayers}~${game.maxPlayers}`}
                        명
                      </option>
                    ))}
                  </select>
                  <span>
                    {isHost
                      ? "게임을 바꾸면 사람은 다시 준비해요. 연습 봇은 바로 준비됩니다."
                      : "호스트가 다음 게임을 고를 수 있어요."}
                  </span>
                </label>
              )}
              {view?.table.status === "RESULT" && isHost && (
                <div className="result-bots">
                  {view.table.members
                    .filter((member) => member.control === "bot")
                    .map((member) => (
                      <button
                        key={member.userId}
                        className="button secondary"
                        disabled={busy || !connected}
                        onClick={() =>
                          send("table_command", {
                            type: "REMOVE_BOT",
                            userId: member.userId,
                            expectedRevision: view.table.revision,
                          })
                        }
                      >
                        <Bot size={17} /> {member.nickname} · 자리 비우기
                      </button>
                    ))}
                  {view.table.members.length < metadata.maxPlayers && (
                    <button
                      className="button secondary"
                      disabled={busy || !connected}
                      onClick={() => tableCommand("ADD_BOT")}
                    >
                      <Plus size={17} /> 연습 봇 추가
                    </button>
                  )}
                </div>
              )}
              {view?.table.status === "PLAYING" &&
                view.game &&
                view.gameKey === "star-trails" && (
                  <GameBoard
                    view={view}
                    busy={busy}
                    connected={connected}
                    onCommand={gameCommand}
                    onRules={() => openDialog("rules")}
                    onResign={() => openDialog("resign")}
                  />
                )}
              {view?.table.status === "PLAYING" &&
                view.game &&
                view.gameKey !== "star-trails" && (
                  <MultiGameBoard
                    view={view}
                    busy={busy}
                    connected={connected}
                    onCommand={gameCommand}
                    onRules={() => openDialog("rules")}
                  />
                )}
              {view?.table.status === "RESULT" &&
                view.result &&
                session &&
                view.gameKey === "star-trails" && (
                  <ResultPanel
                    view={view}
                    userId={session.user.id}
                    busy={busy || !connected}
                    onReady={() => tableCommand("READY", !me?.ready)}
                    onRematch={() => tableCommand("REMATCH")}
                  />
                )}
              {view?.table.status === "RESULT" &&
                view.result &&
                session &&
                view.gameKey !== "star-trails" && (
                  <MultiResultPanel
                    view={view}
                    userId={session.user.id}
                    busy={busy || !connected}
                    onReady={() => tableCommand("READY", !me?.ready)}
                    onRematch={() => tableCommand("REMATCH")}
                  />
                )}
            </section>
          )}
        </main>
        {authMode === "local" && (
          <div className="local-mode">
            로컬 플레이 · 이 기기의 개발 서버에 연결됨
          </div>
        )}
        {toast && (
          <div className="toast" role="status">
            <Check size={17} />
            {toast}
          </div>
        )}

        {dialog === "rules" && (
          <Modal
            title={`${GAME_CATALOG[rulesGame].name}, 이렇게 즐겨요`}
            onClose={() => setDialog(null)}
            wide
          >
            {rulesGame === "star-trails" ? (
              <RulesContent />
            ) : (
              <ExtraRules gameKey={rulesGame} />
            )}
            <button
              className="button primary full"
              onClick={() => setDialog(null)}
            >
              닫기
            </button>
          </Modal>
        )}
        {(dialog === "create" || dialog === "join" || dialog === "login") && (
          <Modal
            title={
              dialog === "create"
                ? "우리만의 테이블을 열어요"
                : dialog === "join"
                  ? "친구가 기다리고 있어요"
                  : "어떤 이름으로 만날까요?"
            }
            onClose={() => setDialog(null)}
          >
            <p className="modal-description">
              {dialog === "create"
                ? "자리만 잡으면 준비 끝. 친구를 초대해 즐거운 시간을 나눠요."
                : dialog === "join"
                  ? "친구에게 받은 초대 링크를 붙여넣어 주세요."
                  : "테이블에서 친구에게 보여줄 이름을 알려 주세요."}
            </p>
            <form
              onSubmit={
                dialog === "create"
                  ? createTable
                  : dialog === "join"
                    ? joinTable
                    : login
              }
            >
              {!session && (
                <label className="field">
                  내 이름
                  <input
                    autoFocus
                    name="nickname"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="예: 별보는 고양이"
                    minLength={2}
                    maxLength={20}
                    required
                    autoComplete="nickname"
                  />
                  <span>2~20글자 · 친구들이 알아볼 수 있는 이름</span>
                </label>
              )}
              {dialog === "create" && (
                <label className="field">
                  함께할 게임
                  <select
                    aria-label="함께할 게임"
                    value={selectedGame}
                    onChange={(event) => {
                      if (isGameKey(event.target.value))
                        setSelectedGame(event.target.value);
                    }}
                  >
                    {GAMES.map((game) => (
                      <option key={game.key} value={game.key}>
                        {game.name} ·{" "}
                        {game.minPlayers === game.maxPlayers
                          ? game.minPlayers
                          : `${game.minPlayers}~${game.maxPlayers}`}
                        명
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {dialog === "create" && (
                <label className="field">
                  테이블 이름
                  <input
                    autoFocus={!!session}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    minLength={2}
                    maxLength={40}
                    required
                    placeholder="우리의 작은 테이블"
                  />
                </label>
              )}
              {dialog === "join" && (
                <label className="field">
                  초대 링크
                  <input
                    autoFocus={!!session}
                    value={inviteInput}
                    onChange={(e) => setInviteInput(e.target.value)}
                    placeholder="친구에게 받은 링크를 붙여넣어 주세요"
                    required
                    type="text"
                  />
                </label>
              )}
              {dialog === "login" && authMode === "supabase" && (
                <label className="field">
                  이메일
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    placeholder="you@example.com"
                  />
                </label>
              )}
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              {mailSent && dialog === "login" && (
                <p className="form-success" role="status">
                  로그인 링크를 보냈어요. 이메일을 확인해 주세요.
                </p>
              )}
              <button
                className="button primary full"
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <Busy />
                ) : dialog === "create" ? (
                  <>
                    테이블 만들기 <ArrowUpRight size={18} />
                  </>
                ) : dialog === "join" ? (
                  <>
                    테이블에 입장하기 <ArrowRight size={18} />
                  </>
                ) : authMode === "supabase" ? (
                  "이메일로 로그인 링크 받기"
                ) : (
                  "이 이름으로 시작하기"
                )}
              </button>
              {!session && (authMode === "local" || authMode === "guest") && (
                <p className="form-footnote">
                  {authMode === "local"
                    ? "로컬 개발용 프로필이에요. 이 탭에서 이름과 자리가 유지돼요."
                    : "이 탭에서 이름과 자리가 유지돼요. 새로고침해도 이어서 할 수 있어요."}
                </p>
              )}
            </form>
          </Modal>
        )}
        {dialog === "leave" && (
          <Modal
            title="이 테이블에서 나갈까요?"
            onClose={() => setDialog(null)}
          >
            <p className="modal-description">
              내 자리가 비워지고, 다음에 들어올 때는 새 초대 링크가 필요해요.
              {isHost && view && view.table.members.length > 1
                ? " 남아 있는 친구가 새 호스트가 됩니다."
                : ""}
            </p>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button
              className="button primary full"
              disabled={busy || !connected}
              onClick={leaveTable}
            >
              {busy ? <Busy /> : "테이블에서 나가기"}
            </button>
            <button
              className="button secondary full"
              onClick={() => setDialog(null)}
            >
              여기 머무르기
            </button>
          </Modal>
        )}
        {dialog === "invite" && (
          <Modal
            title="친구에게 이 자리를 건네세요"
            onClose={() => setDialog(null)}
          >
            <p className="modal-description">
              링크를 받은 친구가 이름을 정하면 같은 테이블에 앉을 수 있어요.
              초대는 24시간 동안 유효해요.
            </p>
            <label className="field">
              우리 테이블 초대 링크
              <input
                readOnly
                value={inviteUrl}
                onFocus={(e) => e.target.select()}
              />
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button
              className="button primary full"
              onClick={() => void copyInvite()}
            >
              <Copy size={18} /> 링크 복사하기
            </button>
          </Modal>
        )}
        {dialog === "settings" && (
          <Modal title="편안한 테이블을 위해" onClose={() => setDialog(null)}>
            {view && view.table.status !== "PLAYING" && (
              <div className="setting-row">
                <div>
                  <strong>테이블에서 나가기</strong>
                  <p>자리를 비우고 내 테이블 목록으로 돌아가요.</p>
                </div>
                <button
                  className="icon-button bordered"
                  aria-label="테이블에서 나가기"
                  onClick={() => openDialog("leave")}
                >
                  <LogOut size={19} />
                </button>
              </div>
            )}
            <div className="setting-profile">
              <span>나의 이름</span>
              <strong>
                {session?.user.nickname || "아직 정하지 않았어요"}
              </strong>
            </div>
            <div className="settings-actions">
              {inGame && metadata.supportsResign && (
                <button
                  className="text-button danger"
                  onClick={() => setDialog("resign")}
                >
                  <Flag size={17} /> 이번 게임 기권하기
                </button>
              )}
              {session && (
                <button
                  className="text-button danger settings-logout"
                  onClick={() => void logout()}
                >
                  <LogOut size={17} /> 로그아웃
                </button>
              )}
            </div>
          </Modal>
        )}
        {dialog === "resign" && (
          <Modal title="이번 탐험을 마칠까요?" onClose={() => setDialog(null)}>
            <p className="modal-description">
              기권하면 친구의 승리로 게임이 끝나요. 테이블은 유지되어 다시 함께
              시작할 수 있어요.
            </p>
            <div className="modal-actions">
              <button
                className="button secondary"
                onClick={() => setDialog(null)}
              >
                계속 탐험하기
              </button>
              <button
                className="button danger-button"
                onClick={() => {
                  gameCommand({ type: "RESIGN", payload: {} });
                  setDialog(null);
                }}
              >
                <Flag size={17} /> 기권하기
              </button>
            </div>
          </Modal>
        )}
      </div>
    </MotionConfig>
  );
}
