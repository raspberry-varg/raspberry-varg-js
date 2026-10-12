import type { RepliableInteraction } from "discord.js";

export interface BotKitConfig {
  /**
   * The level of logs to pass through to {@link logger}.
   */
  logLevel: LogLevelString;

  /**
   * Logger to use for framework logs.
   */
  logger: BotKitLogger;

  /**
   * How long before a menu expires in milliseconds.
   *
   * Defaults to 14 minutes, right below the 15-minute timeout Discord has for interactions.
   */
  defaultIdleTimeoutMs: number;

  /**
   * Called when an interaction is received for a menu that has expired.
   */
  onDeadInteraction?: (interaction: RepliableInteraction) => void;

  /**
   * Support Bun's --hot reloading (globalThis persistence of objects such as the router).
   */
  supportHotReloading: boolean;

  /**
   * Builds up a {@link MenuBuilder} in a legacy view definition's factory function.
   */
  useCordFactoriesForLegacyViewDefines: boolean;

  /**
   * Whether to include component stacks in error messages.
   *
   * Note: This creates extra owners, so it's disabled in production.
   */
  componentStacks: boolean;
}

export type BotKitLoggerMeta = Record<string, any>;

export interface BotKitLogger {
  debug?: (message: string, meta?: BotKitLoggerMeta) => void;
  info?: (message: string, meta?: BotKitLoggerMeta) => void;
  verbose?: (message: string, meta?: BotKitLoggerMeta) => void;
  warn: (message: string, meta?: BotKitLoggerMeta) => void;
  error: (message: string, error?: unknown, meta?: Record<string, any>) => void;
}

const useColor = process.env.FORCE_COLOR ? true : !process.env.NO_COLOR && process.stdout.isTTY;

const c = {
  reset: useColor ? "\x1b[0m" : "",
  bold: useColor ? "\x1b[1m" : "",
  red: useColor ? "\x1b[31m" : "",
  yellow: useColor ? "\x1b[33m" : "",
  cyan: useColor ? "\x1b[36m" : "",
  gray: useColor ? "\x1b[90m" : "",
};

function prefix(tag: string, colorCode: string): string {
  return `${c.bold}${colorCode}[BotKit ${tag}]${c.reset}`;
}

function formatMsg(msg: string): string {
  return !useColor ? msg : msg.replace(/`([^`]+)`/g, `${c.cyan}${c.bold}$1${c.reset}`);
}

const defaultLogger: BotKitLogger = {
  warn: (msg, meta) => {
    console.warn(`${prefix("Warn", c.yellow)} ${formatMsg(msg)}`, meta ?? "");
  },
  info: (msg, meta) => {
    console.info(`${prefix("Info", c.cyan)} ${formatMsg(msg)}`, meta ?? "");
  },
  error: (msg, error, meta) => {
    console.error(`${prefix("Error", c.red)} ${formatMsg(msg)}`, meta ?? "", error ?? "");
  },
  debug: (msg, meta) => {
    console.debug(`${prefix("Debug", c.gray)} ${c.gray}${formatMsg(msg)}`, meta ?? "");
  },
  verbose: (msg, meta) => {
    console.debug(`${prefix("Verbose", c.gray)} ${c.gray}${formatMsg(msg)}`, meta ?? "");
  },
};

export const LogLevel = {
  none: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
  verbose: 5,
} as const;

export type LogLevelString = keyof typeof LogLevel;

function getEnvLogLevel(): LogLevelString | undefined {
  const rawEnv = process.env.SIGCORD_LOG_LEVEL;

  if (!rawEnv) return undefined;

  const normalized = rawEnv.toLowerCase().trim();
  if (normalized in LogLevel) {
    return normalized as LogLevelString;
  }

  console.warn(
    `[BotKit Warning]: Invalid SIGCORD_LOG_LEVEL provided ("${rawEnv}"). ` +
      `Expected one of: ${Object.keys(LogLevel).join(", ")}. ` +
      `Falling back to default log level.`,
  );

  return undefined; // Returns undefined so the fallback logic takes over
}

const globalConfig: BotKitConfig = {
  logLevel: getEnvLogLevel() ?? (process.env.NODE_ENV === "production" ? "warn" : "info"),
  logger: defaultLogger,
  defaultIdleTimeoutMs: 14 * 60 * 1000,
  onDeadInteraction: undefined,
  supportHotReloading: false,
  useCordFactoriesForLegacyViewDefines: false,
  componentStacks: process.env.NODE_ENV !== "production",
};

export function configure(options: Partial<BotKitConfig>): void {
  Object.assign(globalConfig, options);
}

export function getConfig(): Readonly<BotKitConfig> {
  return globalConfig;
}
