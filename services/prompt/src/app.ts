import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import { config, validateEnv } from './config/env';
import promptRouter from './routes/prompt';
import styleRouter from './routes/style';
import { promptCache } from './cache/promptCache';

/**
 * Create and configure Express application
 */
export function createApp(): Application {
  const app = express();

  // Validate environment variables
  validateEnv();

  // Security middleware
  app.use(helmet());

  // CORS configuration
  app.use(cors({
    origin: config.corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // Body parsing middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Logging middleware
  app.use(morgan('combined'));

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'prompt-style-service',
      version: 'v1',
      timestamp: new Date().toISOString(),
      cache: {
        size: promptCache.size(),
      },
      config: {
        groqConfigured: !!config.groqApiKey,
        falConfigured: !!config.falKey,
        supabaseConfigured: !!config.supabaseUrl && !!config.supabaseAnonKey,
      },
    });
  });

  // API routes
  app.use('/prompt', promptRouter);
  app.use('/style', styleRouter);

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      error: 'Not Found',
      message: 'The requested resource does not exist',
    });
  });

  return app;
}

