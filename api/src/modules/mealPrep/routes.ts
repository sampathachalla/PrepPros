import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import * as controller from './controller.js';

export const mealPrepRoutes = Router();

mealPrepRoutes.use(requireAuth);
mealPrepRoutes.get('/', controller.get);
mealPrepRoutes.patch('/dishes/:id', controller.updateDish);
mealPrepRoutes.put('/shopping', controller.setShoppingCheck);
