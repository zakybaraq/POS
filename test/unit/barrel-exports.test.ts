import { describe, it, expect } from 'vitest';

describe('Barrel Exports', () => {
  describe('Domain Repositories', () => {
    it('should export all repositories from index', async () => {
      const repositories = await import('../../src/domain/repositories/index');
      expect(repositories).toBeDefined();
      expect(typeof repositories).toBe('object');
    });

    it('should have order repository', async () => {
      const { getOrderById } = await import('../../src/domain/repositories/index');
      expect(typeof getOrderById).toBe('function');
    });

    it('should have user repository', async () => {
      const { getUserById } = await import('../../src/domain/repositories/index');
      expect(typeof getUserById).toBe('function');
    });

    it('should have inventory repository', async () => {
      const { getIngredientById } = await import('../../src/domain/repositories/index');
      expect(typeof getIngredientById).toBe('function');
    });
  });

  describe('Domain Services', () => {
    it('should export all services from index', async () => {
      const services = await import('../../src/domain/services/index');
      expect(services).toBeDefined();
      expect(typeof services).toBe('object');
    });

    it('should have auth service', async () => {
      const { hashPassword } = await import('../../src/domain/services/index');
      expect(typeof hashPassword).toBe('function');
    });

    it('should have reorder service', async () => {
      const { calculateReorderPoint } = await import('../../src/domain/services/index');
      expect(typeof calculateReorderPoint).toBe('function');
    });
  });

  describe('Domain Schemas', () => {
    it('should export all schemas from index', async () => {
      const schemas = await import('../../src/domain/schemas/index');
      expect(schemas).toBeDefined();
      expect(typeof schemas).toBe('object');
    });
  });

  describe('Infrastructure Database', () => {
    it('should export database from index', async () => {
      const db = await import('../../src/infrastructure/database/index');
      expect(db).toBeDefined();
      expect(typeof db).toBe('object');
    });
  });

  describe('Shared Utils', () => {
    it('should export all utils from index', async () => {
      const utils = await import('../../src/shared/utils/index');
      expect(utils).toBeDefined();
      expect(typeof utils).toBe('object');
    });

    it('should have auth utils', async () => {
      const { generateToken } = await import('../../src/shared/utils/index');
      expect(typeof generateToken).toBe('function');
    });

    it('should have pagination utils', async () => {
      const { createPagination } = await import('../../src/shared/utils/index');
      expect(typeof createPagination).toBe('function');
    });
  });
});

describe('Path Aliases Configuration', () => {
  it('should have tsconfig.json with path aliases', () => {
    const fs = require('fs');
    const tsconfig = JSON.parse(fs.readFileSync('./tsconfig.json', 'utf8'));
    
    expect(tsconfig.compilerOptions.paths).toBeDefined();
    expect(tsconfig.compilerOptions.paths['@/api/*']).toBeDefined();
    expect(tsconfig.compilerOptions.paths['@/domain/*']).toBeDefined();
    expect(tsconfig.compilerOptions.paths['@/infrastructure/*']).toBeDefined();
    expect(tsconfig.compilerOptions.paths['@/shared/*']).toBeDefined();
  });

  it('should have baseUrl configured', () => {
    const fs = require('fs');
    const tsconfig = JSON.parse(fs.readFileSync('./tsconfig.json', 'utf8'));
    
    expect(tsconfig.compilerOptions.baseUrl).toBe('.');
  });
});

describe('Clean Architecture Structure', () => {
  it('should have api directory', () => {
    const fs = require('fs');
    expect(fs.existsSync('./src/api')).toBe(true);
    expect(fs.existsSync('./src/api/routes')).toBe(true);
    expect(fs.existsSync('./src/api/middleware')).toBe(true);
    expect(fs.existsSync('./src/api/pages')).toBe(true);
  });

  it('should have domain directory', () => {
    const fs = require('fs');
    expect(fs.existsSync('./src/domain')).toBe(true);
    expect(fs.existsSync('./src/domain/repositories')).toBe(true);
    expect(fs.existsSync('./src/domain/services')).toBe(true);
    expect(fs.existsSync('./src/domain/schemas')).toBe(true);
  });

  it('should have infrastructure directory', () => {
    const fs = require('fs');
    expect(fs.existsSync('./src/infrastructure')).toBe(true);
    expect(fs.existsSync('./src/infrastructure/database')).toBe(true);
    expect(fs.existsSync('./src/infrastructure/websocket')).toBe(true);
  });

  it('should have shared directory', () => {
    const fs = require('fs');
    expect(fs.existsSync('./src/shared')).toBe(true);
    expect(fs.existsSync('./src/shared/utils')).toBe(true);
    expect(fs.existsSync('./src/shared/templates')).toBe(true);
  });
});
