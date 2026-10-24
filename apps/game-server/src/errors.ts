import { ERROR_MESSAGES, type CommandError } from "@moyeotable/contracts";
export class ServiceError extends Error {
  constructor(readonly code: string) {
    super(ERROR_MESSAGES[code] ?? ERROR_MESSAGES.INVALID_INPUT);
  }
}
export function publicError(error: unknown, commandId?: string): CommandError {
  const rawCode =
    error instanceof Error && "code" in error && typeof error.code === "string"
      ? error.code
      : "";
  const code = ERROR_MESSAGES[rawCode]
    ? rawCode
      : ["BAD_PAYLOAD", "UNKNOWN_COMMAND", "INVALID_SUIT"].includes(rawCode)
      ? "INVALID_INPUT"
        : rawCode && !["BAD_STATE", "INVALID_STATE", "CARD_COUNT", "BAD_PLAYERS", "BAD_PHASE", "DUPLICATE_OR_BAD_ID"].includes(rawCode)
          ? "INVALID_ACTION"
          : "SAVE_FAILED";
  return {
    ...(commandId ? { commandId } : {}),
    code,
    message: ERROR_MESSAGES[code]!,
  };
}
export function object(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new ServiceError("INVALID_INPUT");
  return input as Record<string, unknown>;
}
export function exact(input: Record<string, unknown>, keys: string[]) {
  if (Object.keys(input).some((key) => !keys.includes(key)))
    throw new ServiceError("INVALID_INPUT");
}
export function boundedString(value: unknown, min: number, max: number) {
  if (
    typeof value !== "string" ||
    value.trim().length < min ||
    value.trim().length > max ||
    /[\u0000-\u001f]/u.test(value)
  )
    throw new ServiceError("INVALID_INPUT");
  return value.trim();
}
export function id(value: unknown) {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  )
    throw new ServiceError("INVALID_INPUT");
  return value;
}
export function version(value: unknown) {
  if (!Number.isSafeInteger(value) || (value as number) < 0)
    throw new ServiceError("INVALID_INPUT");
  return value as number;
}
