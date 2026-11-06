import type { BookmarkCategory, SocialPost } from '../../generated/prisma/client.js';
import { postAuthor, postTitle } from './preview.js';

const MAX_INGREDIENTS = 40;
const MAX_INGREDIENT_LENGTH = 200;
const MAX_NOTES_LENGTH = 2000;

/** Checked in order: the most specific kinds of meal come first. */
const CATEGORY_RULES: [BookmarkCategory, RegExp][] = [
  ['dessert', /\b(dessert|brownies?|cookies?|cheesecake|cake|ice cream)\b/i],
  ['breakfast', /\b(breakfast|pancakes?|overnight oats|omelett?e|french toast)\b/i],
  ['high_protein', /\b(high[\s-]?protein|\d+\s?g(rams)?\s+(of\s+)?protein)\b/i],
  ['vegetarian', /\b(vegetarian|vegan|plant[\s-]?based)\b/i],
  ['snacks', /\b(snacks?)\b/i],
  ['lunch_dinner', /\b(lunch|dinner|meal[\s-]?prep|burrito bowls?|pasta)\b/i],
  ['quick_prep', /\b(quick|\d+[\s-]minute)\b/i],
];

/** "Ingredients", "Ingredients (serves 2)", "Ingredients for 4:", or inline "Ingredients: a, b, c". */
const INGREDIENTS_HEADING = /^\W*ingredients?\b(?:\s*\([^)]*\)|\s+for\b[^:]*)?\s*(?:[:–—-]\s*(.*))?$/iu;
/** A named group within the list, e.g. "To serve", found after a blank line. */
const INGREDIENT_GROUP = /^\W*(to serve|to garnish|for (the|serving)\b|sauce|marinade|dressing|topping)/i;
const NEXT_SECTION = /^\W*(instructions?|directions?|method|steps?|how to|macros?|nutrition|preparation)\b/i;
const LEADING_BULLET = /^[^\p{L}\p{N}]+/u;

function findCategory(text: string): BookmarkCategory | undefined {
  return CATEGORY_RULES.find(([, pattern]) => pattern.test(text))?.[0];
}

function cleanIngredient(line: string): string {
  return line.replace(LEADING_BULLET, '').trim().slice(0, MAX_INGREDIENT_LENGTH);
}

/** The list under an "Ingredients" heading, or an inline "Ingredients: a, b, c". */
export function findIngredients(text: string): string[] {
  const lines = text.split('\n').map((line) => line.trim());
  const heading = lines.findIndex((line) => INGREDIENTS_HEADING.test(line));
  if (heading < 0) return [];

  const inline = lines[heading].match(INGREDIENTS_HEADING)?.[1]?.trim();
  if (inline) {
    return inline.split(/,|;/).map(cleanIngredient).filter(Boolean).slice(0, MAX_INGREDIENTS);
  }

  const items: string[] = [];
  let afterBlank = false;
  for (const line of lines.slice(heading + 1)) {
    if (!line) {
      afterBlank = true; // a blank line ends the list unless a named group follows it
      continue;
    }
    if (NEXT_SECTION.test(line) || line.startsWith('#')) break;
    if (afterBlank && items.length > 0) {
      if (!INGREDIENT_GROUP.test(line)) break;
      afterBlank = false;
      continue;
    }
    afterBlank = false;
    const item = cleanIngredient(line);
    if (item) items.push(item);
    if (items.length === MAX_INGREDIENTS) break;
  }
  return items;
}

const minutesAfter = (text: string, label: string) => {
  const match = text.match(new RegExp(`\\b(?:${label})\\s*:?\\s*(\\d{1,3})\\s*(?:min|mins|minutes)\\b`, 'i'));
  return match ? Number(match[1]) : undefined;
};

/**
 * Recipe details a creator wrote into a caption or description. Captions are free text, so only details
 * they state outright are taken; anything else stays empty rather than guessed.
 */
export function bookmarkDetailsFromPost(post: SocialPost) {
  const caption = post.caption ?? '';
  const searchable = [post.title, caption, post.hashtags.map((tag) => tag.replace(/_/g, ' ')).join(' ')]
    .filter(Boolean)
    .join('\n');
  const servings = caption.match(/\b(?:serves|servings?\s*:?|makes)\s*:?\s*(\d{1,2})\b/i)?.[1];

  return {
    title: postTitle(post).slice(0, 150),
    author: postAuthor(post).slice(0, 100),
    category: findCategory(searchable) ?? null,
    ...(post.thumbnailUrl ? { thumbnailUrl: post.thumbnailUrl } : {}),
    prepTimeMinutes: minutesAfter(caption, 'prep(?:\\s*time)?|total(?:\\s*time)?|ready in|takes(?:\\s+(?:around|about))?') ?? null,
    cookTimeMinutes: minutesAfter(caption, 'cook(?:ing)?(?:\\s*time)?') ?? null,
    servings: servings && Number(servings) > 0 ? Number(servings) : null,
    ingredients: findIngredients(caption),
    notes: caption ? caption.slice(0, MAX_NOTES_LENGTH) : null,
  };
}
