function renderBrandMark() {
  return `
    <svg viewBox="0 0 64 80" aria-hidden="true" focusable="false">
      <path d="M23 19c0-9 4-15 9-15s9 6 9 15c0 6-2 11-5 15v6" />
      <path d="M28 28c1 2 3 3 4 3s3-1 4-3" />
      <path d="M30 22h4" />
      <path d="M28 41c2 3 7 3 9 0" />
      <path d="M18 57c4-5 8-7 14-7s10 2 14 7" />
      <path d="M14 69c5-4 11-6 18-6s13 2 18 6" />
      <path d="M23 19c-5 4-8 10-8 18 0 9 5 17 17 17s17-8 17-17c0-8-3-14-8-18" />
      <path d="M32 10v44" />
    </svg>
  `;
}

function formatWorkCount(count, active) {
  return `${count} ${active ? "matching works" : count === 1 ? "work" : "works"}`;
}

function heroPreviewHref(href) {
  return href.includes("?") ? `${href}&embed=hero` : `${href}?embed=hero`;
}

function renderBrowseGroup(group) {
  const itemsHtml = group.items
    .map(
      (item) => `
        <button class="browse-chip" type="button" data-filter-group="${group.id}" data-filter-value="${item.value}" aria-pressed="false">
          <span>${item.label}</span>
          <span class="browse-count">${item.count}</span>
        </button>
      `
    )
    .join("");

  return `
    <section class="browse-group" aria-labelledby="browse-${group.id}">
      <h3 class="browse-group-title" id="browse-${group.id}">${group.title}</h3>
      <div class="browse-chip-row">${itemsHtml}</div>
    </section>
  `;
}

function renderEntry(entry) {
  const isExternal = /^https?:\/\//.test(entry.href);
  const linkLabel = entry.linkLabel || (isExternal ? "View Record" : "View Piece");
  const linkArrow = isExternal ? "↗" : "→";
  const linkAttrs = isExternal ? ' target="_blank" rel="noreferrer"' : "";

  return `
    <li class="work-item" id="work-${entry.id}" data-era="${entry.era}" data-region="${entry.region}" data-artist="${entry.artist}" data-gallery="${entry.gallery}">
      <a class="piece" href="${entry.href}"${linkAttrs}>
        <h4 class="piece-title">${entry.title}</h4>
        ${entry.creator ? `<p class="piece-creator">${entry.creator}</p>` : ""}
        ${entry.date ? `<p class="piece-date">${entry.date}</p>` : ""}
        <span class="piece-link">${linkLabel} <span aria-hidden="true">${linkArrow}</span></span>
      </a>
    </li>
  `;
}

function renderSection(section) {
  const itemsHtml = section.items.map((entry) => renderEntry(entry)).join("");
  return `
    <article class="gallery-card" id="gallery-${section.id}" data-work-count-label="${formatWorkCount(section.workCount)}">
      <div class="gallery-head">
        ${section.region ? `<p class="gallery-region">${section.region}</p>` : ""}
        <h3 class="gallery-title">${section.title}</h3>
        <p class="gallery-description">${section.subtitle}</p>
        <div class="gallery-meta">
          ${section.dateRange ? `<span>${section.dateRange}</span>` : ""}
          <span class="gallery-work-count" data-work-count>${formatWorkCount(section.workCount)}</span>
        </div>
      </div>
      <ul class="work-list">${itemsHtml}</ul>
    </article>
  `;
}

