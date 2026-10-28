const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const project = path.join(__dirname, '..');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(project, 'catalog.js'), 'utf8'), context);
vm.runInNewContext(fs.readFileSync(path.join(project, 'editorial-data.js'), 'utf8'), context);

test('five approved recipes use supplied dish photos and their exact catalog products', () => {
  const products = new Map(context.window.ICEMAN_CATALOG.products.map(product => [product.slug, product]));
  const recipes = context.window.ICEMAN_EDITORIAL.recipes;
  assert.equal(recipes.length, 5);
  for (const recipe of recipes) {
    const product = products.get(recipe.products[0]);
    assert.ok(product, `${recipe.slug} must reference a catalogue product`);
    assert.equal(recipe.image.startsWith('editorial/'), true, `${recipe.slug} must use an editorial photo`);
    assert.equal(recipe.image.endsWith('.webp'), true, `${recipe.slug} should use an optimized photo`);
    assert.equal(fs.existsSync(path.join(project, 'assets', recipe.image)), true, `${recipe.slug} dish image must exist`);
    assert.equal(fs.existsSync(path.join(project, 'assets', 'catalog', `${product.image}.webp`)), true, `${recipe.slug} packshot must exist`);
  }
});

test('recipe product selection begins empty and supports keyboard and touch buttons', () => {
  const app = fs.readFileSync(path.join(project, 'app.js'), 'utf8');
  const css = fs.readFileSync(path.join(project, 'recipe-experience.css'), 'utf8');
  assert.match(app, /data-recipe-select=/);
  assert.match(app, /aria-pressed="false" aria-controls="recipe-feature-panel"/);
  assert.match(app, /recipeFeaturePanel\(recipe\)/);
  assert.match(app, /data-recipe-back/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css, /touch-action:manipulation/);
  assert.match(app, /IntersectionObserver/);
});

test('choosing a package renders its matching recipe with complete ingredients and steps', () => {
  const app = fs.readFileSync(path.join(project, 'app.js'), 'utf8');
  const start = app.indexOf('  function recipeProductChoices()');
  const end = app.indexOf('  function editorialPage(path)', start);
  const source = app.slice(start, end);
  const products = context.window.ICEMAN_CATALOG.products;
  const sandbox = {
    editorial: context.window.ICEMAN_EDITORIAL,
    productBySlug: slug => products.find(product => product.slug === slug),
    recipeVisual: recipe => ({ image:recipe.heroImage || recipe.image, alt:recipe.heroAlt || recipe.title, treatment:'dish' }),
    escapeHTML: value => String(value),
    editorialImage: value => `/assets/${value}`,
    asset: value => `/assets/catalog/${value}.webp`,
    editorialPath: recipe => `/recetas/${recipe.slug}`,
    iconArrow: () => '→'
  };
  vm.runInNewContext(source, sandbox);
  for (const recipe of sandbox.editorial.recipes) {
    const html = sandbox.recipeFeaturePanel(recipe);
    assert.ok(html.includes(`<h2>${recipe.title}</h2>`), recipe.slug);
    assert.ok(html.includes(`/assets/${recipe.image}`), recipe.slug);
    for (const ingredient of recipe.ingredients) assert.ok(html.includes(ingredient), `${recipe.slug}: ${ingredient}`);
    for (const step of recipe.steps) assert.ok(html.includes(step), `${recipe.slug}: ${step}`);
  }
});
