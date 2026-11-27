const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const app = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
const timeline = app.slice(app.indexOf('    // Sticky story scenes'), app.indexOf('    const hero=root.querySelector("[data-reveal-hero]");'));

function element() {
  return {
    attrs: {},
    handlers: {},
    style: { setProperty(property, value) { this[property] = value; } },
    classList: new Set(),
    setAttribute(key, value) { this.attrs[key] = value; },
    addEventListener(event, handler) { this.handlers[event] = handler; }
  };
}

function fixture({ width = 1440, height = 850, reducedMotion = false } = {}) {
  const buttons = Array.from({ length: 3 }, element);
  const photos = Array.from({ length: 3 }, () => ({ ...element(), complete: true, naturalWidth: 100 }));
  const slides = photos.map(photo => ({ ...element(), querySelector: () => photo }));
  const caption = { ...element(), textContent: 'First description' };
  const wrap = { offsetHeight: 520 };
  const section = {
    ...element(),
    dataset: { storySelector: 'concepts' },
    offset: 1000,
    querySelector: selector => selector === '.wrap' ? wrap : caption,
    querySelectorAll: selector => selector === '.story-panel-slide' ? slides : buttons,
    getBoundingClientRect: () => ({
      top: section.offset - window.scrollY,
      bottom: section.offset - window.scrollY + wrap.offsetHeight
    })
  };
  section.classList.toggle = (name, value) => value ? section.classList.add(name) : section.classList.delete(name);
  const window = { ...element(), scrollY: 0, innerHeight: height, scrollTo(options) { this.lastScroll = options; } };
  const preference = { matches: reducedMotion, addEventListener() {} };
  const root = { querySelector: () => ({ offsetHeight: 76 }), querySelectorAll: () => [section] };
  let scheduled;
  const sync = () => {
    const next = scheduled;
    scheduled = null;
    next?.();
  };
  vm.runInNewContext(timeline, {
    window, root, reduced: preference,
    storyConcepts: ['First description', 'Second description', 'Third description'].map(text => ({ text })),
    signal: new AbortController().signal,
    matchMedia: () => ({ matches: width <= 820 }),
    requestAnimationFrame(callback) { scheduled = callback; return 1; },
    cancelAnimationFrame() {},
    ResizeObserver: class { observe() {} disconnect() {} }
  });
  sync();
  return {
    section, window, buttons, caption, photos, slides, sync,
    scroll(progress) {
      const travel = parseFloat(section.style['--story-scene-height']) - wrap.offsetHeight;
      window.scrollY = section.offset - 76 + progress * travel;
      window.handlers.scroll();
      sync();
    }
  };
}

test('photo, caption and controls advance together and reverse with natural scroll', () => {
  const story = fixture();
  for (const [progress, active, description] of [
    [.26, 1, 'Second description'], [.8, 2, 'Third description'], [.45, 1, 'Second description'], [0, 0, 'First description']
  ]) {
    story.scroll(progress);
    assert.equal(story.slides[active].attrs['aria-hidden'], 'false');
    assert.equal(story.buttons[active].attrs['aria-pressed'], 'true');
    assert.equal(story.caption.textContent, description);
  }
});

test('each frame is composed as an opaque background and a fading foreground', () => {
  const story = fixture();
  story.scroll(.25);
  assert.equal(story.slides[0].style.opacity, '1');
  assert.ok(Math.abs(Number(story.slides[1].style.opacity) - .5) < .00001);
  story.scroll(.22);
  assert.ok(Number(story.slides[1].style.opacity) < .5);
  assert.equal(story.slides[0].style.opacity, '1');
});

test('slow photos preserve the current content and catch up when the image loads', () => {
  const story = fixture();
  const photo = story.photos[1];
  photo.complete = false;
  photo.naturalWidth = 0;
  story.scroll(.5);
  assert.equal(story.slides[0].style.opacity, '1');
  assert.equal(story.caption.textContent, 'First description');
  photo.complete = true;
  photo.naturalWidth = 100;
  photo.handlers.load();
  story.sync();
  assert.equal(story.caption.textContent, 'Second description');
});

test('desktop controls move to the matching point using the current section bounds', () => {
  const story = fixture();
  story.section.offset = 1820;
  story.buttons[2].handlers.click();
  assert.equal(story.caption.textContent, 'Third description');
  assert.ok(Math.abs(story.window.lastScroll.top - (1820 - 76 + 520 * .63)) < .001);
  assert.equal(story.window.lastScroll.behavior, 'smooth');
  story.window.handlers.wheel();
  story.scroll(.5);
  assert.equal(story.caption.textContent, 'Second description');
});

test('short and reduced-motion layouts switch images without moving the page', () => {
  for (const options of [{ height: 500 }, { reducedMotion: true }]) {
    const story = fixture(options);
    assert.equal(story.section.classList.has('is-flowing'), true);
    story.buttons[2].handlers.click();
    assert.equal(story.caption.textContent, 'Third description');
    assert.equal(story.window.lastScroll, undefined);
    story.window.scrollY += 50;
    story.window.handlers.scroll();
    story.sync();
    assert.equal(story.caption.textContent, 'Third description');
  }
});

test('mobile photos advance and reverse with scroll while the scene stays pinned', () => {
  const story = fixture({ width: 390, height: 844 });
  assert.equal(story.section.classList.has('is-flowing'), false);
  for (const [progress, description] of [[.5, 'Second description'], [1, 'Third description'], [0, 'First description']]) {
    story.scroll(progress);
    assert.equal(story.caption.textContent, description);
  }
  story.buttons[2].handlers.click();
  assert.equal(story.window.lastScroll.behavior, 'smooth');
});
