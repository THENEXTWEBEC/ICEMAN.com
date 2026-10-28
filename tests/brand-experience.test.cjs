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
function planner(people,plan,method){
 const nodes={};
 const root={querySelectorAll:()=>Object.entries({people,plan,method}).map(([choice,value])=>({dataset:{choice,value}})),querySelector:selector=>nodes[selector]??=( {parentElement:{}} )};
 const helpers=app.slice(app.indexOf('  const featuredRecipeSlugs'),app.indexOf('  const categories ='));
 const source=helpers+app.slice(app.indexOf('  function updatePlanner()'),app.indexOf('  function editorialDetail('));
 const sandbox={root,editorial,productBySlug:slug=>catalog.products.find(p=>p.slug===slug),editorialImage:x=>x,withBase:x=>x,editorialPath:r=>'/recetas/'+r.slug,escapeHTML:x=>String(x)};
 vm.runInNewContext(source+';updatePlanner();',sandbox);
 return nodes;
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
test('planner uses actual recipe servings and method for a matching breakfast',()=>{
 const n=planner('1–2','Desayuno','Horno');
 assert.equal(n['#planner-title'].textContent,'Waffles ICEMAN con Franuí y frutos rojos');
 assert.equal(n['#planner-recipe-link'].href,'/recetas/waffles-con-franui-y-frutos-rojos');
 assert.match(n['#planner-products'].innerHTML,/1 porción/);
 assert.equal(n['#planner-match'].textContent,'Una receta que coincide con tus opciones.');
});
test('planner does not invent servings or method for an unavailable match',()=>{
 const n=planner('8+','Desayuno','Sartén');
 assert.match(n['#planner-match'].textContent,/No tenemos una coincidencia exacta/);
 assert.match(n['#planner-match'].textContent,/método/);
 assert.match(n['#planner-match'].textContent,/cantidad de personas/);
 assert.match(n['#planner-products'].innerHTML,/1 porción/);
 assert.doesNotMatch(n['#planner-products'].innerHTML,/8\+/);
});
test('story selections retain the approved descriptions',()=>{
 const descriptions=['Soluciones que hacen más fácil tu día.','Un producto, muchas formas de disfrutarlo.','Sabores que reúnen alrededor de la mesa.','Te acompañamos a ti y a tu familia con soluciones pensadas para las necesidades de cada día.','Buscamos productos y soluciones que abren nuevas posibilidades.','Cuidamos la calidad de todo lo que llevamos hasta ti.'];
 descriptions.forEach(text=>assert.ok(app.includes(text),text));
});
test('every enabled comparison resolves to existing imagery and responsive optical scales',()=>{
 const source=app.slice(app.indexOf('  const dishScenes ='),app.indexOf('  function productScene('));
 const {scenes,scales}=vm.runInNewContext(source+';({scenes:dishScenes,scales:comparisonScales});');
 assert.equal(Object.keys(scenes).length,27);
 assert.deepEqual(Object.keys(scales).sort(),Object.keys(scenes).sort());
 Object.entries(scenes).forEach(([slug,dish])=>{
  const product=catalog.products.find(p=>p.slug===slug); assert.ok(product,slug);
  assert.ok(fs.existsSync(path.join(base,'assets/catalog',product.image+'.webp')));
  assert.ok(fs.existsSync(path.join(base,'assets',dish.image)));
  assert.equal(scales[slug].length,3,slug);
  scales[slug].forEach(scale=>assert.ok(Number.isFinite(scale)&&scale>0,`${slug}: ${scale}`));
 });
});

test('confirmed recipes lead the library without duplicating or dropping others',()=>{
 const helpers=app.slice(app.indexOf('  const featuredRecipeSlugs'),app.indexOf('  const categories ='));
 const ordered=vm.runInNewContext(helpers+';orderedRecipes().map(r=>r.slug)',{editorial});
 assert.deepEqual(Array.from(ordered.slice(0,3)),['picada-para-compartir','hamburguesa-con-papas','papas-rejilla-para-compartir']);
 assert.equal(new Set(ordered).size,editorial.recipes.length);
});
test('recipe imagery never substitutes straight fries for the wavy cut',()=>{
 const helpers=app.slice(app.indexOf('  const featuredRecipeSlugs'),app.indexOf('  const categories ='));
 const visual=vm.runInNewContext(helpers+';recipeVisual(editorial.recipes.find(r=>r.slug==="hamburguesa-con-papas"))',{editorial});
 assert.equal(visual.treatment,'pack');
 assert.equal(visual.image,'papas-ondulado-premium');
});
