// custom.js — site-specific JS, auto-bundled by the compose theme via
// layouts/_partials/scripts/bundle.html when a file exists at
// assets/js/custom.js (the theme prefers this path over the default
// js/custom.js it ships).
//
// Two features:
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
      // Kopia Backups, Grafana, TimescaleDB, Kubernetes, ...) start
      // collapsed too. Software is a shallow catalog — each entry has
      // its own sub-pages we don't want unfurled on every page load.
      // We detect membership by walking up to find an .aside_inner
      // whose title link points at /software/.
      var ancestor = group.parentElement && group.parentElement.closest('.aside_inner');
      while (ancestor) {
        var link = ancestor.querySelector(':scope > .section_title > a');
        if (link && /\/software\/?$/.test(link.getAttribute('href') || '')) {
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
    // Expand the ancestor chain of the active page so the reader lands
    // on their current spot with context, not on a fully-collapsed tree.
    var active = aside.querySelector('.section_title.active, .section_link.active');
    var node = active && active.closest('.aside_inner');
    while (node) {
      node.classList.remove('collapsed');
      node = node.parentElement && node.parentElement.closest('.aside_inner');
    }
  });
})();
