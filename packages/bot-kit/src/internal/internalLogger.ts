import { LogLevel, type LogLevelString, type BotKitLoggerMeta, getConfig } from "../config.js";

export function shouldLog(level: (typeof LogLevel)[LogLevelString]): boolean {
  return LogLevel[getConfig().logLevel] >= level;
}

/**
 * @internal
 */
export class InternalLogger {
  constructor(
    private readonly scope: string,
    private readonly ns: string = "",
  ) {}

  namespaced(ns: string): InternalLogger {
    return new InternalLogger(this.scope, ns);
  }

  private fmtMsg(msg: string): string {
    let str = `[${this.scope}`;
    if (this.ns) {
      str += `:${this.ns}`;
    }
    return `${str}] ${msg}`;
  }

  verbose(msg: string, meta?: BotKitLoggerMeta) {
    if (shouldLog(LogLevel.verbose)) {
      getConfig().logger.verbose?.(this.fmtMsg(msg), meta);
    }
  }

  debug(msg: string, maybeLazyMeta?: BotKitLoggerMeta | (() => BotKitLoggerMeta)) {
    if (shouldLog(LogLevel.debug)) {
      const meta = typeof maybeLazyMeta === "function" ? maybeLazyMeta() : maybeLazyMeta;
      getConfig().logger.debug?.(this.fmtMsg(msg), meta);
    }
  }

  info(msg: string, meta?: BotKitLoggerMeta) {
    if (shouldLog(LogLevel.info)) {
      getConfig().logger.info?.(this.fmtMsg(msg), meta);
    }
  }

  warn(msg: string, meta?: BotKitLoggerMeta) {
    if (shouldLog(LogLevel.warn)) {
      getConfig().logger.warn(this.fmtMsg(msg), meta);
    }
  }

  error(msg: string, error?: unknown, meta?: BotKitLoggerMeta) {
    if (shouldLog(LogLevel.error)) {
      getConfig().logger.error(this.fmtMsg(msg), error, meta);
    }
  }
}

/**
 * @internal
 */
export function createInternalLogger(scope: string): InternalLogger {
  return new InternalLogger(scope);
}
