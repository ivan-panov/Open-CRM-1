import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import companiesRouter from './routes/companies.js';
import contactsRouter from './routes/contacts.js';
import dealsRouter from './routes/deals.js';
import healthRouter from './routes/health.js';
import { errorHandler, notFound } from './middleware/error-handler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.use('/api/health', healthRouter);
app.use('/api/companies', companiesRouter);
app.use('/api/contacts', contactsRouter);
app.use('/api/deals', dealsRouter);

const distPath = path.resolve(__dirname, '../../dist');
app.use(express.static(distPath));
app.get('*', (_req, res, next) => {
  if (_req.path.startsWith('/api/')) return next();
  return res.sendFile(path.join(distPath, 'index.html'));
});

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`API server listening on port ${PORT}`);
});
