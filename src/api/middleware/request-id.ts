import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';

export const requestIdStore = new AsyncLocalStorage<string>();

export function getRequestId(): string | undefined {
  return requestIdStore.getStore();
}

export function requestIdMiddleware(app: any) {
  return app.onRequest(async (context: any) => {
    const requestId = randomUUID();

    context.set({
      requestId,
    });

    const response = await context.proceed();
    response.headers.set('X-Request-ID', requestId);
    return response;
  });
}
