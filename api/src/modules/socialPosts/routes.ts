import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import * as controller from './controller.js';

export const socialPostRoutes = Router();

socialPostRoutes.use(requireAuth);
socialPostRoutes.get('/', controller.list);
socialPostRoutes.get('/:id', controller.getById);
