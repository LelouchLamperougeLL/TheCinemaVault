const fs = require('fs');
const file = 'c:\\Users\\sabiq\\Music\\TheCinemaVault\\index.html';
let content = fs.readFileSync(file, 'utf8');

// 1. Add CSS
content = content.replace('      /* ── Main content ── */', 
`      /* ── Mobile Filter Group ── */
      .mobile-filter-group { margin-bottom: 1.5rem; }
      .mobile-filter-group:last-child { margin-bottom: 0; }
      .mobile-filter-group-title {
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--text-tertiary);
        margin-bottom: 0.75rem;
        padding-bottom: 0.4rem;
        border-bottom: 1px solid var(--border);
      }

      /* ── Main content ── */`);

// 2. updateActiveFiltersUI
content = content.replace('      const activeCount = getActiveFilterCount();',
`      const activeCount = getActiveFilterCount();
      updateBadge('filters', activeCount);`);

// 3. init() resize
content = content.replace('      renderControls();\n\n      // Modal backdrop click',
`      renderControls();

      let lastIsMobile = window.innerWidth <= 768;
      window.addEventListener('resize', () => {
        const currentIsMobile = window.innerWidth <= 768;
        if (currentIsMobile !== lastIsMobile) {
          lastIsMobile = currentIsMobile;
          renderControls();
        }
      });

      // Modal backdrop click`);

// 4. renderControls restructure
const oldControlsStart = '      const buildDropdown = (id, label, contentHtml, rightAlign = false) => `';
const oldControlsEnd = '      controls.innerHTML = html;';
const startIndex = content.indexOf(oldControlsStart);
const endIndex = content.indexOf(oldControlsEnd) + oldControlsEnd.length;

if (startIndex === -1 || endIndex === -1) {
  console.log('Could not find renderControls block');
  process.exit(1);
}

const oldControls = content.substring(startIndex, endIndex);

