/* Definitions work with touch, hover, and keyboard; Escape preserves focus. */
(function () {
  var terms = [].slice.call(document.querySelectorAll('.term'));
  if (!terms.length) return;
  var hover = window.matchMedia('(hover: hover) and (pointer: fine)');
  var active = null;
  var timer;
  var pointerFocus = false;

  function tipOf(term) { return document.getElementById(term.getAttribute('aria-describedby')); }
  function close() {
    clearTimeout(timer);
    if (!active) return;
    tipOf(active).hidden = true;
    tipOf(active).classList.remove('is-shown');
    active.setAttribute('aria-expanded', 'false');
    active = null;
  }
  function place() {
    if (!active) return;
    var tip = tipOf(active);
    var rect = active.getBoundingClientRect();
    var viewport = window.visualViewport;
    var left = viewport ? viewport.offsetLeft : 0;
    var top = viewport ? viewport.offsetTop : 0;
    var width = viewport ? viewport.width : window.innerWidth;
    var height = viewport ? viewport.height : window.innerHeight;
    var nav = document.querySelector('.nav');
    var safeTop = Math.max(top + 12, nav.getBoundingClientRect().bottom + 12);
    if (rect.bottom < safeTop || rect.top > top + height) { close(); return; }
    tip.style.maxWidth = Math.max(100, width - 24) + 'px';
    tip.style.maxHeight = Math.max(80, height - 24) + 'px';
    var box = tip.getBoundingClientRect();
    tip.style.left = Math.max(left + 12, Math.min(rect.left, left + width - box.width - 12)) + 'px';
    var y = rect.top - box.height - 10;
    if (y < safeTop) y = rect.bottom + 10;
    tip.style.top = Math.max(top + 12, Math.min(y, top + height - box.height - 12)) + 'px';
  }
  function open(term) {
    clearTimeout(timer);
    if (active !== term) close();
    active = term;
    var tip = tipOf(term);
    tip.hidden = false;
    tip.classList.add('is-shown');
    term.setAttribute('aria-expanded', 'true');
    place();
  }
  function leave() {
    clearTimeout(timer);
    timer = setTimeout(function () {
      if (active && document.activeElement !== active && !active.matches(':hover') && !tipOf(active).matches(':hover')) close();
    }, 180);
  }
  terms.forEach(function (term) {
    var tip = tipOf(term);
    term.setAttribute('data-enhanced', '');
    term.setAttribute('aria-expanded', 'false');
    term.setAttribute('aria-controls', tip.id);
    tip.removeAttribute('popover');
    tip.hidden = true;
    tip.style.position = 'fixed';
    tip.style.inset = 'auto';
    document.body.appendChild(tip);
    term.addEventListener('pointerdown', function () { pointerFocus = true; });
    term.addEventListener('focus', function () {
      if (!pointerFocus) open(term);
      pointerFocus = false;
    });
    term.addEventListener('blur', close);
    term.addEventListener('click', function (event) {
      pointerFocus = false;
      if (active === term && (!hover.matches || event.detail === 0)) close();
      else open(term);
    });
    term.addEventListener('mouseenter', function () { if (hover.matches) open(term); });
    term.addEventListener('mouseleave', leave);
    tip.addEventListener('mouseenter', function () { clearTimeout(timer); });
    tip.addEventListener('mouseleave', leave);
  });
  document.addEventListener('pointercancel', function () { pointerFocus = false; });
  document.addEventListener('click', function (event) {
    if (active && !active.contains(event.target) && !tipOf(active).contains(event.target)) close();
  });
  document.addEventListener('keydown', function (event) { if (event.key === 'Escape') close(); });
  window.addEventListener('scroll', place, { passive: true });
  window.addEventListener('resize', place);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', place);
    window.visualViewport.addEventListener('scroll', place);
  }
})();
