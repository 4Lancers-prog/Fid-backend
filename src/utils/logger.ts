/* Minimal structured logger. Avoids leaking sensitive data by only logging
 * what callers explicitly pass. Replace with pino/winston in production. */
type Level = 'info' | 'warn' | 'error' | 'debug';

function log(level: Level, message: string, meta?: unknown): void {
  const time = new Date().toISOString();
  const base = `[${time}] ${level.toUpperCase()} ${message}`;
  if (meta !== undefined) {
    // eslint-disable-next-line no-console
    console[level === 'debug' ? 'log' : level](base, meta);
  } else {
    // eslint-disable-next-line no-console
    console[level === 'debug' ? 'log' : level](base);
  }
}

export const logger = {
  info: (m: string, meta?: unknown) => log('info', m, meta),
  warn: (m: string, meta?: unknown) => log('warn', m, meta),
  error: (m: string, meta?: unknown) => log('error', m, meta),
  debug: (m: string, meta?: unknown) => log('debug', m, meta),
};
