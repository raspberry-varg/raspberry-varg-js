import type { ClientOptions } from 'discord.js';

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
   * Support Bun's --hot reloading (globalThis persistence of objects such as the router).
   */
  supportHotReloading: boolean;

  clientOptions: ClientOptions;
  clientToken: string;
  clientApplicationId: string;

  paths?: readonly string[];

  commandSync: {
    shouldSync: (newHash: string) => boolean | Promise<boolean>;
    onSynced?: (newHash: string) => void | Promise<void>;
  } & (
    | {
        target: 'global';
      }
    | {
        target: 'development';
        testGuildIds: string | readonly string[];
      }
  );
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
  reset: useColor ? '\x1b[0m' : '',
  bold: useColor ? '\x1b[1m' : '',
  red: useColor ? '\x1b[31m' : '',
  yellow: useColor ? '\x1b[33m' : '',
  cyan: useColor ? '\x1b[36m' : '',
  gray: useColor ? '\x1b[90m' : '',
};

function prefix(tag: string, colorCode: string): string {
  return `${c.bold}${colorCode}[BotKit ${tag}]${c.reset}`;
}

function formatMsg(msg: string): string {
  return !useColor ? msg : msg.replace(/`([^`]+)`/g, `${c.cyan}${c.bold}$1${c.reset}`);
}

const defaultLogger: BotKitLogger = {
  warn: (msg, meta) => {
    console.warn(`${prefix('Warn', c.yellow)} ${formatMsg(msg)}`, meta ?? '');
  },
  info: (msg, meta) => {
    console.info(`${prefix('Info', c.cyan)} ${formatMsg(msg)}`, meta ?? '');
  },
  error: (msg, error, meta) => {
    console.error(`${prefix('Error', c.red)} ${formatMsg(msg)}`, meta ?? '', error ?? '');
  },
  debug: (msg, meta) => {
    console.debug(`${prefix('Debug', c.gray)} ${c.gray}${formatMsg(msg)}`, meta ?? '');
  },
  verbose: (msg, meta) => {
    console.debug(`${prefix('Verbose', c.gray)} ${c.gray}${formatMsg(msg)}`, meta ?? '');
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
  const rawEnv = process.env.BOT_KIT_LOG_LEVEL;

  if (!rawEnv) return undefined;

  const normalized = rawEnv.toLowerCase().trim();
  if (normalized in LogLevel) {
    return normalized as LogLevelString;
  }

  console.warn(
    `[BotKit Warning]: Invalid BOT_KIT_LOG_LEVEL provided ("${rawEnv}"). ` +
      `Expected one of: ${Object.keys(LogLevel).join(', ')}. ` +
      `Falling back to default log level.`,
  );

  return undefined;
}

const globalConfig = {
  logLevel: getEnvLogLevel() ?? (process.env.NODE_ENV === 'production' ? 'warn' : 'info'),
  logger: defaultLogger,
  supportHotReloading: false,
} satisfies Partial<BotKitConfig>;

export function configure(options: BotKitConfigPartial): BotKitConfig {
  return Object.assign(globalConfig, options) as BotKitConfig;
}

export type BotKitConfigPartial = Omit<BotKitConfig, keyof typeof globalConfig> &
  Partial<Pick<BotKitConfig, keyof typeof globalConfig>>;

export function getConfig(): Readonly<BotKitConfig> {
  return globalConfig as BotKitConfig;
}
