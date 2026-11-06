import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import * as controller from './controller.js';

export const profileRoutes = Router();

profileRoutes.use(requireAuth);
profileRoutes.get('/', controller.get);
profileRoutes.patch('/', controller.update);
profileRoutes.patch('/preferences', controller.updatePreferences);
