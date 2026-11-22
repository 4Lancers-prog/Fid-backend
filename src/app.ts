import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import mongoSanitize from 'express-mongo-sanitize';
import { env } from './config/env';
import routes from './routes';
import { notFound } from './middleware/notFound';
import { errorHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';

export function createApp(): Application {
  const app = express();

  // Trust the (localhost) proxy in front of us, e.g. the Vite dev proxy. Without this,
  // express-rate-limit rejects proxied requests that carry an X-Forwarded-For header.
  app.set('trust proxy', env.trustProxy);

  // Security headers. HSTS is enabled in production; the API serves JSON only,
  // so a restrictive referrer policy and no sniffing are appropriate.
  app.disable('x-powered-by');
  app.use(
    helmet({
      hsts: env.isProd ? { maxAge: 15552000, includeSubDomains: true } : false,
      referrerPolicy: { policy: 'no-referrer' },
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );

  // CORS — only configured client origins may call the API with credentials.
  // IMPORTANT: a disallowed origin is denied by returning `false`, never by throwing
  // (throwing would surface as a 500 on every request). In development we also accept
  // any localhost / 127.0.0.1 origin so the app works however you open it.
  const devLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true); // same-origin / non-browser clients
        if (env.clientOrigins.includes(origin)) return callback(null, true);
        if (!env.isProd && devLocalhost.test(origin)) return callback(null, true);
        return callback(null, false); // deny without throwing
      },
      credentials: true,
    }),
  );

  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));
  app.use(cookieParser());

  // Strip keys containing $ or . to prevent NoSQL operator injection.
  app.use(mongoSanitize());

  if (!env.isProd) app.use(morgan('dev'));

  app.use('/api', apiLimiter, routes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