const newControls = `      const isMobile = window.innerWidth <= 768;

      const buildDropdown = (id, label, contentHtml, rightAlign = false) => \`
        <div class="dropdown \${rightAlign ? 'dropdown--right' : ''}" id="dd-\${id}">
          <button class="dropdown-btn" aria-haspopup="true" aria-expanded="false">
            \${label} <span class="filter-badge" style="display:none"></span>
          </button>
          <div class="dropdown-menu">
            \${contentHtml}
          </div>
        </div>
      \`;

      const buildFilterGroup = (title, contentHtml) => \`
        <div class="mobile-filter-group">
          <h4 class="mobile-filter-group-title">\${title}</h4>
          \${contentHtml}
        </div>
      \`;

      let desktopHtml = '';
      let mobileFiltersHtml = '';

      const appendFilter = (id, label, contentHtml, rightAlign = false) => {
        if (isMobile) {
          mobileFiltersHtml += buildFilterGroup(label, contentHtml);
        } else {
          desktopHtml += buildDropdown(id, label, contentHtml, rightAlign);
        }
      };

      // Sort
      const sortHtml = \`
        <div class="filter-checks">
          \${sortOptions.map(o => \`
            <label class="filter-check">
              <input type="radio" name="sort" value="\${o.id}" \${state.sort === o.id ? 'checked' : ''}>
              <span>\${o.label}</span>
            </label>
          \`).join('')}
        </div>\`;
      appendFilter('sort', 'Sort By', sortHtml);

      // Decades
      if (meta.decades.length > 0) {
        const decHtml = \`
          <div class="filter-checks">
            \${meta.decades.map(d => \`
              <label class="filter-check">
                <input type="checkbox" value="\${d}" \${f.decades.has(d) ? 'checked' : ''} data-filter="decade">
                <span>\${d}s</span>
              </label>\`).join('')}
          </div>\`;
        appendFilter('decade', 'Decade', decHtml);
      }

      // Year Range
      if (MOVIES.length > 1) {
        const yrHtml = \`
          <div class="year-range">
            <div class="year-range__labels">
              <input type="number" id="yr-min-in" class="year-range__input" min="\${meta.yearMin}" max="\${meta.yearMax}" value="\${curMin}" aria-label="Minimum Year">
              <span style="display:flex; align-items:center; color:var(--text-secondary); font-size:0.75rem;">to</span>
              <input type="number" id="yr-max-in" class="year-range__input" min="\${meta.yearMin}" max="\${meta.yearMax}" value="\${curMax}" aria-label="Maximum Year">
            </div>
            <div class="range-wrap">
              <input type="range" class="range-slider" id="yr-min-sl" min="\${meta.yearMin}" max="\${meta.yearMax}" value="\${curMin}">
              <input type="range" class="range-slider" id="yr-max-sl" min="\${meta.yearMin}" max="\${meta.yearMax}" value="\${curMax}">
            </div>
          </div>\`;
        appendFilter('year', 'Year Range', yrHtml);
      }

      // Viewer Rating
      const VIEWER_COLORS = { 'U': '#10B981', 'PG': '#3B82F6', 'T-13': '#F59E0B', 'M-16': '#F97316', 'R-18': '#EF4444', 'X': '#991B1B' };
      const vrHtml = \`
        <div class="filter-checks filter-checks--grid">
          \${VIEWER_RATINGS.map(r => \`
            <label class="filter-badge-toggle">
              <input type="checkbox" value="\${r}" \${f.viewerRatings.has(r) ? 'checked' : ''} data-filter="viewerRating" class="sr-only">
              <span class="viewer-badge-ui" style="border-color:\${escHtml(VIEWER_COLORS[r] || 'transparent')}; color:\${escHtml(VIEWER_COLORS[r] || 'inherit')}">\${r}</span>
            </label>\`).join('')}
        </div>\`;
      appendFilter('viewer', 'Viewer Rating', vrHtml);

      // Critic Rating
      const crHtml = \`
        <div class="filter-checks filter-checks--2col">
          \${CRITIC_RATINGS.map(r => {
        const w = RATING_WEIGHTS[r];
        const dispRating = w ? \`<span class="critic-score-badge">✦ \${w}/10</span>\` : '';
        const color = (RATING_COLORS[r] || {}).text || 'inherit';
        return \`
              <label class="filter-row-toggle">
                <input type="checkbox" value="\${r}" \${f.criticRatings.has(r) ? 'checked' : ''} data-filter="criticRating" class="sr-only">
                <div class="filter-row-ui">
                  <div class="filter-row-indicator" style="background:\${escHtml(color)}"></div>
                  <span class="filter-row-label" style="color:\${escHtml(color)}">\${r}</span>
                  \${dispRating}
                </div>
              </label>\`;
      }).join('')}
        </div>\`;
      appendFilter('critic', 'Critic Rating', crHtml);

      // Awards
      const awHtml = \`
        <label class="toggle-switch-wrap">
          <input type="checkbox" id="award-check" \${f.awardWinning ? 'checked' : ''} data-filter="awardWinning" class="sr-only">
          <div class="toggle-switch-track"></div>
          <span>Award-winning only</span>
        </label>\`;
      appendFilter('awards', 'Awards', awHtml);

      // Genre
      if (meta.genres.length > 0) {
        const gnHtml = \`
          <div class="tag-cloud">
            \${meta.genres.map(g => \`
              <button class="tag-pill \${f.genres.has(g) ? 'is-active' : ''}" data-filter="genre" data-value="\${escHtml(g)}">\${escHtml(g)}</button>
            \`).join('')}
          </div>\`;
        appendFilter('genre', 'Genre', gnHtml);
      }

      // Theme
      if (meta.themes.length > 0) {
        const thHtml = \`
          <div class="tag-cloud">
            \${meta.themes.map(t => \`
              <button class="tag-pill \${f.themes.has(t) ? 'is-active' : ''}" data-filter="theme" data-value="\${escHtml(t)}">\${escHtml(t)}</button>
            \`).join('')}
          </div>\`;
        appendFilter('theme', 'Theme', thHtml, true);
      }

      // Mood
      if (meta.moods.length > 0) {
        const mdHtml = \`
          <div class="tag-cloud">
            \${meta.moods.map(m => \`
              <button class="tag-pill \${f.moods.has(m) ? 'is-active' : ''}" data-filter="mood" data-value="\${escHtml(m)}">\${escHtml(m)}</button>
            \`).join('')}
          </div>\`;
        appendFilter('mood', 'Mood', mdHtml, true);
      }

      // Language
      if (meta.languages.length > 0) {
        const lgHtml = \`
          <div class="tag-cloud">
            \${meta.languages.map(l => \`
              <button class="tag-pill \${f.languages.has(l) ? 'is-active' : ''}" data-filter="language" data-value="\${escHtml(l)}">\${escHtml(l)}</button>
            \`).join('')}
          </div>\`;
        appendFilter('language', 'Language', lgHtml, true);
      }

      let html = '';
      if (isMobile) {
        html = buildDropdown('filters', 'Filters', mobileFiltersHtml);
      } else {
        html = desktopHtml;
      }

      // Clear button
      html += \`<button class="clear-btn" id="clear-filters-btn" aria-label="Clear all filters">✕ Clear</button>\`;

      controls.innerHTML = html;`;

content = content.replace(oldControls, newControls);

fs.writeFileSync(file, content);
console.log('done');
