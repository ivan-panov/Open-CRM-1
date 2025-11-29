import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { query } from '../db.js';

const router = Router();

const companyValidators = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('website').optional({ nullable: true }).isURL().withMessage('Website must be a valid URL'),
  body('industry').optional({ nullable: true }).isString(),
  body('size').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Size must be a positive integer')
];

router.get('/', async (_req, res, next) => {
  try {
    const [rows] = await query('SELECT * FROM companies ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.post('/', companyValidators, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, website, industry, size } = req.body;
    const [result] = await query(
      'INSERT INTO companies (name, website, industry, size) VALUES (?, ?, ?, ?)',
      [name, website || null, industry || null, size || null]
    );
    const [rows] = await query('SELECT * FROM companies WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', param('id').isInt(), async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { id } = req.params;
    const [rows] = await query('SELECT * FROM companies WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ message: 'Company not found' });
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', [param('id').isInt(), ...companyValidators], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { id } = req.params;
    const { name, website, industry, size } = req.body;
    const [result] = await query(
      'UPDATE companies SET name = ?, website = ?, industry = ?, size = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name, website || null, industry || null, size || null, id]
    );
    if (!result.affectedRows) return res.status(404).json({ message: 'Company not found' });
    const [rows] = await query('SELECT * FROM companies WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', param('id').isInt(), async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { id } = req.params;
    const [result] = await query('DELETE FROM companies WHERE id = ?', [id]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Company not found' });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
