// custom.js — site-specific JS, auto-bundled by the compose theme via
// layouts/_partials/scripts/bundle.html when a file exists at
// assets/js/custom.js (the theme prefers this path over the default
// js/custom.js it ships).
//
// Currently provides one feature: collapsible doc-sidebar sections.
//
//   * Any .aside_inner that has a nested .aside_inner child becomes a
//     click-to-collapse group (chevron rendered via CSS).
//   * The root entry (depth 0, "The Curated Forest") is excluded so it
//     never gets a chevron and can't be collapsed away.
//   * On load, depth >= 2 groups start collapsed; the root and its
//     immediate children (depth 1, e.g. Technology / Plants) start
//     expanded so the reader can always see the top of the tree.
//   * The ancestor chain of the active page is always expanded so deep
//     pages land with their location in context.
(function setupAsideCollapse() {
  if (typeof document === 'undefined') return;
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }
  // Depth here matches the rest of the file's mental model: count of
  // .aside_inner ancestors above the element (exclusive).
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
      // Only sections that have a nested .aside_inner child get the
      // collapsible affordance; leaf sections (just .section_link h3s)
      // are not toggled.
      var hasNested = group.querySelector(':scope > section .aside_inner') ||
                      group.querySelector(':scope > .aside_inner');
      if (!hasNested) return;
      group.classList.add('collapsible');
      // Depth 1 (Technology, Plants) starts expanded so the top of the
      // tree is always visible; deeper levels start collapsed so the
      // sidebar doesn't explode on first load.
      if (depth >= 2) group.classList.add('collapsed');
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
