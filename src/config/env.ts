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
};
