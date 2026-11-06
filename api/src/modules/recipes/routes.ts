import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import * as controller from './controller.js';

export const recipeRoutes = Router();

recipeRoutes.use(requireAuth);
recipeRoutes.get('/', controller.list);
recipeRoutes.post('/', controller.create);
recipeRoutes.get('/:id', controller.getById);
recipeRoutes.delete('/:id', controller.remove);
recipeRoutes.put('/:id/bookmark', controller.bookmark);
recipeRoutes.delete('/:id/bookmark', controller.unbookmark);
