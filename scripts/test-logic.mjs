// Tests for the pure logic modules (ingredient parsing, grocery merge, recipe import).
// The app source uses extension-less imports (Metro style), so we copy the modules to a
// temp folder with .mjs extensions and import them from there.
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = mkdtempSync(join(tmpdir(), 'forkcast-test-'));
const files = ['src/lib/ingredients.js', 'src/lib/importer.js', 'src/lib/dates.js', 'src/data/seed.js'];
for (const f of files) {
  const src = readFileSync(join(root, f), 'utf8').replace(/from '(\.{1,2}\/[^']+)'/g, "from '$1.mjs'");
  const dest = join(out, f.replace(/\.js$/, '.mjs'));
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, src);
}
const ing = await import(join(out, 'src/lib/ingredients.mjs'));
const imp = await import(join(out, 'src/lib/importer.mjs'));
const { seedRecipes } = await import(join(out, 'src/data/seed.mjs'));

let passed = 0;
const test = (name, fn) => {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
};

test('parses mixed fractions and units', () => {
  const p = ing.parseIngredient('2 1/2 cups all-purpose flour, sifted');
  assert.equal(p.qty, 2.5);
  assert.equal(p.unit, 'cup');
  assert.equal(p.name, 'all-purpose flour, sifted');
});
test('parses unicode fractions and glued units', () => {
  assert.equal(ing.parseIngredient('1½ tsp salt').qty, 1.5);
  const g = ing.parseIngredient('200g spaghetti');
  assert.deepEqual([g.qty, g.unit, g.name], [200, 'g', 'spaghetti']);
});
test('parses "a pinch of" and ranges', () => {
  const p = ing.parseIngredient('a pinch of nutmeg');
  assert.deepEqual([p.qty, p.unit, p.name], [1, 'pinch', 'nutmeg']);
  const r = ing.parseIngredient('1-2 tbsp honey');
  assert.deepEqual([r.qty, r.qtyMax], [1, 2]);
});
test('scales and formats nicely', () => {
  assert.equal(ing.formatIngredient(ing.parseIngredient('1/3 cup olive oil'), 2), '⅔ cup olive oil');
  assert.equal(ing.formatIngredient(ing.parseIngredient('3 cloves garlic'), 2), '6 cloves garlic');
  assert.equal(ing.formatIngredient(ing.parseIngredient('Salt to taste'), 3), 'Salt to taste');
});
test('sorts into aisles', () => {
  assert.equal(ing.aisleFor('garlic, minced'), 'Produce');
  assert.equal(ing.aisleFor('black pepper'), 'Spices & Seasoning');
  assert.equal(ing.aisleFor('red bell pepper'), 'Produce');
  assert.equal(ing.aisleFor('peanut butter'), 'Pantry');
  assert.equal(ing.aisleFor('chicken thighs'), 'Meat & Seafood');
  assert.equal(ing.aisleFor('heavy cream'), 'Dairy & Eggs');
});
test('merges duplicate ingredients across recipes', () => {
  const recipes = seedRecipes();
  const merged = ing.mergeIngredients(
    recipes.flatMap((r) => r.ingredients.map((ingredient) => ({ ingredient, factor: 1, recipeTitle: r.title }))),
  );
  const garlic = merged.find((m) => m.name === 'Garlic' && m.unit === 'clove');
  assert.ok(garlic, 'garlic merged');
  assert.equal(garlic.qty, 16);
  assert.equal(garlic.sources.length, 4);
});
test('extracts schema.org recipes (with @graph and HowToSection)', () => {
  const html = `<script type="application/ld+json">{"@graph":[{"@type":"WebPage"},{"@type":["Recipe"],"name":"Best &amp; Easy Brownies","recipeYield":["16"],"totalTime":"PT1H5M","image":[{"url":"https://x/img.jpg"}],"recipeIngredient":["1 cup butter","2 cups sugar","4 eggs"],"recipeInstructions":[{"@type":"HowToSection","itemListElement":[{"@type":"HowToStep","text":"Melt butter."},{"@type":"HowToStep","text":"Whisk in sugar."}]}]}]}</script>`;
  const r = imp.extractJsonLdRecipe(html, 'https://www.example.com/brownies');
  assert.equal(r.title, 'Best & Easy Brownies');
  assert.equal(r.servings, 16);
  assert.equal(r.totalMinutes, 65);
  assert.equal(r.image, 'https://x/img.jpg');
  assert.deepEqual(r.steps, ['Melt butter.', 'Whisk in sugar.']);
  assert.equal(r.sourceName, 'example.com');
});
test('parses a social caption without AI', () => {
  const r = imp.parseRecipeText(
    'Creamy Gnocchi 🤤\nIngredients:\n- 1 lb gnocchi\n- 2 tbsp butter\n- 1 cup cream\nMethod:\n1. Fry gnocchi in butter.\n2. Add cream and simmer.\n#dinner #pasta',
  );
  assert.equal(r.title, 'Creamy Gnocchi 🤤');
  assert.equal(r.ingredients.length, 3);
  assert.deepEqual(r.steps, ['Fry gnocchi in butter.', 'Add cream and simmer.']);
});
test('guesses structure when there are no headers', () => {
  const r = imp.parseRecipeText('Quick Hummus\n1 can chickpeas\n2 tbsp tahini\n1 lemon, juiced\nBlend everything with a splash of water until smooth.');
  assert.equal(r.title, 'Quick Hummus');
  assert.equal(r.ingredients.length, 3);
  assert.equal(r.steps.length, 1);
});

console.log(`\n${passed} tests passed`);
