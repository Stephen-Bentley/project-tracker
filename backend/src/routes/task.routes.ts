import { Router } from 'express';
import {
  assignUserToTask,
  createTask,
  deleteTask,
  getTaskImage,
  getTasksByProject,
  updateTask,
  uploadTaskImages,
} from '../controllers/task.controller';
import { authenticate } from '../middleware/auth.middleware';
import { taskImageUpload } from '../middleware/upload.middleware';

const router = Router();

router.post('/', authenticate, createTask);
router.get('/project/:projectId', authenticate, getTasksByProject);
// The browser loads image elements without the API authorization header.
router.get('/:taskId/images/:imageId', getTaskImage);
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
router.put('/:taskId', authenticate, updateTask);
router.delete('/:taskId', authenticate, deleteTask);
router.put('/:taskId/assign', authenticate, assignUserToTask);

export default router;
