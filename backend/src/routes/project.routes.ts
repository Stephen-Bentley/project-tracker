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
import { validate } from '../middleware/validate.middleware';
import {
  createProjectSchema,
  addMemberSchema,
  removeMemberSchema,
  updateMembersSchema,
} from '../validators/project.validator';

const router = Router();

router.post(
  '/',
  authenticate,
  requireAdmin,
  validate(createProjectSchema),
  createProject
);
router.get('/mine', authenticate, getMyProjects);

router.post(
  '/:projectId/users',
  authenticate,
  requireAdmin,
  validate(addMemberSchema),
  addUserToProject
);

router.delete(
  '/:projectId/users/:userId',
  authenticate,
  requireAdmin,
  validate(removeMemberSchema),
  removeUserFromProject
);

router.put(
  '/:projectId/members',
  authenticate,
  validate(updateMembersSchema),
  updateProjectMembers
);

router.get('/:projectId', authenticate, getProjectById);

router.get('/', authenticate, getAllProjects);

export default router;
