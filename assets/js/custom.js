// custom.js — site-specific JS, auto-bundled by the compose theme via
// layouts/_partials/scripts/bundle.html when a file exists at
// assets/js/custom.js (the theme prefers this path over the default
// js/custom.js it ships).
//
// Currently provides one feature: collapsible doc-sidebar sections.
// Every .aside_inner that has a nested .aside_inner child becomes a
// click-to-collapse group. On load every group is collapsed except the
// chain of ancestors containing the active page, so the reader lands on
// their current location without an exploded tree.
(function setupAsideCollapse() {
  if (typeof document === 'undefined') return;
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }
  ready(function () {
    var aside = document.querySelector('.aside');
    if (!aside) return;
    var groups = aside.querySelectorAll('.aside_inner');
    groups.forEach(function (group) {
      // Only sections that have a nested .aside_inner child get the
      // collapsible affordance; leaf sections (just .section_link h3s)
      // are not toggled.
      var hasNested = group.querySelector(':scope > section .aside_inner') ||
                      group.querySelector(':scope > .aside_inner');
      if (!hasNested) return;
      group.classList.add('collapsible', 'collapsed');
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
