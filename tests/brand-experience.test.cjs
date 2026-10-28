const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const base = path.join(__dirname,'..');
const app = fs.readFileSync(path.join(base,'app.js'),'utf8');
const brandStyles = fs.readFileSync(path.join(base,'brand-experience.css'),'utf8');
const context = {window:{}};
vm.createContext(context);
for(const file of ['catalog.js','editorial-data.js']) vm.runInContext(fs.readFileSync(path.join(base,file),'utf8'),context);
const catalog=context.window.ICEMAN_CATALOG, editorial=context.window.ICEMAN_EDITORIAL;
function recipeModel(){
 const helpers=app.slice(app.indexOf('  function orderedRecipes()'),app.indexOf('  const categories ='));
 return vm.runInNewContext(helpers+';orderedRecipes().map(r=>r.slug)',{editorial});
}
test('Air Fryer is in Papas and no longer a separate category',()=>{
 assert.equal(catalog.products.find(p=>p.slug==='papas-air-fryer').category,'papas');
 assert.ok(!catalog.categories.some(c=>c.slug==='air-fryer'));
});
test('compact navbar menu can render open at every viewport width',()=>{
 assert.match(brandStyles,/\.site-header \.mobile-panel\{[^}]*display:flex/);
 assert.match(brandStyles,/\.site-header \.mobile-panel\.open\{[^}]*visibility:visible[^}]*pointer-events:auto/);
 assert.match(app,/menu\.classList\.toggle\("open", menuOpened\)/);
});
test('only the five client-approved recipes are in the recipe collection',()=>{
 assert.deepEqual(Array.from(recipeModel()),[
  'brochetas-carne-papas-rejilla-chimichurri',
  'carne-plancha-papas-onduladas-salsa-ajo',
  'pollo-hierbas-aros-cebolla-ensalada-repollo',
  'waffles-iceman-franui-frutos-rojos',
  'bowl-salmon-teriyaki-edamame-mayonesa-picante'
 ]);
});
test('recipe selector starts empty and allows selection through button controls',()=>{
 assert.match(app,/data-recipe-explorer/);
 assert.match(app,/aria-pressed="false" aria-controls="recipe-feature-panel"/);
 assert.match(app,/Selecciona un empaque para ver la receta/);
 assert.match(app,/function recipeFeaturePanel\(recipe\)/);
 assert.match(app,/IntersectionObserver/);
});
test('home categories render as a six-card catalog grid with working routes',()=>{
 assert.deepEqual(Array.from(catalog.categories,category=>category.name),['Papas','Vegetales','Especialidades','Smoothies','Helados','Waffles']);
 assert.match(app,/home-category-grid/);
 assert.match(app,/href="\/productos\/\$\{category\.slug\}/);
 assert.match(app,/class="home-category-cta">Explorar/);
});
test('sitemap lists the five recipe pages',()=>{
 const sitemap=fs.readFileSync(path.join(base,'sitemap.xml'),'utf8');
 const paths=[...sitemap.matchAll(/https:\/\/icemanec\.com\/recetas\/([^<]+)/g)].map(match=>match[1]);
 const recipes=editorial.recipes.map(recipe=>recipe.slug);
 recipes.forEach(slug=>assert.ok(paths.includes(slug),slug));
 assert.equal(paths.filter(slug=>recipes.includes(slug)).length,5);
});
test('story selections retain the approved descriptions',()=>{
 const descriptions=['Soluciones que hacen más fácil tu día.','Un producto, muchas formas de disfrutarlo.','Sabores que reúnen alrededor de la mesa.','Te acompañamos a ti y a tu familia con soluciones pensadas para las necesidades de cada día.','Buscamos productos y soluciones que abren nuevas posibilidades.','Cuidamos la calidad de todo lo que llevamos hasta ti.'];
 descriptions.forEach(text=>assert.ok(app.includes(text),text));
});
test('about sections use distinct, context-specific images',()=>{
 const source=app.slice(app.indexOf('  const floatingPackSets ='),app.indexOf('  function storySelector('));
 const {floatingPackSets,storyVisuals,storyConcepts,storyValues}=vm.runInNewContext(source+';({floatingPackSets,storyVisuals,storyConcepts,storyValues});');
 const images=[storyVisuals.hero.image,storyVisuals.history.image,...storyVisuals.purpose.map(item=>item.image),...storyConcepts.map(item=>item.image),...storyValues.map(item=>item.image)];
 assert.equal(new Set(images).size,images.length);
 images.forEach(image=>assert.ok(fs.existsSync(path.join(base,'assets',image)),image));
 const packs=[...floatingPackSets.default,...floatingPackSets.closing];
 assert.equal(new Set(packs).size,packs.length);
 packs.forEach(image=>assert.ok(fs.existsSync(path.join(base,'assets/catalog',`${image}.webp`)),image));
});
test('editorial imagery is unique and matches the subject of corrected sections',()=>{
 const entries=[...editorial.recipes,...editorial.articles,...editorial.occasions,...editorial.business];
 assert.equal(new Set(entries.map(item=>item.image)).size,entries.length);
 const image=(group,slug)=>editorial[group].find(item=>item.slug===slug).image;
 assert.equal(image('articles','zanahoria-para-una-buena-receta'),'editorial/03-zanahoria-receta.webp');
 assert.equal(image('articles','test-rapido-que-prefieres'),'editorial/08-test-preferencias.webp');
 assert.equal(image('articles','cadena-de-frio'),'editorial/advice-store-frozen-products.webp');
 assert.equal(image('business','elegir-congelados-restaurante'),'editorial/business-choose-restaurant.webp');
 assert.equal(image('business','organizar-cadena-de-frio'),'editorial/business-cold-chain.webp');
 assert.equal(image('business','simplificar-preparacion-menu'),'editorial/business-simplify-menu.webp');
 assert.match(app,/home-business-image[^<]*><img src="\$\{projectBase\}\/assets\/editorial\/business-choose-restaurant\.webp"/);
});
test('every enabled comparison resolves to existing imagery and responsive optical scales',()=>{
 const source=app.slice(app.indexOf('  const dishScenes ='),app.indexOf('  function productScene('));
 const {scenes,scales}=vm.runInNewContext(source+';({scenes:dishScenes,scales:comparisonScales});');
 assert.equal(Object.keys(scenes).length,27);
 assert.deepEqual(Object.keys(scales).sort(),Object.keys(scenes).sort());
 assert.equal(scenes['edamame-vaina'].version,'full-plate-20261028');
 assert.equal(scenes['edamame-vaina'].source,undefined);
 assert.deepEqual(Array.from(scales['yuca-500']),[.71,.71,.71]);
 assert.deepEqual(Array.from(scales['zanahoria-ondulada']),[.71,.71,.71]);
 assert.deepEqual(Array.from(scales['hash-brown']),[.66,.66,.66]);
 assert.deepEqual(Array.from(scales['aros-de-cebolla']),[.65,.65,.65]);
 assert.deepEqual(Array.from(scales['croqueta-de-yuca']),[.75,.75,.75]);
 Object.entries(scenes).forEach(([slug,dish])=>{
  const product=catalog.products.find(p=>p.slug===slug); assert.ok(product,slug);
  assert.ok(fs.existsSync(path.join(base,'assets/catalog',product.image+'.webp')));
  assert.ok(fs.existsSync(path.join(base,'assets',dish.image)));
  assert.equal(scales[slug].length,3,slug);
  scales[slug].forEach(scale=>assert.ok(Number.isFinite(scale)&&scale>0,`${slug}: ${scale}`));
 });
});

test('recipe photos and product links match the approved recipes',()=>{
 const helpers=app.slice(app.indexOf('  function orderedRecipes()'),app.indexOf('  const categories ='));
 const visuals=vm.runInNewContext(helpers+';editorial.recipes.map(r=>({slug:r.slug,visual:recipeVisual(r)}))',{editorial});
 assert.equal(visuals.length,5);
 visuals.forEach(({slug,visual})=>{
  const recipe=editorial.recipes.find(item=>item.slug===slug);
  assert.equal(visual.image,recipe.image);
  assert.equal(visual.treatment,'dish');
  assert.ok(fs.existsSync(path.join(base,'assets',recipe.image)));
  assert.ok(catalog.products.some(product=>product.slug===recipe.products[0]));
 });
});
