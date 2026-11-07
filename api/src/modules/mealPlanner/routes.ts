import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import * as controller from './controller.js';

export const mealPlannerRoutes = Router();

mealPlannerRoutes.use(requireAuth);

mealPlannerRoutes.get('/dishes', controller.getDishes);
mealPlannerRoutes.get('/weeks/:weekStart', controller.getWeek);
mealPlannerRoutes.post('/weeks/:weekStart/dish-selections', controller.saveDishSelections);
mealPlannerRoutes.put('/slots/:date/:meal/choice', controller.setSlotChoice);
mealPlannerRoutes.post('/weeks/:weekStart/submit', controller.submitWeek);
mealPlannerRoutes.put('/weeks/:weekStart/slot-policies', controller.updateSlotPolicies);
mealPlannerRoutes.post('/weeks/:weekStart/bulk-assign', controller.bulkAssign);
mealPlannerRoutes.put('/slots/:date/:meal/draft', controller.updateSlotDraft);
mealPlannerRoutes.post('/weeks/:weekStart/publish', controller.publishWeek);
