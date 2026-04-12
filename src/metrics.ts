import { register, Counter, Histogram } from 'prom-client';

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'status'],
});

export const httpRequestDurationSeconds = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request latency in seconds',
  labelNames: ['method', 'path'],
  buckets: [0.1, 0.5, 1, 2, 5],
});

export const ordersCompletedTotal = new Counter({
  name: 'orders_completed_total',
  help: 'Total orders completed',
});

export const stockDecrementsTotal = new Counter({
  name: 'stock_decrements_total',
  help: 'Total stock decrement operations',
});

export const paymentsProcessedTotal = new Counter({
  name: 'payments_processed_total',
  help: 'Total payments processed',
  labelNames: ['status'],
});

export function getMetrics() {
  return register.metrics();
}

export function incrementOrdersCompleted(count: number = 1) {
  ordersCompletedTotal.inc(count);
}

export function incrementStockDecrements(count: number = 1) {
  stockDecrementsTotal.inc(count);
}

export function incrementPayments(status: 'success' | 'failed' = 'success', count: number = 1) {
  paymentsProcessedTotal.labels(status).inc(count);
}
