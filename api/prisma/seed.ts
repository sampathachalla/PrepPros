import { readFile } from 'node:fs/promises';
import { prisma } from '../src/config/db.js';
import type { Difficulty, RecipeCategory } from '../src/generated/prisma/client.js';

interface CatalogRecipe {
  title: string;
  category: RecipeCategory;
  prepTimeMinutes: number;
  cookTimeMinutes?: number;
  servings: number;
  difficulty: Difficulty;
  imageUrl: string;
  ingredients: { name: string; amount?: string }[];
  steps: string[];
}

/** Loads the shared recipe catalog (recipes without an owner). Skips recipes that already exist by title. */
async function seedCatalog() {
  const catalog: CatalogRecipe[] = JSON.parse(
    await readFile(new URL('./catalog-recipes.json', import.meta.url), 'utf8'),
  );
  const existing = await prisma.recipe.findMany({ where: { ownerId: null }, select: { title: true } });
  const existingTitles = new Set(existing.map((recipe) => recipe.title));

  let created = 0;
  for (const { ingredients, steps, ...recipe } of catalog) {
    if (existingTitles.has(recipe.title)) continue;
    await prisma.recipe.create({
      data: {
        ...recipe,
        ingredients: { create: ingredients.map((ingredient, position) => ({ ...ingredient, position })) },
        steps: { create: steps.map((instruction, index) => ({ instruction, stepNumber: index + 1 })) },
      },
    });
    created++;
  }
  console.log(`Catalog recipes: ${created} created, ${catalog.length - created} already present`);
}

seedCatalog()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
