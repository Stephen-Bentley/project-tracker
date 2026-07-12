import { Router } from 'express';
import {
  changeCurrentUserPassword,
  createUser,
  getCurrentUser,
  getUsers,
  updateCurrentUser,
} from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';

const router = Router();

router
  .route('/me')
  .get(authenticate, getCurrentUser)
  .put(authenticate, updateCurrentUser);

router.put('/me/password', authenticate, changeCurrentUserPassword);

router
  .route('/')
  .get(authenticate, requireAdmin, getUsers)
  .post(authenticate, requireAdmin, createUser);

export default router;
