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

    const scenes = [...root.querySelectorAll(".home-hero,.home-recipes,.home-business")];
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
      });
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
      staged.forEach(element => element.classList.remove("scene-ready"));
      if (pointerFrame) cancelAnimationFrame(pointerFrame);
      if (scrollFrame) cancelAnimationFrame(scrollFrame);
    };
  }
  reduced.addEventListener("change", () => {
    cleanup();
    document.documentElement.classList.toggle("no-motion", reduced.matches);
    if (!reduced.matches) mount(document.getElementById("app"));
  });
  window.ICEMAN_MOTION = { mount, unmount:() => cleanup() };
})();
