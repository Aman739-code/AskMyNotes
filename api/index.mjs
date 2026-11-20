// Vercel serverless entry: serves the compiled Express app (apps/api/dist).
// `npm run build:vercel` must run first so that dist/ exists.
import app from '../apps/api/dist/index.js';

export default app;
