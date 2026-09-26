/* Runs immediately after the navigation, before main content is parsed, so
   collapsing the enhanced mobile menu cannot move already-painted content.
   All destinations remain visible when JavaScript is off or fails to load. */
(function () {
  var nav = document.querySelector('.nav');
  var toggle = document.querySelector('.nav-toggle');
  if (!nav || !toggle) return;
  var mobile = window.matchMedia('(max-width: 60rem)');
  nav.setAttribute('data-enhanced', '');
  toggle.hidden = false;

  function updateOffset() {
    var height = getComputedStyle(nav).position === 'sticky' ? nav.offsetHeight : 0;
    document.documentElement.style.setProperty('--nav-offset', (height + 16) + 'px');
  }
  if ('ResizeObserver' in window) new ResizeObserver(updateOffset).observe(nav);
  window.addEventListener('resize', updateOffset);
  updateOffset();

  function setOpen(open, restoreFocus) {
    nav.toggleAttribute('data-menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('span').textContent = open ? '−' : '+';
    updateOffset();
    if (restoreFocus) toggle.focus();
  }
  toggle.addEventListener('click', function () {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });
  nav.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && nav.hasAttribute('data-menu-open')) {
      event.preventDefault();
      setOpen(false, true);
    }
  });
  document.addEventListener('click', function (event) {
    if (!nav.contains(event.target)) setOpen(false);
  });
  nav.addEventListener('focusout', function (event) {
    // Safari does not focus buttons on a pointer click; a null relatedTarget
    // must not undo the menu that the click is about to open.
    if (event.relatedTarget && !nav.contains(event.relatedTarget)) setOpen(false);
  });
  document.addEventListener('click', function (event) {
    var link = event.target.closest('a[href^="#"]');
    if (!link) return;
    var target = document.getElementById(link.hash.slice(1));
    if (!target) return;
    setOpen(false);
    // A section jump also moves keyboard/screen-reader navigation to that section.
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });
  nav.addEventListener('click', function (event) {
    if (event.target.closest('a')) setOpen(false);
  });
  mobile.addEventListener('change', function () {
    var focusWasInMenu = nav.contains(document.activeElement) && document.activeElement !== nav.querySelector('.nav-me');
    setOpen(false);
    if (focusWasInMenu) (mobile.matches ? toggle : nav.querySelector('.nav-me')).focus();
  });
})();

/* WebKit does not consistently route arrow keys to focused overflow groups. */
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('pre[tabindex], .measure-visual[tabindex]').forEach(function (panel) {
    panel.addEventListener('keydown', function (event) {
      if (event.target !== panel || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      if (panel.scrollWidth <= panel.clientWidth) return;
      event.preventDefault();
      panel.scrollLeft += (event.key === 'ArrowRight' ? 1 : -1) * Math.max(40, panel.clientWidth / 8);
    });
  });
});
