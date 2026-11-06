import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import * as controller from './controller.js';

export const calendarRoutes = Router();

calendarRoutes.use(requireAuth);
calendarRoutes.get('/', controller.get);
calendarRoutes.get('/dish-options', controller.dishOptions);
calendarRoutes.post('/dishes', controller.addDish);
calendarRoutes.delete('/dishes/:id', controller.removeDish);
calendarRoutes.post('/dishes/:id/accept', controller.accept);
calendarRoutes.delete('/dishes/:id/accept', controller.withdraw);
calendarRoutes.post('/dishes/:id/decision', controller.decide);
calendarRoutes.post('/timer', controller.startTimer);
calendarRoutes.post('/days/:date/fix', controller.fixDay);
