import { LogLevel, type LogLevelString, type AppLogger } from './appLogger.js';

export const defaultAppLogger: AppLogger = {
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
export function getEnvLogLevel(): LogLevelString | undefined {
  const rawEnv = process.env.BOT_KIT_LOG_LEVEL;

  if (!rawEnv) return undefined;

  const normalized = rawEnv.toLowerCase().trim();
  if (normalized in LogLevel) {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion Checked for key.
    return normalized as LogLevelString;
  }

  console.warn(
    `[BotKit Warning]: Invalid BOT_KIT_LOG_LEVEL provided ("${rawEnv}"). ` +
      `Expected one of: ${Object.keys(LogLevel).join(', ')}. ` +
      `Falling back to default log level.`,
  );

  return undefined;
}
