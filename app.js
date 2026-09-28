(() => {
  const catalog = window.ICEMAN_CATALOG;
  const projectBase = /^\/ICEMAN\.com(?:\/|$)/.test(window.location.pathname) ? "/ICEMAN.com" : "";
  const withBase = (path) => `${projectBase}${path.startsWith("/") ? path : `/${path}`}` || "/";
  const withoutBase = (path) => projectBase && (path === projectBase || path.startsWith(`${projectBase}/`)) ? path.slice(projectBase.length) || "/" : path;
  const products = catalog.products;
  const categories = catalog.categories;
  const waNumber = "593967894279";
  const root = document.getElementById("app");
  const categoryBySlug = Object.fromEntries(categories.map((item) => [item.slug, item]));
  let activeFilter = "todos";
  let searchValue = "";
  let searchOpened = false;
  let menuOpened = false;
  let formStarted = false;

  const track = (eventName, params = {}) => {
    if (typeof window.gtag === "function") window.gtag("event", eventName, params);
    window.dispatchEvent(new CustomEvent("iceman:analytics", { detail: { event: eventName, ...params } }));
  };
  const escapeHTML = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const asset = (name) => `${projectBase}/assets/catalog/${encodeURIComponent(name)}.webp`;
  const waLink = (message) => `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
  const contactMessage = "Hola, quiero recibir información sobre los productos ICEMAN.";
  const categoryLabel = (slug) => categoryBySlug[slug]?.name || "Productos";
  const productPath = (product) => `/productos/${product.category}/${product.slug}`;
  const currentPath = () => `${window.location.pathname.replace(/\/$/, "") || "/"}${window.location.search}`;

  function iconArrow() { return '<span class="btn-arrow" aria-hidden="true">→</span>'; }

  function productCard(product) {
    return `<article class="product-card">
      <a class="product-card-link" href="${productPath(product)}" data-link data-product-link="${escapeHTML(product.slug)}" aria-label="Ver ${escapeHTML(product.name)}, presentación ${escapeHTML(product.presentation)}">
        <div class="product-photo"><img src="${asset(product.image)}" alt="Empaque de ${escapeHTML(product.name)} ICEMAN, presentación ${escapeHTML(product.presentation)}" loading="lazy" decoding="async"><span class="product-badge">${escapeHTML(product.brand)}</span></div>
        <div class="product-info"><div class="product-brand">${escapeHTML(categoryLabel(product.category))}</div><h3 class="product-title">${escapeHTML(product.name)}</h3><div class="product-meta">${escapeHTML(product.presentation)}${product.units ? ` · Caja de ${escapeHTML(product.units)} unidades` : ""}</div><div class="product-more"><span>Ver producto</span><span aria-hidden="true">→</span></div></div>
      </a>
    </article>`;
  }

  function header(path) {
    const links = [
      ["/productos", "Productos", path.startsWith("/productos")],
      ["/productos", "Categorías", false],
      ["/empresas", "Para empresas", path.startsWith("/empresas")],
      ["/nosotros", "Nosotros", path.startsWith("/nosotros")],
      ["/contacto", "Contacto", path.startsWith("/contacto")]
    ];
    return `<header class="site-header"><div class="wrap header-inner">
      <a href="/" data-link class="brand" aria-label="ICEMAN Ecuador, inicio"><img class="brand-symbol" src="/assets/iceman-symbol-cyan.png" alt=""><span class="brand-lockup"><img class="brand-wordmark" src="/assets/iceman-wordmark-navy.png" alt="IceMan"><small>ECUADOR</small></span></a>
      <nav class="desktop-nav" aria-label="Navegación principal">${links.map(([href, label, current]) => `<a href="${href}" data-link ${current ? 'aria-current="page"' : ""}>${label}</a>`).join("")}</nav>
      <div class="header-actions"><button class="icon-btn" type="button" data-action="search" aria-label="Buscar productos" aria-expanded="${searchOpened}"><span class="search-glyph" aria-hidden="true"></span></button><a class="btn btn-primary btn-small header-quote" href="/empresas" data-link>Solicitar cotización ${iconArrow()}</a><button class="menu-toggle" type="button" data-action="menu" aria-label="${menuOpened ? "Cerrar menú" : "Abrir menú"}" aria-expanded="${menuOpened}"><span class="menu-lines" aria-hidden="true">${menuOpened ? "×" : "☰"}</span></button></div>
      </div>
      <div class="search-bar" ${searchOpened ? "" : "hidden"}><form class="wrap search-inner" data-form="search"><span class="search-glyph" aria-hidden="true"></span><label class="sr-only" for="site-search">Buscar productos</label><input id="site-search" type="search" name="q" placeholder="Buscar papas, vegetales, Franui…" value="${escapeHTML(searchValue)}" autocomplete="off"><button class="search-close" type="button" data-action="close-search" aria-label="Cerrar búsqueda">×</button></form></div>
      <nav class="mobile-panel ${menuOpened ? "open" : ""}" aria-label="Menú móvil" ${menuOpened ? "" : "inert"}><a href="/productos" data-link>Productos</a><a href="/productos" data-link>Categorías</a><a href="/empresas" data-link>Para empresas</a><a href="/nosotros" data-link>Nosotros</a><a href="/contacto" data-link>Contacto</a><a class="mobile-sub" href="${waLink(contactMessage)}" data-wa target="_blank" rel="noopener">Hablar por WhatsApp ${iconArrow()}</a><a class="mobile-sub" href="/empresas" data-link>Solicitar cotización ${iconArrow()}</a></nav>
    </header>`;
  }

  function footer() {
    return `<footer class="site-footer"><div class="wrap"><div class="footer-grid">
      <div class="footer-brand-block"><a href="/" data-link class="brand footer-brand"><img class="brand-symbol" src="/assets/iceman-symbol-white.png" alt=""><span class="brand-lockup"><img class="brand-wordmark" src="/assets/iceman-wordmark-white.png" alt="IceMan"><small>ECUADOR</small></span></a><p>Alimentos ultracongelados, prácticos y listos para disfrutar. Una selección para cada día y para cada negocio.</p></div>
      <div class="footer-col"><h3>Productos</h3><a href="/productos/papas" data-link>Papas</a><a href="/productos/vegetales" data-link>Vegetales</a><a href="/productos/especialidades" data-link>Especialidades</a><a href="/productos/franui" data-link>Franui</a><a href="/productos" data-link>Ver catálogo completo</a></div>
      <div class="footer-col"><h3>ICEMAN</h3><a href="/nosotros" data-link>Nosotros</a><a href="/empresas" data-link>Para empresas</a><a href="/contacto" data-link>Contacto</a><p>Distribución en Ecuador</p></div>
      <div class="footer-col"><h3>Contacto</h3><a href="https://wa.me/${waNumber}" data-wa target="_blank" rel="noopener">WhatsApp · 096 789 4279</a><a href="tel:+59323948180" data-contact>Quito · (02) 394 8180</a><a href="https://www.instagram.com/franui.ec/" target="_blank" rel="noopener">Instagram · Franui Ecuador</a></div>
    </div><div class="footer-bottom"><span>© ICEMAN ${new Date().getFullYear()}. Todos los derechos reservados.</span><span>Productos ultracongelados · Ecuador</span></div></div></footer>`;
  }

  function pageShell(content, path) {
    root.innerHTML = `${header(path)}<main id="main" class="fade-in">${content}</main>${footer()}<a class="whatsapp-float" href="${waLink(contactMessage)}" data-wa target="_blank" rel="noopener" aria-label="Escribir a ICEMAN por WhatsApp">WA</a>`;
    root.querySelectorAll("a[data-link]").forEach((link) => { link.href = withBase(withoutBase(link.getAttribute("href"))); });
    if (projectBase) root.querySelectorAll('img[src^="/assets/"]').forEach((image) => { image.src = `${projectBase}${image.getAttribute("src")}`; });
    updateHead(path);
    if (searchOpened) setTimeout(() => document.getElementById("site-search")?.focus(), 0);
  }

  function updateHead(path, title, description) {
    document.title = title ? `${title} | ICEMAN Ecuador` : "ICEMAN Ecuador — Ultracongelados para todos los días";
    const meta = document.querySelector('meta[name="description"]');
    const pageDescription = description || "Descubre el catálogo de alimentos ultracongelados ICEMAN: papas, vegetales, helados, smoothies y más. Información comercial para hogares y negocios en Ecuador.";
    if (meta) meta.content = pageDescription;
    const ogTitle = document.querySelector('meta[property="og:title"]'); if (ogTitle) ogTitle.content = document.title;
    const ogDescription = document.querySelector('meta[property="og:description"]'); if (ogDescription) ogDescription.content = pageDescription;
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement("link"); canonical.rel = "canonical"; document.head.append(canonical); }
    canonical.href = `${window.location.origin}${window.location.pathname}`;
  }

  function hero() {
    return `<section class="hero"><div class="wrap hero-grid"><div class="hero-copy"><div class="eyebrow">Alimentos ultracongelados</div><h1>Lo práctico también puede ser <em>extraordinario.</em></h1><p>Descubre productos listos para acompañar cada día: fáciles de preparar, versátiles y siempre a la mano.</p><div class="hero-actions"><a class="btn btn-primary" href="/productos" data-link>Explorar productos ${iconArrow()}</a><a class="btn btn-outline" href="/empresas" data-link>Cotizar para mi negocio</a></div><div class="hero-note"><span class="snow-mark" aria-hidden="true">✳</span><span>Conserva congelado · Prepara en minutos</span></div></div><div class="hero-visual"><span class="hero-side-label">Prácticos · Versátiles · Ultracongelados</span><img class="hero-product" src="${asset("papas-ondulado-premium")}" alt="Empaque real de papas a la francesa corte ondulado ICEMAN" fetchpriority="high"><div class="hero-tag"><strong>Tu próximo favorito</strong>Papas corte ondulado · 900 g</div></div></div></section>`;
  }

  function home() {
    const categoryCards = categories.map((category) => `<a href="/productos/${category.slug}" class="category-card" data-link data-category-link="${category.slug}"><div class="category-image"><img src="${asset(category.image)}" alt="" loading="lazy" decoding="async"></div><div><div class="category-info"><span>${escapeHTML(category.name)}</span><span aria-hidden="true">↗</span></div><small>${escapeHTML(category.note)}</small></div></a>`).join("");
    const featured = products.filter((product) => product.featured).slice(0, 8).map(productCard).join("");
    return `${hero()}<div class="trust-strip"><div class="wrap trust-inner"><div class="trust-item"><span class="trust-icon" aria-hidden="true">✳</span><span><strong>Proceso IQF</strong> Ultracongelación individual</span></div><div class="trust-item"><span class="trust-icon" aria-hidden="true">◷</span><span><strong>Fáciles de preparar</strong> Listos en pocos minutos</span></div><div class="trust-item"><span class="trust-icon" aria-hidden="true">−18°</span><span><strong>Conservación</strong> Mantener a −18 °C</span></div></div></div>
    <section class="section"><div class="wrap"><div class="section-head"><div><div class="eyebrow">Explora el catálogo</div><h2>Encuentra lo que buscas</h2><p>Diez categorías, muchas ideas para tu mesa o tu negocio.</p></div><a class="text-link" href="/productos" data-link>Ver todos los productos <span>→</span></a></div><div class="category-grid">${categoryCards}</div></div></section>
    <section class="section catalog-feature"><div class="wrap"><div class="section-head section-head-row"><div><div class="eyebrow">Favoritos ICEMAN</div><h2>Para disfrutar una y otra vez</h2></div><div class="slider-controls"><button type="button" data-scroll="featured" data-direction="-1" aria-label="Productos anteriores">←</button><button type="button" data-scroll="featured" data-direction="1" aria-label="Más productos">→</button></div></div><div class="featured-track" id="featured-track">${featured}</div></div></section>
    <section class="section"><div class="wrap"><div class="eyebrow">Lo bueno de tenerlos a mano</div><h2 class="section-head" style="display:block;margin:12px 0 0;color:var(--navy);font-size:clamp(30px,4.4vw,50px);letter-spacing:-.055em">Más tiempo para lo que disfrutas</h2><div class="benefits"><article class="benefit"><span class="benefit-index">01 / PRÁCTICOS</span><h3>Listos en minutos</h3><p>Opciones fáciles de preparar para resolver cada comida.</p></article><article class="benefit"><span class="benefit-index">02 / VERSÁTILES</span><h3>Para muchas ideas</h3><p>Combina, acompaña y disfruta a tu manera.</p></article><article class="benefit"><span class="benefit-index">03 / A TU RITMO</span><h3>Usa lo que necesitas</h3><p>Porciones prácticas para preparar y servir a tu gusto.</p></article><article class="benefit"><span class="benefit-index">04 / ULTRACONGELADOS</span><h3>Sabor y frescura</h3><p>Proceso IQF que conserva sabor y frescura, según el catálogo ICEMAN.</p></article></div></div></section>
    <section class="section-tight"><div class="wrap"><div class="business-panel"><div class="business-copy"><div class="eyebrow">Para tu operación</div><h2>Productos ICEMAN para tu negocio.</h2><p>Restaurantes, hoteles, cafeterías, supermercados y más. Cuéntanos qué necesita tu operación y te ayudamos a encontrar los productos y presentaciones adecuadas.</p><div class="business-actions"><a class="btn btn-primary" href="/empresas" data-link>Solicitar información ${iconArrow()}</a><a class="btn btn-light" href="${waLink("Hola, quisiera información sobre los productos ICEMAN para mi negocio.")}" data-wa target="_blank" rel="noopener">Hablar por WhatsApp</a></div></div><div class="business-art"><img src="${asset("papas-spices")}" alt="Empaque de papas corte artesanal ICEMAN" loading="lazy"><span class="business-stamp">Una solución para cada cocina</span></div></div></div></section>
    <section class="section-tight"><div class="wrap"><div class="section-head"><div><div class="eyebrow">Nuestras líneas</div><h2>Marcas para cada momento</h2></div></div><div class="brand-row"><span class="brand-word">ICEMAN<small>Ultracongelados</small></span><span class="brand-word">Foody<small>Selección congelada</small></span><span class="brand-word franui">Franui</span><span class="brand-word munana">Munana</span><span class="brand-word">IQF<small>Ultracongelación</small></span></div></div></section>
    <section class="section-tight"><div class="wrap"><div class="cta-band"><div><h2>¿Buscas productos para tu negocio?</h2><p>Hablemos de las presentaciones y categorías que necesitas.</p></div><div class="cta-actions"><a href="/empresas" data-link class="btn btn-primary">Solicitar cotización ${iconArrow()}</a><a href="${waLink("Hola, quisiera información sobre los productos ICEMAN para mi negocio.")}" data-wa target="_blank" rel="noopener" class="btn btn-light">WhatsApp</a></div></div></div></section>`;
  }

  function breadcrumbs(parts) {
    return `<nav class="breadcrumb" aria-label="Ruta de navegación">${parts.map((part, index) => `${index ? '<span aria-hidden="true">/</span>' : ""}${part.href ? `<a href="${part.href}" data-link>${escapeHTML(part.name)}</a>` : `<span aria-current="page">${escapeHTML(part.name)}</span>`}`).join("")}</nav>`;
  }

  function catalogPage(path, categorySlug = null) {
    const category = categorySlug ? categoryBySlug[categorySlug] : null;
    const query = new URLSearchParams(window.location.search).get("q") || "";
    searchValue = query;
    activeFilter = categorySlug || "todos";
    const headerText = category ? category.name : query ? `Resultados para “${query}”` : "Todos los productos";
    const intro = `<section class="page-intro"><div class="wrap">${breadcrumbs([{ name:"Inicio", href:"/" },{ name:"Productos", href:"/productos" },...(category ? [{ name:category.name }] : [])])}<div class="page-heading"><div class="eyebrow">Catálogo ICEMAN</div><h1>${escapeHTML(headerText)}</h1><p>${category ? escapeHTML(category.note)+". Encuentra presentación, preparación y datos para cotizar." : "Explora papas, vegetales, especialidades y más. Encuentra rápidamente el producto y la presentación que buscas."}</p></div></div></section>
      <div class="catalog-toolbar"><div class="wrap toolbar-inner"><div class="category-chips" role="group" aria-label="Filtrar por categoría"><button class="chip ${activeFilter === "todos" ? "active" : ""}" data-filter="todos" aria-pressed="${activeFilter === "todos"}">Todos</button>${categories.map((item) => `<button class="chip ${activeFilter === item.slug ? "active" : ""}" data-filter="${item.slug}" aria-pressed="${activeFilter === item.slug}">${escapeHTML(item.name)}</button>`).join("")}</div><span class="toolbar-count" id="catalog-count"></span></div></div>
      <section class="catalog-results"><div class="wrap"><div id="catalog-content"></div></div></section>`;
    pageShell(intro, path);
    renderCatalogResults(categorySlug || "todos", query);
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
      return;
    }
    if (filter !== "todos") {
      content.innerHTML = `<div class="product-grid">${shown.map(productCard).join("")}</div>`;
      return;
    }
    const grouped = categories.map((category) => ({ category, items: shown.filter((product) => product.category === category.slug) })).filter((group) => group.items.length);
    content.innerHTML = grouped.map(({ category, items }) => `<section class="category-section"><h2>${escapeHTML(category.name)}</h2><div class="product-grid">${items.map(productCard).join("")}</div></section>`).join("");
  }

  function productPage(product, path) {
    track("product_view", { product_name: product.name, product_category: product.category, item_id: product.sap || product.slug });
    const category = categoryBySlug[product.category];
    const similar = products.filter((item) => item.slug !== product.slug && item.family === product.family).sort((a, b) => Number(b.category === product.category) - Number(a.category === product.category)).slice(0, 8);
    const text = `Hola, estoy interesado en ${product.name} (${product.presentation}) de ICEMAN. Quisiera recibir más información.`;
    const content = `<section class="product-detail"><div class="wrap">${breadcrumbs([{ name:"Inicio", href:"/" },{ name:"Productos", href:"/productos" },{ name:category.name, href:`/productos/${category.slug}` },{ name:product.name }])}<div class="detail-grid"><div class="detail-image"><img src="${asset(product.image)}" alt="Empaque de ${escapeHTML(product.name)}, marca ${escapeHTML(product.brand)}, presentación ${escapeHTML(product.presentation)}" fetchpriority="high"></div><div class="detail-copy"><span class="detail-brand">${escapeHTML(product.brand)} · ${escapeHTML(category.name)}</span><h1>${escapeHTML(product.name)}</h1><p>${escapeHTML(product.description)}</p><div class="detail-meta"><div class="meta-cell"><small>Presentación</small><strong>${escapeHTML(product.presentation)}</strong></div><div class="meta-cell"><small>Unidades por caja</small><strong>${escapeHTML(product.units || "Consultar")}</strong></div>${product.sap ? `<div class="meta-cell"><small>Código SAP</small><strong>${escapeHTML(product.sap)}</strong></div>` : ""}<div class="meta-cell"><small>Conservación</small><strong>−18 °C</strong></div></div><div class="detail-spec"><h2>Preparación y conservación</h2><ul class="prep-list">${product.prep.map((line) => `<li>${escapeHTML(line)}</li>`).join("")}</ul></div><div class="detail-note">Mantener congelado a −18 °C. No descongelar antes de utilizar, salvo que el modo de preparación del producto indique lo contrario. Los tiempos pueden variar según el electrodoméstico.</div><div class="detail-actions"><a class="btn btn-primary" href="/empresas" data-link>Solicitar cotización ${iconArrow()}</a><a class="btn btn-outline" href="${waLink(text)}" data-wa target="_blank" rel="noopener">Consultar por WhatsApp</a></div></div></div></div></section>${similar.length ? `<section class="similar-section"><div class="wrap"><div class="section-head section-head-row"><div><div class="eyebrow">Más de ${escapeHTML(category.name)}</div><h2>También te puede interesar</h2></div><a class="text-link" href="/productos/${category.slug}" data-link>Ver categoría <span>→</span></a></div><div class="related-track">${similar.map(productCard).join("")}</div></div></section>` : ""}`;
    pageShell(content, path);
    const image = document.querySelector('meta[property="og:image"]') || document.createElement("meta");
    image.setAttribute("property", "og:image"); image.content = `${window.location.origin}${asset(product.image)}`; if (!image.parentNode) document.head.append(image);
    updateHead(path, product.name, `${product.description} Presentación ${product.presentation}. Consulta información y disponibilidad a ICEMAN Ecuador.`);
    const crumbItems = breadcrumbSchema([{ name:"Inicio", href:"/" },{ name:"Productos", href:"/productos" },{ name:category.name, href:`/productos/${category.slug}` },{ name:product.name, href:productPath(product) }]).itemListElement;
    addSchema({ "@context":"https://schema.org", "@graph":[
      { "@type":"Product", name:product.name, image:`${window.location.origin}${asset(product.image)}`, description:product.description, sku:product.sap || product.slug, brand:{ "@type":"Brand", name:product.brand } },
      { "@type":"BreadcrumbList", itemListElement:crumbItems }
    ] });
  }

  function breadcrumbSchema(parts) {
    return { "@context":"https://schema.org", "@type":"BreadcrumbList", itemListElement:parts.map((part, index) => ({ "@type":"ListItem", position:index+1, name:part.name, item:`${window.location.origin}${part.href || window.location.pathname}` })) };
  }

  function addSchema(schema) {
    document.querySelectorAll('script[data-schema="page"]').forEach((node) => node.remove());
    const script = document.createElement("script"); script.type = "application/ld+json"; script.dataset.schema = "page"; script.textContent = JSON.stringify(schema); document.head.append(script);
  }

  function businessPage(path) {
    formStarted = false;
    const businesses = ["Restaurante","Hotel","Cafetería","Supermercado","Minimarket","Distribuidor","Catering","Otro"];
    const interests = ["Papas","Vegetales","Especialidades","Air Fryer","Helados","Smoothies","Franui","Munana","Waffles","Pizza","Otros"];
    const content = `<section class="business-page"><div class="wrap business-page-grid"><div class="business-lede">${breadcrumbs([{ name:"Inicio", href:"/" },{ name:"Para empresas" }])}<div class="eyebrow">Atención comercial</div><h1>Una buena operación empieza con los productos correctos.</h1><p>Cuéntanos qué necesita tu negocio. Nuestro equipo te ayudará a encontrar categorías y presentaciones adecuadas para tu operación.</p><div class="business-points"><div class="business-point"><b>01</b><span>Atención para restaurantes, hoteles, tiendas y distribuidores.</span></div><div class="business-point"><b>02</b><span>Información de presentaciones y productos del catálogo ICEMAN.</span></div><div class="business-point"><b>03</b><span>Contacto directo con el equipo comercial por WhatsApp.</span></div></div></div>
      <form class="lead-form" id="lead-form" novalidate><div class="form-section"><h2>Cuéntanos de tu negocio</h2><div class="form-grid"><div class="field"><label for="lead-name">Nombre <span aria-hidden="true">*</span></label><input id="lead-name" name="name" autocomplete="name" required><span class="field-error">Escribe tu nombre.</span></div><div class="field"><label for="lead-company">Empresa <span aria-hidden="true">*</span></label><input id="lead-company" name="company" autocomplete="organization" required><span class="field-error">Escribe el nombre de la empresa.</span></div><div class="field"><label for="lead-role">Cargo</label><input id="lead-role" name="role" autocomplete="organization-title"></div><div class="field"><label for="lead-city">Ciudad <span aria-hidden="true">*</span></label><input id="lead-city" name="city" autocomplete="address-level2" required><span class="field-error">Escribe tu ciudad.</span></div><div class="field"><label for="lead-phone">Teléfono / WhatsApp <span aria-hidden="true">*</span></label><input id="lead-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" required><span class="field-error">Ingresa un número de contacto válido.</span></div><div class="field"><label for="lead-email">Correo electrónico <span aria-hidden="true">*</span></label><input id="lead-email" name="email" type="email" autocomplete="email" required><span class="field-error">Ingresa un correo válido.</span></div><div class="field full"><label for="lead-business-type">Tipo de negocio <span aria-hidden="true">*</span></label><select id="lead-business-type" name="business_type" required><option value="">Selecciona una opción</option>${businesses.map((name) => `<option>${name}</option>`).join("")}</select><span class="field-error">Selecciona el tipo de negocio.</span></div></div></div>
      <div class="form-section"><h2>¿Qué productos te interesan?</h2><div class="check-grid">${interests.map((name) => `<label class="check-option"><input type="checkbox" name="interests" value="${name}"><span>${name}</span></label>`).join("")}</div></div>
      <div class="form-section"><h2>Cuéntanos un poco más</h2><div class="form-grid"><div class="field full"><label for="lead-volume">Volumen aproximado o necesidad</label><input id="lead-volume" name="volume" placeholder="Opcional"></div><div class="field full"><label for="lead-message">Mensaje</label><textarea id="lead-message" name="message" placeholder="¿Qué te gustaría consultar?"></textarea></div></div></div>
      <div class="sr-only" aria-hidden="true"><label for="lead-website">No llenar este campo</label><input id="lead-website" name="website" tabindex="-1" autocomplete="off"></div><label class="consent"><input type="checkbox" name="consent" required><span>Acepto ser contactado por ICEMAN respecto a esta solicitud. <span aria-hidden="true">*</span></span></label><p class="field-error consent-error">Acepta el contacto para continuar.</p><div class="form-error" id="form-error" role="alert"></div><div class="form-success" id="form-success" role="status"></div><div class="submit-row"><button class="btn btn-primary" type="submit">Solicitar información ${iconArrow()}</button><span class="submit-hint">Al enviar, se abrirá WhatsApp con tu consulta para que puedas revisarla y compartirla con ICEMAN.</span></div></form></div></section>`;
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
    const content = `<section class="page-intro"><div class="wrap">${breadcrumbs([{ name:"Inicio", href:"/" },{ name:"Contacto" }])}<div class="page-heading"><div class="eyebrow">Estamos para ayudarte</div><h1>Conversemos.</h1><p>Escríbenos para consultar productos, cobertura o información para tu negocio.</p></div></div></section><section class="section"><div class="wrap contact-panel"><article class="contact-card"><h2>Contacto comercial</h2><a href="https://wa.me/${waNumber}" data-wa target="_blank" rel="noopener">WhatsApp · +593 96 789 4279</a><a href="tel:+59323948180" data-contact>Quito · (02) 394 8180</a><a href="https://www.instagram.com/franui.ec/" target="_blank" rel="noopener">Instagram · Franui Ecuador</a><p>Para una cotización empresarial, cuéntanos sobre tu negocio.</p><a class="btn btn-primary btn-small" href="/empresas" data-link>Formulario para empresas ${iconArrow()}</a></article><article class="contact-card"><h2>Oficinas y distribuidores</h2>${cities.map(([name,address,phone]) => `<div class="contact-city"><h3>${escapeHTML(name)}</h3><p>${escapeHTML(address)}<br>${escapeHTML(phone)}</p></div>`).join("")}</article></div></section>`;
    pageShell(content, path);
    updateHead(path, "Contacto ICEMAN Ecuador", "Contacta al equipo comercial ICEMAN por WhatsApp o consulta las oficinas y distribuidores en Ecuador.");
  }

  function aboutPage(path) {
    const content = `<section class="section"><div class="wrap about-split"><div class="about-copy">${breadcrumbs([{ name:"Inicio", href:"/" },{ name:"Nosotros" }])}<div class="eyebrow">ICEMAN Ecuador</div><h1>Prácticos para el día a día. Listos para compartir.</h1><p>ICEMAN reúne alimentos ultracongelados pensados para hacer más fácil la preparación de tus comidas. El catálogo incluye papas, vegetales, especialidades, helados de paila, smoothies, Franui, waffles, productos Munana y pizza.</p><p>El catálogo ICEMAN indica que el proceso de ultracongelación IQF conserva el valor nutritivo, sabor y frescura de los productos. Mantener los productos congelados a −18 °C.</p><div class="about-callout">Una selección para hogares y para negocios que buscan opciones prácticas y versátiles.</div><div class="hero-actions"><a href="/productos" data-link class="btn btn-primary">Explorar productos ${iconArrow()}</a><a href="/contacto" data-link class="btn btn-outline">Contactar</a></div></div><div class="about-visual"><img src="${asset("edamame-grano")}" alt="Empaque de edamame grano ICEMAN" loading="lazy"></div></div></section><section class="section-tight"><div class="wrap"><div class="trust-strip"><div class="trust-inner"><div class="trust-item"><span class="trust-icon">01</span><span><strong>Variedad</strong> Diez categorías</span></div><div class="trust-item"><span class="trust-icon">IQF</span><span><strong>Ultracongelación</strong> Según el catálogo</span></div><div class="trust-item"><span class="trust-icon">EC</span><span><strong>Ecuador</strong> Oficinas en seis ciudades</span></div></div></div></div></section>`;
    pageShell(content, path);
    updateHead(path, "Nosotros", "Conoce ICEMAN Ecuador y su catálogo de alimentos ultracongelados para el día a día y para negocios.");
  }

  function notFound(path) {
    pageShell(`<section class="not-found"><div><div class="eyebrow" style="justify-content:center">Página no encontrada</div><h1>Sigamos explorando.</h1><p>El enlace puede haber cambiado.</p><a class="btn btn-primary" href="/productos" data-link>Ver productos ${iconArrow()}</a></div></section>`, path);
    updateHead(path, "Página no encontrada", "El enlace solicitado no se encontró. Explora el catálogo de productos ICEMAN.");
  }

  function render() {
    const path = withoutBase(window.location.pathname).replace(/\/$/, "") || "/";
    const parts = path.split("/").filter(Boolean);
    if (path === "/") { activeFilter = "todos"; pageShell(home(), path); addSchema({ "@context":"https://schema.org", "@type":"Organization", name:"ICEMAN Ecuador", url:window.location.origin, telephone:"+593 96 789 4279", contactPoint:{ "@type":"ContactPoint", telephone:"+593 96 789 4279", contactType:"sales", areaServed:"EC" } }); }
    else if (path === "/productos") catalogPage(path);
    else if (parts[0] === "productos" && parts.length === 2 && categoryBySlug[parts[1]]) catalogPage(path, parts[1]);
    else if (parts[0] === "productos" && parts.length >= 3) {
      const slug = parts[parts.length - 1]; const product = products.find((item) => item.slug === slug);
      product ? productPage(product, path) : notFound(path);
    }
    else if (path === "/empresas") businessPage(path);
    else if (path === "/contacto") contactPage(path);
    else if (path === "/nosotros") aboutPage(path);
    else notFound(path);
    document.body.classList.toggle("menu-open", menuOpened);
  }

  function navigate(href, { replace = false } = {}) {
    const url = new URL(href, window.location.origin);
    const target = `${withBase(withoutBase(url.pathname))}${url.search}${url.hash}`;
    if (replace) history.replaceState({}, "", target); else history.pushState({}, "", target);
    searchOpened = false; menuOpened = false; searchValue = ""; window.scrollTo({ top:0, behavior:matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" }); render();
  }

  root.addEventListener("click", (event) => {
    const anchor = event.target.closest("a");
    if (anchor?.dataset.productLink && anchor.closest(".related-track")) track("related_product_click", { product_slug: anchor.dataset.productLink });
    if (anchor?.hasAttribute("data-link") && withoutBase(new URL(anchor.href, window.location.origin).pathname) === "/contacto") track("contact_click", { target:"contact_page" });
    if (anchor?.hasAttribute("data-link")) { event.preventDefault(); navigate(anchor.getAttribute("href")); return; }
    if (anchor?.hasAttribute("data-wa")) track("whatsapp_click", { placement: anchor.classList.contains("whatsapp-float") ? "floating" : "link" });
    if (anchor?.hasAttribute("data-contact")) track("contact_click", { target: anchor.getAttribute("href") });
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (action === "search") { searchOpened = !searchOpened; menuOpened = false; render(); }
    if (action === "close-search") { searchOpened = false; render(); }
    if (action === "menu") { menuOpened = !menuOpened; searchOpened = false; document.body.classList.toggle("menu-open", menuOpened); render(); }
    if (action === "clear-search") { searchValue = ""; navigate("/productos"); }
    const filter = event.target.closest("[data-filter]")?.dataset.filter;
    if (filter) {
      activeFilter = filter; searchValue = "";
      const targetPath = filter === "todos" ? "/productos" : `/productos/${filter}`;
      history.pushState({}, "", withBase(targetPath));
      document.querySelectorAll(".chip").forEach((chip) => { const isActive = chip.dataset.filter === filter; chip.classList.toggle("active", isActive); chip.setAttribute("aria-pressed", String(isActive)); });
      renderCatalogResults(filter); track("category_view", { category: filter === "todos" ? "all" : filter });
    }
    const scroll = event.target.closest("[data-scroll]");
    if (scroll) document.getElementById(`${scroll.dataset.scroll}-track`)?.scrollBy({ left:Number(scroll.dataset.direction) * 300, behavior:"smooth" });
  });

  root.addEventListener("submit", async (event) => {
    const form = event.target;
    if (form.matches('[data-form="search"]')) {
      event.preventDefault(); const value = new FormData(form).get("q")?.toString().trim() || "";
      searchValue = value; track("search", { search_term:value }); searchOpened = false; navigate(value ? `/productos?q=${encodeURIComponent(value)}` : "/productos"); return;
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
    if (form.elements.website.value.trim()) return;
    const values = new FormData(form);
    const chosen = values.getAll("interests");
    const message = [
      "Hola, quiero solicitar información comercial de ICEMAN.",
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
    if (endpoint) {
      try {
        const payload = Object.fromEntries(values); payload.interests = values.getAll("interests");
        const response = await fetch(endpoint, { method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(payload) });
        if (!response.ok) throw new Error("No se pudo enviar la solicitud.");
        successBox.textContent = "Gracias. Recibimos tu solicitud y el equipo ICEMAN se pondrá en contacto contigo."; successBox.classList.add("show"); form.reset(); track("b2b_form_submit", { destination:"backend" });
      } catch { errorBox.textContent = "No pudimos enviar tu solicitud en este momento. Escríbenos por WhatsApp y te ayudaremos."; errorBox.classList.add("show"); }
      return;
    }
    track("b2b_form_submit", { destination:"whatsapp" });
    const opened = window.open(waLink(message), "_blank", "noopener,noreferrer");
    successBox.textContent = opened ? "WhatsApp se abrió con los datos de tu consulta. Revísalos y envíalos para contactar al equipo ICEMAN." : "Tu consulta está lista. Usa el botón de WhatsApp para compartirla con el equipo ICEMAN.";
    successBox.classList.add("show");
  });

  root.addEventListener("change", (event) => {
    const field = event.target.closest(".field input, .field select");
    if (field) { field.closest(".field")?.classList.remove("has-error"); field.removeAttribute("aria-invalid"); }
    if (event.target.name === "consent" && event.target.checked) { const err = root.querySelector(".consent-error"); if (err) err.style.display = "none"; }
  });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") { if (menuOpened || searchOpened) { menuOpened = false; searchOpened = false; document.body.classList.remove("menu-open"); render(); } } });
  window.addEventListener("popstate", render);
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) document.documentElement.classList.add("no-motion");
  const restoredRoute = new URLSearchParams(window.location.search).get("__route");
  if (restoredRoute) {
    const restoredUrl = new URL(restoredRoute, window.location.origin);
    history.replaceState({}, "", `${withBase(withoutBase(restoredUrl.pathname))}${restoredUrl.search}${restoredUrl.hash}`);
  }
  render();
})();
