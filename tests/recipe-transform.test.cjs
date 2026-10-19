const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const project = path.join(__dirname, '..');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(project, 'catalog.js'), 'utf8'), context);
vm.runInNewContext(fs.readFileSync(path.join(project, 'editorial-data.js'), 'utf8'), context);

test('every recipe has a real catalogue packshot and a prepared-dish WebP', () => {
  const products = new Map(context.window.ICEMAN_CATALOG.products.map(product => [product.slug, product]));
  const recipes = context.window.ICEMAN_EDITORIAL.recipes;
  assert.equal(recipes.length, 10);
  for (const recipe of recipes) {
    const product = products.get(recipe.products[0]);
    assert.ok(product, `${recipe.slug} must reference a catalogue product`);
    assert.equal(recipe.image.startsWith('editorial/'), true, `${recipe.slug} must use editorial food photography`);
    assert.equal(fs.existsSync(path.join(project, 'assets', `${recipe.image}`)), true, `${recipe.slug} dish image must exist`);
    assert.equal(fs.existsSync(path.join(project, 'assets', 'catalog', `${product.image}.webp`)), true, `${recipe.slug} packshot must exist`);
  }
});

test('recipe transformation exposes independent interaction and accessibility states', () => {
  const app = fs.readFileSync(path.join(project, 'app.js'), 'utf8');
  const css = fs.readFileSync(path.join(project, 'styles.css'), 'utf8');
  assert.match(app, /type="button" data-recipe-transform aria-pressed="false"/);
  assert.match(app, /setupRecipeTransforms\(\)/);
  assert.match(app, /IntersectionObserver/);
  assert.match(css, /650ms cubic-bezier\(\.22,1,\.36,1\)/);
  assert.match(css, /@media\(hover:none\),\(pointer:coarse\)/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\).*editorial-recipe-media/s);
  assert.match(css, /editorial-recipe-media:focus-visible/);
});
