import { beforeAll, afterAll } from 'vitest';

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret-key-for-testing-only-32chars';
  process.env.NODE_ENV = 'test';
  process.env.DB_HOST = 'localhost';
  process.env.DB_USER = 'root';
  process.env.DB_PASSWORD = 'P@blo7272';
  process.env.DB_NAME = 'pos_db';
});

afterAll(async () => {
});