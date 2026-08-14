import { Router } from 'express';
import {
  changeCurrentUserPassword,
  createUser,
  getCurrentUser,
  getUserAvatar,
  getUsers,
  uploadCurrentUserAvatar,
  updateCurrentUser,
} from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';
import { avatarUpload } from '../middleware/upload.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  createUserSchema,
  updateCurrentUserSchema,
  changePasswordSchema,
} from '../validators/user.validator';

const router = Router();

router
  .route('/me')
  .get(authenticate, getCurrentUser)
  .put(authenticate, validate(updateCurrentUserSchema), updateCurrentUser);

router.put('/me/password', authenticate, validate(changePasswordSchema), changeCurrentUserPassword);

// Avatar images are public so browsers can render them in an <img> element.
router.get('/:userId/avatar', getUserAvatar);

router.post(
  '/me/avatar',
  authenticate,
  (req, res, next) => {
    avatarUpload.single('avatar')(req, res, (error) => {
      if (error) {
        return res.status(400).json({ message: error.message });
      }
      next();
    });
  },
  uploadCurrentUserAvatar
);

router
  .route('/')
  .get(authenticate, requireAdmin, getUsers)
  .post(authenticate, requireAdmin, validate(createUserSchema), createUser);

export default router;
