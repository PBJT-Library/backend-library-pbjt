export const env = {
  app: {
    port: Number(process.env.APP_PORT),
    env: process.env.APP_ENV,
  },

  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    exp: process.env.JWT_EXPIRES_IN,
  },

  security: {
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [],
    rateLimitDuration: Number(process.env.RATE_LIMIT_DURATION) || 60000,
    rateLimitMax: Number(process.env.RATE_LIMIT_MAX) || 100,
    rateLimitAuthMax: Number(process.env.RATE_LIMIT_AUTH_MAX) || 5,
    enableThrottle: process.env.ENABLE_THROTTLE === 'true',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD,
    db: Number(process.env.REDIS_DB) || 0,
  },

  swagger: {
    enabled: process.env.SWAGGER_ENABLED !== 'false', // true by default
    username: process.env.SWAGGER_USERNAME || 'admin',
    password: process.env.SWAGGER_PASSWORD || 'change_this',
  },
};

