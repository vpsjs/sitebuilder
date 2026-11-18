export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  database: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USER ?? 'sitebuilder_app',
    password: process.env.DB_PASSWORD ?? 'sitebuilder_app_dev',
    name: process.env.DB_NAME ?? 'sitebuilder',
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-only-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  revalidate: {
    url: process.env.REVALIDATE_URL ?? 'http://localhost:3001/api/revalidate',
    secret: process.env.REVALIDATE_SECRET ?? 'dev-revalidate-secret',
  },
  renderer: {
    url: process.env.RENDERER_URL ?? 'http://localhost:3001',
  },
  storage: {
    driver: process.env.STORAGE_DRIVER ?? 'local',
    root: process.env.STORAGE_ROOT ?? './storage',
    publicBaseUrl: process.env.PUBLIC_BASE_URL ?? 'http://localhost:3000/api/cdn',
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION ?? 'us-east-1',
    bucket: process.env.S3_BUCKET ?? 'sites',
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
});