function bindLobbyFilters() {
  const browseButtons = Array.from(document.querySelectorAll(".browse-chip"));
  const resetButton = document.querySelector("[data-filter-reset]");
  const galleryCards = Array.from(document.querySelectorAll(".gallery-card"));
  const status = document.getElementById("browseStatus");

  let activeGroup = "";
  let activeValue = "";

  function applyFilter(group = "", value = "") {
    activeGroup = group;
    activeValue = value;

    const hasActiveFilter = Boolean(group && value);
    if (status) {
      status.textContent = hasActiveFilter ? `Showing ${value}` : "Viewing the full collection";
    }
    if (resetButton) {
      resetButton.hidden = !hasActiveFilter;
    }

    for (const button of browseButtons) {
      const isActive = button.dataset.filterGroup === group && button.dataset.filterValue === value;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    }

    for (const card of galleryCards) {
      const works = Array.from(card.querySelectorAll(".work-item"));
      let visibleCount = 0;

      for (const work of works) {
        const isVisible = !hasActiveFilter || work.dataset[group] === value;
        work.hidden = !isVisible;
        if (isVisible) {
          visibleCount += 1;
        }
      }

      card.hidden = visibleCount === 0;

      const countNode = card.querySelector("[data-work-count]");
      if (countNode) {
        countNode.textContent = hasActiveFilter
          ? formatWorkCount(visibleCount, true)
          : card.dataset.workCountLabel || "";
      }
    }
  }

  for (const button of browseButtons) {
    button.addEventListener("click", () => {
      const nextGroup = button.dataset.filterGroup || "";
      const nextValue = button.dataset.filterValue || "";
      const isSameFilter = nextGroup === activeGroup && nextValue === activeValue;

      applyFilter(isSameFilter ? "" : nextGroup, isSameFilter ? "" : nextValue);

      if (!isSameFilter) {
        const firstVisibleGallery = galleryCards.find((card) => !card.hidden);
        firstVisibleGallery?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }

  resetButton?.addEventListener("click", () => {
    applyFilter();
  });

  applyFilter();
}

export function renderMuseumLobby(lobby) {
  document.title = lobby.pageTitle || document.title;

  const featuredPiece = lobby.featuredPiece;
  const browseGroupsHtml = lobby.browseGroups.map((group) => renderBrowseGroup(group)).join("");
  const sectionsHtml = lobby.sections.map((section) => renderSection(section)).join("");

  document.body.innerHTML = `
    <div class="app lobby-app">
      <header class="lobby-header">
        <div class="brand-lockup">
          <span class="brand-mark">${renderBrandMark()}</span>
          <span class="brand-name">${lobby.brand}</span>
        </div>
        <div class="lobby-copy-block">
          <h1 class="lobby-title">${lobby.title}</h1>
          <p class="lobby-intro">${lobby.subtitle}</p>
          <p class="lobby-metadata">${lobby.metadataLine}</p>
        </div>
      </header>

      <main class="stage">
        <section class="hero-section" aria-labelledby="featured-work-title">
          <div class="hero-copy">
            <p class="section-kicker">${lobby.featuredLabel}</p>
            <h2 class="hero-title" id="featured-work-title">${featuredPiece.title}</h2>
            ${featuredPiece.attribution ? `<p class="hero-attribution">${featuredPiece.attribution}</p>` : ""}
            ${featuredPiece.date ? `<p class="hero-date">${featuredPiece.date}</p>` : ""}
            <a class="hero-link" href="${featuredPiece.href}">${lobby.featuredCtaLabel}</a>
          </div>
          <div class="hero-stage-shell" aria-hidden="true">
            <iframe
              class="hero-frame"
              src="${heroPreviewHref(featuredPiece.href)}"
              tabindex="-1"
              loading="eager"
              title="${featuredPiece.title} preview"
            ></iframe>
          </div>
        </section>

        <section class="browse-section" aria-labelledby="browse-title">
          <div class="section-head">
            <div>
              <p class="section-kicker">Collection Guide</p>
              <h2 class="section-title" id="browse-title">${lobby.browseTitle}</h2>
            </div>
            <button class="browse-reset" type="button" data-filter-reset hidden>${lobby.browseResetLabel}</button>
          </div>
          <p class="section-sub">${lobby.browseSubtitle}</p>
          <p class="browse-status" id="browseStatus" aria-live="polite">Viewing the full collection</p>
          <div class="browse-grid">${browseGroupsHtml}</div>
        </section>

        <section class="rooms-section" id="rooms" aria-labelledby="rooms-title">
          <div class="section-head">
            <div>
              <p class="section-kicker">Curatorial Rooms</p>
              <h2 class="section-title" id="rooms-title">Galleries</h2>
            </div>
          </div>
          <div class="gallery-grid">${sectionsHtml}</div>
        </section>
      </main>
    </div>
  `;

  bindLobbyFilters();
}
