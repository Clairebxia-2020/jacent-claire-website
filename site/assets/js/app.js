/* Line Review — vanilla JS hash router + views. No build step, no backend. */

(function () {
  "use strict";

  const app = document.getElementById("app");

  function imgSrc(collectionSlug, filename) {
    return `assets/img/${collectionSlug}/${filename}`;
  }

  function collectionBySlug(slug) {
    return COLLECTIONS.find((c) => c.slug === slug);
  }

  function productsIn(slug) {
    return PRODUCTS.filter((p) => p.collection === slug);
  }

  function statusLabel(status) {
    return { active: "Active", new: "New", temp: "Temp" }[status] || status;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  // Minimal inline line-icons for the "Standard" value-props block — no icon
  // library dependency, styled via currentColor to match --clay.
  const ICONS = {
    layers: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 3 8l9 5 9-5-9-5Z"/><path d="M3 13l9 5 9-5"/></svg>`,
    grid: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="3.5" width="7" height="7" rx="1.2"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.2"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.2"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.2"/></svg>`,
    check: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.2l2.4 2.4 4.6-4.9"/></svg>`,
    search: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M19.5 19.5 15 15"/></svg>`,
  };

  function heroImageFor(slug) {
    // pick a representative image per collection for card art
    const reps = {
      "handoff-2026": imgSrc("handoff-2026", "13790-fop-a.png"),
      "candle": imgSrc("candle", "19146-a.png"),
      "proseries": imgSrc("proseries", "62474-a.png"),
    };
    return reps[slug] || "";
  }

  // ---------------- Router ----------------

  function route() {
    const hash = location.hash.replace(/^#/, "") || "/";
    const parts = hash.split("/").filter(Boolean);

    setActiveNav(parts[0] === "collection" ? parts[1] : "home");

    const isHome = parts.length === 0 || (parts[0] !== "collection" && parts[0] !== "product");
    if (!isHome && heroScrollCleanup) {
      heroScrollCleanup();
      heroScrollCleanup = null;
    }

    if (parts.length === 0) {
      renderHome();
    } else if (parts[0] === "collection" && parts[1]) {
      renderCollection(parts[1]);
    } else if (parts[0] === "product" && parts[1]) {
      renderProduct(decodeURIComponent(parts[1]));
    } else {
      renderHome();
    }
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }

  function setActiveNav(key) {
    document.querySelectorAll(".main-nav a").forEach((a) => {
      a.classList.toggle("active", a.dataset.nav === key);
    });
  }

  window.addEventListener("hashchange", route);
  window.addEventListener("DOMContentLoaded", () => {
    route();
    initSearch();
    initLightbox();
  });

  // ---------------- Home hero motion (fade-up + parallax) ----------------

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let heroScrollCleanup = null;

  // Shared fade-up-on-scroll helper, used by the hero copy and the
  // "Standard" value-props block (each item fades up with a small stagger).
  function fadeInOnView(elements, staggerMs) {
    const list = Array.from(elements);
    if (!list.length) return;

    if (prefersReducedMotion) {
      list.forEach((el) => el.classList.add("in-view"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const delay = staggerMs ? list.indexOf(entry.target) * staggerMs : 0;
            setTimeout(() => entry.target.classList.add("in-view"), delay);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 }
    );
    list.forEach((el) => observer.observe(el));
  }

  function initHeroEffects() {
    if (heroScrollCleanup) {
      heroScrollCleanup();
      heroScrollCleanup = null;
    }

    const copy = document.getElementById("heroCopy");
    const img = document.getElementById("heroImg");
    if (!copy) return;

    fadeInOnView([copy], 0);
    fadeInOnView(document.querySelectorAll("#standardBlock .standard__item"), 90);

    if (img && !prefersReducedMotion) {
      let ticking = false;
      const onScroll = () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          const offset = Math.min(window.scrollY * 0.12, 40);
          img.style.transform = `translateY(${offset}px)`;
          ticking = false;
        });
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      heroScrollCleanup = () => window.removeEventListener("scroll", onScroll);
    }
  }

  // ---------------- Home ----------------

  function renderHome() {
    const totalProducts = PRODUCTS.length;
    const totalImages = PRODUCTS.reduce((n, p) => n + p.images.length, 0);

    app.innerHTML = `
      <section class="hero" id="homeHero">
        <div class="hero__grid">
          <div class="hero__copy" id="heroCopy">
            <div class="hero__eyebrow">Internal Review Portal</div>
            <h1 class="hero__slogan">Jacent made easier.</h1>
            <p>Browse packaging photography for every SKU moving through the line — front, back, and side of pack, side by side, before it ships to retail.</p>
            <div class="hero__cta">
              <a href="#/collection/handoff-2026" class="btn btn-solid">Browse 2026 Handoff</a>
              <a href="#collections" class="btn btn-outline" id="scrollToCollections">All collections</a>
            </div>
          </div>
          <div class="hero__visual">
            <img src="assets/img/hero/hero-aisle.jpg" alt="" class="hero__img" id="heroImg" />
          </div>
        </div>
      </section>

      <section class="standard" id="standardBlock">
        <svg class="standard__decor" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M10 190C60 190 70 140 60 110C50 80 20 70 30 40C40 10 90 5 110 30C130 55 110 80 140 95C170 110 190 70 195 40" stroke="currentColor" stroke-width="1.4"/>
          <path d="M45 185C80 175 85 145 70 125" stroke="currentColor" stroke-width="1.4"/>
        </svg>
        <div class="standard__inner">
          <div class="standard__head">
            <div>
              <span class="eyebrow">Our Standard</span>
              <h2>The <em>Line</em> Standard</h2>
            </div>
            <div class="standard__sub">Consistency, before it ships.</div>
          </div>
          <div class="standard__grid">
            <div class="standard__item">
              <div class="standard__icon">${ICONS.layers}</div>
              <h3>Every Angle, One Place</h3>
              <p>FOP, BOP, and SOP shown together for every SKU.</p>
            </div>
            <div class="standard__item">
              <div class="standard__icon">${ICONS.grid}</div>
              <h3>Organized by Collection</h3>
              <p>Grouped the way merchandising already thinks.</p>
            </div>
            <div class="standard__item">
              <div class="standard__icon">${ICONS.check}</div>
              <h3>Review-Ready Status</h3>
              <p>See what's active, new, or still in temp at a glance.</p>
            </div>
            <div class="standard__item">
              <div class="standard__icon">${ICONS.search}</div>
              <h3>Find Any SKU in Seconds</h3>
              <p>Search across every collection instantly.</p>
            </div>
          </div>
        </div>
      </section>

      <div class="stat-strip">
        <div class="stat-strip__inner">
          <span><b>${COLLECTIONS.length}</b> collections</span>
          <span><b>${totalProducts}</b> products</span>
          <span><b>${totalImages}</b> packaging images</span>
        </div>
      </div>

      <div class="wrap" id="collections">
        <div class="section-head">
          <div>
            <h2>Collections</h2>
            <p>Pick a collection to review its products.</p>
          </div>
        </div>
        <div class="collection-grid">
          ${COLLECTIONS.map(collectionCardHtml).join("")}
        </div>
      </div>
    `;

    initHeroEffects();
  }

  function collectionCardHtml(c) {
    const count = productsIn(c.slug).length;
    return `
      <a class="collection-card" href="#/collection/${c.slug}">
        <div class="collection-card__frame">
          <img src="${heroImageFor(c.slug)}" alt="" loading="lazy" />
        </div>
        <div class="collection-card__label">
          <div class="eyebrow">Collection</div>
          <h3>${escapeHtml(c.name)}</h3>
          <p>${escapeHtml(c.tagline)}</p>
          <div class="collection-card__count">${count} product${count === 1 ? "" : "s"} →</div>
        </div>
      </a>
    `;
  }

  // ---------------- Collection ----------------

  let activeStatusFilter = "all";
  let activeSearchTerm = "";

  function renderCollection(slug) {
    const collection = collectionBySlug(slug);
    if (!collection) {
      app.innerHTML = `<div class="wrap empty-state"><p>Collection not found.</p><a href="#/" class="btn btn-solid">Back home</a></div>`;
      return;
    }
    activeStatusFilter = "all";
    activeSearchTerm = "";
    paintCollection(collection);
  }

  function paintCollection(collection) {
    const all = productsIn(collection.slug);
    const statuses = Array.from(new Set(all.map((p) => p.status)));

    const filtered = all.filter((p) => {
      const statusOk = activeStatusFilter === "all" || p.status === activeStatusFilter;
      const term = activeSearchTerm.trim().toLowerCase();
      const searchOk =
        !term ||
        p.sku.toLowerCase().includes(term) ||
        p.name.toLowerCase().includes(term) ||
        (p.brand || "").toLowerCase().includes(term);
      return statusOk && searchOk;
    });

    app.innerHTML = `
      <div class="wrap">
        <div class="breadcrumb">
          <a href="#/">Home</a><span>/</span><span>${escapeHtml(collection.name)}</span>
        </div>
        <div class="section-head">
          <div>
            <h2>${escapeHtml(collection.name)}</h2>
            <p>${escapeHtml(collection.tagline)}</p>
          </div>
        </div>

        <div class="toolbar">
          <div class="toolbar__filters" id="statusChips">
            <button class="chip ${activeStatusFilter === "all" ? "active" : ""}" data-status="all">All (${all.length})</button>
            ${statuses.map((s) => {
              const n = all.filter((p) => p.status === s).length;
              return `<button class="chip ${activeStatusFilter === s ? "active" : ""}" data-status="${s}">${statusLabel(s)} (${n})</button>`;
            }).join("")}
          </div>
          <input type="search" id="collectionSearch" placeholder="Filter this collection…" value="${escapeHtml(activeSearchTerm)}" style="padding:9px 14px;border:1px solid var(--line);border-radius:20px;background:var(--bg-alt);color:var(--ink);font-size:0.85rem;min-width:220px;" />
        </div>

        <div class="toolbar__count">${filtered.length} of ${all.length} shown</div>

        ${filtered.length
          ? `<div class="product-grid">${filtered.map((p) => productCardHtml(p)).join("")}</div>`
          : `<div class="empty-state">No products match this filter.</div>`
        }
      </div>
    `;

    app.querySelectorAll("#statusChips .chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeStatusFilter = btn.dataset.status;
        paintCollection(collection);
      });
    });
    const searchInput = document.getElementById("collectionSearch");
    searchInput.addEventListener("input", () => {
      activeSearchTerm = searchInput.value;
      paintCollection(collection);
    });
    searchInput.focus();
    searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
  }

  function productCardHtml(p) {
    const cover = imgSrc(p.collection, p.images[0].src);
    return `
      <a class="product-card" href="#/product/${p.sku}">
        <div class="product-card__img">
          <img src="${cover}" alt="${escapeHtml(p.name)}" loading="lazy" />
          <span class="product-card__count">${p.images.length} img${p.images.length === 1 ? "" : "s"}</span>
        </div>
        <div class="product-card__body">
          <span class="badge badge-${p.status}">${statusLabel(p.status)}</span>
          <span class="product-card__sku">SKU ${escapeHtml(p.sku)}</span>
          <span class="product-card__name">${escapeHtml(p.name)}</span>
          ${p.brand ? `<span class="product-card__brand">${escapeHtml(p.brand)}</span>` : ""}
        </div>
      </a>
    `;
  }

  // ---------------- Product detail ----------------

  let currentGallery = []; // [{src, label}]
  let currentGalleryIndex = 0;

  function renderProduct(sku) {
    const product = PRODUCTS.find((p) => p.sku === sku);
    if (!product) {
      app.innerHTML = `<div class="wrap empty-state"><p>Product not found.</p><a href="#/" class="btn btn-solid">Back home</a></div>`;
      return;
    }
    const collection = collectionBySlug(product.collection);
    const siblings = productsIn(product.collection);
    const idx = siblings.findIndex((p) => p.sku === sku);
    const prev = siblings[(idx - 1 + siblings.length) % siblings.length];
    const next = siblings[(idx + 1) % siblings.length];

    currentGallery = product.images.map((img) => ({
      src: imgSrc(product.collection, img.src),
      label: img.label,
    }));
    currentGalleryIndex = 0;

    app.innerHTML = `
      <div class="wrap">
        <div class="breadcrumb">
          <a href="#/">Home</a><span>/</span>
          <a href="#/collection/${collection.slug}">${escapeHtml(collection.name)}</a><span>/</span>
          <span>SKU ${escapeHtml(product.sku)}</span>
        </div>

        <div class="product-detail">
          <div class="pd-gallery">
            <div class="pd-gallery__main" id="pdMain">
              <img src="${currentGallery[0].src}" alt="${escapeHtml(product.name)}" id="pdMainImg" />
            </div>
            <div class="pd-current-label" id="pdCurrentLabel">${escapeHtml(currentGallery[0].label)}</div>
            ${currentGallery.length > 1 ? `
              <div class="pd-gallery__thumbs" id="pdThumbs">
                ${currentGallery.map((g, i) => `
                  <button class="pd-thumb ${i === 0 ? "active" : ""}" data-index="${i}" title="${escapeHtml(g.label)}">
                    <img src="${g.src}" alt="${escapeHtml(g.label)}" />
                  </button>
                `).join("")}
              </div>
            ` : ""}
          </div>

          <div class="pd-info">
            <div class="eyebrow">${escapeHtml(collection.name)}</div>
            <h1>${escapeHtml(product.name)}</h1>
            ${product.brand ? `<div class="pd-brand">${escapeHtml(product.brand)}</div>` : ""}

            <dl class="pd-meta">
              <dt>SKU</dt><dd>${escapeHtml(product.sku)}</dd>
              <dt>Status</dt><dd><span class="badge badge-${product.status}">${statusLabel(product.status)}</span></dd>
              <dt>Images</dt><dd>${product.images.length}</dd>
            </dl>

            ${product.note ? `<div class="pd-note">${escapeHtml(product.note)}</div>` : ""}

            <p style="color:var(--ink-soft);font-size:0.88rem;">Click the main image to zoom. Use the thumbnails to switch between angles.</p>

            <div class="pd-prevnext">
              <a href="#/product/${prev.sku}"><span class="dir">&larr; Previous</span>${escapeHtml(prev.name)}</a>
              <a href="#/product/${next.sku}" style="text-align:right"><span class="dir">Next &rarr;</span>${escapeHtml(next.name)}</a>
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById("pdMain").addEventListener("click", () => openLightbox(currentGalleryIndex));

    const thumbs = document.getElementById("pdThumbs");
    if (thumbs) {
      thumbs.querySelectorAll(".pd-thumb").forEach((btn) => {
        btn.addEventListener("click", () => {
          const i = Number(btn.dataset.index);
          setMainImage(i);
        });
      });
    }
  }

  function setMainImage(i) {
    currentGalleryIndex = i;
    const g = currentGallery[i];
    document.getElementById("pdMainImg").src = g.src;
    document.getElementById("pdMainImg").alt = g.label;
    document.getElementById("pdCurrentLabel").textContent = g.label;
    document.querySelectorAll(".pd-thumb").forEach((t, idx) => {
      t.classList.toggle("active", idx === i);
    });
  }

  // ---------------- Lightbox ----------------

  function initLightbox() {
    document.getElementById("lightboxClose").addEventListener("click", closeLightbox);
    document.getElementById("lightboxPrev").addEventListener("click", () => stepLightbox(-1));
    document.getElementById("lightboxNext").addEventListener("click", () => stepLightbox(1));
    document.getElementById("lightbox").addEventListener("click", (e) => {
      if (e.target.id === "lightbox") closeLightbox();
    });
    document.addEventListener("keydown", (e) => {
      const lb = document.getElementById("lightbox");
      if (lb.hidden) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") stepLightbox(-1);
      if (e.key === "ArrowRight") stepLightbox(1);
    });
  }

  function openLightbox(index) {
    if (!currentGallery.length) return;
    currentGalleryIndex = index;
    paintLightbox();
    document.getElementById("lightbox").hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    document.getElementById("lightbox").hidden = true;
    document.body.style.overflow = "";
  }

  function stepLightbox(delta) {
    currentGalleryIndex = (currentGalleryIndex + delta + currentGallery.length) % currentGallery.length;
    paintLightbox();
    setMainImage(currentGalleryIndex);
  }

  function paintLightbox() {
    const g = currentGallery[currentGalleryIndex];
    document.getElementById("lightboxImg").src = g.src;
    document.getElementById("lightboxImg").alt = g.label;
    document.getElementById("lightboxCaption").textContent = `${g.label} — ${currentGalleryIndex + 1} of ${currentGallery.length}`;
    const showNav = currentGallery.length > 1;
    document.getElementById("lightboxPrev").style.display = showNav ? "" : "none";
    document.getElementById("lightboxNext").style.display = showNav ? "" : "none";
  }

  // ---------------- Global search ----------------

  function initSearch() {
    const input = document.getElementById("globalSearch");
    const results = document.getElementById("searchResults");

    input.addEventListener("input", () => {
      const term = input.value.trim().toLowerCase();
      if (!term) {
        results.hidden = true;
        results.innerHTML = "";
        return;
      }
      const matches = PRODUCTS.filter(
        (p) =>
          p.sku.toLowerCase().includes(term) ||
          p.name.toLowerCase().includes(term) ||
          (p.brand || "").toLowerCase().includes(term)
      ).slice(0, 8);

      results.innerHTML = matches.length
        ? matches.map((p) => `
            <a href="#/product/${p.sku}">
              <img src="${imgSrc(p.collection, p.images[0].src)}" alt="" />
              <span>
                <span class="sr-name">${escapeHtml(p.name)}</span><br>
                <span class="sr-meta">SKU ${escapeHtml(p.sku)} · ${escapeHtml(collectionBySlug(p.collection).name)}</span>
              </span>
            </a>
          `).join("")
        : `<div class="sr-empty">No matches.</div>`;
      results.hidden = false;
    });

    results.addEventListener("click", () => {
      results.hidden = true;
      input.value = "";
    });

    document.addEventListener("click", (e) => {
      if (!e.target.closest(".header-search")) results.hidden = true;
    });
  }
})();
