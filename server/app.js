import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import configRoutes from './routes/config.js';
import draftsRoutes from './routes/drafts.js';
import settingsRoutes from './routes/settings.js';
import { swaggerSpec } from './swagger.js';

export function createApp() {
  const app = express();
  const isProduction = process.env.NODE_ENV === 'production';

  // Middleware
  app.use(cors({
    origin: isProduction ? false : true,
  }));
  app.use(express.json({ limit: '1mb' }));

  // Swagger docs
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // API Routes
  app.use('/api/config', configRoutes);
  app.use('/api/drafts', draftsRoutes);
  app.use('/api/settings', settingsRoutes);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  return app;
}

export default createApp;
