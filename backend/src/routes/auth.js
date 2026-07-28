import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { findUserByEmail, signToken } from '../middleware/auth.js';

const router = Router();

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const user = findUserByEmail(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = signToken(user);
  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
});

router.post('/guest', (_req, res) => {
  const token = signToken({
    id: 'guest',
    email: 'guest@campus.edu',
    name: 'Guest',
    role: 'student',
  });
  res.json({
    token,
    user: { id: 'guest', email: 'guest@campus.edu', name: 'Guest', role: 'student' },
  });
});

export default router;
