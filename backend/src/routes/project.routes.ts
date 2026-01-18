import { Router } from 'express';
import {
  createProject,
  getMyProjects,
  addUserToProject,
  removeUserFromProject
} from '../controllers/project.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';

const router = Router();

router.post('/', authenticate, requireAdmin, createProject);
router.get('/', authenticate, getMyProjects);

router.post(
  '/:projectId/users',
  authenticate,
  requireAdmin,
  addUserToProject
);

router.delete(
  '/:projectId/users/:userId',
  authenticate,
  requireAdmin,
  removeUserFromProject
);

export default router;
