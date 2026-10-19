(() => {
  const catalog = window.ICEMAN_CATALOG;
  const projectBase = /^\/ICEMAN\.com(?:\/|$)/.test(window.location.pathname) ? "/ICEMAN.com" : "";
  const withBase = (path) => `${projectBase}${path.startsWith("/") ? path : `/${path}`}` || "/";
  const withoutBase = (path) => projectBase && (path === projectBase || path.startsWith(`${projectBase}/`)) ? path.slice(projectBase.length) || "/" : path;
  const products = catalog.products;
  const editorial = window.ICEMAN_EDITORIAL;
  const categories = catalog.categories;
  const waNumber = "593999152518";
  const root = document.getElementById("app");
  const categoryBySlug = Object.fromEntries(categories.map((item) => [item.slug, item]));
  let activeFilter = "todos";
  let searchValue = "";
  let searchOpened = false;
  let menuOpened = false;
  let formStarted = false;
  let scrollSpyCleanup = null;
  let motionObserver = null;
  let stockistsCleanup = null;

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
    return `<article class="product-card">
      <a class="product-card-link" href="${productPath(product)}" data-link data-product-link="${escapeHTML(product.slug)}" aria-label="Ver ${escapeHTML(product.name)}, presentación ${escapeHTML(product.presentation)}">
        <div class="product-photo"><img class="${product.slug === "helado-paila-naranjilla" ? "product-image-naranjilla" : ""}" src="${asset(product.image)}" alt="Empaque de ${escapeHTML(product.name)} ICEMAN, presentación ${escapeHTML(product.presentation)}" loading="lazy" decoding="async"><span class="product-badge">${escapeHTML(product.brand)}</span></div>
        <div class="product-info"><div class="product-brand">${escapeHTML(categoryLabel(product.category))}</div><h3 class="product-title">${escapeHTML(product.name)}</h3><div class="product-meta">${escapeHTML(product.presentation)}${product.units ? ` · Caja de ${escapeHTML(product.units)} unidades` : ""}</div><div class="product-more"><span>Ver producto</span>${iconArrow()}</div></div>
      </a>
    </article>`;
  }

  function header(path) {
    const parts = path.split("/").filter(Boolean);
    const activeNav = path.startsWith("/productos")
      ? (parts.length === 2 || window.location.hash === "#categorias" ? "categories" : "products")
      : path.startsWith("/empresas") ? "business"
      : path.startsWith("/nosotros") ? "about"
      : path.startsWith("/contacto") ? "contact"
      : path.startsWith("/recetas") ? "editorial"
      : "home";
    const links = [
      ["/#inicio", "Inicio", "home"],
      ["/productos", "Productos", "products"],
      ["/recetas", "Recetas", "editorial"],
      ["/#donde-encontrarnos", "Dónde encontrarnos", "stockists"],
      ["/empresas", "Para empresas", "business"],
      ["/contacto", "Contacto", "contact"]
    ];
    return `<header class="site-header"><div class="wrap header-inner">
      <a href="/" data-link class="brand" aria-label="ICEMAN Ecuador, inicio"><img class="brand-official-logo" src="/assets/iceman-logo-cliente.jpg" alt="ICEMAN, alimentos congelados" fetchpriority="high"></a>
      <nav class="desktop-nav" aria-label="Navegación principal">${links.map(([href, label, key]) => `<a href="${href}" data-link data-nav="${key}" ${activeNav === key ? 'aria-current="page"' : ""}>${label}</a>`).join("")}</nav>
      <div class="header-actions"><button class="icon-btn" type="button" data-action="search" aria-label="Buscar productos" aria-controls="site-search-panel" aria-expanded="${searchOpened}"><span class="search-glyph" aria-hidden="true"></span></button><a class="btn btn-primary btn-small header-quote" href="/empresas" data-link>Solicitar cotización ${iconArrow()}</a><button class="menu-toggle" type="button" data-action="menu" aria-label="${menuOpened ? "Cerrar menú" : "Abrir menú"}" aria-expanded="${menuOpened}" aria-controls="mobile-menu"><span class="menu-lines ${menuOpened ? "is-open" : ""}" aria-hidden="true"><span></span><span></span></span></button></div>
      </div>
      <div class="search-bar" id="site-search-panel" ${searchOpened ? "" : "hidden"}><form class="wrap search-inner" data-form="search"><span class="search-glyph" aria-hidden="true"></span><label class="sr-only" for="site-search">Buscar productos</label><input id="site-search" type="search" name="q" placeholder="Buscar papas, vegetales, smoothies…" value="${escapeHTML(searchValue)}" autocomplete="off"><button class="search-close" type="button" data-action="close-search" aria-label="Cerrar búsqueda">×</button></form></div>
      <nav id="mobile-menu" class="mobile-panel ${menuOpened ? "open" : ""}" aria-label="Menú móvil" ${menuOpened ? "" : "inert"}>${links.map(([href, label, key]) => `<a href="${href}" data-link data-nav="${key}" ${activeNav === key ? 'aria-current="page"' : ""}>${label}</a>`).join("")}<a class="mobile-sub mobile-whatsapp" href="${waLink(contactMessage)}" data-wa target="_blank" rel="noopener">${iconWhatsApp()} Hablar por WhatsApp</a><a class="mobile-sub" href="/empresas" data-link>Solicitar cotización ${iconArrow()}</a></nav>
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
    const update = () => {
      frame = 0;
      const headerHeight = root.querySelector(".site-header")?.getBoundingClientRect().height || 0;
      const activationLine = headerHeight + 24;
      let current = sections[0].dataset.navSection;
      for (const section of sections) {
        if (section.getBoundingClientRect().top <= activationLine) current = section.dataset.navSection;
        else break;
      }
      setActiveNav(current);
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
      <div class="footer-brand-block"><a href="/" data-link class="brand footer-brand"><img class="brand-symbol" src="/assets/iceman-symbol-white.png" alt=""><span class="brand-lockup"><img class="brand-wordmark" src="/assets/iceman-wordmark-white.png" alt="IceMan"><small>ECUADOR</small></span></a><p>Alimentos ultracongelados, prácticos y listos para disfrutar. Una selección para cada día y para cada negocio.</p></div>
      <div class="footer-col"><h3>Productos</h3><a href="/productos/papas" data-link>Papas</a><a href="/productos/vegetales" data-link>Vegetales</a><a href="/productos/especialidades" data-link>Especialidades</a><a href="/productos/helados" data-link>Helados</a><a href="/productos" data-link>Ver catálogo completo</a></div>
      <div class="footer-col"><h3>ICEMAN</h3><a href="/nosotros" data-link>Nosotros</a><a href="/empresas" data-link>Para empresas</a><a href="/recetas" data-link>Recetas & Consejos</a><a href="/contacto" data-link>Contacto</a><a href="/contacto" data-link>Consulta las opciones de distribución con nuestro equipo.</a></div>
      <div class="footer-col"><h3>Contacto</h3><a href="${waLink(contactMessage)}" data-wa target="_blank" rel="noopener">WhatsApp · 099 915 2518</a><a href="tel:+593999152518" data-contact>Información · 099 915 2518</a></div>
    </div><div class="footer-bottom"><span>© ICEMAN ${new Date().getFullYear()}. Todos los derechos reservados.</span><span>Productos ultracongelados · Ecuador</span><div class="footer-legal"><a href="/privacidad" data-link>Privacidad</a><a href="/terminos" data-link>Términos</a><button type="button" data-action="cookie-settings">Cookies</button></div></div></div></footer>`;
  }

  function pageShell(content, path) {
    window.ICEMAN_MOTION?.unmount();
    stockistsCleanup?.();
    stockistsCleanup = null;
    motionObserver?.disconnect();
    motionObserver = null;
    const floatingWhatsAppClass = path === "/empresas" ? "whatsapp-float whatsapp-float-form" : "whatsapp-float";
    root.innerHTML = `${header(path)}<main id="main" class="fade-in">${content}</main>${footer()}<a class="${floatingWhatsAppClass}" href="${waLink(contactMessage)}" data-wa target="_blank" rel="noopener" aria-label="Escribir a ICEMAN por WhatsApp">${iconWhatsApp()}</a>`;
    setupEditorialDrag();
    root.querySelectorAll("a[data-link]").forEach((link) => { link.href = withBase(withoutBase(link.getAttribute("href"))); });
    if (projectBase) root.querySelectorAll('img[src^="/assets/"]').forEach((image) => { image.src = `${projectBase}${image.getAttribute("src")}`; });
    updateHead(path);
    if (searchOpened) setTimeout(() => document.getElementById("site-search")?.focus(), 0);
    requestAnimationFrame(() => setupMotion());
    requestAnimationFrame(() => window.ICEMAN_MOTION?.mount(root));
    if (path === "/") requestAnimationFrame(() => { setupHomeProducts(); setupStockistsMarquee(); });
  }

  function updateHead(path, title, description) {
    document.title = title ? `${title} | ICEMAN Ecuador` : "ICEMAN Ecuador — Ultracongelados para todos los días";
    const meta = document.querySelector('meta[name="description"]');
    const pageDescription = description || "Descubre el catálogo de alimentos ultracongelados ICEMAN: papas, vegetales, helados, smoothies y más. Información comercial para hogares y negocios en Ecuador.";
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
    return `<section class="hero"><div class="wrap hero-grid"><div class="hero-copy"><div class="eyebrow">Alimentos ultracongelados</div><h1>Lo práctico también puede ser <em>extraordinario.</em></h1><p>Descubre productos listos para acompañar cada día: fáciles de preparar, versátiles y siempre a la mano.</p><div class="hero-actions"><a class="btn btn-primary" href="/productos" data-link>Explorar productos ${iconArrow()}</a><a class="btn btn-outline" href="/empresas" data-link>Cotizar para mi negocio</a></div><div class="hero-note"><span class="snow-mark" aria-hidden="true">✳</span><span>Conserva congelado · Prepara en minutos</span></div></div><div class="hero-visual"><img class="hero-product hero-brand-image" src="${projectBase}/assets/iceman-hero-brand.jpg" alt="Productos ICEMAN sanos y naturales: mix jardinera, maíz dulce, arvejas y ensalada rusa" fetchpriority="high"></div></div></section>`;
  }

  const homeShowcase = [
    { slug:"papas-air-fryer", tone:"#EFB54A" },
    { slug:"mix-jardinera-450", tone:"#86BD69" },
    { slug:"aros-de-cebolla", tone:"#65BED0" },
    { slug:"helado-paila-mora", tone:"#83AED8" }
  ].map((item) => ({ ...item, product:products.find((product) => product.slug === item.slug) })).filter((item) => item.product);

  function home() {
    const categoryLinks = categories.map((category, index) => `<a class="home-category" href="/productos/${category.slug}" data-link data-category-link="${category.slug}"><span class="home-category-number">0${index + 1}</span><span class="home-category-image"><img src="${asset(category.image)}" alt="" loading="lazy" decoding="async"></span><strong>${escapeHTML(category.name)}</strong>${iconArrow("up-right")}</a>`).join("");
    const showcasePanels = homeShowcase.map(({ product, tone }, index) => `<article class="showcase-panel ${index === 0 ? "is-selected" : ""}" style="--panel-tone:${tone}"><div class="showcase-scene" aria-hidden="true"></div><button class="showcase-select" type="button" data-home-product="${index}" aria-label="Explorar ${escapeHTML(product.name)}" aria-pressed="${index === 0}"><span class="showcase-index">0${index + 1} / 0${homeShowcase.length}</span><img class="showcase-pack" src="${asset(product.image)}" alt="" loading="lazy" decoding="async"><span class="showcase-product-name">${escapeHTML(product.name)}</span></button><div class="showcase-detail" aria-hidden="${index !== 0}"><span>${escapeHTML(categoryLabel(product.category))}</span><p>${escapeHTML(product.description)}</p><a href="${productPath(product)}" data-link tabindex="${index === 0 ? 0 : -1}">Ver producto ${iconArrow()}</a></div></article>`).join("");
    const recipeCards = editorial.recipes.slice(0, 3).map((recipe, index) => `<article class="home-recipe home-recipe-${index + 1}"><a href="/recetas/${recipe.slug}" data-link><div class="home-recipe-image"><img src="${editorialImage(recipe.image)}" alt="Imagen referencial para ${escapeHTML(recipe.title)}" loading="lazy" decoding="async"><span>Imagen referencial</span></div><div class="home-recipe-copy"><span>Idea con productos ICEMAN</span><h3>${escapeHTML(recipe.title)}</h3><span class="home-recipe-arrow">Ver idea ${iconArrow()}</span></div></a></article>`).join("");
    const stockistItems = [["Consulta disponibilidad",waLink(contactMessage),"data-wa target=\"_blank\" rel=\"noopener\""],["Explora el catálogo","/productos","data-link"],["Habla con nuestro equipo",waLink(contactMessage),"data-wa target=\"_blank\" rel=\"noopener\""],["Encuentra tu favorito","/productos","data-link"]].map(([label,href,attributes]) => `<a class="stockist-placeholder" href="${href}" ${attributes}><span class="stockist-mark" aria-hidden="true">✳</span>${label}<small>ICEMAN Ecuador ↗</small></a>`).join("");
    return `<div class="home-hero-journey" data-hero-journey><section class="home-hero" id="inicio" data-nav-section="home"><div class="home-hero-image" data-parallax="0.16"><img src="${projectBase}/assets/editorial/golden-fries-alpine.png" alt="Papas doradas flotando sobre un paisaje alpino congelado, fotografía referencial" fetchpriority="high" decoding="async" width="1672" height="941"></div><div class="home-hero-shade"></div><div class="hero-orbit hero-orbit-one" data-pointer-depth="12" aria-hidden="true"></div><div class="hero-orbit hero-orbit-two" data-pointer-depth="-8" aria-hidden="true"></div><div class="wrap home-hero-inner"><div class="home-hero-copy"><span class="home-kicker hero-sequence">Alimentos ultracongelados ICEMAN</span><h1><span class="hero-line"><span>Sabor a</span></span><span class="hero-line"><em>tu ritmo.</em></span></h1><p class="hero-sequence">Productos prácticos para disfrutar a tu manera, todos los días.</p><div class="home-hero-actions hero-sequence"><a class="btn btn-primary magnetic" href="/productos" data-link>Explorar productos ${iconArrow()}</a><a class="home-hero-link" href="/#donde-encontrarnos" data-link>Encuéntranos ${iconArrow()}</a></div></div><div class="hero-scroll-story" aria-hidden="true"><span>ICEMAN · Ultracongelados</span><strong>Listos cuando<br>tú lo estás.</strong><small>Productos prácticos para cada día</small></div><div class="hero-pack-wrap" data-pointer-depth="-16"><span class="hero-pack-halo" aria-hidden="true"></span><img class="hero-pack" src="${asset(homeShowcase[0].product.image)}" alt="Empaque oficial de ${escapeHTML(homeShowcase[0].product.name)} ICEMAN" fetchpriority="high" decoding="async"></div><div class="hero-journey-progress" aria-hidden="true"><span>01</span><i><b></b></i><span>02</span></div><span class="hero-side-note" aria-hidden="true">Del congelador a tu mesa · ICEMAN Ecuador</span><span class="home-image-note">Fotografía referencial</span><a class="hero-scroll" href="#productos-destacados" aria-label="Explorar productos destacados"><span aria-hidden="true">↓</span> Desliza para descubrir</a></div></section></div>
    <section class="home-showcase" id="productos-destacados" aria-labelledby="showcase-title" data-nav-section="products"><div class="wrap"><div class="home-showcase-heading"><span class="home-kicker">Productos que se mueven contigo</span><h2 id="showcase-title">Elige. Descubre. Disfruta.</h2><p>Toca un empaque para acercarlo. Los demás se mueven y puedes explorar cada producto.</p></div><div class="showcase-accordion" id="showcase-accordion" aria-label="Productos destacados de ICEMAN">${showcasePanels}</div><div class="showcase-footer"><span class="showcase-count" aria-live="polite">01 <i>/</i> 0${homeShowcase.length}</span><div class="showcase-progress" aria-hidden="true"><span></span></div><div class="showcase-controls"><button type="button" data-showcase-step="-1" aria-label="Producto anterior">${iconArrow("left")}</button><button type="button" data-showcase-step="1" aria-label="Producto siguiente">${iconArrow()}</button></div></div></div></section>
    <section class="home-categories" id="categorias" aria-labelledby="categories-title"><div class="wrap"><div class="home-section-heading"><span class="home-kicker">Del congelador a tu mesa</span><h2 id="categories-title">Hay mucho por descubrir.</h2><p>Encuentra tu próximo favorito entre las categorías del catálogo.</p></div><div class="home-category-rail">${categoryLinks}</div><a class="home-inline-link" href="/productos" data-link>Ver catálogo completo ${iconArrow()}</a></div></section>
    <section class="home-recipes" id="ideas" aria-labelledby="recipes-title" data-nav-section="editorial"><div class="wrap"><div class="home-section-heading"><span class="home-kicker">Inspiración para la mesa</span><h2 id="recipes-title">Más ideas para disfrutar.</h2><p>Preparaciones y ocasiones con productos del catálogo ICEMAN.</p></div><div class="home-recipe-grid">${recipeCards}</div><div class="home-recipes-foot"><p>Las fotografías son referenciales. La selección final de imágenes y contenido está pendiente de aprobación.</p><a class="home-inline-link" href="/recetas" data-link>Explorar recetas y consejos ${iconArrow()}</a></div></div></section>
    <section class="home-stockists" id="donde-encontrarnos" aria-labelledby="stockists-title" data-nav-section="stockists"><div class="wrap home-stockists-head"><span class="home-kicker">Dónde encontrarnos</span><h2 id="stockists-title">IceMan, cerca de ti.</h2><p>Estamos preparando la lista oficial de establecimientos. Mientras tanto, consulta la disponibilidad directamente con nuestro equipo.</p><a class="btn btn-primary" href="${waLink(contactMessage)}" data-wa target="_blank" rel="noopener">Consultar por WhatsApp ${iconArrow()}</a></div><div class="stockists-track" id="stockists-track" aria-label="Opciones para consultar productos ICEMAN"><div class="stockists-set">${stockistItems}</div>${Array.from({ length:3 }, () => `<div class="stockists-set" aria-hidden="true" inert>${stockistItems}</div>`).join("")}</div><div class="wrap stockists-note">Los nombres de los puntos de venta se incorporarán cuando ICEMAN confirme la lista oficial.</div></section>
    <section class="home-business" id="para-empresas" aria-labelledby="business-title" data-nav-section="business"><div class="wrap home-business-grid"><div class="home-business-image"><img src="${projectBase}/assets/editorial/business-cold-chain.webp" alt="Fotografía referencial de operación de alimentos congelados" loading="lazy" decoding="async"><span>Fotografía referencial</span></div><div class="home-business-copy"><span class="home-kicker">Para empresas</span><h2 id="business-title">Una selección para tu operación.</h2><p>Restaurantes, cafeterías, hoteles y comercios pueden explorar nuestras categorías y consultar las presentaciones disponibles con el equipo ICEMAN.</p><a class="btn btn-primary" href="/empresas" data-link>Solicitar información ${iconArrow()}</a><a class="home-inline-link" href="${waLink(businessMessage)}" data-wa target="_blank" rel="noopener">Hablar por WhatsApp ${iconArrow()}</a></div></div></section>
    <section class="home-contact" aria-labelledby="contact-title" data-nav-section="contact"><div class="wrap home-contact-inner"><div><span class="home-kicker">Conversemos</span><h2 id="contact-title">¿Tienes algo en mente?</h2><p>Te ayudamos a encontrar productos para tu mesa o tu negocio.</p></div><a class="btn btn-primary" href="/contacto" data-link>Ir a contacto ${iconArrow()}</a></div></section>`;
  }

  function setupHomeProducts() {
    const accordion = root.querySelector("#showcase-accordion");
    if (!accordion || !homeShowcase.length) return;
    const panels = [...accordion.querySelectorAll(".showcase-panel")];
    let selected = 0;
    const select = (index) => {
      const previous = selected;
      selected = (index + homeShowcase.length) % homeShowcase.length;
      if (previous === selected) return;
      panels.forEach((panel, index) => {
        const active = index === selected;
        panel.classList.toggle("is-selected", active);
        panel.querySelector(".showcase-select").setAttribute("aria-pressed", String(active));
        panel.querySelector(".showcase-detail").setAttribute("aria-hidden", String(!active));
        panel.querySelector(".showcase-detail a").tabIndex = active ? 0 : -1;
      });
      if (matchMedia("(max-width: 640px)").matches) {
        const panel = panels[selected];
        accordion.scrollTo({ left:panel.offsetLeft - accordion.offsetLeft - 16, behavior:"smooth" });
      }
      const pack = panels[selected].querySelector(".showcase-pack");
      if (!matchMedia("(prefers-reduced-motion: reduce)").matches && pack?.animate) {
        pack.getAnimations().forEach((animation) => animation.cancel());
        pack.animate([{ opacity:0, translate:`${selected > previous ? 48 : -48}px 24px`, rotate:`${selected > previous ? 8 : -8}deg`, scale:.88 },{ opacity:1, translate:"0 0", rotate:"0deg", scale:1 }], { duration:720, easing:"cubic-bezier(.16,1,.3,1)" });
      }
      const count = root.querySelector(".showcase-count");
      if (count) count.innerHTML = `${String(selected + 1).padStart(2,"0")} <i>/</i> 0${homeShowcase.length}`;
      root.querySelector(".showcase-progress span")?.style.setProperty("transform", `scaleX(${(selected + 1) / homeShowcase.length})`);
      track("product_view", { product_slug:homeShowcase[selected].product.slug, placement:"home_showcase" });
    };
    root.querySelectorAll("[data-showcase-step]").forEach((button) => button.addEventListener("click", () => select(selected + Number(button.dataset.showcaseStep))));
    let touchStart = null;
    accordion.addEventListener("touchstart", (event) => { touchStart = event.touches[0]?.clientX ?? null; }, { passive:true });
    accordion.addEventListener("touchend", (event) => { if (touchStart === null) return; const delta = event.changedTouches[0].clientX - touchStart; touchStart = null; if (Math.abs(delta) > 42) select(selected + (delta < 0 ? 1 : -1)); }, { passive:true });
    accordion.querySelectorAll("[data-home-product]").forEach((button) => {
      button.addEventListener("click", () => select(Number(button.dataset.homeProduct)));
      button.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        const next = (selected + (event.key === "ArrowRight" ? 1 : -1) + panels.length) % panels.length;
        select(next);
        panels[next].querySelector(".showcase-select").focus();
      });
    });
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
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    track.scrollLeft = setWidth;
    const tick = (now) => {
      frame = 0;
      if (!visible || reduced.matches) return;
      if (!paused) {
        const elapsed = previous ? Math.min(now - previous, 50) : 16;
        track.scrollLeft -= elapsed * .028;
        if (track.scrollLeft <= 0) track.scrollLeft += setWidth;
      }
      previous = now;
      frame = requestAnimationFrame(tick);
    };
    const pause = () => { paused = true; };
    const resume = () => { paused = false; previous = 0; };
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
    stockistsCleanup = () => { cancelAnimationFrame(frame); observer.disconnect(); document.removeEventListener("visibilitychange", onVisibility); window.removeEventListener("resize", onResize); reduced.removeEventListener("change", onMotion); track.removeEventListener("mouseenter", pause); track.removeEventListener("mouseleave", resume); track.removeEventListener("focusin", pause); track.removeEventListener("focusout", resume); track.removeEventListener("touchstart", pause); track.removeEventListener("touchend", resume); };
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
    const product = productBySlug(item.products?.[0]);
    const eyebrow = item.kind === "recipe" ? `Receta · ${item.time}` : item.category;
    return `<article class="editorial-card ${item.image.startsWith("editorial/") ? "editorial-card-poster" : ""} ${item.imageLayout === "landscape" ? "editorial-card-landscape" : ""} ${featured ? "editorial-card-featured" : ""}" data-editorial-card data-category="${item.kind === "business" ? "negocios" : item.kind === "recipe" ? "recetas" : "nutricion"}" data-search="${escapeHTML([item.title,item.description,item.category,...(item.tags || []),...(item.ingredients || []),...(item.occasions || []),product?.name || ""].join(" ").toLocaleLowerCase("es"))}">
      <a class="editorial-card-image" href="${articleHref(item)}" data-link aria-label="Leer ${escapeHTML(item.title)}"><img src="${editorialImage(item.image)}" alt="${escapeHTML(item.image.startsWith("editorial/") ? item.title : item.kind === "recipe" ? `Producto ICEMAN para ${item.title}` : item.title)}" loading="lazy" decoding="async">${item.image.startsWith("editorial/") ? `<span class="editorial-temp-label">Imagen referencial</span>` : `<span class="editorial-image-label">${escapeHTML(item.kind === "recipe" ? "ICEMAN EN LA MESA" : item.category.toUpperCase())}</span>`}</a>
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
  function editorialPage(path) {
    const occasions = editorial.occasions;
    const first = editorial.recipes[0];
    const cards = editorialAll.map((item) => editorialCard(item)).join("");
    const occasionCards = occasions.map((occasion) => `<a class="occasion-card" href="#ideas" data-occasion-link="${occasion.slug}"><img src="${editorialImage(occasion.image)}" alt="${escapeHTML(occasion.title)} con productos ICEMAN" loading="lazy"><span class="occasion-overlay"><small>EL PLAN</small><strong>${escapeHTML(occasion.title)}</strong><span>${escapeHTML(occasion.text)}</span><b>Descubrir ideas ${iconArrow()}</b></span></a>`).join("");
    const content = `<section class="editorial-hero"><div class="wrap editorial-hero-grid"><div class="editorial-hero-copy">${breadcrumbs([{name:"Inicio",href:"/"},{name:"Recetas & Consejos"}])}<div class="eyebrow">Ideas para cada momento</div><h1>Ideas para disfrutar <em>ICEMAN.</em></h1><p>Recetas, consejos e inspiración para sacarle más provecho a tus productos favoritos.</p><p class="editorial-review-note">Fotografías referenciales y contenido editorial pendiente de aprobación final.</p><div class="editorial-hero-actions"><a class="btn btn-primary" href="${editorialPath(first)}" data-link>Ver receta destacada ${iconArrow()}</a><a class="editorial-text-link" href="#ideas">Explorar ideas ↓</a></div><div class="editorial-feature-meta"><span>RECETA DESTACADA</span><b>${escapeHTML(first.time)} · ${escapeHTML(first.difficulty)}</b></div></div><a class="editorial-hero-image ${String(first.heroImage || first.image).startsWith("editorial/") ? "editorial-hero-poster" : ""}" href="${editorialPath(first)}" data-link aria-label="Ver ${escapeHTML(first.title)}"><img src="${editorialImage(first.heroImage || first.image)}" alt="${escapeHTML(first.title)}" fetchpriority="high">${String(first.heroImage || first.image).startsWith("editorial/") ? `<span class="editorial-temp-label">Imagen referencial</span>` : `<span class="editorial-hero-sticker">Fácil<br><b>y a tu manera</b></span><span class="editorial-hero-caption">${escapeHTML(first.title)} <span>↗</span></span>`}</a></div></section>
    <section class="editorial-browse" id="ideas"><div class="wrap"><div class="editorial-tools"><div class="editorial-tabs" role="group" aria-label="Filtrar contenido"><button class="editorial-tab is-active" data-editorial-filter="todos" aria-pressed="true">Todo</button><button class="editorial-tab" data-editorial-filter="negocios" aria-pressed="false">Para tu negocio</button><button class="editorial-tab" data-editorial-filter="recetas" aria-pressed="false">Recetas</button><button class="editorial-tab" data-editorial-filter="nutricion" aria-pressed="false">Nutrición & consejos</button><button class="editorial-tab" data-editorial-filter="ocasiones" aria-pressed="false">Ocasiones</button></div><label class="editorial-search"><span aria-hidden="true">⌕</span><input id="editorial-search" type="search" placeholder="Buscar recetas, productos o ideas…" autocomplete="off"><kbd>↵</kbd></label></div><p class="editorial-search-status" id="editorial-search-status" aria-live="polite"></p><div class="editorial-card-grid" id="editorial-card-grid">${cards}</div><div id="editorial-product-results"></div><div class="editorial-empty" id="editorial-empty" hidden>No encontramos ideas con esa búsqueda. Prueba con “papas”, “reunión” o “congelado”.</div></div></section>
    <section class="editorial-section editorial-occasions" data-editorial-section="ocasiones"><div class="wrap"><div class="section-head"><div><div class="eyebrow">Planes que se disfrutan</div><h2>¿Cuál es el plan?</h2><p>Elige el momento. Nosotros ponemos algunas ideas sobre la mesa.</p></div></div><div class="occasion-grid">${occasionCards}</div></div></section>
    <section class="editorial-planner"><div class="wrap planner-layout"><div class="planner-copy"><div class="eyebrow">Una idea a tu medida</div><h2>¿Qué preparamos hoy?</h2><p>Cuéntanos cuántos son y cómo quieres cocinar. Te sugerimos una combinación del catálogo.</p><div class="planner-step"><span>01</span><div><strong>¿Para cuántas personas?</strong><div class="planner-options" data-choice-group="people"><button class="is-selected" data-choice="people" data-value="1–2" aria-pressed="true">1–2</button><button data-choice="people" data-value="3–4" aria-pressed="false">3–4</button><button data-choice="people" data-value="5–8" aria-pressed="false">5–8</button><button data-choice="people" data-value="8+" aria-pressed="false">8+</button></div></div></div><div class="planner-step"><span>02</span><div><strong>¿Cuál es el plan?</strong><div class="planner-options" data-choice-group="plan"><button class="is-selected" data-choice="plan" data-value="Cena rápida" aria-pressed="true">Cena rápida</button><button data-choice="plan" data-value="Película" aria-pressed="false">Película</button><button data-choice="plan" data-value="Partido" aria-pressed="false">Partido</button><button data-choice="plan" data-value="Reunión" aria-pressed="false">Reunión</button></div></div></div><div class="planner-step"><span>03</span><div><strong>¿Cómo quieres cocinar?</strong><div class="planner-options" data-choice-group="method"><button class="is-selected" data-choice="method" data-value="Air Fryer" aria-pressed="true">Air Fryer</button><button data-choice="method" data-value="Horno">Horno</button><button data-choice="method" data-value="Sartén">Sartén</button><button data-choice="method" data-value="Lo más rápido">Lo más rápido</button></div></div></div></div><aside class="planner-result" aria-live="polite"><span class="planner-result-icon">✳</span><small>UNA IDEA PARA TI</small><h3 id="planner-title">Una cena rápida para 1–2</h3><p id="planner-description">Papas Air Fryer para resolver el acompañamiento. Revisa el empaque para conocer el método de preparación.</p><div id="planner-products" class="planner-products"></div><a id="planner-recipe-link" class="btn btn-primary" href="${editorialPath(first)}" data-link>Ver cómo prepararlo ${iconArrow()}</a></aside></div></section>
    <section class="editorial-section editorial-product-discovery" data-editorial-section="recetas"><div class="wrap"><div class="section-head section-head-row"><div><div class="eyebrow">Del catálogo a tu mesa</div><h2>Ideas con productos ICEMAN</h2><p>Explora recetas que parten de productos disponibles en el catálogo.</p></div><a class="text-link" href="/productos" data-link>Ver catálogo ${iconArrow()}</a></div>${productRail(editorialProducts(["papas-air-fryer","aros-de-cebolla","hash-brown","waffle-glaseado","mix-jardinera-450","smoothie-red"]),"editorial-products")}</div></section>
    <section class="editorial-business" data-editorial-section="negocios" id="negocios"><div class="wrap editorial-business-inner"><div><div class="eyebrow">ICEMAN para tu negocio</div><h2>Ideas para una cocina que no se detiene.</h2><p>Consejos y soluciones para restaurantes, cafeterías, hoteles y comercios. Explora el catálogo y conversa con nuestro equipo sobre las opciones para tu operación.</p><div class="hero-actions"><a class="btn btn-primary" href="${editorialPath(editorial.business[0])}" data-link>Explorar ideas para negocios ${iconArrow()}</a><a class="btn btn-light" href="${waLink(businessMessage)}" data-wa target="_blank" rel="noopener">Hablar por WhatsApp</a></div></div><div class="editorial-business-art"><img src="${asset("papas-spices")}" alt="Producto ICEMAN para cocinas profesionales" loading="lazy"></div></div></section>`;
    pageShell(content, path);
    updateHead(path,"Recetas & Consejos — Ideas para disfrutar ICEMAN","Recetas, consejos e inspiración para aprovechar productos ICEMAN en casa y en tu negocio.");
    addSchema(breadcrumbSchema([{name:"Inicio",href:"/"},{name:"Recetas & Consejos",href:"/recetas"}]));
    updatePlanner();
  }

  function updatePlanner() {
    const selected = Object.fromEntries([...root.querySelectorAll(".planner-options .is-selected")].map((button) => [button.dataset.choice,button.dataset.value]));
    const plan = selected.plan || "Cena rápida";
    const occasion = /película/i.test(plan) ? editorial.occasions.find((item) => item.slug === "peliculas") : /partido/i.test(plan) ? editorial.occasions.find((item) => item.slug === "partido") : /reunión/i.test(plan) ? editorial.occasions.find((item) => item.slug === "reunion") : editorial.occasions.find((item) => item.slug === "cena");
    const chosen = editorialProducts(occasion.products).slice(0, selected.people === "5–8" || selected.people === "8+" ? 3 : 2);
    root.querySelector("#planner-title").textContent = `${plan} para ${selected.people || "1–2"}`;
    root.querySelector("#planner-description").textContent = `${selected.method || "Air Fryer"}: una combinación sencilla de productos ICEMAN. Los tiempos y métodos pueden variar; sigue las indicaciones de cada empaque.`;
    root.querySelector("#planner-products").innerHTML = chosen.map((product) => `<a href="${productPath(product)}" data-link>${escapeHTML(product.name)}</a>`).join("");
    const recipe = editorial.recipes.find((item) => item.occasions.includes(occasion.slug)) || editorial.recipes[0];
    root.querySelector("#planner-recipe-link").href = withBase(editorialPath(recipe));
  }

  function editorialDetail(item, path) {
    const isRecipe = item.kind === "recipe";
    const isBusiness = item.kind === "business";
    const relatedProducts = editorialProducts(item.products || []);
    const related = editorialAll.filter((other) => other.slug !== item.slug && (other.kind === item.kind || (other.tags || []).some((tag) => (item.tags || []).includes(tag)))).slice(0,3);
    const productNames = relatedProducts.map((product) => product.name).join(", ");
    const body = isRecipe ? `<div class="recipe-method"><h2>Ingredientes</h2><ul class="recipe-ingredients">${item.ingredients.map((ingredient) => `<li>${escapeHTML(ingredient)}</li>`).join("")}</ul><h2>Preparación</h2><ol class="recipe-steps">${item.steps.map((step,index) => `<li><span>${String(index+1).padStart(2,"0")}</span><p>${escapeHTML(step)}</p></li>`).join("")}</ol><p class="recipe-note">Los tiempos son orientativos. Sigue las indicaciones del empaque y las instrucciones de tu electrodoméstico.</p><div class="recipe-share"><strong>Comparte esta receta</strong><a href="${waLink(`Mira esta receta de ICEMAN: ${item.title} ${publicUrl(path)}`)}" data-wa target="_blank" rel="noopener">WhatsApp ${iconArrow()}</a><button type="button" data-action="copy-link">Copiar enlace</button><span id="copy-status" aria-live="polite"></span></div></div>` : `<div class="article-body">${item.body.map((paragraph,index) => `<${index ? "h2" : "p"}>${escapeHTML(paragraph)}</${index ? "h2" : "p"}>`).join("")}${isBusiness ? `<div class="article-business-cta"><h2>¿Buscas productos para tu negocio?</h2><p>Cuéntanos qué necesitas y un asesor ICEMAN puede ayudarte con productos, presentaciones y opciones para tu operación.</p><a class="btn btn-primary" href="${waLink(businessMessage)}" data-wa target="_blank" rel="noopener">Hablar por WhatsApp ${iconArrow()}</a><a class="editorial-text-link" href="/empresas" data-link>Solicitar información</a></div>` : ""}</div>`;
    const editorialPoster = String(item.heroImage || item.image).startsWith("editorial/");
    const editorialLandscape = item.imageLayout === "landscape";
    const content = `<section class="editorial-detail"><div class="wrap"><div class="editorial-detail-breadcrumb">${breadcrumbs([{name:"Inicio",href:"/"},{name:"Recetas & Consejos",href:"/recetas"},{name:isRecipe?"Recetas":item.category,href:"/recetas"},{name:item.title}])}</div><div class="editorial-detail-hero"><div class="editorial-detail-copy"><div class="eyebrow">${isRecipe ? "RECETA ICEMAN" : escapeHTML(item.category)}</div><h1>${escapeHTML(item.title)}</h1><p>${escapeHTML(item.description)}</p>${isRecipe ? `<p class="editorial-review-note">Receta e imagen referenciales. Revisa el empaque del producto para las indicaciones definitivas.</p>` : ""}${isRecipe ? `<div class="recipe-facts"><span><small>TIEMPO</small><b>${escapeHTML(item.time)}</b></span><span><small>DIFICULTAD</small><b>${escapeHTML(item.difficulty)}</b></span><span><small>PORCIONES</small><b>${escapeHTML(item.servings)}</b></span><span><small>MÉTODO</small><b>${escapeHTML(item.method)}</b></span></div>` : `<span class="article-reading-time">Ideas claras para llevar a tu mesa.</span>`}<div class="editorial-detail-actions"><a class="editorial-text-link" href="#contenido">${isRecipe?"Ir a la receta":"Leer artículo"} ↓</a></div></div><div class="editorial-detail-image ${editorialPoster ? "editorial-detail-poster" : ""} ${editorialLandscape ? "editorial-detail-landscape" : ""}"><img src="${editorialImage(item.heroImage || item.image)}" alt="${escapeHTML(isRecipe && item.heroImage ? "Papas doradas y crujientes recién hechas, servidas con salsas" : isRecipe ? `Producto ICEMAN relacionado con ${item.title}` : item.title)}" fetchpriority="high">${String(item.heroImage || item.image).startsWith("editorial/") ? `<span class="editorial-temp-label">Imagen referencial</span>` : `<span>${isRecipe ? "PRODUCTOS ICEMAN" : "RECETAS & CONSEJOS"}</span>`}</div></div><div class="editorial-detail-layout" id="contenido"><article>${body}</article><aside class="editorial-detail-aside"><small>${relatedProducts.length ? (isRecipe ? "EN ESTA IDEA" : "PRODUCTOS MENCIONADOS") : "SIGUE EXPLORANDO"}</small><strong>${relatedProducts.length ? escapeHTML(productNames) : escapeHTML(item.category)}</strong><a href="/productos" data-link>Explorar productos ${iconArrow()}</a></aside></div>${relatedProducts.length ? `<section class="editorial-section detail-products"><div class="section-head"><div><div class="eyebrow">Del contenido al catálogo</div><h2>${isRecipe ? "Productos ICEMAN para esta receta" : "Productos ICEMAN relacionados"}</h2></div></div>${productRail(relatedProducts,"detail-products-rail")}</section>` : ""}${isRecipe ? `<section class="editorial-section detail-products"><div class="section-head"><div><div class="eyebrow">Una combinación a tu gusto</div><h2>También queda bien con…</h2></div></div>${productRail(editorialProducts(["papas-air-fryer","aros-de-cebolla","hash-brown","corte-ondulado-900-premium","smoothie-red"]),"detail-discovery-rail")}</section>` : ""}<section class="editorial-section detail-related"><div class="section-head"><div><div class="eyebrow">Sigue explorando</div><h2>Más ideas para disfrutar</h2></div></div><div class="editorial-card-grid">${related.map((entry) => editorialCard(entry)).join("")}</div></section></div></section>`;
    pageShell(content,path);
    updateHead(path,item.title,`${item.description} ${isRecipe ? `Tiempo: ${item.time}. Dificultad: ${item.difficulty}.` : ""}`);
    const imageMeta = document.querySelector('meta[property="og:image"]'); if (imageMeta) imageMeta.content = `${window.location.origin}${editorialImage(item.heroImage || item.image)}`;
    const twitterImage = document.querySelector('meta[name="twitter:image"]'); if (twitterImage && imageMeta) twitterImage.content = imageMeta.content;
    if (isRecipe) {
      const recipeSchema = {"@context":"https://schema.org","@type":"Recipe",name:item.title,description:item.description,image:`${window.location.origin}${editorialImage(item.heroImage || item.image)}`,recipeCategory:"Acompañamiento",recipeCuisine:"Ecuatoriana",recipeYield:item.servings,prepTime:`PT${(item.time.match(/\d+/)||["10"])[0]}M`,recipeIngredient:item.ingredients,recipeInstructions:item.steps.map((text)=>({"@type":"HowToStep",text})),author:{"@type":"Organization",name:"ICEMAN Ecuador"}};
      addSchema({"@context":"https://schema.org","@graph":[recipeSchema,breadcrumbSchema([{name:"Inicio",href:"/"},{name:"Recetas & Consejos",href:"/recetas"},{name:item.title,href:path}])]});
    } else addSchema({"@context":"https://schema.org","@graph":[{"@type":"Article",headline:item.title,description:item.description,image:`${window.location.origin}${editorialImage(item.heroImage || item.image)}`,author:{"@type":"Organization",name:"ICEMAN Ecuador"},publisher:{"@type":"Organization",name:"ICEMAN Ecuador"}},breadcrumbSchema([{name:"Inicio",href:"/"},{name:"Recetas & Consejos",href:"/recetas"},{name:item.title,href:path}])]});
  }

  function catalogPage(path, categorySlug = null) {
    const category = categorySlug ? categoryBySlug[categorySlug] : null;
    const query = new URLSearchParams(window.location.search).get("q") || "";
    searchValue = query;
    activeFilter = categorySlug || "todos";
    const headerText = category ? category.name : query ? `Resultados para “${query}”` : "Todos los productos";
    const intro = `<section class="page-intro" id="productos" data-nav-section="products"><div class="wrap">${breadcrumbs([{ name:"Inicio", href:"/" },{ name:"Productos", href:"/productos" },...(category ? [{ name:category.name }] : [])])}<div class="page-heading"><div class="eyebrow">Catálogo ICEMAN</div><h1>${escapeHTML(headerText)}</h1><p>${category ? escapeHTML(category.note)+". Encuentra presentación, preparación y datos para cotizar." : "Explora papas, vegetales, especialidades y más. Encuentra rápidamente el producto y la presentación que buscas."}</p></div></div></section>
      <div class="catalog-toolbar" id="categorias" data-nav-section="categories"><div class="wrap toolbar-inner"><div class="category-chips" role="group" aria-label="Filtrar por categoría"><button class="chip ${activeFilter === "todos" ? "active" : ""}" data-filter="todos" aria-pressed="${activeFilter === "todos"}">Todos</button>${categories.map((item) => `<button class="chip ${activeFilter === item.slug ? "active" : ""}" data-filter="${item.slug}" aria-pressed="${activeFilter === item.slug}">${escapeHTML(item.name)}</button>`).join("")}</div><span class="toolbar-count" id="catalog-count" aria-live="polite"></span></div></div>
      <section class="catalog-results"><div class="wrap"><div id="catalog-content"></div></div></section>`;
    pageShell(intro, path);
    renderCatalogResults(categorySlug || "todos", query);
    if (!category) setupScrollSpy();
    updateHead(path, category ? `Productos ${category.name}` : query ? `Resultados de búsqueda para ${query}` : "Catálogo de productos", category ? `${category.note}. Consulta presentaciones y preparación en el catálogo ICEMAN.` : "Explora el catálogo de productos ultracongelados ICEMAN: papas, vegetales, helados, smoothies, especialidades y más.");
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
    const content = `<section class="product-detail"><div class="wrap">${breadcrumbs([{ name:"Inicio", href:"/" },{ name:"Productos", href:"/productos" },{ name:category.name, href:`/productos/${category.slug}` },{ name:product.name }])}<div class="detail-grid"><div class="detail-image"><img src="${asset(product.image)}" alt="Empaque de ${escapeHTML(product.name)}, marca ${escapeHTML(product.brand)}, presentación ${escapeHTML(product.presentation)}" fetchpriority="high"></div><div class="detail-copy"><span class="detail-brand">${escapeHTML(product.brand)} · ${escapeHTML(category.name)}</span><h1>${escapeHTML(product.name)}</h1><p>${escapeHTML(product.description)}</p><div class="detail-meta"><div class="meta-cell"><small>Presentación</small><strong>${escapeHTML(product.presentation)}</strong></div><div class="meta-cell"><small>Unidades por caja</small><strong>${escapeHTML(product.units || "Consultar")}</strong></div>${product.pvp ? `<div class="meta-cell"><small>PVP</small><strong>${escapeHTML(product.pvp)}</strong></div>` : ""}${product.sap ? `<div class="meta-cell"><small>Código SAP</small><strong>${escapeHTML(product.sap)}</strong></div>` : ""}<div class="meta-cell"><small>Conservación</small><strong>−18 °C</strong></div></div><div class="detail-spec"><h2>Preparación y conservación</h2><ul class="prep-list">${product.prep.map((line) => `<li>${escapeHTML(line)}</li>`).join("")}</ul></div><div class="detail-note">Mantener congelado a −18 °C. No descongelar antes de utilizar, salvo que el modo de preparación del producto indique lo contrario. Los tiempos pueden variar según el electrodoméstico.</div><div class="detail-actions"><a class="btn btn-primary" href="/empresas" data-link>Solicitar cotización ${iconArrow()}</a><a class="btn btn-outline" href="${waLink(text)}" data-wa target="_blank" rel="noopener">Consultar por WhatsApp</a></div></div></div></div></section>${similar.length ? `<section class="similar-section"><div class="wrap"><div class="section-head section-head-row"><div><div class="eyebrow">Más de ${escapeHTML(category.name)}</div><h2>También te puede interesar</h2></div><a class="text-link" href="/productos/${category.slug}" data-link>Ver categoría ${iconArrow()}</a></div><div class="related-track">${similar.map(productCard).join("")}</div></div></section>` : ""}`;
    const recipeSection = recipeIdeas.length ? `<section class="editorial-section product-recipe-ideas"><div class="wrap"><div class="section-head"><div><div class="eyebrow">Ideas para disfrutarlo</div><h2>Recetas con ${escapeHTML(product.name)}</h2></div><a class="text-link" href="/recetas" data-link>Ver Recetas & Consejos ${iconArrow()}</a></div><div class="editorial-card-grid">${recipeIdeas.map((recipe) => editorialCard({ ...recipe, kind:"recipe" })).join("")}</div></div></section>` : "";
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
    const content = `<section class="business-page"><div class="wrap business-page-grid"><div class="business-lede">${breadcrumbs([{ name:"Inicio", href:"/" },{ name:"Para empresas" }])}<div class="eyebrow">Atención comercial</div><h1>Una buena operación empieza con los productos correctos.</h1><p>Cuéntanos qué necesita tu negocio. Nuestro equipo te ayudará a encontrar categorías y presentaciones adecuadas para tu operación.</p><div class="business-points"><div class="business-point"><b>01</b><span>Atención para restaurantes, hoteles, tiendas y distribuidores.</span></div><div class="business-point"><b>02</b><span>Información de presentaciones y productos del catálogo ICEMAN.</span></div><div class="business-point"><b>03</b><span>Contacto directo con el equipo comercial por WhatsApp.</span></div></div><div class="business-audience" aria-label="Tipo de negocio"><span class="home-kicker">Comienza por tu negocio</span><div class="business-audience-options"><button type="button" data-business-audience="Restaurante" aria-pressed="false">Restaurante</button><button type="button" data-business-audience="Hotel" aria-pressed="false">Hotel</button><button type="button" data-business-audience="Supermercado" aria-pressed="false">Comercio</button></div><p id="business-audience-status" aria-live="polite">Selecciona tu tipo de negocio y completa la consulta.</p></div><div class="business-product-composition" aria-label="Selección de empaques oficiales ICEMAN"><span aria-hidden="true">ICEMAN · ECUADOR</span><img src="${asset(homeShowcase[1].product.image)}" alt="Empaque ICEMAN de Mix jardinera" loading="lazy" decoding="async"><img src="${asset(homeShowcase[0].product.image)}" alt="Empaque ICEMAN de Papas Air Fryer" loading="lazy" decoding="async"></div></div>
      <form class="lead-form" id="lead-form" novalidate><div class="form-section"><h2>Cuéntanos de tu negocio</h2><div class="form-grid"><div class="field"><label for="lead-name">Nombre <span aria-hidden="true">*</span></label><input id="lead-name" name="name" autocomplete="name" required><span class="field-error">Escribe tu nombre.</span></div><div class="field"><label for="lead-company">Empresa <span aria-hidden="true">*</span></label><input id="lead-company" name="company" autocomplete="organization" required><span class="field-error">Escribe el nombre de la empresa.</span></div><div class="field"><label for="lead-role">Cargo</label><input id="lead-role" name="role" autocomplete="organization-title"></div><div class="field"><label for="lead-city">Ciudad <span aria-hidden="true">*</span></label><input id="lead-city" name="city" autocomplete="address-level2" required><span class="field-error">Escribe tu ciudad.</span></div><div class="field"><label for="lead-phone">Teléfono / WhatsApp <span aria-hidden="true">*</span></label><input id="lead-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" required><span class="field-error">Ingresa un número de contacto válido.</span></div><div class="field"><label for="lead-email">Correo electrónico <span aria-hidden="true">*</span></label><input id="lead-email" name="email" type="email" autocomplete="email" required><span class="field-error">Ingresa un correo válido.</span></div><div class="field full"><label for="lead-business-type">Tipo de negocio <span aria-hidden="true">*</span></label><select id="lead-business-type" name="business_type" required><option value="">Selecciona una opción</option>${businesses.map((name) => `<option>${name}</option>`).join("")}</select><span class="field-error">Selecciona el tipo de negocio.</span></div></div></div>
      <div class="form-section"><h2>¿Qué productos te interesan?</h2><div class="check-grid">${interests.map((name) => `<label class="check-option"><input type="checkbox" name="interests" value="${name}"><span>${name}</span></label>`).join("")}</div></div>
      <div class="form-section"><h2>Cuéntanos un poco más</h2><div class="form-grid"><div class="field full"><label for="lead-volume">Volumen aproximado o necesidad</label><input id="lead-volume" name="volume" placeholder="Opcional"></div><div class="field full"><label for="lead-message">Mensaje</label><textarea id="lead-message" name="message" placeholder="¿Qué te gustaría consultar?"></textarea></div></div></div>
      <div class="sr-only" aria-hidden="true"><label for="lead-website">No llenar este campo</label><input id="lead-website" name="website" tabindex="-1" autocomplete="off"></div><label class="consent"><input type="checkbox" name="consent" required><span>Acepto ser contactado por ICEMAN respecto a esta solicitud. <a href="/privacidad" data-link>Lee la política de privacidad</a>. <span aria-hidden="true">*</span></span></label><p class="field-error consent-error">Acepta el contacto para continuar.</p><div class="form-error" id="form-error" role="alert"></div><div class="form-success" id="form-success" role="status"></div><div class="submit-row"><button class="btn btn-primary" type="submit">Solicitar información ${iconArrow()}</button><span class="submit-hint">${leadHint}</span></div></form></div></section>`;
    pageShell(content, path);
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

  function aboutPage(path) {
    const content = `<section class="section"><div class="wrap about-split"><div class="about-copy">${breadcrumbs([{ name:"Inicio", href:"/" },{ name:"Nosotros" }])}<div class="eyebrow">ICEMAN Ecuador</div><h1>Prácticos para el día a día. Listos para compartir.</h1><p>ICEMAN reúne alimentos ultracongelados pensados para hacer más fácil la preparación de tus comidas. El catálogo incluye exclusivamente productos ICEMAN: papas, vegetales, especialidades, helados de paila, sorbetto artesanal, smoothies y waffles.</p><p>El catálogo ICEMAN indica que el proceso de ultracongelación IQF conserva el valor nutritivo, sabor y frescura de los productos. Mantener los productos congelados a −18 °C.</p><div class="about-callout">Una selección para hogares y para negocios que buscan opciones prácticas y versátiles.</div><div class="hero-actions"><a href="/productos" data-link class="btn btn-primary">Explorar productos ${iconArrow()}</a><a href="/contacto" data-link class="btn btn-outline">Contactar</a></div></div><div class="about-visual"><img src="${asset("edamame-grano")}" alt="Empaque de edamame grano ICEMAN" loading="lazy"></div></div></section><section class="section-tight"><div class="wrap"><div class="trust-strip"><div class="trust-inner"><div class="trust-item"><span class="trust-icon">01</span><span><strong>Variedad</strong> Siete categorías</span></div><div class="trust-item"><span class="trust-icon">IQF</span><span><strong>Ultracongelación</strong> Según el catálogo</span></div><div class="trust-item"><span class="trust-icon">EC</span><span><strong>Ecuador</strong> Oficinas en seis ciudades</span></div></div></div></div></section>`;
    pageShell(content, path);
    updateHead(path, "Nosotros", "Conoce ICEMAN Ecuador y su catálogo de alimentos ultracongelados para el día a día y para negocios.");
  }

  function notFound(path) {
    pageShell(`<section class="not-found"><div><div class="eyebrow" style="justify-content:center">Página no encontrada</div><h1>Sigamos explorando.</h1><p>El enlace puede haber cambiado.</p><a class="btn btn-primary" href="/productos" data-link>Ver productos ${iconArrow()}</a></div></section>`, path);
    updateHead(path, "Página no encontrada", "El enlace solicitado no se encontró. Explora el catálogo de productos ICEMAN.");
  }

  function legalPage(path, kind) {
    const privacy = kind === "privacy";
    const title = privacy ? "Política de privacidad" : "Términos y condiciones";
    const copy = privacy
      ? `<p><strong>Responsable:</strong> ICEMAN. El propietario debe completar razón social, identificación tributaria y domicilio legal antes de publicar esta política.</p><h2>Datos y finalidad</h2><p>El formulario para empresas solicita nombre, empresa, ciudad, teléfono, correo y tipo de negocio, además de campos opcionales. Se envían a Formspree para recibir y gestionar tu solicitud comercial y permitir que ICEMAN te contacte. Los enlaces de WhatsApp permiten contactar al equipo por ese servicio.</p><h2>Cookies y analítica</h2><p>El sitio usa almacenamiento local para recordar preferencias. Google Analytics 4 (ID G-EP2322YPPC) solo se carga si la persona acepta analítica; Google puede usar cookies y recibir datos de uso. La elección se cambia desde «Cookies» en el pie.</p><h2>Servicios externos</h2><p>Al abrir WhatsApp, Instagram o Google Maps se accede a servicios sujetos a sus propias políticas. El sitio no controla su tratamiento de datos.</p><h2>Contacto y derechos</h2><p>Para consultas de privacidad o ejercer derechos, contactar a <strong>[EL PROPIETARIO DEBE PROPORCIONAR UN CORREO DE PRIVACIDAD]</strong>.</p><p><strong>Pendiente del propietario:</strong> completar identidad legal, domicilio, correo, plazos de conservación, base legal y canales de solicitudes de derechos.</p>`
      : `<p>Al navegar el sitio, la persona visitante acepta usarlo conforme a la ley y no interferir con su funcionamiento.</p><h2>Contenido y propiedad intelectual</h2><p>Los textos, marcas, fotografías y demás materiales se muestran con fines informativos y pertenecen a sus respectivos titulares. No se autoriza su reproducción comercial sin permiso.</p><h2>Productos y solicitudes</h2><p>El catálogo es informativo. Presentaciones, disponibilidad y características pueden cambiar; confirma la información con el equipo comercial. Una solicitud no constituye oferta ni confirma una compra.</p><h2>Servicios externos</h2><p>Los enlaces a WhatsApp, Instagram, Google Maps y otros servicios se rigen por las condiciones de sus proveedores.</p><h2>Responsabilidad y contacto</h2><p>Para consultas, visita la página de <a href="/contacto" data-link>Contacto</a>.</p><p><strong>Pendiente del propietario:</strong> proporcionar razón social, identificación y domicilio legal; revisar estas condiciones con asesoría legal local.</p>`;
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
    else if (parts[0] === "productos" && parts.length === 2 && categoryBySlug[parts[1]]) catalogPage(path, parts[1]);
    else if (parts[0] === "productos" && parts.length >= 3) {
      const slug = parts[parts.length - 1]; const product = products.find((item) => item.slug === slug);
      product ? productPage(product, path) : notFound(path);
    }
    else if (path === "/recetas") editorialPage(path);
    else if (parts[0] === "recetas" && parts.length === 2) { const item = editorialItem(parts[1]); item ? editorialDetail(item,path) : notFound(path); }
    else if (path === "/empresas") businessPage(path);
    else if (path === "/contacto") contactPage(path);
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
    const anchor = event.target.closest("a");
    if (anchor?.dataset.productLink && anchor.closest(".related-track,.editorial-rail")) track("related_product_click", { product_slug: anchor.dataset.productLink });
    if (anchor?.hasAttribute("data-link") && withoutBase(new URL(anchor.href, window.location.origin).pathname) === "/contacto") track("contact_click", { target:"contact_page" });
    const isPlainInternalClick = event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
    if (anchor?.hasAttribute("data-link") && isPlainInternalClick && !anchor.hasAttribute("download") && (!anchor.target || anchor.target === "_self")) { event.preventDefault(); navigate(anchor.getAttribute("href"), { sharedImage:anchor.closest(".home-recipe,.editorial-card")?.querySelector("img") || null }); return; }
    if (anchor?.hasAttribute("data-wa")) track("whatsapp_click", { placement: anchor.classList.contains("whatsapp-float") ? "floating" : "link" });
    if (anchor?.hasAttribute("data-contact")) track("contact_click", { target: anchor.getAttribute("href") });
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (event.target.closest("[data-load-map]")) {
      const frame=document.createElement("iframe"); frame.className="contact-map"; frame.title="Mapa de ICEMAN, matriz en Carcelén Industrial, Quito"; frame.loading="lazy"; frame.referrerPolicy="no-referrer-when-downgrade"; frame.allowFullscreen=true; frame.src="https://maps.google.com/maps?q=Antonio%20Castillo%20OE1-464%20y%20Av.%20Juan%20de%20Selis%2C%20Carcel%C3%A9n%20Industrial%2C%20Quito%2C%20Ecuador&output=embed"; event.target.closest(".contact-map-placeholder").replaceWith(frame); return;
    }
    if (action === "cookie-settings") { event.preventDefault(); consentUI(true); document.querySelector('[data-consent="reject"]')?.focus(); }
    if (action === "search") { searchOpened = !searchOpened; menuOpened = false; render(); }
    if (action === "close-search") { searchOpened = false; render(); }
    if (action === "menu") {
      menuOpened = !menuOpened; searchOpened = false; document.body.classList.toggle("menu-open", menuOpened); render();
      if (menuOpened) requestAnimationFrame(() => root.querySelector(".mobile-panel a")?.focus());
    }
    if (action === "clear-search") { searchValue = ""; navigate("/productos"); }
    const filter = event.target.closest("[data-filter]")?.dataset.filter;
    if (filter) {
      activeFilter = filter; searchValue = "";
      const targetPath = filter === "todos" ? "/productos" : `/productos/${filter}`;
      history.pushState({}, "", withBase(targetPath));
      setActiveNav(filter === "todos" ? "products" : "categories");
      document.querySelectorAll(".chip").forEach((chip) => { const isActive = chip.dataset.filter === filter; chip.classList.toggle("active", isActive); chip.setAttribute("aria-pressed", String(isActive)); });
      renderCatalogResults(filter); track("category_view", { category: filter === "todos" ? "all" : filter });
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
      root.querySelector("#editorial-card-grid")?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
    }
  });

  function applyEditorialSearch(query, filter = root.querySelector("[data-editorial-filter].is-active")?.dataset.editorialFilter || "todos") {
    const normalized = query.trim().toLocaleLowerCase("es");
    const cards = [...root.querySelectorAll("[data-editorial-card]")];
    let shown = 0;
    cards.forEach((card) => {
      const matchesFilter = filter === "todos" || card.dataset.category === filter || (filter === "nutricion" && card.dataset.category === "consejos");
      const matchesQuery = !normalized || card.dataset.search.includes(normalized) || (normalized.split(/\s+/).some((word) => card.dataset.search.includes(word)));
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
    if (normalized && filter !== "nutricion" && filter !== "negocios" && filter !== "ocasiones") matchedProducts = products.filter((product) => [product.name,product.brand,product.presentation,categoryLabel(product.category),product.description,...product.prep].join(" ").toLocaleLowerCase("es").includes(normalized));
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
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") { if (menuOpened || searchOpened) { menuOpened = false; searchOpened = false; document.body.classList.remove("menu-open"); render(); } } });
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
