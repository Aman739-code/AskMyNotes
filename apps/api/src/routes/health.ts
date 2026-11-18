import { Router } from 'express';

export const healthRouter = Router();

const startTime = Date.now();

healthRouter.get('/', async (_req, res) => {
  const uptime = Math.floor((Date.now() - startTime) / 1000);
  
  // TODO: Check actual service health
  const services = {
    database: true,
    redis: true, 
    llm: true,
  };

  const allHealthy = Object.values(services).every(Boolean);

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'ok' : 'degraded',
    version: process.env.npm_package_version || '1.0.0',
    uptime,
    services,
  });
});
