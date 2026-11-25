import dotenv from 'dotenv';

dotenv.config();

/**
 * Central, validated access to environment variables.
 * Sensible defaults are provided for local development only.
 * Secrets MUST be overridden via a real .env file in any shared environment.
 */
function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    // Fail fast on startup rather than at request time.
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parseTrustProxy(value: string): boolean | number | string {
  if (value === 'true') return true;
  if (value === 'false') return false;
  const n = Number(value);
  return Number.isInteger(n) && value.trim() !== '' ? n : value;
}

const NODE_ENV = process.env.NODE_ENV ?? 'development';
const isProd = NODE_ENV === 'production';

export const env = {
  nodeEnv: NODE_ENV,
  isProd,
  port: parseInt(process.env.PORT ?? '5000', 10),
  clientOrigins: (process.env.CLIENT_ORIGINS ?? 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  // Express 'trust proxy' setting. Default 'loopback' trusts only localhost proxies
  // (e.g. the Vite dev proxy) — safe and fixes X-Forwarded-For handling. Behind a real
  // reverse proxy in production, set TRUST_PROXY=1 (or your proxy's config).
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY ?? 'loopback'),
  mongoUri: required('MONGODB_URI', 'mongodb://127.0.0.1:27017/farmer_portal'),
  // Zero-install local mode: run an in-memory MongoDB instead of a real one.
  useMemoryDb: (process.env.USE_MEMORY_DB ?? 'false') === 'true',
  // Create the seed Super Admin on startup if missing (handy with the in-memory DB).
  autoSeed: (process.env.AUTO_SEED ?? 'false') === 'true',
  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET', isProd ? undefined : 'dev_access_secret'),
    refreshSecret: required('JWT_REFRESH_SECRET', isProd ? undefined : 'dev_refresh_secret'),
    accessExpires: process.env.JWT_ACCESS_EXPIRES ?? '15m',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES ?? '7d',
  },
  dataEncryptionKey: required(
    'DATA_ENCRYPTION_KEY',
    isProd ? undefined : '0'.repeat(64),
  ),
  // Optional AUTHORIZED government FRUITS/K-Kisan API (issued by the dept). When set,
  // the Aadhaar lookup auto-fetches new farmers from it. Leave blank to use only the
  // local database (scraping the OTP/CAPTCHA portal is never done).
  fruits: {
    url: process.env.FRUITS_API_URL ?? '',
    key: process.env.FRUITS_API_KEY ?? '',
  },
  seed: {
    name: process.env.SEED_ADMIN_NAME ?? 'Super Admin',
    email: process.env.SEED_ADMIN_EMAIL ?? 'admin@farmerportal.local',
    password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin@12345',
  },
};

if (isProd && env.useMemoryDb) {
  throw new Error('USE_MEMORY_DB cannot be enabled in production. Configure a real MONGODB_URI.');
}

if (isProd) {
  // Guard rails: refuse to boot in production with placeholder secrets.
  const weak = ['dev_access_secret', 'dev_refresh_secret', '0'.repeat(64)];
  if (
    weak.includes(env.jwt.accessSecret) ||
    weak.includes(env.jwt.refreshSecret) ||
    weak.includes(env.dataEncryptionKey)
  ) {
    throw new Error(
      'Refusing to start in production with default/placeholder secrets. Set strong JWT and encryption secrets.',
    );
  }
}
