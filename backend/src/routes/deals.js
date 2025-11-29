import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { query } from '../db.js';

const router = Router();

const dealValidators = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('value').isFloat({ min: 0 }).withMessage('Value must be zero or greater'),
  body('stage').trim().notEmpty().withMessage('Stage is required'),
  body('company_id').isInt({ min: 1 }).withMessage('company_id is required'),
  body('contact_id').optional({ nullable: true }).isInt({ min: 1 })
];

router.get('/', async (_req, res, next) => {
  try {
    const [rows] = await query(
      `SELECT d.*, c.name AS company_name, ct.first_name, ct.last_name
       FROM deals d
       LEFT JOIN companies c ON c.id = d.company_id
       LEFT JOIN contacts ct ON ct.id = d.contact_id
       ORDER BY d.created_at DESC`
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.post('/', dealValidators, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { title, value, stage, company_id, contact_id } = req.body;
    const [result] = await query(
      `INSERT INTO deals (title, value, stage, company_id, contact_id)
       VALUES (?, ?, ?, ?, ?)`,
      [title, value, stage, company_id, contact_id || null]
    );
    const [rows] = await query('SELECT * FROM deals WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', [param('id').isInt(), ...dealValidators], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { id } = req.params;
    const { title, value, stage, company_id, contact_id } = req.body;
    const [result] = await query(
      `UPDATE deals
       SET title = ?, value = ?, stage = ?, company_id = ?, contact_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [title, value, stage, company_id, contact_id || null, id]
    );
    if (!result.affectedRows) return res.status(404).json({ message: 'Deal not found' });
    const [rows] = await query('SELECT * FROM deals WHERE id = ?', [id]);
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
    const [result] = await query('DELETE FROM deals WHERE id = ?', [id]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Deal not found' });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
