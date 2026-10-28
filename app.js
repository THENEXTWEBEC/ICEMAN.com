(() => {
  const catalog = window.ICEMAN_CATALOG;
  const projectBase = /^\/ICEMAN\.com(?:\/|$)/.test(window.location.pathname) ? "/ICEMAN.com" : "";
  const withBase = (path) => `${projectBase}${path.startsWith("/") ? path : `/${path}`}` || "/";
  const withoutBase = (path) => projectBase && (path === projectBase || path.startsWith(`${projectBase}/`)) ? path.slice(projectBase.length) || "/" : path;
  const products = catalog.products;
  const editorial = window.ICEMAN_EDITORIAL;
  // Selección confirmada por el cliente el 22 de octubre de 2026.
  const featuredRecipeSlugs = ["picada-para-compartir", "hamburguesa-con-papas", "papas-rejilla-para-compartir"];
  function orderedRecipes() {
    return [...featuredRecipeSlugs.map(slug => editorial.recipes.find(recipe => recipe.slug === slug)).filter(Boolean), ...editorial.recipes.filter(recipe => !featuredRecipeSlugs.includes(recipe.slug))];
  }
  function recipeVisual(recipe) {
    if (recipe.slug === "hamburguesa-con-papas") return { image:"papas-ondulado-premium", alt:"Empaque de Papas corte ondulado ICEMAN", treatment:"pack" };
    if (recipe.slug === "papas-rejilla-para-compartir") return { image:"editorial/papas-rejilla-servidas-cliente.jpeg", alt:"Papas corte rejilla doradas, servidas en un plato verde", treatment:"rejilla" };
    return { image:recipe.heroImage || recipe.image, alt:recipe.heroAlt || recipe.title, treatment:"dish" };
  }
  const categories = catalog.categories;
  const waNumber = "593999152518";
  const root = document.getElementById("app");
  const categoryBySlug = Object.fromEntries(categories.map((item) => [item.slug, item]));
  const stockists = [
      { name:"Supermaxi", logo:"supermaxi.png" },
      { name:"Megamaxi", logo:"megamaxi.png" },
      { name:"Mi Comisariato", logo:"mi-comisariato.png" },
      { name:"Akí", logo:"aki.png" },
      { name:"Gran Akí", logo:"gran-aki.png" },
      { name:"Tía", logo:"tia.png" },
      { name:"Coral Hipermercados", logo:"coral.png" },
      { name:"Del Portal Supermercados", logo:"del-portal.png" },
      { name:"Fybeca", logo:"fybeca.png" },
      { name:"Pedidos Ya", logo:"pedidos-ya-clean.png" },
      { name:"Tipti", logo:"tipti.png" },
      { name:"Datu Deli", logo:"datu-deli.png" },
      { name:"Casa Deli", logo:"casa-deli-clean.webp" }
    ];

  let experienceCleanup = null;
  let activeFilter = "todos";
  let searchValue = "";
  let searchOpened = false;
  let menuOpened = false;
  let formStarted = false;
  let scrollSpyCleanup = null;
  let motionObserver = null;
  let stockistsCleanup = null;
  let showcaseCleanup = null;
  let recipeImageObserver = null;

  const track = (eventName, params = {}) => {
    if (typeof window.gtag === "function") window.gtag("event", eventName, params);
    window.dispatchEvent(new CustomEvent("iceman:analytics", { detail: { event: eventName, ...params } }));
  };
  function trackConfirmedLead() {
    // Reuse the existing Google tag, and respect the current analytics choice.
    try {
      if (!JSON.parse(localStorage.getItem("iceman-consent") || "null")?.analytics) return;
      const params = { form_id: "lead-form", form_name: "b2b_request", form_path: "/empresas", destination: "backend" };
      if (new URLSearchParams(window.location.search).get("ga4_debug") === "1") params.debug_mode = true;
      track("generate_lead", params);
    } catch { return; }
  }
  const escapeHTML = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const asset = (name) => `${projectBase}/assets/catalog/${encodeURIComponent(name)}.webp`;
  const cutoutAsset = (name) => `${projectBase}/assets/catalog/cutout/${encodeURIComponent(name)}.png`;
  const editorialImage = (name) => name?.startsWith("editorial/") ? `${projectBase}/assets/${name}` : asset(name);
  const waLink = (message) => `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
  const contactMessage = "Hola, equipo de ICEMAN. Me gustaría recibir información sobre sus productos.";
  const businessMessage = "Hola, equipo de ICEMAN. Me interesa conocer sus opciones de distribución y abastecimiento para empresas.";
  const categoryLabel = (slug) => categoryBySlug[slug]?.name || "Productos";
  const productPath = (product) => `/productos/${product.category}/${product.slug}`;
  const currentPath = () => `${window.location.pathname.replace(/\/$/, "") || "/"}${window.location.search}`;
  const publicUrl = (path) => `${window.location.origin}${withBase(withoutBase(path))}`;

  function iconArrow(direction = "right") {
    const paths = direction === "left"
      ? '<path d="M20 12H4m6-6-6 6 6 6"/>'
      : direction === "up-right"
      ? '<path d="M5 19 19 5M9 5h10v10"/>'
      : '<path d="M4 12h16m-6-6 6 6-6 6"/>';
    return `<svg class="thin-arrow thin-arrow-${direction}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${paths}</svg>`;
  }

  function iconWhatsApp() {
    return '<svg class="whatsapp-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20 11.6a8 8 0 0 1-11.8 7L4 19.8l1.2-4A8 8 0 1 1 20 11.6Z"/><path d="M8.6 7.7c.2-.4.4-.4.7-.4h.4c.2 0 .4.1.5.4l.8 1.8c.1.3.1.5-.1.7l-.6.7c-.2.2-.1.4 0 .6.7 1.3 1.7 2.2 3 2.8.2.1.4.1.6-.1l.8-1c.2-.2.4-.3.7-.1l1.8.8c.3.1.4.3.4.6 0 .4-.2 1.3-.8 1.8-.6.5-1.4.7-2.3.5-1.4-.3-3.2-1.1-4.9-2.7-1.3-1.2-2.3-2.8-2.7-4.1-.4-1-.1-1.8.3-2.3.4-.4.9-.6 1.4-.6Z"/></svg>';
  }

  function setupMotion(scope = root) {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    document.documentElement.classList.add("motion-enabled");
    if (!motionObserver) {
      motionObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          motionObserver?.unobserve(entry.target);
        });
      }, { threshold:0.08, rootMargin:"0px 0px -7% 0px" });
    }
    const selectors = [
      ".hero-copy > *", ".hero-visual", ".trust-item", ".section-head", ".category-card",
      ".product-card", ".benefit", ".business-copy > *", ".business-art", ".brand-word",
      ".cta-band > *", ".page-heading > *", ".detail-image", ".detail-copy > *",
      ".business-lede > *", ".form-section", ".contact-card", ".about-copy > *", ".about-visual"
    ];
    [...scope.querySelectorAll(selectors.join(","))].filter((element) => !element.classList.contains("reveal")).forEach((element, index) => {
      element.classList.add("reveal");
      element.style.setProperty("--reveal-delay", `${Math.min(index % 6, 5) * 45}ms`);
      motionObserver.observe(element);
    });
  }

  function productCard(product) {
    return `<article class="product-card">${productScene(product)}<a class="product-card-link" href="${productPath(product)}" data-link data-product-link="${escapeHTML(product.slug)}"><div class="product-info"><div class="product-brand">${escapeHTML(categoryLabel(product.category))}</div><h3 class="product-title">${escapeHTML(product.name)}</h3><div class="product-meta">${escapeHTML(product.presentation)}</div><div class="product-more"><span>Conoce el producto</span>${iconArrow()}</div></div></a></article>`;
  }

  function header(path) {
    const parts = path.split("/").filter(Boolean);
    const activeNav = path.startsWith("/productos")
      ? "products"
      : path.startsWith("/empresas") ? "business"
      : path.startsWith("/nosotros") ? "about"
      : path.startsWith("/donde-encontrarnos") ? "stockists"
      : path.startsWith("/contacto") ? "contact"
      : path.startsWith("/recetas") ? "editorial"
      : "home";
    const links = [
      ["/", "Inicio", "home"], ["/productos", "Productos", "products"],
      ["/recetas", "Recetas y ocasiones", "editorial"], ["/nosotros", "Nosotros", "about"],
      ["/donde-encontrarnos", "Dónde encontrarnos", "stockists"]
    ];
    const navLink = ([href, label, key]) => `<a href="${href}" data-link data-nav="${key}" ${activeNav === key ? 'aria-current="page"' : ""}>${label}</a>`;
    return `<header class="site-header"><div class="wrap header-inner header-inner-centered">
      <nav class="desktop-nav desktop-nav-left" aria-label="Navegación principal, primera parte">${links.slice(0,2).map(navLink).join("")}</nav>
      <a href="/" data-link class="brand brand-centered" aria-label="ICEMAN Ecuador, inicio"><img class="brand-official-logo" src="${projectBase}/assets/iceman-logo-cliente.jpg" alt="ICEMAN, alimentos congelados" fetchpriority="high"></a>
      <div class="header-right"><nav class="desktop-nav desktop-nav-right" aria-label="Navegación principal, segunda parte">${links.slice(2).map(navLink).join("")}</nav>
      <div class="header-actions"><button class="icon-btn" type="button" data-action="search" aria-label="Buscar productos" aria-controls="site-search-panel" aria-expanded="${searchOpened}"><span class="search-glyph" aria-hidden="true"></span></button><button class="menu-toggle" type="button" data-action="menu" aria-label="${menuOpened ? "Cerrar menú" : "Abrir menú"}" aria-expanded="${menuOpened}" aria-controls="mobile-menu"><span class="menu-lines ${menuOpened ? "is-open" : ""}" aria-hidden="true"><span></span><span></span></span></button></div></div>
      </div>
      <div class="search-bar" id="site-search-panel" ${searchOpened ? "" : "hidden"}><form class="wrap search-inner" data-form="search"><span class="search-glyph" aria-hidden="true"></span><label class="sr-only" for="site-search">Buscar productos</label><input id="site-search" type="search" name="q" placeholder="Buscar papas, vegetales, smoothies…" value="${escapeHTML(searchValue)}" autocomplete="off"><button class="search-close" type="button" data-action="close-search" aria-label="Cerrar búsqueda">×</button></form></div>
      <nav id="mobile-menu" class="mobile-panel ${menuOpened ? "open" : ""}" aria-label="Menú móvil" ${menuOpened ? "" : "inert"}>${links.map(([href, label, key]) => `<a href="${href}" data-link data-nav="${key}" ${activeNav === key ? 'aria-current="page"' : ""}>${label}</a>`).join("")}<a class="mobile-sub mobile-whatsapp" href="${waLink(contactMessage)}" data-wa target="_blank" rel="noopener">${iconWhatsApp()} Hablar por WhatsApp</a><a class="mobile-sub" href="/empresas" data-link>Para tu negocio ${iconArrow()}</a></nav>
    </header>`;
  }

  function setActiveNav(key) {
    root.querySelectorAll("[data-nav]").forEach((link) => {
      const isActive = link.dataset.nav === key;
      if (isActive) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  function setupScrollSpy() {
    scrollSpyCleanup?.();
    scrollSpyCleanup = null;
    const sections = [...root.querySelectorAll("[data-nav-section]")];
    if (sections.length < 2) return;
    let frame = 0;
    let activeKey = null;
    const update = () => {
      frame = 0;
      const headerHeight = root.querySelector(".site-header")?.getBoundingClientRect().height || 0;
      const activationLine = headerHeight + 24;
      let current = sections[0].dataset.navSection;
      for (const section of sections) {
        if (section.getBoundingClientRect().top <= activationLine) current = section.dataset.navSection;
        else break;
      }
      if (current !== activeKey) { setActiveNav(current); activeKey = current; }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive:true });
    window.addEventListener("resize", onScroll);
    update();
    scrollSpyCleanup = () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }

  function scrollToHash(hash, behavior = "smooth") {
    if (!hash) return;
    const target = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (target) requestAnimationFrame(() => {
      const headerHeight = root.querySelector(".site-header")?.getBoundingClientRect().height || 0;
      const top = window.scrollY + target.getBoundingClientRect().top - headerHeight;
      window.scrollTo({ top:Math.max(0, top), behavior });
    });
  }

  function footer() {
    return `<footer class="site-footer"><div class="wrap"><div class="footer-grid">
      <div class="footer-brand-block"><a href="/" data-link class="brand footer-brand"><img class="brand-symbol" src="${projectBase}/assets/iceman-symbol-white.png" alt=""><span class="brand-lockup"><img class="brand-wordmark" src="${projectBase}/assets/iceman-wordmark-white.png" alt="IceMan"><small>ECUADOR</small></span></a><p>Alimentos congelados, prácticos y listos para disfrutar. Una selección para cada día y para cada negocio.</p></div>
      <div class="footer-col"><h3>Productos</h3><a href="/productos/papas" data-link>Papas</a><a href="/productos/vegetales" data-link>Vegetales</a><a href="/productos/especialidades" data-link>Especialidades</a><a href="/productos/helados" data-link>Helados</a><a href="/productos" data-link>Ver catálogo completo</a></div>
      <div class="footer-col"><h3>ICEMAN</h3><a href="/nosotros" data-link>Nosotros</a><a href="/donde-encontrarnos" data-link>Dónde encontrarnos</a><a href="/recetas" data-link>Recetas y ocasiones</a><a href="/empresas" data-link>Para tu negocio</a><a href="/contacto" data-link>Contacto</a></div>
      <div class="footer-col"><h3>Contacto</h3><a href="${waLink(contactMessage)}" data-wa target="_blank" rel="noopener">WhatsApp · 099 915 2518</a><a href="tel:+593999152518" data-contact>Información · 099 915 2518</a></div>
    </div><div class="footer-bottom"><span>© ICEMAN ${new Date().getFullYear()}. Todos los derechos reservados.</span><span>Productos congelados · Ecuador</span><div class="footer-legal"><a href="/privacidad" data-link>Privacidad</a><a href="/terminos" data-link>Términos</a><button type="button" data-action="cookie-settings">Cookies</button></div></div></div></footer>`;
  }

  function pageShell(content, path) {
    experienceCleanup?.();
    experienceCleanup = null;
    window.ICEMAN_MOTION?.unmount();
    showcaseCleanup?.();
    showcaseCleanup = null;
    stockistsCleanup?.();
    stockistsCleanup = null;
    motionObserver?.disconnect();
    motionObserver = null;
    recipeImageObserver?.disconnect();
    recipeImageObserver = null;
    const floatingWhatsAppClass = path === "/empresas" ? "whatsapp-float whatsapp-float-form" : "whatsapp-float";
    const pageContent = path === "/" ? content.replace("Alimentos congelados ICEMAN", "Alimentos congelados ICEMAN") : content;
    document.querySelectorAll('script[data-schema="page"]').forEach(node=>node.remove());
    root.innerHTML = `${header(path)}<main id="main" class="fade-in">${pageContent}</main>${footer()}<a class="${floatingWhatsAppClass}" href="${waLink(contactMessage)}" data-wa target="_blank" rel="noopener" aria-label="Escribir a ICEMAN por WhatsApp">${iconWhatsApp()}</a>`;
    root.querySelectorAll('a[href^="#"]').forEach(link=>link.setAttribute("href",`${withBase(path)}${link.getAttribute("href")}`));
    document.querySelector(".skip-link")?.setAttribute("href",`${withBase(path)}#main`);
    setupExperience();
    setupEditorialDrag();
    setupRecipeTransforms();
    root.querySelectorAll("a[data-link]").forEach((link) => { link.href = withBase(withoutBase(link.getAttribute("href"))); });
    if (projectBase) root.querySelectorAll('img[src^="/assets/"]').forEach((image) => { image.src = `${projectBase}${image.getAttribute("src")}`; });
    updateHead(path);
    if (searchOpened) setTimeout(() => document.getElementById("site-search")?.focus(), 0);
    requestAnimationFrame(() => setupMotion());
    requestAnimationFrame(() => window.ICEMAN_MOTION?.mount(root));
    if (path === "/") requestAnimationFrame(() => { setupHomeProducts(); setupStockistsMarquee(); });
  }

  function updateHead(path, title, description) {
    document.title = title ? `${title} | ICEMAN Ecuador` : "ICEMAN Ecuador — Congelados para todos los días";
    const meta = document.querySelector('meta[name="description"]');
    const pageDescription = description || "Descubre el catálogo de alimentos congelados ICEMAN: papas, vegetales, helados, smoothies y más. Información comercial para hogares y negocios en Ecuador.";
    if (meta) meta.content = pageDescription;
    const ogTitle = document.querySelector('meta[property="og:title"]'); if (ogTitle) ogTitle.content = document.title;
    const ogDescription = document.querySelector('meta[property="og:description"]'); if (ogDescription) ogDescription.content = pageDescription;
    const twitterTitle = document.querySelector('meta[name="twitter:title"]'); if (twitterTitle) twitterTitle.content = document.title;
    const twitterDescription = document.querySelector('meta[name="twitter:description"]'); if (twitterDescription) twitterDescription.content = pageDescription;
    const robots = document.querySelector('meta[name="robots"]'); if (robots) robots.content = title === "Página no encontrada" ? "noindex,follow" : "index,follow";
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement("link"); canonical.rel = "canonical"; document.head.append(canonical); }
    canonical.href = `${window.location.origin}${withBase(withoutBase(window.location.pathname))}`;
    const ogUrl = document.querySelector('meta[property="og:url"]'); if (ogUrl) ogUrl.content = canonical.href;
  }

  function hero() {
    return `<section class="hero"><div class="wrap hero-grid"><div class="hero-copy"><div class="eyebrow">Alimentos congelados</div><h1>Lo práctico también puede ser <em>extraordinario.</em></h1><p>Descubre productos listos para acompañar cada día: fáciles de preparar, versátiles y siempre a la mano.</p><div class="hero-actions"><a class="btn btn-primary" href="/productos" data-link>Explorar productos ${iconArrow()}</a><a class="btn btn-outline" href="/empresas" data-link>Cotizar para mi negocio</a></div><div class="hero-note"><span class="snow-mark" aria-hidden="true">✳</span><span>Conserva congelado · Prepara en minutos</span></div></div><div class="hero-visual"><img class="hero-product hero-brand-image" src="${projectBase}/assets/iceman-hero-brand.jpg" alt="Productos ICEMAN sanos y naturales: mix jardinera, maíz dulce, arvejas y ensalada rusa" fetchpriority="high"></div></div></section>`;
  }

  const homeShowcase = [
    { slug:"papas-air-fryer", tone:"#EFB54A" },
    { slug:"mix-jardinera-450", tone:"#86BD69" },
    { slug:"aros-de-cebolla", tone:"#65BED0" },
    { slug:"helado-paila-mora", tone:"#83AED8" }
  ].map((item) => ({ ...item, product:products.find((product) => product.slug === item.slug) })).filter((item) => item.product);

  function home() {
    const categoryLinks = categories.map((category, index) => `<a class="home-category" href="/productos/${category.slug}" data-link data-category-link="${category.slug}" data-float-index="${index}" aria-label="Explorar ${escapeHTML(category.name)}"><span class="home-category-image"><img src="${asset(category.image)}" alt="" loading="lazy" decoding="async"></span><strong>${escapeHTML(category.name)}</strong></a>`).join("");
    const showcasePanels = homeShowcase.map(({ product, tone }, index) => `<article class="discovery-card" style="--panel-tone:${tone}"><a class="discovery-link" href="${productPath(product)}" data-link data-product-link="${escapeHTML(product.slug)}" aria-label="Ver ${escapeHTML(product.name)}" aria-describedby="discovery-copy-${index}"><img class="discovery-pack discovery-pack-${escapeHTML(product.slug)}" data-discovery-product="${escapeHTML(product.slug)}" src="${asset(product.image)}" alt="" loading="lazy" decoding="async" width="480" height="480"><div class="discovery-copy" id="discovery-copy-${index}"><h3>${escapeHTML(product.name)}</h3><p>${escapeHTML(product.description)}</p><span class="discovery-cta">Ver producto ${iconArrow()}</span></div></a></article>`).join("");
    const recipeCards = orderedRecipes().slice(0, 3).map((recipe, index) => `<article class="home-recipe home-recipe-${index + 1}"><a href="/recetas/${recipe.slug}" data-link><div class="home-recipe-image recipe-visual-${recipeVisual(recipe).treatment}"><img src="${editorialImage(recipeVisual(recipe).image)}" alt="${escapeHTML(recipeVisual(recipe).alt)}" loading="lazy" decoding="async"></div><div class="home-recipe-copy"><span class="home-recipe-label">Idea con productos ICEMAN</span><h3>${escapeHTML(recipe.title)}</h3><span class="home-recipe-arrow">Ver receta ${iconArrow()}</span></div></a></article>`).join("");
    const stockistItems = stockists.map(({ name, logo }) => `<div class="stockist-logo stockist-logo-${logo.replace(/\.[^.]+$/, "").replace(/[^a-z0-9-]/gi, "-")}" role="listitem"><img src="${projectBase}/assets/stockists/${logo}" alt="${escapeHTML(name)}" loading="lazy" decoding="async"></div>`).join("");
    return `<div class="home-hero-journey" data-hero-journey><section class="home-hero" id="inicio" data-nav-section="home"><div class="home-hero-image" data-parallax="0.16"><img src="${projectBase}/assets/editorial/golden-fries-alpine-1672.webp" srcset="${projectBase}/assets/editorial/golden-fries-alpine-768.webp 768w, ${projectBase}/assets/editorial/golden-fries-alpine-1672.webp 1672w" sizes="100vw" alt="Papas doradas flotando sobre un paisaje alpino congelado" fetchpriority="high" decoding="async" width="1672" height="941"></div><div class="home-hero-shade"></div><div class="hero-orbit hero-orbit-one" data-pointer-depth="12" aria-hidden="true"></div><div class="hero-orbit hero-orbit-two" data-pointer-depth="-8" aria-hidden="true"></div><div class="wrap home-hero-inner"><div class="home-hero-copy"><span class="home-kicker hero-sequence">Alimentos congelados ICEMAN</span><h1><span class="hero-line"><span>Sabor a</span></span><span class="hero-line"><em>tu ritmo.</em></span></h1><p class="hero-sequence">Lo hacemos fácil. Tú lo haces especial.</p><div class="home-hero-actions hero-sequence"><a class="btn btn-primary magnetic" href="/productos" data-link>Explorar productos ${iconArrow()}</a><a class="home-hero-link" href="/donde-encontrarnos" data-link>Encuéntranos ${iconArrow()}</a></div></div><div class="hero-scroll-story" aria-hidden="true"><span>ICEMAN · Congelados</span><strong>Listos cuando<br>tú lo estás.</strong><small>Productos prácticos para cada día</small></div><div class="hero-pack-wrap" data-pointer-depth="-16"><span class="hero-pack-halo" aria-hidden="true"></span><img class="hero-pack" src="${asset(homeShowcase[0].product.image)}" alt="Empaque oficial de ${escapeHTML(homeShowcase[0].product.name)} ICEMAN" fetchpriority="high" decoding="async"></div><div class="hero-journey-progress" aria-hidden="true"><span>01</span><i><b></b></i><span>02</span></div><span class="hero-side-note" aria-hidden="true">Del congelador a tu mesa · ICEMAN Ecuador</span><a class="hero-scroll" href="#productos-destacados" aria-label="Explorar productos destacados"><span aria-hidden="true">↓</span> Desliza para descubrir</a></div></section></div>
    <section class="home-showcase" id="productos-destacados" aria-labelledby="showcase-title" data-nav-section="products"><div class="wrap"><div class="home-showcase-heading"><span class="home-kicker">Productos que se mueven contigo</span><h2 id="showcase-title">Elige. Descubre. Disfruta.</h2><p>Toca para descubrir. Toca de nuevo para ver el producto.</p></div></div><div class="discovery-grid" aria-label="Productos destacados de ICEMAN">${showcasePanels}</div></section>
    <section class="home-stockists" id="donde-encontrarnos" aria-labelledby="stockists-title" data-nav-section="stockists"><div class="wrap home-stockists-head"><span class="home-kicker">Dónde encontrarnos</span><h2 id="stockists-title">IceMan, cerca de ti.</h2><p>Encuentra productos ICEMAN en las principales cadenas del país.</p></div><div class="stockists-track" id="stockists-track" role="list" aria-label="Establecimientos donde encuentras productos ICEMAN"><div class="stockists-set">${stockistItems}</div><div class="stockists-set" aria-hidden="true" inert>${stockistItems}</div></div><div class="wrap stockists-note"><a class="home-inline-link" href="/donde-encontrarnos" data-link>Ver todos los establecimientos →</a><br>La disponibilidad y el surtido pueden variar según el establecimiento y el local.</div></section>
    <section class="home-categories" id="categorias" aria-labelledby="categories-title"><div class="category-ambient" aria-hidden="true"><i></i><i></i><i></i></div><div class="wrap"><div class="home-section-heading"><span class="home-kicker">Del congelador a tu mesa</span><h2 id="categories-title">Hay mucho por descubrir.</h2><p>Encuentra tu próximo favorito entre las categorías del catálogo.</p></div><div class="home-category-rail" data-category-universe aria-label="Universo de categorías ICEMAN">${categoryLinks}</div><a class="home-inline-link" href="/productos" data-link>Ver catálogo completo ${iconArrow()}</a></div></section>
    <section class="home-recipes" id="ideas" aria-labelledby="recipes-title" data-nav-section="editorial"><div class="wrap"><div class="home-section-heading"><span class="home-kicker">Inspiración para la mesa</span><h2 id="recipes-title">¿Qué preparamos <em>hoy?</em></h2><p>Preparaciones y ocasiones con productos del catálogo ICEMAN.</p></div><div class="home-recipe-grid">${recipeCards}</div><div class="home-recipes-foot"><p>Encuentra nuevas formas de preparar y compartir tus productos favoritos.</p><a class="home-inline-link" href="/recetas" data-link>Explorar recetas y ocasiones ${iconArrow()}</a></div></div></section>
    <section class="home-business" id="para-empresas" aria-labelledby="business-title" data-nav-section="business"><div class="wrap home-business-grid"><div class="home-business-image"><img src="${projectBase}/assets/editorial/recipe-onion-rings.webp" alt="Aros de cebolla listos para servir" loading="lazy" decoding="async"></div><div class="home-business-copy"><span class="home-kicker">Para tu negocio</span><h2 id="business-title">Una selección para tu operación.</h2><p>Restaurantes, cafeterías, hoteles y comercios pueden explorar nuestras categorías y consultar las presentaciones disponibles con el equipo ICEMAN.</p><a class="btn btn-primary" href="/empresas" data-link>Solicitar información ${iconArrow()}</a><a class="home-inline-link" href="${waLink(businessMessage)}" data-wa target="_blank" rel="noopener">Hablar por WhatsApp ${iconArrow()}</a></div></div></section>
    <section class="home-contact" aria-labelledby="contact-title" data-nav-section="contact"><div class="wrap home-contact-inner"><div><span class="home-kicker">Conversemos</span><h2 id="contact-title">¿Tienes algo en mente?</h2><p>Te ayudamos a encontrar productos para tu mesa o tu negocio.</p></div><a class="btn btn-primary" href="/contacto" data-link>Ir a contacto ${iconArrow()}</a></div></section>`;
  }

  function setupHomeProducts() {
    const grid = root.querySelector(".discovery-grid");
    if (!grid) return;
    const cards = [...grid.querySelectorAll(".discovery-card")];
    const controller = new AbortController();
    const { signal } = controller;
    let active = null;
    let gesture = null;
    const reveal = (card) => {
      active = card;
      cards.forEach((item) => item.classList.toggle("is-revealed", item === card));
    };
    grid.addEventListener("pointerdown", (event) => {
      gesture = { id:event.pointerId, x:event.clientX, y:event.clientY, moved:!event.isPrimary, type:event.pointerType };
    }, { passive:true, signal });
    document.addEventListener("pointermove", (event) => {
      if (gesture?.id === event.pointerId && Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 10) gesture.moved = true;
    }, { passive:true, signal });
    grid.addEventListener("pointercancel", () => { if (gesture) gesture.moved = true; }, { passive:true, signal });
    grid.addEventListener("click", (event) => {
      const card = event.target.closest(".discovery-card");
      if (!card || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const touch = event.pointerType === "touch" || event.pointerType === "pen" || gesture?.type === "touch" || gesture?.type === "pen";
      const moved = gesture?.moved;
      gesture = null;
      if (event.detail > 0 && (moved || (touch && active !== card))) {
        event.preventDefault();
        event.stopPropagation();
        if (!moved) reveal(card);
      }
      // Keyboard activation and mouse clicks keep the existing product route.
    }, { signal });
    cards.forEach((card) => {
      card.addEventListener("pointerenter", (event) => { if (event.pointerType === "mouse") reveal(card); }, { signal });
      card.addEventListener("pointerleave", (event) => { if (event.pointerType === "mouse" && active === card) reveal(null); }, { signal });
      card.addEventListener("focusin", () => { if (card.querySelector(":focus-visible")) reveal(card); }, { signal });
    });
    document.addEventListener("pointerdown", (event) => { if (!grid.contains(event.target)) reveal(null); }, { passive:true, signal });
    document.addEventListener("focusin", (event) => { if (!grid.contains(event.target)) reveal(null); }, { signal });
    document.addEventListener("keydown", (event) => { if (event.key === "Escape") reveal(null); }, { signal });
    showcaseCleanup = () => controller.abort();
  }

  function setupStockistsMarquee() {
    const track = root.querySelector("#stockists-track");
    if (!track) return;
    const set = track.querySelector(".stockists-set");
    let frame = 0;
    let previous = 0;
    let paused = false;
    let visible = false;
    let setWidth = set.getBoundingClientRect().width;
    const pixelsPerMillisecond = .028 * 1.15;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    track.scrollLeft = setWidth;
    const tick = (now) => {
      frame = 0;
      if (!visible || paused || reduced.matches) return;
      if (!paused) {
        const elapsed = previous ? Math.min(now - previous, 50) : 16;
        track.scrollLeft -= elapsed * pixelsPerMillisecond;
        if (track.scrollLeft <= 0) track.scrollLeft += setWidth;
      }
      previous = now;
      frame = requestAnimationFrame(tick);
    };
    const pause = () => { paused = true; if (frame) cancelAnimationFrame(frame); frame = 0; };
    const resume = () => { paused = false; previous = 0; if (visible && !frame && !reduced.matches) frame = requestAnimationFrame(tick); };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && !document.hidden;
      previous = 0;
      if (visible && !frame && !reduced.matches) frame = requestAnimationFrame(tick);
      if (!visible && frame) { cancelAnimationFrame(frame); frame = 0; }
    });
    observer.observe(track);
    const onVisibility = () => { visible = !document.hidden && track.getBoundingClientRect().bottom > 0 && track.getBoundingClientRect().top < innerHeight; if (visible && !frame && !reduced.matches) frame = requestAnimationFrame(tick); else if (!visible && frame) { cancelAnimationFrame(frame); frame = 0; } };
    const onResize = () => { setWidth = set.getBoundingClientRect().width; };
    const onMotion = () => { if (reduced.matches && frame) { cancelAnimationFrame(frame); frame = 0; } else if (visible && !frame) frame = requestAnimationFrame(tick); };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("resize", onResize);
    reduced.addEventListener("change", onMotion);
    track.addEventListener("mouseenter", pause);
    track.addEventListener("mouseleave", resume);
    track.addEventListener("focusin", pause);
    track.addEventListener("focusout", resume);
    track.addEventListener("touchstart", pause, { passive:true });
    track.addEventListener("touchend", resume, { passive:true });
    track.addEventListener("touchcancel", resume, { passive:true });
    stockistsCleanup = () => { cancelAnimationFrame(frame); observer.disconnect(); document.removeEventListener("visibilitychange", onVisibility); window.removeEventListener("resize", onResize); reduced.removeEventListener("change", onMotion); track.removeEventListener("mouseenter", pause); track.removeEventListener("mouseleave", resume); track.removeEventListener("focusin", pause); track.removeEventListener("focusout", resume); track.removeEventListener("touchstart", pause); track.removeEventListener("touchend", resume); track.removeEventListener("touchcancel", resume); };
  }

  function breadcrumbs(parts) {
    return `<nav class="breadcrumb" aria-label="Ruta de navegación">${parts.map((part, index) => `${index ? '<span aria-hidden="true">/</span>' : ""}${part.href ? `<a href="${part.href}" data-link>${escapeHTML(part.name)}</a>` : `<span aria-current="page">${escapeHTML(part.name)}</span>`}`).join("")}</nav>`;
  }

  const editorialAll = [...editorial.recipes.map((item) => ({ ...item, kind:"recipe" })), ...editorial.articles.map((item) => ({ ...item, kind:"article" })), ...editorial.business.map((item) => ({ ...item, kind:"business" }))];
  const editorialItem = (slug) => editorialAll.find((item) => item.slug === slug);
  const productBySlug = (slug) => products.find((item) => item.slug === slug);
  const editorialPath = (item) => `/recetas/${item.slug}`;
  const articleHref = (item) => item.kind === "recipe" ? editorialPath(item) : editorialPath(item);
  function editorialCard(item, featured = false) {
    const visual = item.kind === "recipe" ? recipeVisual(item) : null;
    if (visual) item = {...item, image:visual.image};
    const product = productBySlug(item.products?.[0]);
    const eyebrow = item.kind === "recipe" ? `Receta · ${item.time}` : item.category;
    if (item.kind === "recipe" && product && visual.treatment !== "pack") {
      const productAlt = `Empaque de ${product.name} ICEMAN, presentación ${product.presentation}`;
      const dishAlt = visual.alt;
      return `<article class="editorial-card editorial-recipe-card ${featured ? "editorial-card-featured" : ""}" data-editorial-card data-category="recetas" data-search="${escapeHTML([item.title,item.description,item.category,...(item.tags || []),...(item.ingredients || []),...(item.occasions || []),product.name].join(" ").toLocaleLowerCase("es"))}">
        <button class="editorial-card-image editorial-recipe-media recipe-visual-${visual.treatment}" type="button" data-recipe-transform aria-pressed="false" aria-label="Mostrar el plato preparado de ${escapeHTML(item.title)}. Producto actual: ${escapeHTML(product.name)} ICEMAN.">
          <img class="editorial-recipe-product" src="${asset(product.image)}" alt="${escapeHTML(productAlt)}" loading="lazy" decoding="async">
          <img class="editorial-recipe-dish" data-src="${editorialImage(item.image)}" alt="${escapeHTML(dishAlt)}" decoding="async">
          <span class="editorial-recipe-status" aria-hidden="true"><span>Producto ICEMAN</span><span>Listo para disfrutar</span></span>
          <span class="editorial-recipe-cue" aria-hidden="true">Toca para transformar</span>
        </button>
        <div class="editorial-card-copy"><div class="editorial-kicker">De nuestro producto a tu mesa</div><h3><a href="${articleHref(item)}" data-link>${escapeHTML(item.title)}</a></h3><p>${escapeHTML(item.description)}</p><div class="editorial-recipe-facts" aria-label="Detalles de la receta"><span><small>Tiempo</small><b>${escapeHTML(item.time)}</b></span><span><small>Dificultad</small><b>${escapeHTML(item.difficulty)}</b></span></div><div class="editorial-card-foot"><a class="editorial-product-chip" href="${productPath(product)}" data-link aria-label="Ver producto ${escapeHTML(product.name)}">${escapeHTML(product.name)} · ${escapeHTML(product.presentation)}</a><a class="editorial-read editorial-recipe-link" href="${articleHref(item)}" data-link>Ver receta ${iconArrow()}</a></div></div>
      </article>`;
    }
    return `<article class="editorial-card ${item.image.startsWith("editorial/") ? "editorial-card-poster" : ""} ${item.imageLayout === "landscape" ? "editorial-card-landscape" : ""} ${featured ? "editorial-card-featured" : ""}" data-editorial-card data-category="${item.kind === "business" ? "negocios" : item.kind === "recipe" ? "recetas" : "nutricion"}" data-search="${escapeHTML([item.title,item.description,item.category,...(item.tags || []),...(item.ingredients || []),...(item.occasions || []),product?.name || ""].join(" ").toLocaleLowerCase("es"))}">
      <a class="editorial-card-image" href="${articleHref(item)}" data-link aria-label="Leer ${escapeHTML(item.title)}"><img src="${editorialImage(item.image)}" alt="${escapeHTML(item.image.startsWith("editorial/") ? item.title : item.kind === "recipe" ? `Producto ICEMAN para ${item.title}` : item.title)}" loading="lazy" decoding="async">${item.image.startsWith("editorial/") ? "" : `<span class="editorial-image-label">${escapeHTML(item.kind === "recipe" ? "ICEMAN EN LA MESA" : item.category.toUpperCase())}</span>`}</a>
      <div class="editorial-card-copy"><div class="editorial-kicker">${escapeHTML(eyebrow)}</div><h3><a href="${articleHref(item)}" data-link>${escapeHTML(item.title)}</a></h3><p>${escapeHTML(item.description)}</p><div class="editorial-card-foot">${product ? `<a class="editorial-product-chip" href="${productPath(product)}" data-link>${escapeHTML(product.name)} · ${escapeHTML(product.presentation)}</a>` : `<span>${item.kind === "business" ? "Ideas para tu operación" : "Lectura breve"}</span>`}<a class="editorial-read" href="${articleHref(item)}" data-link> ${item.kind === "recipe" ? "Ver receta" : "Leer artículo"} ${iconArrow()}</a></div></div>
    </article>`;
  }
  function editorialProducts(slugs) {
    return slugs.map(productBySlug).filter(Boolean);
  }
  function productRail(items, id = "editorial-products") {
    return `<div class="editorial-rail-wrap"><div class="editorial-rail" id="${id}" tabindex="0" aria-label="Productos ICEMAN relacionados">${items.map((product) => `<article class="editorial-product"><a href="${withBase(productPath(product))}" data-product-link="${product.slug}"><span class="editorial-product-image"><img src="${asset(product.image)}" alt="Empaque de ${escapeHTML(product.name)}, ${escapeHTML(product.presentation)}" loading="lazy" decoding="async"></span><span class="editorial-product-category">${escapeHTML(categoryLabel(product.category))}</span><strong>${escapeHTML(product.name)}</strong><small>${escapeHTML(product.presentation)}</small><span class="editorial-read">Ver producto ${iconArrow()}</span></a></article>`).join("")}</div><div class="editorial-rail-controls"><button type="button" data-scroll-editorial="${id}" data-direction="-1" aria-label="Productos anteriores">${iconArrow("left")}</button><span class="rail-hint">Desliza para explorar</span><button type="button" data-scroll-editorial="${id}" data-direction="1" aria-label="Más productos">${iconArrow()}</button></div></div>`;
  }
  function setupEditorialDrag(scope = root) {
    scope.querySelectorAll(".editorial-rail:not([data-drag-ready])").forEach((rail) => {
      rail.dataset.dragReady = "true";
      let startX = 0; let startScroll = 0; let moved = false; let pointerDown = false;
      rail.addEventListener("pointerdown", (event) => {
        if (event.pointerType !== "mouse" || event.button !== 0) return;
        startX = event.clientX; startScroll = rail.scrollLeft; moved = false; pointerDown = true;
      });
      rail.addEventListener("pointermove", (event) => {
        if (!pointerDown) return;
        const delta = event.clientX - startX;
        if (!moved && Math.abs(delta) <= 8) return;
        if (!moved) { moved = true; rail.classList.add("is-dragging"); rail.setPointerCapture(event.pointerId); }
        rail.scrollLeft = startScroll - delta; event.preventDefault();
      });
      const stop = () => { pointerDown = false; rail.classList.remove("is-dragging"); if (moved) { rail.dataset.dragged = "true"; setTimeout(() => delete rail.dataset.dragged, 350); } };
      rail.addEventListener("pointerup", stop); rail.addEventListener("pointercancel", stop);
      rail.addEventListener("click", (event) => { if (rail.dataset.dragged === "true") { event.preventDefault(); event.stopPropagation(); delete rail.dataset.dragged; } }, true);
    });
  }

  function loadRecipeDish(control) {
    const dish = control?.querySelector(".editorial-recipe-dish[data-src]");
    if (!dish) return;
    const markReady = () => control.classList.add("is-dish-ready");
    dish.addEventListener("load", markReady, { once:true });
    dish.src = dish.dataset.src;
    delete dish.dataset.src;
    if (dish.complete) markReady();
  }

  function setRecipeTransform(control, active) {
    if (!control) return;
    loadRecipeDish(control);
    control.classList.toggle("is-transformed", active);
    control.setAttribute("aria-pressed", String(active));
    const cardTitle = control.closest(".editorial-recipe-card")?.querySelector("h3")?.textContent?.trim() || "la receta";
    const productName = control.closest(".editorial-recipe-card")?.querySelector(".editorial-product-chip")?.textContent?.split(" · ")[0]?.trim() || "ICEMAN";
    control.setAttribute("aria-label", active ? `Mostrar el producto ${productName} usado en ${cardTitle}.` : `Mostrar el plato preparado de ${cardTitle}. Producto actual: ${productName} ICEMAN.`);
  }

  function setupRecipeTransforms(scope = root) {
    const controls = [...scope.querySelectorAll("[data-recipe-transform]")];
    if (!controls.length) return;
    if ("IntersectionObserver" in window) {
      recipeImageObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          loadRecipeDish(entry.target);
          recipeImageObserver?.unobserve(entry.target);
        });
      }, { rootMargin:"500px 0px", threshold:0.01 });
    }
    controls.forEach((control, index) => {
      if (index < 3 || !recipeImageObserver) loadRecipeDish(control);
      else recipeImageObserver.observe(control);
      control.addEventListener("pointerenter", () => loadRecipeDish(control), { once:true });
      control.addEventListener("focus", () => loadRecipeDish(control), { once:true });
    });
  }
  function recipeCover(recipe, index) {
    const product=productBySlug(recipe.products[0]);
    const visual=recipeVisual(recipe);
    const image=visual.image;
    const search=[recipe.title,recipe.description,...recipe.tags,...recipe.occasions].join(" ").toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g,"");
    return `<article class="recipe-cover" data-editorial-card data-category="recetas" data-search="${escapeHTML(search)}"><a class="recipe-cover-art recipe-visual-${visual.treatment}" href="${editorialPath(recipe)}" data-link aria-label="Abrir ${escapeHTML(recipe.title)}"><img class="recipe-cover-dish" src="${editorialImage(image)}" alt="${escapeHTML(visual.alt)}" loading="lazy"><span class="recipe-cover-index">${String(index+1).padStart(2,"0")} / LA MESA ICEMAN</span>${product && visual.treatment !== "pack"?`<img class="recipe-cover-pack" src="${asset(product.image)}" alt="Empaque de ${escapeHTML(product.name)}" loading="lazy">`:""}<span class="recipe-cover-open" aria-hidden="true">↗</span></a><div class="recipe-cover-copy"><span class="story-kicker">${escapeHTML(recipe.time)} · ${escapeHTML(recipe.difficulty)}</span><h3><a href="${editorialPath(recipe)}" data-link>${escapeHTML(recipe.title)}</a></h3><p>${escapeHTML(recipe.description)}</p><a href="${editorialPath(recipe)}" data-link class="recipe-link">Ver receta ${iconArrow()}</a></div></article>`;
  }
  function recipeMarquee() {
    const names=orderedRecipes().map(r=>`<a href="${editorialPath(r)}" data-link>${escapeHTML(r.title)}</a><span aria-hidden="true">✦</span>`).join("");
    return `<div class="recipe-marquee"><div class="recipe-marquee-window"><div class="recipe-marquee-track"><div>${names}</div><div aria-hidden="true" inert>${names}</div></div></div><button type="button" aria-pressed="false">Pausar títulos Ⅱ</button></div>`;
  }
  function editorialPage(path) {
    const choices=(group,values,active)=>`<div class="planner-options" data-choice-group="${group}">${values.map(value=>`<button type="button" data-choice="${group}" data-value="${value}" class="${value===active?"is-selected":""}" aria-pressed="${value===active}">${value}</button>`).join("")}</div>`;
    const content=`<div class="recipe-experience"><section class="idea-selector" id="elige-tu-idea"><div class="wrap idea-selector-layout"><div class="idea-selector-copy"><span class="story-kicker">UNA IDEA A TU MEDIDA</span><h1>¿Qué preparamos <em>hoy?</em></h1><p>Cuéntanos cuántos son, cuál es el plan y cómo quieres cocinar. Encuentra una idea para tu mesa.</p><div class="planner-step"><span>01</span><div><strong>¿Para cuántas personas?</strong>${choices("people",["1–2","3–4","5–8","8+"],"3–4")}</div></div><div class="planner-step"><span>02</span><div><strong>¿Cuál es el plan?</strong>${choices("plan",["Cena rápida","Desayuno","Reunión","Película","Partido"],"Cena rápida")}</div></div><div class="planner-step"><span>03</span><div><strong>¿Cómo quieres cocinar?</strong>${choices("method",["Air Fryer","Horno","Sartén","Lo más fácil"],"Sartén")}</div></div><a class="story-scroll" href="#las-recetas">↓ <span>Descubre todas las recetas</span></a></div><aside class="idea-result" aria-label="Receta sugerida"><div class="idea-result-image"><img id="planner-image" src="${editorialImage(editorial.recipes[0].image)}" alt="${escapeHTML(editorial.recipes[0].title)}"><span>✦ UNA IDEA PARA TI</span></div><div class="idea-result-copy"><span class="story-kicker">TU COMBINACIÓN ICEMAN</span><div aria-live="polite"><h2 id="planner-title"></h2><p id="planner-description"></p><div id="planner-products" class="idea-result-facts"></div><p id="planner-match" class="idea-match"></p></div><a id="planner-recipe-link" class="btn btn-primary" href="${editorialPath(editorial.recipes[0])}" data-link>Ver esta inspiración ${iconArrow()}</a></div></aside>${floatPacks("planner-floating")}</div></section>
    ${recipeMarquee()}
    <section class="recipe-library" id="las-recetas"><div class="wrap"><div class="recipe-library-heading"><div><span class="story-kicker">LA MESA ICEMAN</span><h2>Encuentra una.<br><em>Hazla tuya.</em></h2></div><p>Explora nuestras recetas y encuentra una para hoy. Tú le pones el toque especial.</p></div><nav class="recipe-section-nav" aria-label="Explorar inspiración"><a href="#las-recetas" aria-current="location">Recetas</a><a href="#ocasiones">Ocasiones ↗</a><label class="recipe-search"><span class="sr-only">Buscar recetas</span><input id="editorial-search" type="search" placeholder="Busca una receta o ingrediente…"></label></nav><p id="editorial-search-status" aria-live="polite"></p><div class="recipe-library-list" id="editorial-card-grid">${orderedRecipes().map(recipeCover).join("")}</div><div id="editorial-empty" class="editorial-empty" hidden>No encontramos recetas con esa búsqueda.</div></div></section>
    <section class="recipe-occasions" id="ocasiones"><div class="wrap"><div class="recipe-library-heading"><div><span class="story-kicker">CUALQUIER DÍA PUEDE SER ESPECIAL</span><h2>Elige el plan.<br><em>Comparte el sabor.</em></h2></div></div><div class="occasion-grid">${editorial.occasions.map(o=>`<a class="occasion-card" href="#las-recetas" data-occasion-link="${o.slug}"><img src="${editorialImage(o.image)}" alt="${escapeHTML(o.title)}" loading="lazy"><span class="occasion-overlay"><strong>${escapeHTML(o.title)}</strong><span>${escapeHTML(o.text)}</span><b>Ver ideas ${iconArrow()}</b></span></a>`).join("")}</div></div></section></div>`;
    pageShell(content,path);updateHead(path,"Recetas y ocasiones — La mesa ICEMAN","Encuentra recetas con productos ICEMAN para cocinar, disfrutar y compartir.");updatePlanner();
  }
  function updatePlanner() {
    const selected=Object.fromEntries([...root.querySelectorAll(".planner-options .is-selected")].map(b=>[b.dataset.choice,b.dataset.value]));
    const occasion={"Cena rápida":"cena","Desayuno":"fin-de-semana","Reunión":"reunion","Película":"peliculas","Partido":"partido"}[selected.plan];
    const range={"1–2":[1,2],"3–4":[3,4],"5–8":[5,8],"8+":[9,Infinity]}[selected.people];
    const candidates=orderedRecipes().map((recipe,index)=>{
      const portions=Number.parseInt(recipe.servings,10);
      const people=portions>=range[0]&&portions<=range[1];
      const plan=recipe.occasions.includes(occasion)&&(selected.plan!=="Desayuno"||recipe.tags.includes("desayuno"));
      const method=selected.method==="Lo más fácil"?recipe.difficulty==="Fácil":recipe.method.toLowerCase().includes(selected.method.toLowerCase());
      return {recipe,people,plan,method,score:Number(plan)*4+Number(method)*2+Number(people),index};
    }).sort((a,b)=>b.score-a.score||a.index-b.index);
    const match=candidates[0],recipe=match.recipe;
    root.querySelector("#planner-title").textContent=recipe.title;
    root.querySelector("#planner-description").textContent=recipe.description;
    const visual=recipeVisual(recipe);
    const image=root.querySelector("#planner-image");image.src=editorialImage(visual.image);image.alt=visual.alt;image.parentElement.className=`idea-result-image recipe-visual-${visual.treatment}`;
    root.querySelector("#planner-products").innerHTML=`<span>${escapeHTML(recipe.servings)} ${/porci/.test(recipe.servings)?"":"personas"}</span><span>${escapeHTML(recipe.time)}</span><span>${escapeHTML(recipe.method)}</span>`;
    const missing=[];
    if(!match.plan)missing.push("la ocasión");if(!match.method)missing.push("el método");if(!match.people)missing.push("la cantidad de personas");
    root.querySelector("#planner-match").textContent=missing.length?`No tenemos una coincidencia exacta para ${missing.join(" y ")}. Esta es una alternativa disponible; revisa las porciones y el método de la receta.`:"Una receta que coincide con tus opciones.";
    root.querySelector("#planner-recipe-link").href=withBase(editorialPath(recipe));
  }

  function editorialDetail(item, path) {
    const isRecipe = item.kind === "recipe";
    const isBusiness = item.kind === "business";
    const visual=isRecipe ? recipeVisual(item) : null;
    if(visual) item = {...item, image:visual.image,heroImage:visual.image,heroAlt:visual.alt};
    const relatedProducts = editorialProducts(item.products || []);
    const related = (isRecipe ? orderedRecipes().map(recipe=>({...recipe,kind:"recipe"})) : editorialAll).filter((other) => other.slug !== item.slug && other.kind === item.kind).slice(0,3);
    const productNames = relatedProducts.map((product) => product.name).join(", ");
    const body = isRecipe ? `<div class="recipe-method"><h2>Ingredientes</h2><ul class="recipe-ingredients">${item.ingredients.map((ingredient) => `<li>${escapeHTML(ingredient)}</li>`).join("")}</ul><h2>Preparación</h2><ol class="recipe-steps">${item.steps.map((step,index) => `<li><span>${String(index+1).padStart(2,"0")}</span><p>${escapeHTML(step)}</p></li>`).join("")}</ol><p class="recipe-note">Los tiempos son orientativos. Sigue las indicaciones del empaque y las instrucciones de tu electrodoméstico.</p><div class="recipe-share"><strong>Comparte esta receta</strong><a href="${waLink(`Mira esta receta de ICEMAN: ${item.title} ${publicUrl(path)}`)}" data-wa target="_blank" rel="noopener">WhatsApp ${iconArrow()}</a><button type="button" data-action="copy-link">Copiar enlace</button><span id="copy-status" aria-live="polite"></span></div></div>` : `<div class="article-body">${item.body.map((paragraph,index) => `<${index ? "h2" : "p"}>${escapeHTML(paragraph)}</${index ? "h2" : "p"}>`).join("")}${isBusiness ? `<div class="article-business-cta"><h2>¿Buscas productos para tu negocio?</h2><p>Cuéntanos qué necesitas y un asesor ICEMAN puede ayudarte con productos, presentaciones y opciones para tu operación.</p><a class="btn btn-primary" href="${waLink(businessMessage)}" data-wa target="_blank" rel="noopener">Hablar por WhatsApp ${iconArrow()}</a><a class="editorial-text-link" href="/empresas" data-link>Solicitar información</a></div>` : ""}</div>`;
    const editorialPoster = String(item.heroImage || item.image).startsWith("editorial/");
    const editorialLandscape = item.imageLayout === "landscape";
    const content = `<section class="editorial-detail ${isRecipe ? "recipe-detail" : ""}"><div class="wrap"><div class="editorial-detail-breadcrumb">${breadcrumbs([{name:"Inicio",href:"/"},{name:"Recetas y ocasiones",href:"/recetas"},{name:isRecipe?"Recetas":item.category,href:"/recetas"},{name:item.title}])}</div><div class="editorial-detail-hero"><div class="editorial-detail-copy"><div class="eyebrow">${isRecipe ? "RECETA ICEMAN" : escapeHTML(item.category)}</div><h1>${escapeHTML(item.title)}</h1><p>${escapeHTML(item.description)}</p>${isRecipe ? `<p class="editorial-guidance">Sigue las indicaciones del empaque para obtener el mejor resultado.</p>` : ""}${isRecipe ? `<div class="recipe-facts"><span><small>TIEMPO</small><b>${escapeHTML(item.time)}</b></span><span><small>DIFICULTAD</small><b>${escapeHTML(item.difficulty)}</b></span><span><small>PORCIONES</small><b>${escapeHTML(item.servings)}</b></span><span><small>MÉTODO</small><b>${escapeHTML(item.method)}</b></span></div>` : `<span class="article-reading-time">Ideas claras para llevar a tu mesa.</span>`}<div class="editorial-detail-actions"><a class="editorial-text-link" href="#contenido">${isRecipe?"Ir a la receta":"Leer artículo"} ↓</a></div></div><div class="editorial-detail-image ${visual ? `recipe-visual-${visual.treatment}` : ""} ${editorialPoster ? "editorial-detail-poster" : ""} ${editorialLandscape ? "editorial-detail-landscape" : ""}"><img src="${editorialImage(item.heroImage || item.image)}" alt="${escapeHTML(item.heroAlt || (isRecipe ? `Plato preparado: ${item.title}` : item.title))}" fetchpriority="high">${String(item.heroImage || item.image).startsWith("editorial/") ? "" : `<span>${isRecipe ? "PRODUCTOS ICEMAN" : "RECETAS & CONSEJOS"}</span>`}</div></div><div class="editorial-detail-layout" id="contenido"><article>${body}</article><aside class="editorial-detail-aside"><small>${relatedProducts.length ? (isRecipe ? "EN ESTA IDEA" : "PRODUCTOS MENCIONADOS") : "SIGUE EXPLORANDO"}</small><strong>${relatedProducts.length ? escapeHTML(productNames) : escapeHTML(item.category)}</strong><a href="/productos" data-link>Explorar productos ${iconArrow()}</a></aside></div>${relatedProducts.length ? `<section class="editorial-section detail-products"><div class="section-head"><div><div class="eyebrow">Del contenido al catálogo</div><h2>${isRecipe ? "Productos ICEMAN para esta receta" : "Productos ICEMAN relacionados"}</h2></div></div>${productRail(relatedProducts,"detail-products-rail")}</section>` : ""}${isRecipe ? `<section class="editorial-section detail-products"><div class="section-head"><div><div class="eyebrow">Una combinación a tu gusto</div><h2>También queda bien con…</h2></div></div>${productRail(editorialProducts(["papas-air-fryer","aros-de-cebolla","hash-brown","corte-ondulado-900-premium","smoothie-red"]),"detail-discovery-rail")}</section>` : ""}<section class="editorial-section detail-related"><div class="section-head"><div><div class="eyebrow">Sigue explorando</div><h2>Más ideas para disfrutar</h2></div></div><div class="editorial-card-grid">${related.map((entry) => editorialCard(entry)).join("")}</div></section></div></section>`;
    pageShell(content,path);
    updateHead(path,item.title,`${item.description} ${isRecipe ? `Tiempo: ${item.time}. Dificultad: ${item.difficulty}.` : ""}`);
    const imageMeta = document.querySelector('meta[property="og:image"]'); if (imageMeta) imageMeta.content = `${window.location.origin}${editorialImage(item.heroImage || item.image)}`;
    const twitterImage = document.querySelector('meta[name="twitter:image"]'); if (twitterImage && imageMeta) twitterImage.content = imageMeta.content;
    if (isRecipe) {
      const recipeSchema = {"@context":"https://schema.org","@type":"Recipe",name:item.title,description:item.description,image:`${window.location.origin}${editorialImage(item.heroImage || item.image)}`,recipeCategory:"Acompañamiento",recipeCuisine:"Ecuatoriana",recipeYield:item.servings,prepTime:`PT${(item.time.match(/\d+/)||["10"])[0]}M`,recipeIngredient:item.ingredients,recipeInstructions:item.steps.map((text)=>({"@type":"HowToStep",text})),author:{"@type":"Organization",name:"ICEMAN Ecuador"}};
      addSchema({"@context":"https://schema.org","@graph":[recipeSchema,breadcrumbSchema([{name:"Inicio",href:"/"},{name:"Recetas y ocasiones",href:"/recetas"},{name:item.title,href:path}])]});
    } else addSchema({"@context":"https://schema.org","@graph":[{"@type":"Article",headline:item.title,description:item.description,image:`${window.location.origin}${editorialImage(item.heroImage || item.image)}`,author:{"@type":"Organization",name:"ICEMAN Ecuador"},publisher:{"@type":"Organization",name:"ICEMAN Ecuador"}},breadcrumbSchema([{name:"Inicio",href:"/"},{name:"Recetas y ocasiones",href:"/recetas"},{name:item.title,href:path}])]});
  }

  function catalogPage(path, categorySlug = null) {
    const category = categorySlug ? categoryBySlug[categorySlug] : null;
    const query = new URLSearchParams(window.location.search).get("q") || "";
    searchValue = query;
    activeFilter = categorySlug || "todos";
    const headerText = category ? category.name : query ? `Resultados para “${query}”` : "Del empaque a tu mesa.";
    const intro = `<section class="page-intro" id="productos" data-nav-section="products"><div class="wrap">${breadcrumbs([{ name:"Inicio", href:"/" },{ name:"Productos", href:"/productos" },...(category ? [{ name:category.name }] : [])])}<div class="page-heading"><div class="eyebrow">Catálogo ICEMAN</div><h1>${escapeHTML(headerText)}</h1><p>${category ? escapeHTML(category.note)+". Descubre cómo llevarlos a tu mesa." : "Elige tus favoritos. Desliza los comparadores para descubrir otra forma de disfrutarlos."}</p></div></div></section>
      <div class="catalog-toolbar" id="categorias" data-nav-section="categories"><div class="wrap toolbar-inner"><div class="category-chips" role="group" aria-label="Filtrar por categoría"><button class="chip ${activeFilter === "todos" ? "active" : ""}" data-filter="todos" aria-pressed="${activeFilter === "todos"}">Todos</button>${categories.map((item) => `<button class="chip ${activeFilter === item.slug ? "active" : ""}" data-filter="${item.slug}" aria-pressed="${activeFilter === item.slug}">${escapeHTML(item.name)}</button>`).join("")}</div><span class="toolbar-count" id="catalog-count" aria-live="polite"></span></div></div>
      <section class="catalog-results"><div class="wrap"><div id="catalog-content"></div></div></section>`;
    pageShell(intro, path);
    renderCatalogResults(categorySlug || "todos", query);

    updateHead(path, category ? `Productos ${category.name}` : query ? `Resultados de búsqueda para ${query}` : "Catálogo de productos", category ? `${category.note}. Consulta presentaciones y preparación en el catálogo ICEMAN.` : "Explora el catálogo de productos congelados ICEMAN: papas, vegetales, helados, smoothies, especialidades y más.");
    track("category_view", { category: categorySlug || "all" });
    if (category) addSchema(breadcrumbSchema([{ name:"Inicio", href:"/" },{ name:"Productos", href:"/productos" },{ name:category.name, href:`/productos/${category.slug}` }]));
  }

  function renderCatalogResults(filter, query = "") {
    activeFilter = filter;
    const normal = query.trim().toLocaleLowerCase("es");
    let shown = products.filter((product) => (filter === "todos" || product.category === filter) && (!normal || [product.name, product.brand, product.presentation, product.sap || "", categoryLabel(product.category)].join(" ").toLocaleLowerCase("es").includes(normal)));
    const content = document.getElementById("catalog-content");
    const count = document.getElementById("catalog-count");
    if (!content || !count) return;
    count.textContent = `${shown.length} ${shown.length === 1 ? "producto" : "productos"}`;
    if (!shown.length) {
      content.innerHTML = `<div class="catalog-empty"><strong>No encontramos productos con esa búsqueda.</strong><p>Prueba otro nombre o selecciona una categoría.</p><button class="btn btn-outline btn-small" type="button" data-action="clear-search">Ver todo el catálogo</button></div>`;
      setupMotion(content);
      return;
    }
    if (filter !== "todos") {
      content.innerHTML = `<div class="product-grid">${shown.map(productCard).join("")}</div>`;
      setupMotion(content);
      return;
    }
    const grouped = categories.map((category) => ({ category, items: shown.filter((product) => product.category === category.slug) })).filter((group) => group.items.length);
    content.innerHTML = grouped.map(({ category, items }) => `<section class="category-section"><h2>${escapeHTML(category.name)}</h2><div class="product-grid">${items.map(productCard).join("")}</div></section>`).join("");
    setupMotion(content);
  }

  function productPage(product, path) {
    track("product_view", { product_name: product.name, product_category: product.category, item_id: product.sap || product.slug });
    const category = categoryBySlug[product.category];
    const similar = products.filter((item) => item.slug !== product.slug && item.family === product.family).sort((a, b) => Number(b.category === product.category) - Number(a.category === product.category)).slice(0, 8);
    const recipeIdeas = editorial.recipes.filter((recipe) => recipe.products.some((slug) => productBySlug(slug)?.family === product.family)).slice(0, 3);
    const text = `Hola, equipo de ICEMAN. Me gustaría recibir información sobre ${product.name}.`;
    const content = `<section class="product-detail"><div class="wrap">${breadcrumbs([{ name:"Inicio", href:"/" },{ name:"Productos", href:"/productos" },{ name:category.name, href:`/productos/${category.slug}` },{ name:product.name }])}<div class="detail-grid"><div class="detail-image">${productScene(product)}</div><div class="detail-copy"><span class="detail-brand">${escapeHTML(product.brand)} · ${escapeHTML(category.name)}</span><h1>${escapeHTML(product.name)}</h1><p>${escapeHTML(product.description)}</p><div class="detail-meta"><div class="meta-cell"><small>Presentación</small><strong>${escapeHTML(product.presentation)}</strong></div><div class="meta-cell"><small>Unidades por caja</small><strong>${escapeHTML(product.units || "Consultar")}</strong></div>${product.pvp ? `<div class="meta-cell"><small>PVP</small><strong>${escapeHTML(product.pvp)}</strong></div>` : ""}${product.sap ? `<div class="meta-cell"><small>Código SAP</small><strong>${escapeHTML(product.sap)}</strong></div>` : ""}<div class="meta-cell"><small>Conservación</small><strong>−18 °C</strong></div></div><div class="detail-spec"><h2>Preparación y conservación</h2><ul class="prep-list">${product.prep.map((line) => `<li>${escapeHTML(line)}</li>`).join("")}</ul></div><div class="detail-note">Mantener congelado a −18 °C. No descongelar antes de utilizar, salvo que el modo de preparación del producto indique lo contrario. Los tiempos pueden variar según el electrodoméstico.</div><div class="detail-actions"><a class="btn btn-primary" href="/donde-encontrarnos" data-link>Dónde encontrarnos ${iconArrow()}</a><a class="btn btn-outline" href="${waLink(text)}" data-wa target="_blank" rel="noopener">Consultar por WhatsApp</a></div></div></div></div></section>${similar.length ? `<section class="similar-section"><div class="wrap"><div class="section-head section-head-row"><div><div class="eyebrow">Más de ${escapeHTML(category.name)}</div><h2>También te puede interesar</h2></div><a class="text-link" href="/productos/${category.slug}" data-link>Ver categoría ${iconArrow()}</a></div><div class="related-track">${similar.map(productCard).join("")}</div></div></section>` : ""}`;
    const recipeSection = recipeIdeas.length ? `<section class="editorial-section product-recipe-ideas"><div class="wrap"><div class="section-head"><div><div class="eyebrow">Ideas para disfrutarlo</div><h2>Recetas con ${escapeHTML(product.name)}</h2></div><a class="text-link" href="/recetas" data-link>Ver Recetas y ocasiones ${iconArrow()}</a></div><div class="editorial-card-grid">${recipeIdeas.map((recipe) => editorialCard({ ...recipe, kind:"recipe" })).join("")}</div></div></section>` : "";
    pageShell(`${content}${recipeSection}`, path);
    const image = document.querySelector('meta[property="og:image"]') || document.createElement("meta");
    image.setAttribute("property", "og:image"); image.content = `${window.location.origin}${asset(product.image)}`; if (!image.parentNode) document.head.append(image);
    const twitterImage = document.querySelector('meta[name="twitter:image"]'); if (twitterImage) twitterImage.content = image.content;
    updateHead(path, product.name, `${product.description} Presentación ${product.presentation}. Consulta información y disponibilidad a ICEMAN Ecuador.`);
    const crumbItems = breadcrumbSchema([{ name:"Inicio", href:"/" },{ name:"Productos", href:"/productos" },{ name:category.name, href:`/productos/${category.slug}` },{ name:product.name, href:productPath(product) }]).itemListElement;
    addSchema({ "@context":"https://schema.org", "@graph":[
      { "@type":"Product", name:product.name, image:`${window.location.origin}${asset(product.image)}`, description:product.description, sku:product.sap || product.slug, brand:{ "@type":"Brand", name:product.brand } },
      { "@type":"BreadcrumbList", itemListElement:crumbItems }
    ] });
  }

  function breadcrumbSchema(parts) {
    return { "@context":"https://schema.org", "@type":"BreadcrumbList", itemListElement:parts.map((part, index) => ({ "@type":"ListItem", position:index+1, name:part.name, item:publicUrl(part.href || window.location.pathname) })) };
  }

  function addSchema(schema) {
    document.querySelectorAll('script[data-schema="page"]').forEach((node) => node.remove());
    const script = document.createElement("script"); script.type = "application/ld+json"; script.dataset.schema = "page"; script.textContent = JSON.stringify(schema); document.head.append(script);
  }

  function businessPage(path) {
    formStarted = false;
    const leadHint = document.querySelector('meta[name="iceman-lead-endpoint"]')?.content?.trim()
      ? "Tu solicitud se enviará al equipo ICEMAN y se abrirá WhatsApp con tu consulta para que puedas revisarla y compartirla."
      : "Al enviar, se abrirá WhatsApp con tu consulta para que puedas revisarla y compartirla con ICEMAN.";
    const businesses = ["Restaurante","Hotel","Cafetería","Supermercado","Minimarket","Distribuidor","Catering","Otro"];
    const interests = ["Papas","Vegetales","Especialidades","Air Fryer","Helados","Smoothies","Waffles","Otros"];
    const content = `<section class="business-page"><div class="wrap business-page-grid"><div class="business-lede">${breadcrumbs([{ name:"Inicio", href:"/" },{ name:"Para tu negocio" }])}<div class="eyebrow">Atención comercial</div><h1>Una buena operación empieza con los productos correctos.</h1><p>Cuéntanos qué necesita tu negocio. Nuestro equipo te ayudará a encontrar categorías y presentaciones adecuadas para tu operación.</p><div class="business-points"><div class="business-point"><b>01</b><span>Atención para restaurantes, hoteles, tiendas y distribuidores.</span></div><div class="business-point"><b>02</b><span>Información de presentaciones y productos del catálogo ICEMAN.</span></div><div class="business-point"><b>03</b><span>Contacto directo con el equipo comercial por WhatsApp.</span></div></div><div class="business-audience" aria-label="Tipo de negocio"><span class="home-kicker">Comienza por tu negocio</span><div class="business-audience-options"><button type="button" data-business-audience="Restaurante" aria-pressed="false">Restaurante</button><button type="button" data-business-audience="Hotel" aria-pressed="false">Hotel</button><button type="button" data-business-audience="Supermercado" aria-pressed="false">Comercio</button></div><p id="business-audience-status" aria-live="polite">Selecciona tu tipo de negocio y completa la consulta.</p></div><div class="business-product-composition" aria-label="Selección de empaques oficiales ICEMAN"><span aria-hidden="true">ICEMAN · ECUADOR</span><img src="${asset(homeShowcase[1].product.image)}" alt="Empaque ICEMAN de Mix jardinera" loading="lazy" decoding="async"><img src="${asset(homeShowcase[0].product.image)}" alt="Empaque ICEMAN de Papas Air Fryer" loading="lazy" decoding="async"></div></div>
      <form class="lead-form" id="lead-form" novalidate><div class="form-section"><h2>Cuéntanos de tu negocio</h2><div class="form-grid"><div class="field"><label for="lead-name">Nombre <span aria-hidden="true">*</span></label><input id="lead-name" name="name" autocomplete="name" required><span class="field-error">Escribe tu nombre.</span></div><div class="field"><label for="lead-company">Empresa <span aria-hidden="true">*</span></label><input id="lead-company" name="company" autocomplete="organization" required><span class="field-error">Escribe el nombre de la empresa.</span></div><div class="field"><label for="lead-role">Cargo</label><input id="lead-role" name="role" autocomplete="organization-title"></div><div class="field"><label for="lead-city">Ciudad <span aria-hidden="true">*</span></label><input id="lead-city" name="city" autocomplete="address-level2" required><span class="field-error">Escribe tu ciudad.</span></div><div class="field"><label for="lead-phone">Teléfono / WhatsApp <span aria-hidden="true">*</span></label><input id="lead-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" required><span class="field-error">Ingresa un número de contacto válido.</span></div><div class="field"><label for="lead-email">Correo electrónico <span aria-hidden="true">*</span></label><input id="lead-email" name="email" type="email" autocomplete="email" required><span class="field-error">Ingresa un correo válido.</span></div><div class="field full"><label for="lead-business-type">Tipo de negocio <span aria-hidden="true">*</span></label><select id="lead-business-type" name="business_type" required><option value="">Selecciona una opción</option>${businesses.map((name) => `<option>${name}</option>`).join("")}</select><span class="field-error">Selecciona el tipo de negocio.</span></div></div></div>
      <div class="form-section"><h2>¿Qué productos te interesan?</h2><div class="check-grid">${interests.map((name) => `<label class="check-option"><input type="checkbox" name="interests" value="${name}"><span>${name}</span></label>`).join("")}</div></div>
      <div class="form-section"><h2>Cuéntanos un poco más</h2><div class="form-grid"><div class="field full"><label for="lead-volume">Volumen aproximado o necesidad</label><input id="lead-volume" name="volume" placeholder="Opcional"></div><div class="field full"><label for="lead-message">Mensaje</label><textarea id="lead-message" name="message" placeholder="¿Qué te gustaría consultar?"></textarea></div></div></div>
      <div class="sr-only" aria-hidden="true"><label for="lead-website">No llenar este campo</label><input id="lead-website" name="website" tabindex="-1" autocomplete="off"></div><label class="consent"><input type="checkbox" name="consent" required><span>Acepto ser contactado por ICEMAN respecto a esta solicitud. <a href="/privacidad" data-link>Lee la política de privacidad</a>. <span aria-hidden="true">*</span></span></label><p class="field-error consent-error">Acepta el contacto para continuar.</p><div class="form-error" id="form-error" role="alert"></div><div class="form-success" id="form-success" role="status"></div><div class="submit-row"><button class="btn btn-primary" type="submit">Solicitar información ${iconArrow()}</button><span class="submit-hint">${leadHint}</span></div></form></div></section>`;
    const reading = `<section class="business-reading"><div class="wrap"><div class="section-head"><div><div class="eyebrow">Para tu negocio</div><h2>Ideas para tu operación.</h2></div></div><div class="editorial-card-grid">${editorial.business.map(item=>editorialCard({...item,kind:"business"})).join("")}</div></div></section>`;
    pageShell(content + reading, path);
    updateHead(path, "Productos ICEMAN para empresas", "Solicita información comercial sobre productos y presentaciones ICEMAN para restaurantes, hoteles, cafeterías, supermercados y distribuidores en Ecuador.");
    document.querySelectorAll("#lead-form input, #lead-form select, #lead-form textarea").forEach((field) => field.addEventListener("focus", () => {
      if (!formStarted) { formStarted = true; track("b2b_form_start"); }
    }, { once:true }));
  }

  function contactPage(path) {
    const cities = [
      ["Quito · Matriz", "Antonio Castillo OE1-464 y Av. Juan de Selis. Carcelén Industrial.", "PBX: 02 394 8180 · 099 946 2554"],
      ["Cuenca", "Luis Vélez Álvarez y Av. Loja.", "Cel.: 099 417 3515"],
      ["Manta", "D.A. PRODUCONG. Calle 124 y Av. 103 / Los Esteros.", "Cel.: 099 300 4128 · 096 857 4624"],
      ["Santo Domingo", "D.A. Disbar. Urb. Las Guaduas, Calle H. Fierro y Crespo Toral.", "Cel.: 099 759 9620"],
      ["Guayaquil", "Km 7½ Vía Daule, Bodegas Hilantex.", "Telf.: 099 364 3640"],
      ["Ambato", "Av. El Cóndor y Bolivariana.", "Telf.: 099 428 6645"]
    ];
    const content = `<section class="page-intro"><div class="wrap">${breadcrumbs([{ name:"Inicio", href:"/" },{ name:"Contacto" }])}<div class="page-heading"><div class="eyebrow">Estamos para ayudarte</div><h1>Conversemos.</h1><p>Escríbenos para consultar productos, cobertura o información para tu negocio.</p></div></div></section><section class="section"><div class="wrap contact-panel"><article class="contact-card"><h2>Contacto comercial</h2><div class="contact-map-placeholder"><p>Ver ubicación de ICEMAN, matriz en Carcelén Industrial, Quito.</p><button type="button" class="btn btn-outline btn-small" data-load-map>Cargar mapa de Google Maps</button></div><a href="${waLink(contactMessage)}" data-wa target="_blank" rel="noopener">WhatsApp · +593 99 915 2518</a><a href="tel:+593999152518" data-contact>Información · 099 915 2518</a><p>Para una cotización empresarial, cuéntanos sobre tu negocio.</p><a class="btn btn-primary btn-small" href="/empresas" data-link>Formulario para empresas ${iconArrow()}</a></article><article class="contact-card"><h2>Oficinas y distribuidores</h2>${cities.map(([name,address,phone]) => `<div class="contact-city"><h3>${escapeHTML(name)}</h3><p>${escapeHTML(address)}<br>${escapeHTML(phone)}</p></div>`).join("")}</article></div></section>`;
    pageShell(content, path);
    updateHead(path, "Contacto ICEMAN Ecuador", "Contacta al equipo comercial ICEMAN por WhatsApp o consulta las oficinas y distribuidores en Ecuador.");
  }

  // Client-supplied prepared dishes. The comparison keeps the existing pack
  // geometry and only swaps the visual shown on the “En tu mesa” side.
  const dishScenes = {
    "papas-air-fryer": {image:"catalog/prepared/papas-air-fryer.png",alt:"Papas Air Fryer preparadas y servidas en un plato verde"},
    "corte-ondulado-900-premium": {image:"catalog/prepared/corte-ondulado-900-premium.png",alt:"Papas onduladas preparadas y servidas en un plato verde"},
    "corte-recto-900-premium": {image:"catalog/prepared/corte-recto-900-premium.png",alt:"Papas de corte recto preparadas y servidas en un plato verde"},
    "papa-steak": {image:"catalog/prepared/papa-steak.png",alt:"Papa Steak preparada y servida en un plato verde"},
    "papas-spices": {image:"catalog/prepared/papas-spices.png",alt:"Papas con especias preparadas y servidas en un plato verde"},
    "papas-finas-hierbas": {image:"catalog/prepared/papas-finas-hierbas.png",alt:"Papas con finas hierbas preparadas y servidas en un plato verde"},
    "papas-rejilla": {image:"catalog/prepared/papas-rejilla.png",alt:"Papas rejilla preparadas y servidas en un plato verde"},
    "hash-brown": {image:"catalog/prepared/hash-brown.png",alt:"Hash Brown preparado y servido en un plato verde"},
    "aros-de-cebolla": {image:"catalog/prepared/aros-de-cebolla.png",alt:"Aros de cebolla preparados y servidos en un plato verde"},
    "croqueta-de-yuca": {image:"catalog/prepared/croqueta-de-yuca.png",alt:"Croquetas de yuca preparadas y servidas en un plato verde"},
    "zanahoria-ondulada": {image:"catalog/prepared/zanahoria-ondulada.png",alt:"Zanahoria ondulada servida en un plato verde"},
    "ensalada-rusa": {image:"catalog/prepared/ensalada-rusa.png",alt:"Ensalada rusa servida en un plato verde"},
    "maiz-dulce-450": {image:"catalog/prepared/maiz-dulce-450.png",alt:"Maíz dulce preparado y servido en un plato verde"},
    "mix-jardinera-450": {image:"catalog/prepared/mix-jardinera-450.png",alt:"Mix jardinera preparado y servido en un plato verde"},
    "arvejas-450": {image:"catalog/prepared/arvejas-450.png",alt:"Arvejas preparadas y servidas en un plato verde"},
    "edamame-vaina": {image:"catalog/prepared/edamame-vaina.png",alt:"Edamame en vaina preparado y servido en un plato verde",className:"dish-edamame-vaina",version:"full-plate-20261028"},
    "edamame-grano": {image:"catalog/prepared/edamame-grano.png",alt:"Edamame en grano preparado y servido en un plato verde",className:"dish-edamame-grano"},
    "salteado-de-verduras": {image:"catalog/prepared/salteado-de-verduras.png",alt:"Salteado de verduras preparado y servido en un plato verde"},
    "yuca-500": {image:"catalog/prepared/yuca-500.png",alt:"Trozos de yuca preparados y servidos en un plato verde"},
    "helado-paila-mora": {image:"catalog/prepared/helado-paila-mora.png",alt:"Helado de mora servido en un plato verde"},
    "helado-paila-naranjilla": {image:"catalog/prepared/helado-paila-naranjilla.png",alt:"Helado de naranjilla servido en un plato verde"},
    "helado-paila-guanabana": {image:"catalog/prepared/helado-paila-guanabana.png",alt:"Helado de guanábana servido en un plato verde"},
    "helado-paila-naranjilla-hierbabuena": {image:"catalog/prepared/helado-paila-naranjilla-hierbabuena.png",alt:"Helado de naranjilla y hierbabuena servido en un plato verde"},
    "smoothie-green": {image:"catalog/prepared/smoothie-green.png",alt:"Smoothie Green servido en un plato verde"},
    "smoothie-orange": {image:"catalog/prepared/smoothie-orange.png",alt:"Smoothie Orange servido en un plato verde"},
    "smoothie-red": {image:"catalog/prepared/smoothie-red.png",alt:"Smoothie Red servido en un plato verde"},
    "waffle-glaseado": {image:"catalog/prepared/waffle-glaseado.png",alt:"Waffle glaseado preparado y servido en un plato verde"}
  };
  // The transparent and photographic canvases have different intrinsic ratios.
  // These optical corrections keep the visible dish as tall as its pack without
  // changing the pack scale or distorting either image.
  const comparisonScales = {
    "papas-air-fryer":[1,1,1],
    "corte-ondulado-900-premium":[.87,.87,.62],
    "corte-recto-900-premium":[.88,.88,.63],
    "papa-steak":[.95,.95,1.11],
    "papas-spices":[.97,.97,.97],
    "papas-finas-hierbas":[.81,.81,.81],
    "papas-rejilla":[.85,.85,.85],
    "hash-brown":[.74,.74,.74],
    "aros-de-cebolla":[.74,.74,.74],
    "croqueta-de-yuca":[.77,.77,.77],
    "salteado-de-verduras":[1.06,1.06,1.06],
    "edamame-vaina":[1.07,1.07,1.07],
    "edamame-grano":[1.07,1.07,1.07],
    "maiz-dulce-450":[1.01,1.01,1.01],
    "arvejas-450":[.99,.99,.99],
    "ensalada-rusa":[1,1,1],
    "mix-jardinera-450":[1.01,1.01,1.01],
    "yuca-500":[.71,.71,.71],
    "zanahoria-ondulada":[.83,.83,.83],
    "helado-paila-mora":[1.15,1.15,1.09],
    "helado-paila-naranjilla":[1.34,1.34,1.34],
    "helado-paila-guanabana":[1.16,1.16,1.09],
    "helado-paila-naranjilla-hierbabuena":[1.19,1.19,1.19],
    "smoothie-green":[.92,.92,.92],
    "smoothie-orange":[.91,.91,.91],
    "smoothie-red":[.87,.87,.87],
    "waffle-glaseado":[1.68,1.68,1.20]
  };
  function productScene(product) {
    const dish = dishScenes[product.slug];
    const pack = `<img src="${cutoutAsset(product.image)}" alt="Empaque de ${escapeHTML(product.name)}, ${escapeHTML(product.presentation)}" loading="lazy" decoding="async">`;
    if (!dish) return `<div class="product-photo">${pack}</div>`;
    const dishBaseSrc = dish.source === "prepared" ? `${projectBase}/assets/${dish.image}` : dish.image.startsWith("catalog/prepared/") ? `${projectBase}/assets/catalog/prepared-cutout/${dish.image.split("/").pop()}` : editorialImage(dish.image);
    const dishSrc = dish.version ? `${dishBaseSrc}?v=${dish.version}` : dishBaseSrc;
    const [desktopScale=1,tabletScale=desktopScale,mobileScale=desktopScale] = comparisonScales[product.slug] || [];
    const scaleStyle = `--dish-scale:${desktopScale};--dish-scale-tablet:${tabletScale};--dish-scale-mobile:${mobileScale}`;
    return `<div class="product-comparison" data-comparison data-comparison-product="${product.slug}" data-comparison-side="mix" style="--split:50%;${scaleStyle}"><div class="comparison-scene"><div class="comparison-dish ${dish.className || ""}"><img src="${dishSrc}" alt="${dish.alt}" loading="lazy" decoding="async"></div><div class="comparison-pack">${pack}</div><span class="comparison-line" aria-hidden="true"><b>↔</b></span><input type="range" min="0" max="100" value="50" data-compare-range aria-label="Revelar preparación de ${escapeHTML(product.name)}" aria-valuetext="50% empaque, 50% preparación"></div><div class="comparison-captions"><span>En el empaque</span><span>En tu mesa</span></div><p class="comparison-cue">Desliza y descubre <span aria-hidden="true">↔</span></p></div>`;
  }
  function floatPacks(className = "") {
    return `<div class="floating-packs ${className}" aria-hidden="true"><img src="${asset("air-fryer")}" alt="" class="float-pack pack-one" loading="lazy"><img src="${asset("edamame-grano")}" alt="" class="float-pack pack-two" loading="lazy"><img src="${asset("papas-rejilla")}" alt="" class="float-pack pack-three" loading="lazy"></div>`;
  }
  const storyConcepts = [
    {title:"PRACTICIDAD",text:"Soluciones que hacen más fácil tu día.",image:"occasion-quick-dinner.webp",alt:"Preparación de una comida en casa"},
    {title:"VERSATILIDAD",text:"Un producto, muchas formas de disfrutarlo.",image:"recipe-onion-chicken-plate.png",alt:"Pollo con ensalada y aros de cebolla"},
    {title:"PARA COMPARTIR",text:"Sabores que reúnen alrededor de la mesa.",image:"occasion-home-sharing.webp",alt:"Una mesa compartida con amigos"}
  ];
  const storyValues = [
    {title:"CERCANÍA",text:"Te acompañamos a ti y a tu familia con soluciones pensadas para las necesidades de cada día.",image:"occasion-weekend-breakfast.webp",alt:"Desayuno para compartir en casa"},
    {title:"INNOVACIÓN",text:"Buscamos productos y soluciones que abren nuevas posibilidades.",image:"article-edamame-clean.png",alt:"Bowl de salmón con edamame"},
    {title:"CONFIANZA",text:"Cuidamos la calidad de todo lo que llevamos hasta ti.",image:"recipe-waffles-franui-clean.png",alt:"Waffles con frutos rojos"}
  ];
  function storySelector(items, id, title, hint, number) {
    return `<section class="story-section story-selector" data-story-selector="${id}"><div class="wrap"><div class="story-section-head"><span class="story-number">${number} / SOMOS ICEMAN</span><h2>${title}</h2><p>${hint}</p></div><div class="story-selector-layout"><div class="story-options" role="group" aria-label="${title}">${items.map((item,i)=>`<button type="button" data-story-option="${i}" aria-pressed="${i===0}" aria-controls="story-panel-${id}"><span>0${i+1}</span>${item.title}<b aria-hidden="true">↗</b></button>`).join("")}</div><div class="story-panel" id="story-panel-${id}"><div class="story-panel-image"><img src="${editorialImage(`editorial/${items[0].image}`)}" alt="${items[0].alt}" loading="lazy"></div><p aria-live="polite">${items[0].text}</p></div></div></div></section>`;
  }
  function aboutPage(path) {
    const words = "Hacerlo fácil no significa hacerlo siempre igual.".split(" ");
    const content = `<div class="brand-story"><section class="story-hero" data-reveal-hero><div class="story-hidden-photo" aria-hidden="true"><img src="${editorialImage("editorial/occasion-home-sharing.webp")}" alt=""></div><div class="wrap story-hero-inner"><div class="story-hero-copy"><span class="story-kicker">SOMOS ICEMAN</span><h1>Lo hacemos fácil.<br><em>Tú lo haces especial.</em></h1><p class="story-reveal-hint">Mueve el cursor o toca para destapar nuestra mesa</p><div class="story-hero-actions"><a href="#trayectoria" class="story-scroll">↓ <span>Desliza para conocernos</span></a><button class="story-reveal-toggle" type="button" data-reveal-toggle aria-pressed="false">Descubre nuestra mesa ↗</button></div></div>${floatPacks("hero-story-packs")}</div></section>
    <section class="story-section story-history" id="trayectoria"><div class="wrap"><span class="story-number">02 / CERCA DE TI</span><div class="story-history-grid"><h2>Más de <em>20 años</em> cerca de tu mesa</h2><div class="story-history-copy"><p>ICEMAN es una marca ecuatoriana de alimentos congelados con más de 20 años de trayectoria. Forma parte de Kypross, una empresa especializada en la elaboración, importación y distribución de alimentos. Ofrecemos una amplia variedad de productos pensados para hacer más fáciles tus comidas de todos los días y abrirte nuevas posibilidades en la cocina.</p><p>A lo largo de los años hemos ampliado nuestras categorías y nuestra presencia en el país, manteniendo nuestro compromiso con la calidad, la variedad y la confianza. También queremos demostrarte que elegir congelados no significa renunciar al sabor ni al valor nutricional: procesos como IQF ayudan a conservar las características de los alimentos.</p></div></div><div class="story-history-foot"><img src="${editorialImage("editorial/occasion-quick-dinner.webp")}" alt="Preparando una comida para disfrutar en casa" loading="lazy"><p>Pensamos en ti, en tu familia y en las necesidades reales de cada día.</p></div></div></section>
    ${storySelector(storyConcepts,"concepts","Elegir ICEMAN significa elegir…","Toca cada concepto y mira cómo cambia la historia","03")}
    <section class="story-purpose" data-story-purpose><div class="wrap purpose-sticky"><div class="purpose-copy"><span class="story-number">04 / NUESTRO PROPÓSITO</span><h2 aria-label="Hacerlo fácil no significa hacerlo siempre igual.">${words.map(w=>`<span aria-hidden="true">${w}</span>`).join(" ")}</h2><p>Existimos para que la falta de tiempo nunca limite la posibilidad de comer rico, crear algo diferente y compartir.</p></div><div class="purpose-photos">${["recipe-onion-rings.webp","article-edamame-clean.png","occasion-home-sharing.webp"].map((name,i)=>`<img class="${i===0?"is-active":""}" src="${editorialImage(`editorial/${name}`)}" alt="${["Aros de cebolla listos para servir","Una preparación con edamame","Sabores para compartir en la mesa"][i]}" loading="lazy">`).join("")}</div></div></section>
    ${storySelector(storyValues,"values","Así hacemos las cosas","Selecciona un valor para descubrir cómo se vive en ICEMAN","05")}
    <section class="story-closing"><div class="wrap"><span class="story-number">06 / ESTO RECIÉN EMPIEZA</span><h2>Hay mucho<br>por <em>descubrir.</em></h2><a class="btn btn-primary" href="/productos" data-link>Conoce nuestros productos ${iconArrow()}</a>${floatPacks("closing-packs")}</div></section></div>`;
    pageShell(content,path);
    updateHead(path,"Somos ICEMAN — Lo hacemos fácil. Tú lo haces especial.","Conoce ICEMAN, una marca ecuatoriana con más de 20 años cerca de tu mesa.");
  }
  function stockistsPage(path) {
    pageShell(`<div class="stockists-page"><section class="brand-page-intro"><div class="wrap">${breadcrumbs([{name:"Inicio",href:"/"},{name:"Dónde encontrarnos"}])}<span class="story-kicker">CERCA DE TU MESA</span><h1>Tus favoritos.<br><em>Más cerca de ti.</em></h1><p>Encuentra productos ICEMAN en estos establecimientos.</p></div><img src="${asset("air-fryer")}" alt="Papas Air Fryer ICEMAN" class="stockists-hero-pack"></section><section class="stockists-directory"><div class="wrap"><div class="stockists-directory-head"><h2>Dónde encontrarnos</h2><p>La presencia de la marca en una cadena no garantiza la disponibilidad de cada producto en todas sus sucursales. Consulta el surtido con tu establecimiento.</p></div><ul class="stockists-grid">${stockists.map(item=>`<li><div><img src="${projectBase}/assets/stockists/${item.logo}" alt="" loading="lazy"></div><h3>${escapeHTML(item.name)}</h3></li>`).join("")}</ul><a href="/contacto" data-link class="text-link">¿Necesitas ayuda? Contacta con ICEMAN ${iconArrow()}</a></div></section></div>`,path);
    updateHead(path,"Dónde encontrarnos","Consulta los establecimientos donde encuentras productos ICEMAN en Ecuador.");
  }
  function setupExperience() {
    const controller = new AbortController(), signal = controller.signal;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    root.addEventListener("input", e=>{
      if (!e.target.matches("[data-compare-range]")) return;
      const value=Number(e.target.value);
      const comparison=e.target.closest("[data-comparison]");
      comparison.style.setProperty("--split",`${value}%`);
      comparison.dataset.comparisonSide=value >= 98 ? "pack" : value <= 2 ? "dish" : "mix";
      e.target.setAttribute("aria-valuetext",`${value}% empaque, ${100-value}% preparación`);
    },{signal});
    root.querySelectorAll("[data-story-selector]").forEach(section=>{
      section.addEventListener("click",e=>{
        const button=e.target.closest("[data-story-option]"); if (!button) return;
        const items=section.dataset.storySelector==="concepts"?storyConcepts:storyValues;
        const item=items[Number(button.dataset.storyOption)];
        section.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",String(b===button)));
        const image=section.querySelector(".story-panel img"); image.src=editorialImage(`editorial/${item.image}`); image.alt=item.alt;
        section.querySelector(".story-panel p").textContent=item.text;
      },{signal});
    });
    const hero=root.querySelector("[data-reveal-hero]");
    if(hero){
      const update=e=>{ if (e.target.closest("a,button")) return; const rect=hero.getBoundingClientRect(); hero.style.setProperty("--reveal-x",`${e.clientX-rect.left}px`);hero.style.setProperty("--reveal-y",`${e.clientY-rect.top}px`);hero.classList.add("is-revealing");};
      hero.addEventListener("pointermove",update,{signal,passive:true});
      hero.addEventListener("pointerdown",update,{signal,passive:true});
      hero.addEventListener("pointerleave",()=>hero.classList.remove("is-revealing"),{signal});
      hero.addEventListener("pointercancel",()=>hero.classList.remove("is-revealing"),{signal});
      hero.querySelector("[data-reveal-toggle]").addEventListener("click",e=>{ const active=hero.classList.toggle("is-photo-visible");e.currentTarget.setAttribute("aria-pressed",String(active));e.currentTarget.textContent=active?"Volver a los empaques ↗":"Descubre nuestra mesa ↗";},{signal});
    }
    let frame=0;
    const purpose=root.querySelector("[data-story-purpose]");
    const updatePurpose=()=>{
      frame=0;if(!purpose)return;
      const rect=purpose.getBoundingClientRect();
      const progress=reduced.matches?1:Math.max(0,Math.min(1,(innerHeight*.6-rect.top)/(rect.height-innerHeight*.3)));
      const words=purpose.querySelectorAll("h2 span");words.forEach((word,i)=>word.classList.toggle("lit",progress>=(i/(words.length+1))));
      purpose.querySelectorAll(".purpose-photos img").forEach((img,i)=>{const active=reduced.matches||i===Math.min(2,Math.floor(progress*3));img.classList.toggle("is-active",active);img.setAttribute("aria-hidden",String(!active));});
    };
    if(purpose){ window.addEventListener("scroll",()=>{if(!frame) frame=requestAnimationFrame(updatePurpose);},{signal,passive:true});window.addEventListener("resize",updatePurpose,{signal});reduced.addEventListener("change",updatePurpose,{signal});updatePurpose(); }
    const marquee=root.querySelector(".recipe-marquee");
    if(marquee){
      const observer=new IntersectionObserver(([entry])=>marquee.classList.toggle("is-offscreen",!entry.isIntersecting));observer.observe(marquee);
      signal.addEventListener("abort",()=>observer.disconnect(),{once:true});
      marquee.querySelector("button").addEventListener("click",e=>{const paused=marquee.classList.toggle("is-paused");e.currentTarget.setAttribute("aria-pressed",String(paused));e.currentTarget.textContent=paused?"Reanudar títulos ▶":"Pausar títulos Ⅱ";},{signal});
    }
    experienceCleanup=()=>{controller.abort();cancelAnimationFrame(frame);};
  }
  function notFound(path) {
    pageShell(`<section class="not-found"><div><div class="eyebrow" style="justify-content:center">Página no encontrada</div><h1>Sigamos explorando.</h1><p>El enlace puede haber cambiado.</p><a class="btn btn-primary" href="/productos" data-link>Ver productos ${iconArrow()}</a></div></section>`, path);
    updateHead(path, "Página no encontrada", "El enlace solicitado no se encontró. Explora el catálogo de productos ICEMAN.");
  }

  function legalPage(path, kind) {
    const privacy = kind === "privacy";
    const title = privacy ? "Política de privacidad" : "Términos y condiciones";
    const copy = privacy
      ? `<p><strong>Responsable:</strong> ICEMAN Ecuador.</p><h2>Datos y finalidad</h2><p>El formulario para empresas solicita nombre, empresa, ciudad, teléfono, correo y tipo de negocio, además de campos opcionales. Se envían a Formspree para recibir y gestionar tu solicitud comercial y permitir que ICEMAN te contacte. Los enlaces de WhatsApp permiten contactar al equipo por ese servicio.</p><h2>Cookies y analítica</h2><p>El sitio usa almacenamiento local para recordar preferencias. Google Analytics 4 (ID G-EP2322YPPC) solo se carga si la persona acepta analítica; Google puede usar cookies y recibir datos de uso. La elección se cambia desde «Cookies» en el pie.</p><h2>Servicios externos</h2><p>Al abrir WhatsApp, Instagram o Google Maps se accede a servicios sujetos a sus propias políticas. El sitio no controla su tratamiento de datos.</p><h2>Contacto y derechos</h2><p>Para consultas de privacidad o ejercer tus derechos, visita la página de <a href="/contacto" data-link>Contacto</a>.</p>`
      : `<p>Al navegar el sitio, la persona visitante acepta usarlo conforme a la ley y no interferir con su funcionamiento.</p><h2>Contenido y propiedad intelectual</h2><p>Los textos, marcas, fotografías y demás materiales se muestran con fines informativos y pertenecen a sus respectivos titulares. No se autoriza su reproducción comercial sin permiso.</p><h2>Productos y solicitudes</h2><p>El catálogo es informativo. Presentaciones, disponibilidad y características pueden cambiar; confirma la información con el equipo comercial. Una solicitud no constituye oferta ni confirma una compra.</p><h2>Servicios externos</h2><p>Los enlaces a WhatsApp, Instagram, Google Maps y otros servicios se rigen por las condiciones de sus proveedores.</p><h2>Responsabilidad y contacto</h2><p>Para consultas, visita la página de <a href="/contacto" data-link>Contacto</a>.</p>`;
    pageShell(`<section class="page-intro"><div class="wrap">${breadcrumbs([{name:"Inicio",href:"/"},{name:title}])}<div class="page-heading"><div class="eyebrow">ICEMAN Ecuador</div><h1>${title}</h1><p>${privacy ? "Información sobre datos y preferencias de analítica." : "Condiciones generales para navegar este sitio web."}</p></div></div></section><section class="section legal-page"><div class="wrap legal-copy">${copy}</div></section>`,path);
    updateHead(path,title,privacy ? "Información sobre datos tratados por el sitio ICEMAN Ecuador, el formulario y las preferencias de analítica." : "Condiciones generales de uso del sitio y catálogo ICEMAN Ecuador.");
  }

  function consentUI(force = false) {
    const host=document.getElementById("consent-root"); if (!host) return;
    if (localStorage.getItem("iceman-consent") && !force) { host.innerHTML=""; return; }
    host.innerHTML=`<section class="cookie-banner" role="dialog" aria-label="Preferencias de analítica" aria-describedby="cookie-description"><div><strong>Tu privacidad importa</strong><p id="cookie-description">Google Analytics solo se carga si aceptas analítica.</p></div><div class="cookie-actions"><button type="button" data-consent="reject">Rechazar analítica</button><button type="button" data-consent="accept">Aceptar analítica</button></div></section>`;
  }

  function saveConsent(analytics) {
    localStorage.setItem("iceman-consent",JSON.stringify({essential:true,analytics,updatedAt:new Date().toISOString()}));
    if (analytics) {
      window.dataLayer=window.dataLayer||[]; window.gtag=window.gtag||function(){window.dataLayer.push(arguments);};
      window.gtag("js",new Date()); window.gtag("config","G-EP2322YPPC",{anonymize_ip:true});
      if (!document.querySelector("script[data-iceman-analytics]")) { const script=document.createElement("script"); script.async=true; script.src="https://www.googletagmanager.com/gtag/js?id=G-EP2322YPPC"; script.dataset.icemanAnalytics="true"; document.head.append(script); }
    } else if (typeof window.gtag === "function") window.gtag("consent","update",{analytics_storage:"denied"});
    consentUI();
  }

  function render() {
    scrollSpyCleanup?.();
    scrollSpyCleanup = null;
    const path = withoutBase(window.location.pathname).replace(/\/$/, "") || "/";
    const parts = path.split("/").filter(Boolean);
    if (path === "/") { activeFilter = "todos"; pageShell(home(), path); setupScrollSpy(); addSchema({ "@context":"https://schema.org", "@type":"Organization", name:"ICEMAN Ecuador", url:publicUrl("/"), telephone:"+593 99 915 2518", contactPoint:{ "@type":"ContactPoint", telephone:"+593 99 915 2518", contactType:"sales", areaServed:"EC" } }); }
    else if (path === "/productos") catalogPage(path);
    else if (path === "/productos/air-fryer") { history.replaceState({}, "", withBase("/productos/papas")); catalogPage("/productos/papas", "papas"); }
    else if (parts[0] === "productos" && parts.length === 2 && categoryBySlug[parts[1]]) catalogPage(path, parts[1]);
    else if (parts[0] === "productos" && parts.length >= 3) {
      const slug = parts[parts.length - 1]; const product = products.find((item) => item.slug === slug);
      product ? productPage(product, path) : notFound(path);
    }
    else if (path === "/recetas") editorialPage(path);
    else if (parts[0] === "recetas" && parts.length === 2) { const item = editorialItem(parts[1]); item ? editorialDetail(item,path) : notFound(path); }
    else if (path === "/empresas") businessPage(path);
    else if (path === "/contacto") contactPage(path);
    else if (path === "/donde-encontrarnos") stockistsPage(path);
    else if (path === "/nosotros") aboutPage(path);
    else if (path === "/privacidad") legalPage(path,"privacy");
    else if (path === "/terminos") legalPage(path,"terms");
    else notFound(path);
    document.body.classList.toggle("menu-open", menuOpened);
  }

  function navigate(href, { replace = false, sharedImage = null } = {}) {
    const url = new URL(href, window.location.origin);
    const target = `${withBase(withoutBase(url.pathname))}${url.search}${url.hash}`;
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    searchOpened = false; menuOpened = false; searchValue = "";
    const commit = () => {
      if (replace) history.replaceState({}, "", target); else history.pushState({}, "", target);
      render();
      const main = root.querySelector("main"); main?.setAttribute("tabindex","-1"); main?.focus({preventScroll:true});
      if (url.hash) scrollToHash(url.hash, reducedMotion ? "auto" : "smooth");
      else window.scrollTo({ top:0, behavior:"auto" });
    };
    if (sharedImage && !reducedMotion && document.startViewTransition) {
      sharedImage.style.viewTransitionName = "iceman-editorial-image";
      const transition = document.startViewTransition(() => {
        commit();
        const targetImage = root.querySelector(".editorial-detail-image img");
        if (targetImage) targetImage.style.viewTransitionName = "iceman-editorial-image";
      });
      transition.finished.finally(() => { root.querySelector(".editorial-detail-image img")?.style.removeProperty("view-transition-name"); });
    } else commit();
  }

  root.addEventListener("click", (event) => {
    const recipeTransform = event.target.closest("[data-recipe-transform]");
    if (recipeTransform) {
      if (event.detail > 0 && matchMedia("(hover: hover) and (pointer: fine)").matches) return;
      setRecipeTransform(recipeTransform, recipeTransform.getAttribute("aria-pressed") !== "true");
      return;
    }
    const anchor = event.target.closest("a");
    if (anchor?.dataset.productLink && anchor.closest(".related-track,.editorial-rail")) track("related_product_click", { product_slug: anchor.dataset.productLink });
    if (anchor?.hasAttribute("data-link") && withoutBase(new URL(anchor.href, window.location.origin).pathname) === "/contacto") track("contact_click", { target:"contact_page" });
    const isPlainInternalClick = event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
    if (anchor?.hasAttribute("data-link") && isPlainInternalClick && !anchor.hasAttribute("download") && (!anchor.target || anchor.target === "_self")) { event.preventDefault(); navigate(anchor.getAttribute("href"), { sharedImage:anchor.closest(".editorial-recipe-card")?.querySelector(".editorial-recipe-dish") || anchor.closest(".home-recipe,.editorial-card")?.querySelector("img") || null }); return; }
    if (anchor?.hasAttribute("data-wa")) track("whatsapp_click", { placement: anchor.classList.contains("whatsapp-float") ? "floating" : "link" });
    if (anchor?.hasAttribute("data-contact")) track("contact_click", { target: anchor.getAttribute("href") });
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (event.target.closest("[data-load-map]")) {
      const frame=document.createElement("iframe"); frame.className="contact-map"; frame.title="Mapa de ICEMAN, matriz en Carcelén Industrial, Quito"; frame.loading="lazy"; frame.referrerPolicy="no-referrer-when-downgrade"; frame.allowFullscreen=true; frame.src="https://maps.google.com/maps?q=Antonio%20Castillo%20OE1-464%20y%20Av.%20Juan%20de%20Selis%2C%20Carcel%C3%A9n%20Industrial%2C%20Quito%2C%20Ecuador&output=embed"; event.target.closest(".contact-map-placeholder").replaceWith(frame); return;
    }
    if (action === "cookie-settings") { event.preventDefault(); consentUI(true); document.querySelector('[data-consent="reject"]')?.focus(); }
    if (action === "search" || action === "close-search" || action === "menu") {
      menuOpened = action === "menu" ? !menuOpened : false;
      searchOpened = action === "search" ? !searchOpened : false;
      document.body.classList.toggle("menu-open", menuOpened);
      const menu = root.querySelector(".mobile-panel");
      menu.classList.toggle("open", menuOpened);
      menu.inert = !menuOpened;
      const toggle = root.querySelector('[data-action="menu"]');
      toggle.setAttribute("aria-expanded", String(menuOpened));
      toggle.setAttribute("aria-label", menuOpened ? "Cerrar menú" : "Abrir menú");
      toggle.querySelector(".menu-lines").classList.toggle("is-open", menuOpened);
      root.querySelector(".search-bar").hidden = !searchOpened;
      root.querySelector('[data-action="search"]').setAttribute("aria-expanded", String(searchOpened));
      if (menuOpened) menu.querySelector("a")?.focus({ preventScroll:true });
      else if (searchOpened) root.querySelector("#site-search")?.focus({ preventScroll:true });
      else root.querySelector(`[data-action="${action === "menu" ? "menu" : "search"}"]`)?.focus({ preventScroll:true });
    }
    if (action === "clear-search") { searchValue = ""; navigate("/productos"); }
    const filter = event.target.closest("[data-filter]")?.dataset.filter;
    if (filter) {
      navigate(filter === "todos" ? "/productos" : `/productos/${filter}`);
    }
    const scroll = event.target.closest("[data-scroll]");
    if (scroll) document.getElementById(`${scroll.dataset.scroll}-track`)?.scrollBy({ left:Number(scroll.dataset.direction) * 300, behavior:"smooth" });
    const editorialScroll = event.target.closest("[data-scroll-editorial]");
    if (editorialScroll) document.getElementById(editorialScroll.dataset.scrollEditorial)?.scrollBy({ left:Number(editorialScroll.dataset.direction) * 300, behavior:"smooth" });
    const editorialFilter = event.target.closest("[data-editorial-filter]");
    if (editorialFilter) {
      root.querySelectorAll("[data-editorial-filter]").forEach((button) => { const active = button === editorialFilter; button.classList.toggle("is-active",active); button.setAttribute("aria-pressed",String(active)); });
      const updateResults = () => applyEditorialSearch(root.querySelector("#editorial-search")?.value || "", editorialFilter.dataset.editorialFilter);
      if (document.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) document.startViewTransition(updateResults);
      else updateResults();
    }
    const choice = event.target.closest("[data-choice]");
    if (choice) { root.querySelectorAll(`[data-choice="${choice.dataset.choice}"]`).forEach((button) => { const active = button === choice; button.classList.toggle("is-selected",active); button.setAttribute("aria-pressed",String(active)); }); updatePlanner(); }
    const audience = event.target.closest("[data-business-audience]");
    if (audience) {
      root.querySelectorAll("[data-business-audience]").forEach((button) => button.setAttribute("aria-pressed", String(button === audience)));
      const type = root.querySelector("#lead-business-type");
      if (type) { type.value = audience.dataset.businessAudience; type.closest(".field")?.classList.remove("has-error"); type.setAttribute("aria-invalid", "false"); }
      const status = root.querySelector("#business-audience-status");
      if (status) status.textContent = `${audience.textContent.trim()} seleccionado. Completa los productos de interés en el formulario.`;
    }
    if (event.target.closest('[data-action="copy-link"]')) {
      const status = root.querySelector("#copy-status");
      navigator.clipboard?.writeText(window.location.href).then(() => { if (status) status.textContent = "Enlace copiado"; }).catch(() => { if (status) status.textContent = "Copia la dirección desde tu navegador"; });
    }
    const occasionLink = event.target.closest("[data-occasion-link]");
    if (occasionLink) {
      event.preventDefault();
      root.querySelectorAll("[data-editorial-filter]").forEach((button) => {
        const active = button.dataset.editorialFilter === "recetas";
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
      });
      const search = root.querySelector("#editorial-search");
      if (search) search.value = occasionLink.dataset.occasionLink;
      applyEditorialSearch(occasionLink.dataset.occasionLink, "recetas");
      root.querySelector("#editorial-card-grid")?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    }
  });

  function applyEditorialSearch(query, filter = root.querySelector("[data-editorial-filter].is-active")?.dataset.editorialFilter || "todos") {
    const normalized = query.trim().toLocaleLowerCase("es");
    const cards = [...root.querySelectorAll("[data-editorial-card]")];
    let shown = 0;
    cards.forEach((card) => {
      const matchesFilter = filter === "todos" || card.dataset.category === filter;
      const matchesQuery = !normalized || card.dataset.search.includes(normalized.normalize("NFD").replace(/[\u0300-\u036f]/g,""));
      card.hidden = !(matchesFilter && matchesQuery); if (!card.hidden) shown++;
    });
    const occasionSection = root.querySelector('[data-editorial-section="ocasiones"]');
    if (occasionSection) occasionSection.hidden = !(filter === "todos" || filter === "ocasiones") || Boolean(normalized);
    const productSection = root.querySelector('[data-editorial-section="recetas"]');
    if (productSection) productSection.hidden = !(filter === "todos" || filter === "recetas") || Boolean(normalized);
    const businessSection = root.querySelector('[data-editorial-section="negocios"]');
    if (businessSection) businessSection.hidden = !(filter === "todos" || filter === "negocios") || Boolean(normalized);
    const empty = root.querySelector("#editorial-empty"); if (empty) empty.hidden = shown > 0;
    const status = root.querySelector("#editorial-search-status"); if (status) status.textContent = normalized ? `${shown} ${shown === 1 ? "resultado" : "resultados"}` : "";
    const productResults = root.querySelector("#editorial-product-results");
    let matchedProducts = [];
    if (productResults && normalized && filter !== "nutricion" && filter !== "negocios" && filter !== "ocasiones") matchedProducts = products.filter((product) => [product.name,product.brand,product.presentation,categoryLabel(product.category),product.description,...product.prep].join(" ").toLocaleLowerCase("es").includes(normalized));
    if (productResults) productResults.innerHTML = matchedProducts.length ? `<div class="editorial-product-results-head"><span>PRODUCTOS</span><a href="/productos?q=${encodeURIComponent(query)}" data-link>Ver catálogo ${iconArrow()}</a></div><div class="product-grid editorial-search-products">${matchedProducts.slice(0,6).map(productCard).join("")}</div>` : "";
    if (status && normalized) status.textContent = `${shown + matchedProducts.length} ${(shown + matchedProducts.length) === 1 ? "resultado" : "resultados"}`;
    if (empty) { empty.hidden = shown > 0 || matchedProducts.length > 0 || filter === "ocasiones"; empty.textContent = "No encontramos ideas con esa búsqueda. Prueba con “papas”, “reunión” o “congelado”."; }
  }
  root.addEventListener("input", (event) => { if (event.target.id === "editorial-search") applyEditorialSearch(event.target.value); });

  root.addEventListener("submit", async (event) => {
    const form = event.target;
    if (form.matches('[data-form="search"]')) {
      event.preventDefault(); const value = new FormData(form).get("q")?.toString().trim() || "";
      searchValue = value; track("search"); searchOpened = false; navigate(value ? `/productos?q=${encodeURIComponent(value)}` : "/productos"); return;
    }
    if (form.id !== "lead-form") return;
    event.preventDefault();
    const errorBox = document.getElementById("form-error"); const successBox = document.getElementById("form-success"); errorBox.classList.remove("show"); successBox.classList.remove("show");
    const controls = [...form.querySelectorAll("input[required], select[required]")]; let firstInvalid = null;
    controls.forEach((field) => {
      const wrapper = field.closest(".field"); const value = field.type === "checkbox" ? field.checked : field.value.trim(); let invalid = !value;
      if (field.name === "email" && value) invalid = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      if (field.name === "phone" && value) invalid = value.replace(/\D/g, "").length < 7;
      if (wrapper) { wrapper.classList.toggle("has-error", invalid); field.setAttribute("aria-invalid", String(invalid)); }
      if (invalid && !firstInvalid) firstInvalid = field;
    });
    const consent = form.elements.consent;
    form.querySelector(".consent-error").style.display = consent.checked ? "none" : "block";
    if (!consent.checked && !firstInvalid) firstInvalid = consent;
    if (firstInvalid) { firstInvalid.focus(); errorBox.textContent = "Revisa los campos marcados para continuar."; errorBox.classList.add("show"); return; }
    if (form.dataset.submitting === "true") return;
    if (form.elements.website.value.trim()) return;
    form.dataset.submitting = "true";
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) { submitButton.disabled = true; submitButton.setAttribute("aria-busy","true"); }
    const values = new FormData(form);
    const chosen = values.getAll("interests");
    const message = [
      "Hola, equipo de ICEMAN. Me interesa conocer sus opciones de distribución y abastecimiento para empresas.",
      `Nombre: ${values.get("name")}`,
      `Empresa: ${values.get("company")}`,
      values.get("role") ? `Cargo: ${values.get("role")}` : "",
      `Ciudad: ${values.get("city")}`,
      `Teléfono / WhatsApp: ${values.get("phone")}`,
      `Correo: ${values.get("email")}`,
      `Tipo de negocio: ${values.get("business_type")}`,
      chosen.length ? `Productos de interés: ${chosen.join(", ")}` : "",
      values.get("volume") ? `Volumen o necesidad: ${values.get("volume")}` : "",
      values.get("message") ? `Mensaje: ${values.get("message")}` : ""
    ].filter(Boolean).join("\n");
    const endpoint = document.querySelector('meta[name="iceman-lead-endpoint"]')?.content?.trim();
    // Open during the submit gesture, before awaiting the backend response,
    // so browsers can open WhatsApp without treating it as a delayed popup.
    const preparedWhatsAppLink = waLink(message);
    const opened = window.open(preparedWhatsAppLink, "_blank", "noopener,noreferrer");
    const whatsAppAction = `<a href="${preparedWhatsAppLink}" data-wa target="_blank" rel="noopener">Abrir WhatsApp con mis datos</a>`;
    if (endpoint) {
      try {
        if (new URL(endpoint,window.location.href).protocol !== "https:") throw new Error("El formulario requiere un endpoint seguro HTTPS.");
        const payload = Object.fromEntries(values); payload.interests = values.getAll("interests");
        const response = await fetch(endpoint, { method:"POST", headers:{ "Content-Type":"application/json", "Accept":"application/json" }, body:JSON.stringify(payload) });
        if (!response.ok) throw new Error("No se pudo enviar la solicitud.");
        // A successful HTTP response is the endpoint's receipt contract. Never
        // count validation, errors, or opening a prepared WhatsApp message.
        trackConfirmedLead();
        successBox.innerHTML = `Gracias. Recibimos tu solicitud y el equipo ICEMAN se pondrá en contacto contigo. También puedes revisar y enviar tu consulta por WhatsApp. ${whatsAppAction}.`; successBox.classList.add("show"); form.reset(); track("b2b_form_submit", { destination:"backend" });
      } catch { errorBox.innerHTML = `No pudimos registrar tu solicitud en este momento. Puedes enviarla por WhatsApp. ${whatsAppAction}.`; errorBox.classList.add("show"); }
      finally { delete form.dataset.submitting; if (submitButton) { submitButton.disabled = false; submitButton.removeAttribute("aria-busy"); } }
      return;
    }
    track("b2b_form_submit", { destination:"whatsapp" });
    if (opened) successBox.textContent = "WhatsApp se abrió con los datos de tu consulta. Revísalos y envíalos para contactar al equipo ICEMAN.";
    else successBox.innerHTML = `Tu consulta está lista. <a href="${preparedWhatsAppLink}" data-wa target="_blank" rel="noopener">Abrir WhatsApp con mis datos</a>.`;
    successBox.classList.add("show");
    delete form.dataset.submitting;
    if (submitButton) { submitButton.disabled = false; submitButton.removeAttribute("aria-busy"); }
  });

  const clearFieldError = (event) => {
    const field = event.target.closest(".field input, .field select");
    if (field) { field.closest(".field")?.classList.remove("has-error"); field.removeAttribute("aria-invalid"); }
  };
  root.addEventListener("input", clearFieldError);
  root.addEventListener("change", (event) => {
    clearFieldError(event);
    if (event.target.name === "consent" && event.target.checked) { const err = root.querySelector(".consent-error"); if (err) err.style.display = "none"; }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Tab" && menuOpened) {
      const controls = [root.querySelector('[data-action="menu"]'), ...root.querySelectorAll('.mobile-panel a')];
      const current = controls.indexOf(document.activeElement);
      if (event.shiftKey && current <= 0) { event.preventDefault(); controls.at(-1)?.focus(); }
      else if (!event.shiftKey && (current < 0 || current === controls.length - 1)) { event.preventDefault(); controls[0]?.focus(); }
    }
    if (event.key === "Escape") { if (menuOpened || searchOpened) { menuOpened = false; searchOpened = false; document.body.classList.remove("menu-open");
      root.querySelector(".mobile-panel")?.classList.remove("open");
      root.querySelector(".mobile-panel").inert = true;
      root.querySelector(".search-bar").hidden = true;
      root.querySelectorAll('[data-action="menu"],[data-action="search"]').forEach(button => button.setAttribute("aria-expanded", "false"));
      root.querySelector(".menu-lines")?.classList.remove("is-open");
      root.querySelector('[data-action="menu"]').setAttribute("aria-label", "Abrir menú");
      root.querySelector('[data-action="menu"]')?.focus({ preventScroll:true }); } } });
  window.addEventListener("popstate", () => { render(); scrollToHash(window.location.hash, "auto"); });
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) document.documentElement.classList.add("no-motion");
  const restoredRoute = new URLSearchParams(window.location.search).get("__route");
  if (restoredRoute) {
    const restoredUrl = new URL(restoredRoute, window.location.origin);
    history.replaceState({}, "", `${withBase(withoutBase(restoredUrl.pathname))}${restoredUrl.search}${restoredUrl.hash}`);
  }
  document.getElementById("consent-root")?.addEventListener("click", (event) => {
    const button=event.target.closest("[data-consent]");
    if (button) saveConsent(button.dataset.consent === "accept");
  });
  render();
  try { const consent=JSON.parse(localStorage.getItem("iceman-consent")||"null"); if (consent?.analytics) saveConsent(true); else consentUI(); }
  catch { consentUI(); }
  scrollToHash(window.location.hash, "auto");
})();
