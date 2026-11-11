const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const base = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(base, 'app.js'), 'utf8');
const motion = fs.readFileSync(path.join(base, 'motion-experience.js'), 'utf8');
const html = fs.readFileSync(path.join(base, 'index.html'), 'utf8');
const builder = fs.readFileSync(path.join(base, 'scripts/build_site.py'), 'utf8');

test('initial hero retains responsive critical image with high fetch priority', () => {
  assert.match(app, /golden-fries-alpine-480\.webp 480w/);
  assert.match(app, /golden-fries-alpine-1672\.webp 1672w/);
  assert.match(app, /sizes="100vw"/);
  assert.match(app, /Papas doradas flotando[\s\S]*fetchpriority="high"/);
  assert.match(html, /heroPreload\.fetchPriority = "high"/);
});

test('below-the-fold categories use low-priority lazy images', () => {
  assert.match(app, /reference-category-pack-\$\{packIndex \+ 1\}" src="\$\{src\}"\$\{responsive\} alt="" loading="lazy" fetchpriority="low"/);
  assert.doesNotMatch(app, /loading="\$\{index < 3 \? "eager" : "lazy"\}"/);
});

test('generated cutouts and PNG fallbacks keep mobile layout intact', () => {
  assert.match(app, /const productionImage = /);
  assert.match(app, /dataset\.icemanOptimized === "true"/);
  for (const file of [
    'mix-jardinera-450-clean.png',
    'papas-rejilla-clean.png',
    'smoothie-red-clean.png',
    'waffle-clean.png',
  ]) {
    assert.ok(app.includes(file), `source reference stays intact: ${file}`);
  }
  assert.match(app, /responsiveImageAttrs\(packSrc,imageSizes\)/);
  assert.match(builder, /Preserve the alpha channel/);
  assert.match(builder, /convert\("RGBA"\)/);
});

test('mobile no longer schedules perpetual floating-category animation', () => {
  assert.match(motion, /if \(!categoryVisible \|\| reduced\.matches \|\| innerWidth < 821\) return/);
  assert.match(motion, /categoryVisible && innerWidth >= 821/);
  assert.match(motion, /addEventListener\("resize", syncCategoryMotion/);
  assert.match(motion, /cancelAnimationFrame\(categoryFrame\)/);
});

test('production pipeline builds bundled CSS and responsive assets', () => {
  assert.match(builder, /iceman\.bundle\.css/);
  assert.match(builder, /\(320, 640, 960\)/);
  assert.match(builder, /\(480, 768, 960\)/);
  assert.match(builder, /fingerprint_scripts/);
  assert.match(builder, /data-iceman-optimized/);
});
