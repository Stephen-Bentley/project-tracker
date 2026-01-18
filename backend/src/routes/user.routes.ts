import { Router } from 'express';
import { createUser } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';

const router = Router();

router.post('/', authenticate, requireAdmin, createUser);

export default router;
