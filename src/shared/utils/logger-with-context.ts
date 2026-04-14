import { logger, createChildLogger } from '../logger';
import { getRequestId } from '../middleware/request-id';

export function getLoggerWithRequestId() {
  const requestId = getRequestId();
  if (requestId) {
    return createChildLogger({ requestId });
  }
  return logger;
}
