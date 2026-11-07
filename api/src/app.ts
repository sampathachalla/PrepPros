import express from 'express';
import { prisma } from './config/db.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { authRoutes } from './modules/auth/routes.js';
import { bookmarkRoutes } from './modules/bookmarks/routes.js';
import { calendarRoutes } from './modules/calendar/routes.js';
import { chatRoutes } from './modules/chat/routes.js';
import { householdRoutes } from './modules/household/routes.js';
import { mealPlannerRoutes } from './modules/mealPlanner/routes.js';
import { mealPrepRoutes } from './modules/mealPrep/routes.js';
import { profileRoutes } from './modules/profile/routes.js';
import { recipeRoutes } from './modules/recipes/routes.js';
import { socialPostRoutes } from './modules/socialPosts/routes.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'healthy' });
  });

  app.use('/auth', authRoutes);
  app.use('/profile', profileRoutes);
  app.use(chatRoutes);
  app.use('/recipes', recipeRoutes);
  app.use('/bookmarks', bookmarkRoutes);
  app.use('/social-posts', socialPostRoutes);
  app.use('/household', householdRoutes);
  app.use('/calendar', calendarRoutes);
  app.use('/meal-prep', mealPrepRoutes);
  app.use('/meal-planner', mealPlannerRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
