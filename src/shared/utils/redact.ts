const SAFE_FIELDS = new Set([
  'requestId',
  'userId',
  'orderId',
  'customerId',
  'ingredientId',
  'menuId',
  'tableId',
  'status',
  'method',
  'path',
  'timestamp',
  'duration',
  'count',
  'quantity',
  'amount',
  'total',
  'uptime',
  'version',
  'database',
  'transactionId',
  'orderId',
  'previousState',
  'newState',
  'reason',
  'paymentMethod',
  'success',
  'stockBefore',
  'stockAfter',
  'pointsBefore',
  'pointsAfter',
  'ingredients',
  'before',
  'after',
  'err',
  'error',
  'statusCode',
  'code',
  'message',
  'msg',
  'type',
  'level',
  'time',
  'pid',
  'hostname',
]);

const DANGEROUS_FIELDS = new Set([
  'password',
  'secret',
  'token',
  'apiKey',
  'api_key',
  'creditCard',
  'credit_card',
  'ssn',
  'pin',
  'cvv',
  'cvv2',
  'authorization',
  'sessionId',
  'session_id',
  'refreshToken',
  'refresh_token',
  'accessToken',
  'access_token',
  'privateKey',
  'private_key',
  'publicKey',
  'public_key',
]);

export function redactObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => redactObject(item));
  }

  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (DANGEROUS_FIELDS.has(key.toLowerCase())) {
      result[key] = '[REDACTED]';
    } else if (SAFE_FIELDS.has(key)) {
      result[key] = typeof value === 'object' ? redactObject(value) : value;
    } else if (typeof value === 'object') {
      result[key] = redactObject(value);
    } else {
      result[key] = '[REDACTED]';
    }
  }

  return result;
}

export function createRedactionSerializer() {
  return {
    err: (err: any) => redactObject(err),
    error: (error: any) => redactObject(error),
    req: (req: any) => redactObject(req),
    res: (res: any) => redactObject(res),
  };
}
