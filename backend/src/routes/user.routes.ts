import { Router } from 'express';
import { createUser, getUsers } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';

const router = Router();

router
  .route('/')
  .get(authenticate, requireAdmin, getUsers)
  .post(authenticate, requireAdmin, createUser);

export default router;
