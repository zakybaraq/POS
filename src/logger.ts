import pino from 'pino';
import { createRedactionSerializer } from './utils/redact';

// Logger instance with configurable level and transport
const transport =
  process.env.NODE_ENV === 'production'
    ? undefined // JSON to stdout in production
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      };

export const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'info',
    transport,
    serializers: createRedactionSerializer(),
  }
);

/**
 * Create a child logger with bound context
 * Useful for adding metadata that persists across multiple log calls
 * @param context - Object with context fields (e.g., { requestId, userId })
 * @returns Child logger with context bound
 */
export function createChildLogger(context: Record<string, any>) {
  return logger.child(context);
}

export default logger;
