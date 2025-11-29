import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'ok', database: 'reachable' });
  } catch (error) {
    next(error);
  }
});

export default router;
