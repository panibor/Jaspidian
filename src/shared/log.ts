/**
 * src-v2/shared/log.ts
 * Logging with ringbuffer for debug overlay.
 */

export interface Logger {
  debug: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

export interface LogEntry {
  ts: string;
  level: 'debug' | 'warn' | 'error';
  prefix: string;
  args: unknown[];
}

const LOG_BUFFER_SIZE = 200;
let logBuffer: LogEntry[] = [];

/**
 * Create a logger with a given prefix.
 * In production, debug is a no-op. All entries go to ringbuffer.
 */
export function createLogger(prefix: string): Logger {
  return {
    debug: (...args) => {
      if (process.env.NODE_ENV === 'development') {
        recordLog('debug', prefix, args);
      }
    },
    warn: (...args) => recordLog('warn', prefix, args),
    error: (...args) => recordLog('error', prefix, args),
  };
}

function recordLog(level: 'debug' | 'warn' | 'error', prefix: string, args: unknown[]): void {
  const entry: LogEntry = {
    ts: new Date().toISOString(),
    level,
    prefix,
    args,
  };
  logBuffer.push(entry);
  if (logBuffer.length > LOG_BUFFER_SIZE) {
    logBuffer.shift();
  }
}

/**
 * Get recent log entries (for debug overlay).
 */
export function getRecentLogs(): LogEntry[] {
  return [...logBuffer];
}
