/* One motion controller per rendered route. All effects are progressive enhancements. */
(() => {
  let cleanup = () => {};
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
  const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));

  function mount(root) {
    cleanup();
    if (reduced.matches) return;
    const controller = new AbortController();
    const { signal } = controller;
    const staged = [...root.querySelectorAll(".home-categories,.home-showcase,.home-recipes,.home-stockists,.home-business,.home-contact,.editorial-card,.business-page")];
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("scene-visible");
        observer.unobserve(entry.target);
      }
    }, { threshold:0.12, rootMargin:"0px 0px -5% 0px" });
    staged.forEach((element) => { element.classList.add("scene-ready"); observer.observe(element); });

    const hero = root.querySelector(".home-hero");
    const heroJourney = root.querySelector("[data-hero-journey]");
    const depthLayers = hero ? [...hero.querySelectorAll("[data-pointer-depth]")] : [];
    let pointerFrame = 0;
    let pointerX = 0;
    let pointerY = 0;
    if (hero && finePointer.matches) {
      hero.addEventListener("pointermove", (event) => {
        const box = hero.getBoundingClientRect();
        pointerX = (event.clientX - box.left) / box.width - .5;
        pointerY = (event.clientY - box.top) / box.height - .5;
        if (pointerFrame) return;
        pointerFrame = requestAnimationFrame(() => {
          depthLayers.forEach((layer) => {
            const depth = Number(layer.dataset.pointerDepth);
            layer.style.setProperty("--pointer-x", `${(pointerX * depth).toFixed(2)}px`);
            layer.style.setProperty("--pointer-y", `${(pointerY * depth).toFixed(2)}px`);
          });
          pointerFrame = 0;
        });
      }, { passive:true, signal });
      hero.addEventListener("pointerleave", () => {
        depthLayers.forEach((layer) => { layer.style.setProperty("--pointer-x", "0px"); layer.style.setProperty("--pointer-y", "0px"); });
      }, { signal });
    }

    const categoryScene = root.querySelector(".home-categories");
    const categoryField = categoryScene?.querySelector("[data-category-universe]");
    const categoryItems = categoryField ? [...categoryField.querySelectorAll(".home-category")] : [];
    const floatProfiles = [
      { phase:.2, speed:.62, x:22, y:28, rx:3.2, ry:5.8, rz:2.4, depth:.82 },
      { phase:1.7, speed:.51, x:30, y:22, rx:4.4, ry:7.2, rz:2.8, depth:1.18 },
      { phase:3.1, speed:.71, x:18, y:34, rx:3.8, ry:5.1, rz:3.1, depth:.68 },
      { phase:4.4, speed:.56, x:27, y:25, rx:4.7, ry:6.5, rz:2.2, depth:1.04 },
      { phase:5.6, speed:.66, x:20, y:30, rx:3.4, ry:5.6, rz:2.7, depth:.76 },
      { phase:2.5, speed:.48, x:32, y:20, rx:4.1, ry:7.6, rz:2.1, depth:1.12 }
    ];
    const categoryMotion = floatProfiles.map(() => ({
      cursorX:0, cursorY:0, cursorRX:0, cursorRY:0,
      targetX:0, targetY:0, targetRX:0, targetRY:0,
      scrollX:0, scrollY:0, scrollRZ:0, lastTransform:""
    }));
    let categoryFrame = 0;
    let categoryPointerFrame = 0;
    let categoryVisible = false;
    let categoryLastFrame = 0;
    let activeCategory = null;
    const lowPower = innerWidth < 700 || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
    const motionScale = lowPower ? .68 : 1;
    categoryItems.forEach((item, index) => {
      const profile = floatProfiles[index];
      item.style.setProperty("--depth-z", `${Math.round((profile.depth - 1) * 110)}px`);
      item.style.setProperty("--entry-delay", `${index * 70}ms`);
    });
    const setActiveCategory = (item) => {
      activeCategory = item;
      categoryScene?.classList.toggle("has-active-category", Boolean(item));
      categoryItems.forEach(entry => entry.classList.toggle("is-active-category", entry === item));
    };
    const renderCategoryFloat = (now) => {
      categoryFrame = 0;
      if (!categoryVisible || reduced.matches) return;
      const delta = categoryLastFrame ? Math.min(40, now - categoryLastFrame) : 16.7;
      categoryLastFrame = now;
      const response = 1 - Math.exp(-delta * .018);
      const time = now / 1000;
      categoryItems.forEach((item, index) => {
        const p = floatProfiles[index];
        const state = categoryMotion[index];
        const primary = time * p.speed + p.phase;
        const secondary = time * p.speed * .61 + p.phase * 1.7;
        state.cursorX += (state.targetX - state.cursorX) * response;
        state.cursorY += (state.targetY - state.cursorY) * response;
        state.cursorRX += (state.targetRX - state.cursorRX) * response;
        state.cursorRY += (state.targetRY - state.cursorRY) * response;
        const x = (Math.sin(primary) * p.x + Math.sin(secondary) * p.x * .28) * motionScale + state.cursorX + state.scrollX;
        const y = (Math.cos(primary * .83) * p.y + Math.sin(secondary * 1.3) * p.y * .22) * motionScale + state.cursorY + state.scrollY;
        const rx = Math.sin(primary * .72) * p.rx * motionScale + state.cursorRX;
        const ry = Math.cos(secondary * .9) * p.ry * motionScale + state.cursorRY;
        const rz = Math.sin(primary * .53) * p.rz * motionScale + state.scrollRZ;
        const transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,var(--depth-z)) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg)`;
        if (transform !== state.lastTransform) {
          item.style.transform = transform;
          state.lastTransform = transform;
        }
      });
      categoryFrame = requestAnimationFrame(renderCategoryFloat);
    };
    const categoryObserver = categoryScene ? new IntersectionObserver(([entry]) => {
      categoryVisible = entry.isIntersecting && !document.hidden;
      if (categoryVisible && !categoryFrame && !reduced.matches) categoryFrame = requestAnimationFrame(renderCategoryFloat);
      if (!categoryVisible && categoryFrame) { cancelAnimationFrame(categoryFrame); categoryFrame = 0; }
    }, { rootMargin:"18% 0px" }) : null;
    if (categoryScene) categoryObserver.observe(categoryScene);
    if (categoryScene && categoryField && finePointer.matches) {
      categoryScene.addEventListener("pointermove", (event) => {
        if (categoryPointerFrame) return;
        categoryPointerFrame = requestAnimationFrame(() => {
          const fieldBox = categoryField.getBoundingClientRect();
          const localX = event.clientX - fieldBox.left;
          const localY = event.clientY - fieldBox.top;
          const nx = localX / fieldBox.width - .5;
          const ny = (event.clientY - categoryScene.getBoundingClientRect().top) / categoryScene.clientHeight - .5;
          categoryItems.forEach((item, index) => {
            const centerX = item.offsetLeft + item.offsetWidth / 2;
            const centerY = item.offsetTop + item.offsetHeight / 2;
            const distance = Math.hypot(localX - centerX, localY - centerY);
            const attraction = Math.max(0, 1 - distance / 360);
            const depth = floatProfiles[index].depth;
            const state = categoryMotion[index];
            state.targetX = nx * 28 * depth + (localX - centerX) * attraction * .045;
            state.targetY = ny * 20 * depth + (localY - centerY) * attraction * .045;
            state.targetRX = -ny * 6 * depth;
            state.targetRY = nx * 8 * depth;
          });
          categoryPointerFrame = 0;
        });
      }, { passive:true, signal });
      categoryScene.addEventListener("pointerleave", () => {
        categoryMotion.forEach(state => { state.targetX = 0; state.targetY = 0; state.targetRX = 0; state.targetRY = 0; });
        setActiveCategory(null);
      }, { signal });
    }
    categoryItems.forEach(item => {
      item.addEventListener("pointerenter", event => { if (event.pointerType === "mouse") setActiveCategory(item); }, { signal });
      item.addEventListener("focusin", () => setActiveCategory(item), { signal });
      item.addEventListener("focusout", () => { if (!categoryField?.contains(document.activeElement)) setActiveCategory(null); }, { signal });
    });
    if (categoryField) {
      // Category cards are real links: one tap should always navigate on touch devices.
      document.addEventListener("pointerdown", event => { if (!categoryField.contains(event.target)) setActiveCategory(null); }, { passive:true, signal });
    }

    const scenes = [...root.querySelectorAll(".home-hero,.home-categories,.home-recipes,.home-business")];
    let scrollFrame = 0;
    let heroMetrics = null;
    const measureHero = () => {
      heroMetrics = hero && heroJourney ? {
        top:Number.parseFloat(getComputedStyle(hero).top) || 0,
        distance:Math.max(1, heroJourney.offsetHeight - hero.offsetHeight),
        width:hero.clientWidth, height:hero.clientHeight
      } : null;
    };
    const layoutObserver = new ResizeObserver(() => { measureHero(); scheduleScroll(); });
    if (hero) layoutObserver.observe(hero);
    if (heroJourney) layoutObserver.observe(heroJourney);
    measureHero();
    const updateScroll = () => {
      scrollFrame = 0;
      const height = innerHeight || 1;
      // Complete geometry reads before custom-property writes to avoid repeated
      // forced layout when scenes enter and leave the viewport.
      const sceneBounds = scenes.map(scene => [scene, scene.getBoundingClientRect()]);
      const journeyBounds = heroJourney?.getBoundingClientRect();
      sceneBounds.forEach(([scene, bounds]) => {
        if (bounds.bottom < 0 || bounds.top > height) return;
        const progress = clamp((height - bounds.top) / (height + bounds.height));
        scene.style.setProperty("--hero-shift", `${(progress * 36).toFixed(1)}px`);
        scene.style.setProperty("--scene-shift", `${((.5 - progress) * 64).toFixed(1)}px`);
        scene.style.setProperty("--scene-shift-medium", `${((.5 - progress) * 36).toFixed(1)}px`);
        scene.style.setProperty("--scene-shift-small", `${((.5 - progress) * 20).toFixed(1)}px`);
        scene.style.setProperty("--scene-scale", (0.93 + progress * .11).toFixed(3));
        if (scene === categoryScene) {
          const centered = progress - .5;
          categoryItems.forEach((item, index) => {
            const depth = floatProfiles[index].depth;
            const state = categoryMotion[index];
            state.scrollX = centered * (index % 2 ? 24 : -20) * depth;
            state.scrollY = centered * -90 * depth;
            state.scrollRZ = centered * (index % 2 ? 3.2 : -2.6);
          });
        }
      });
      if (activeCategory && finePointer.matches && !activeCategory.matches(":hover") && document.activeElement !== activeCategory) setActiveCategory(null);
      if (heroMetrics && journeyBounds && journeyBounds.bottom >= 0 && journeyBounds.top <= height) {
        const progress = clamp((heroMetrics.top - journeyBounds.top) / heroMetrics.distance);
        const storyIn = clamp((progress - .25) / .2);
        const storyOut = clamp((1 - progress) / .12);
        const compact = innerWidth <= 820;
        hero.style.setProperty("--journey-progress", progress.toFixed(4));
        hero.style.setProperty("--journey-copy-opacity", clamp(1 - progress * 3.7).toFixed(3));
        hero.style.setProperty("--journey-copy-y", `${(-progress * 76).toFixed(1)}px`);
        hero.style.setProperty("--journey-story-opacity", Math.min(storyIn, storyOut).toFixed(3));
        hero.style.setProperty("--journey-story-y", `${((1 - storyIn) * 42 - progress * 18).toFixed(1)}px`);
        hero.style.setProperty("--journey-pack-x", `${(-heroMetrics.width * progress * (compact ? 0 : .24)).toFixed(1)}px`);
        hero.style.setProperty("--journey-pack-y", `${(-heroMetrics.height * progress * (compact ? 0 : .065)).toFixed(1)}px`);
        hero.style.setProperty("--journey-pack-scale", (1 + progress * (compact ? 0 : .28)).toFixed(3));
        hero.style.setProperty("--journey-pack-rotate", `${(-progress * 8).toFixed(2)}deg`);
        hero.style.setProperty("--journey-bg-y", `${(progress * 58).toFixed(1)}px`);
        hero.style.setProperty("--journey-bg-scale", (1 + progress * .075).toFixed(3));
        hero.style.setProperty("--journey-shade-opacity", (1 - progress * .42).toFixed(3));
      }
    };
    const scheduleScroll = () => { if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll); };
    addEventListener("scroll", scheduleScroll, { passive:true, signal });
    addEventListener("resize", scheduleScroll, { passive:true, signal });
    updateScroll();

    if (finePointer.matches) {
      root.querySelectorAll(".magnetic").forEach((button) => {
        button.addEventListener("pointermove", (event) => {
          const box = button.getBoundingClientRect();
          button.style.setProperty("--mag-x", `${((event.clientX - box.left - box.width / 2) * .12).toFixed(1)}px`);
          button.style.setProperty("--mag-y", `${((event.clientY - box.top - box.height / 2) * .16).toFixed(1)}px`);
        }, { passive:true, signal });
        button.addEventListener("pointerleave", () => { button.style.setProperty("--mag-x", "0px"); button.style.setProperty("--mag-y", "0px"); }, { signal });
      });
    }
    cleanup = () => {
      controller.abort();
      observer.disconnect();
      layoutObserver.disconnect();
      categoryObserver?.disconnect();
      staged.forEach(element => element.classList.remove("scene-ready"));
      if (pointerFrame) cancelAnimationFrame(pointerFrame);
      if (scrollFrame) cancelAnimationFrame(scrollFrame);
      if (categoryFrame) cancelAnimationFrame(categoryFrame);
      if (categoryPointerFrame) cancelAnimationFrame(categoryPointerFrame);
    };
  }
  reduced.addEventListener("change", () => {
    cleanup();
    document.documentElement.classList.toggle("no-motion", reduced.matches);
    if (!reduced.matches) mount(document.getElementById("app"));
  });
  window.ICEMAN_MOTION = { mount, unmount:() => cleanup() };
})();
