import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { query } from '../db.js';

const router = Router();

const contactValidators = [
  body('first_name').trim().notEmpty().withMessage('First name is required'),
  body('last_name').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').optional({ nullable: true }).isString(),
  body('company_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('company_id must be an integer')
];

router.get('/', async (_req, res, next) => {
  try {
    const [rows] = await query(
      `SELECT c.*, co.name AS company_name
       FROM contacts c
       LEFT JOIN companies co ON co.id = c.company_id
       ORDER BY c.created_at DESC`
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.post('/', contactValidators, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { first_name, last_name, email, phone, company_id } = req.body;
    const [result] = await query(
      'INSERT INTO contacts (first_name, last_name, email, phone, company_id) VALUES (?, ?, ?, ?, ?)',
      [first_name, last_name, email, phone || null, company_id || null]
    );
    const [rows] = await query('SELECT * FROM contacts WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', [param('id').isInt(), ...contactValidators], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { id } = req.params;
    const { first_name, last_name, email, phone, company_id } = req.body;
    const [result] = await query(
      `UPDATE contacts
       SET first_name = ?, last_name = ?, email = ?, phone = ?, company_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [first_name, last_name, email, phone || null, company_id || null, id]
    );
    if (!result.affectedRows) return res.status(404).json({ message: 'Contact not found' });
    const [rows] = await query('SELECT * FROM contacts WHERE id = ?', [id]);
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
    const [result] = await query('DELETE FROM contacts WHERE id = ?', [id]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Contact not found' });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
