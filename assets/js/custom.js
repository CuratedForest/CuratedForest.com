// custom.js — site-specific JS, auto-bundled by the compose theme via
// layouts/_partials/scripts/bundle.html when a file exists at
// assets/js/custom.js (the theme prefers this path over the default
// js/custom.js it ships).
//
// Three features:
//
// 1. Force dark mode at every page load. The site has no mode toggle
//    (see layouts/_partials/mode.html); enableDarkMode and
//    defaultLightingMode in hugo.yaml take care of the first paint, and
//    this IIFE re-pins the data-mode attribute after the theme's
//    mode.js runs in case anything tries to flip it back.
//
// 2. Collapsible doc-sidebar sections:
//      * Any .aside_inner that has children (nested .aside_inner OR
//        leaf-page .section_link entries) becomes a click-to-collapse
//        group (chevron rendered via CSS).
//      * The root entry (depth 0, "The Curated Forest") is excluded so
//        it never gets a chevron and can't be collapsed away.
//      * On load, depth >= 4 groups start collapsed; the root and the
//        first three child levels start expanded so the reader can
//        always see down through and including the "Label Based
//        Features" children before having to click anything.
//      * The ancestor chain of the active page is always expanded so
//        deep pages land with their location in context.
//
// 3. Page-ToC scroll-spy: marks the .page-toc link whose heading is
//    currently in view with .active so the ToC highlights the reader's
//    position (styled green in _custom.sass). The theme's own spy only
//    covers the sidebar ToC, not the in-content one.
(function forceDarkMode() {
  if (typeof document === 'undefined' || !document.documentElement) return;
  var doc = document.documentElement;
  doc.setAttribute('data-mode', 'dark');
  doc.classList.add('dark');
})();

