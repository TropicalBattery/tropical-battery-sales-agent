type Level = "info" | "warn" | "error";
const ts = () => new Date().toISOString();
function emit(level: Level, msg: string, meta?: unknown) {
  const line = { t: ts(), level, msg, ...(meta ? { meta } : {}) };
  // eslint-disable-next-line no-console
  console[level === "error" ? "error" : level === "warn" ? "warn" : "log"](JSON.stringify(line));
}
export const log = {
  info: (m: string, meta?: unknown) => emit("info", m, meta),
  warn: (m: string, meta?: unknown) => emit("warn", m, meta),
  error: (m: string, meta?: unknown) => emit("error", m, meta),
};
