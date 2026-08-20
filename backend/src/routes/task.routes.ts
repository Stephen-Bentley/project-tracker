import { Router } from 'express';
import {
  assignUserToTask,
  createTask,
  deleteTask,
  getTaskImage,
  getTasksByProject,
  updateTask,
  uploadTaskImages,
  addTaskComment,
} from '../controllers/task.controller';
import { authenticate } from '../middleware/auth.middleware';
import { taskImageUpload } from '../middleware/upload.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  createTaskCommentSchema,
  createTaskSchema,
  updateTaskSchema,
} from '../validators/task.validator';

const router = Router();

router.post('/', authenticate, validate(createTaskSchema), createTask);
router.get('/project/:projectId', authenticate, getTasksByProject);
// The browser loads image elements without the API authorization header.
router.get('/:taskId/images/:imageId', authenticate, getTaskImage);
router.post(
  '/:taskId/images',
  authenticate,
  (req, res, next) => {
    taskImageUpload.array('images', 3)(req, res, (error) => {
      if (error) return res.status(400).json({ message: error.message });
      next();
    });
  },
  uploadTaskImages
);
router.put('/:taskId', authenticate, validate(updateTaskSchema), updateTask);
router.post(
  '/:taskId/comments',
  authenticate,
  validate(createTaskCommentSchema),
  addTaskComment
);
router.delete('/:taskId', authenticate, deleteTask);
router.put('/:taskId/assign', authenticate, assignUserToTask);

export default router;