(function setupAsideCollapse() {
  if (typeof document === 'undefined') return;
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }
  // Depth = count of .aside_inner ancestors above the element
  // (exclusive). The root section in the sidebar is depth 0.
  function depthOf(el) {
    var d = 0;
    var n = el.parentElement;
    while (n) {
      if (n.classList && n.classList.contains('aside_inner')) d++;
      n = n.parentElement;
    }
    return d;
  }
  ready(function () {
    var aside = document.querySelector('.aside');
    if (!aside) return;
    var groups = aside.querySelectorAll('.aside_inner');
    groups.forEach(function (group) {
      var depth = depthOf(group);
      // Skip the root — no chevron, no collapse handler. The root entry
      // is the site itself and stays permanently expanded.
      if (depth === 0) return;
      // A group is collapsible if it has any children to hide — either
      // nested sections (another .aside_inner) OR leaf-page links
      // (.section_link). Without the .section_link check, "Label Based
      // Features" wouldn't be collapsible because all its children are
      // leaf pages, not further sub-sections.
      var hasChildren =
        group.querySelector(':scope > section > .aside_inner') ||
        group.querySelector(':scope > section > .section_link');
      if (!hasChildren) return;
      group.classList.add('collapsible');
      // Depths 1 and 2 start expanded so the reader always sees down
      // through "Label Based Features" by default; deeper levels start
      // collapsed so the tree doesn't explode on first load.
      if (depth >= 4) group.classList.add('collapsed');
      // Special-case: children of the /software/ section (ESPHome,
      // Kopia Backups, Grafana, TimescaleDB, Kubernetes, ...) also
      // start collapsed. Software is a shallow catalog — each entry
      // has its own sub-pages we don't want unfurled on every page
      // load. Detect membership by walking up the .aside_inner chain
      // looking for a title link that points at /software/.
      var ancestor = group.parentElement && group.parentElement.closest('.aside_inner');
      while (ancestor) {
        var link = ancestor.querySelector(':scope > .section_title > a');
        var href = link && link.getAttribute('href');
        if (href && /\/software\/?$/.test(href)) {
          group.classList.add('collapsed');
          break;
        }
        ancestor = ancestor.parentElement && ancestor.parentElement.closest('.aside_inner');
      }
      var title = group.querySelector(':scope > .section_title');
      if (!title) return;
      title.addEventListener('click', function (event) {
        // Don't hijack clicks on the section title's link — that should
        // still navigate. Only intercept clicks on the title chrome
        // (the chevron or whitespace around the link).
        if (event.target.closest('a')) return;
        group.classList.toggle('collapsed');
      });
    });
    // Expand the ancestor chain of the active page and mark each
    // ancestor's section title as active too. The sidebar template
    // (layouts/_partials/sidebar.html) only stamps `active` on the
    // exact match, so a leaf page like "Financial Viability" doesn't
    // visually connect to its parent chain (Plants > Strawberries).
    // We propagate `active` up the ancestor .aside_inner chain so the
    // whole breadcrumb lights up green (styled by the theme's default
    // .section_title.active rule).
    //
    // The root sidebar entry ("The Curated Forest") is depth 0 and
    // matches the site home page — skip it so navigating anywhere
    // doesn't turn the root green.
    var active = aside.querySelector('.section_title.active, .section_link.active');
    var node = active && active.closest('.aside_inner');
    var highest = null;
    while (node) {
      node.classList.remove('collapsed');
      // depth 0 is the site root ("The Curated Forest") — skip so
      // navigating anywhere doesn't turn the root entry green.
      if (depthOf(node) > 0) {
        var t = node.querySelector(':scope > .section_title');
        if (t) t.classList.add('active');
        highest = node; // overwritten on each loop, last write wins
      }
      node = node.parentElement && node.parentElement.closest('.aside_inner');
    }
    // Scroll the sidebar (which is its own overflow:auto container) so
    // the topmost highlighted ancestor lines up near the top. Using
    // aside.scrollTop directly instead of Element.scrollIntoView because
    // scrollIntoView with block:'nearest' does nothing when the element
    // is already technically visible in the viewport but not in the
    // sidebar's own scroll box, and block:'start' scrolls the whole
    // document, yanking the page content out from under the reader.
    //
    // Timing: the compose theme's own featureHeading() scrolls the aside
    // to the active LEAF link via `setTimeout(featureHeading, 50)` after
    // load, which would override this and leave e.g. "World Record Size"
    // at the top instead of "Plants". Run our scroll twice — once now
    // (no flash of unscrolled sidebar) and again after the theme's 50 ms
    // timer has fired — so our topmost-ancestor position wins.
    if (highest) {
      var scrollToHighest = function () {
        var target = highest.querySelector(':scope > .section_title') || highest;
        var asideRect = aside.getBoundingClientRect();
        var targetRect = target.getBoundingClientRect();
        var offset = targetRect.top - asideRect.top + aside.scrollTop;
        aside.scrollTop = Math.max(0, offset - 8); // small top padding
      };
      scrollToHighest();
      setTimeout(scrollToHighest, 120);
    }
  });
})();

// Page-ToC scroll-spy. The theme's own spy (customizeSidebar in
// index.js) only watches the sidebar's .toc_active nav; the in-content
// .page-toc rendered by layouts/_partials/document.html gets no active
// tracking. Mirror the theme's approach: the current section is the
// last heading whose top sits above the viewport midpoint.
(function setupPageTocSpy() {
  if (typeof document === 'undefined') return;
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }
  ready(function () {
    var toc = document.querySelector('.page-toc nav');
    if (!toc) return;
    var links = Array.prototype.slice.call(toc.querySelectorAll('a'));
    if (!links.length) return;
    var pairs = [];
    links.forEach(function (link) {
      var hash = link.hash || '';
      if (hash.charAt(0) !== '#') return;
      var heading = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (heading) pairs.push({ link: link, heading: heading });
    });
    if (!pairs.length) return;
    var ticking = false;
    function update() {
      ticking = false;
      var midpoint = window.innerHeight / 2;
      var current = pairs[0];
      for (var i = 0; i < pairs.length; i++) {
        if (pairs[i].heading.getBoundingClientRect().top < midpoint) {
          current = pairs[i];
        } else {
          break;
        }
      }
      pairs.forEach(function (pair) {
        pair.link.classList.toggle('active', pair === current);
      });
    }
    window.addEventListener('scroll', function () {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    }, { passive: true });
    update();
  });
})();
