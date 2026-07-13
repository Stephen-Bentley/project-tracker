import { Router } from 'express';
import {
  createProject,
  getMyProjects,
  addUserToProject,
  removeUserFromProject,
  getProjectById,
  updateProjectMembers,
  getAllProjects,
} from '../controllers/project.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';

const router = Router();

router.post('/', authenticate, requireAdmin, createProject);
router.get('/mine', authenticate, getMyProjects);

router.post('/:projectId/users', authenticate, requireAdmin, addUserToProject);

router.delete(
  '/:projectId/users/:userId',
  authenticate,
  requireAdmin,
  removeUserFromProject
);

router.put('/:projectId/members', authenticate, updateProjectMembers);

router.get('/:projectId', authenticate, getProjectById);

router.get('/', authenticate, getAllProjects);

export default router;
