/**
 * Centralized configuration management
 * Validates all required environment variables at startup (fail-fast)
 */

interface Config {
  jwt: {
    secret: string;
    expiresIn: string;
  };
  cookie: {
    secure: boolean;
    httpOnly: boolean;
    sameSite: 'strict' | 'lax' | 'none';
    maxAge: number;
  };
  server: {
    port: number;
    nodeEnv: 'development' | 'production' | 'test';
  };
  db: {
    host: string;
    user: string;
    password: string;
    name: string;
  };
}

function validateEnvironment(): Config {
  // JWT_SECRET is REQUIRED - fail immediately if missing
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.trim() === '') {
    throw new Error(
      'FATAL: JWT_SECRET environment variable is required. ' +
      'Set it in .env file or environment before starting the application.'
    );
  }

  // Other variables with sensible defaults
  const nodeEnv = (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test';
  const port = parseInt(process.env.PORT || '3000', 10);
  const cookieSecure = process.env.COOKIE_SECURE !== 'false'; // Default to true (secure)

  return {
    jwt: {
      secret: jwtSecret,
      expiresIn: '24h',
    },
    cookie: {
      secure: cookieSecure,
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
    server: {
      port,
      nodeEnv,
    },
    db: {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      name: process.env.DB_NAME || 'pos_db',
    },
  };
}

// Validate immediately on module load (fail-fast)
let config: Config;
try {
  config = validateEnvironment();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

export default config;
