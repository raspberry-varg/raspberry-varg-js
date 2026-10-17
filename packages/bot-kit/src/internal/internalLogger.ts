import { type LoggerMeta, LogLevel, type LogLevelString } from '../app/appLogger.js';
import { getConfig } from '../core/config.js';

export function shouldLog(level: (typeof LogLevel)[LogLevelString]): boolean {
  return LogLevel[getConfig().logLevel] >= level;
}

/**
 * @internal
 */
export class InternalLogger {
  constructor(private readonly scope: string) {}

  namespaced(ns: string): InternalLogger {
    return new InternalLogger(this.scope ? `${this.scope}:${ns}` : ns);
  }

  private fmtMsg(msg: string): string {
    return `[${this.scope}] ${msg}`;
  }

  verbose(msg: string, meta?: LoggerMeta) {
    if (shouldLog(LogLevel.verbose)) {
      getConfig().logger.verbose?.(this.fmtMsg(msg), meta);
    }
  }

  debug(msg: string, maybeLazyMeta?: LoggerMeta | (() => LoggerMeta)) {
    if (shouldLog(LogLevel.debug)) {
      const meta = typeof maybeLazyMeta === 'function' ? maybeLazyMeta() : maybeLazyMeta;
      getConfig().logger.debug?.(this.fmtMsg(msg), meta);
    }
  }

  info(msg: string, meta?: LoggerMeta) {
    if (shouldLog(LogLevel.info)) {
      getConfig().logger.info?.(this.fmtMsg(msg), meta);
    }
  }

  warn(msg: string, meta?: LoggerMeta) {
    if (shouldLog(LogLevel.warn)) {
      getConfig().logger.warn(this.fmtMsg(msg), meta);
    }
  }

  error(msg: string, error?: unknown, meta?: LoggerMeta) {
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
