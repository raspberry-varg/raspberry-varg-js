export type LoggerMeta = Record<string, any>;

export interface AppLogger {
  debug?: (message: string, meta?: LoggerMeta) => void;
  info?: (message: string, meta?: LoggerMeta) => void;
  verbose?: (message: string, meta?: LoggerMeta) => void;
  warn: (message: string, meta?: LoggerMeta) => void;
  error: (message: string, error?: unknown, meta?: Record<string, any>) => void;
}

export const LogLevel = {
  none: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
  verbose: 5,
} as const;
export type LogLevelString = keyof typeof LogLevel;
