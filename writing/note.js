(function () {
  var terms = Array.prototype.slice.call(document.querySelectorAll(".term"));
  if (!terms.length) return;

  var hover = window.matchMedia("(hover: hover) and (pointer: fine)");

  function tipOf(term) {
    var id = term.getAttribute("aria-describedby");
    return id ? document.getElementById(id) : term.querySelector(".term-tip");
  }

  function hide(tip) {
    if (!tip) return;
    if (tip.hidePopover) {
      try { if (tip.matches(":popover-open")) tip.hidePopover(); } catch (e) {}
    }
    tip.classList.remove("is-shown");
    tip.removeAttribute("style");
  }

  function dock(term) {
    var tip = tipOf(term);
    if (!tip) return;
    hide(tip);
    if (tip.parentElement !== term) term.appendChild(tip);
  }

  function place(term) {
    var tip = tipOf(term);
    if (!tip) return;
    var r = term.getBoundingClientRect();
    tip.classList.add("is-shown");
    tip.style.position = "fixed";
    tip.style.margin = "0";
    tip.style.inset = "auto";
    tip.style.left = Math.max(16, r.left) + "px";
    tip.style.right = "auto";
    tip.style.bottom = Math.max(16, window.innerHeight - r.top + 10) + "px";
    tip.style.top = "auto";
    if (tip.showPopover) {
      try { if (!tip.matches(":popover-open")) tip.showPopover(); } catch (e) {}
    }
    var box = tip.getBoundingClientRect();
    if (box.right > window.innerWidth - 16) {
      tip.style.left = "auto";
      tip.style.right = "16px";
    }
    if (box.top < 64) {
      tip.style.bottom = "auto";
      tip.style.top = (r.bottom + 10) + "px";
    }
  }

  function closeAll(except) {
    terms.forEach(function (term) {
      if (term === except) return;
      term.classList.remove("is-open");
      dock(term);
    });
  }

  function open(term) {
    closeAll(term);
    term.classList.add("is-open");
    place(term);
  }

  terms.forEach(function (term) {
    term.addEventListener("mouseenter", function () {
      if (!hover.matches) return;
      open(term);
    });
    term.addEventListener("mouseleave", function () {
      if (!hover.matches) return;
      term.classList.remove("is-open");
      dock(term);
    });
    term.addEventListener("focus", function () { open(term); });
    term.addEventListener("click", function (e) {
      e.stopPropagation();
      if (hover.matches) {
        open(term);
        return;
      }
      if (term.classList.contains("is-open")) {
        term.classList.remove("is-open");
        dock(term);
      } else {
        open(term);
      }
    });
  });

  document.addEventListener("click", function (e) {
    if (!e.target.closest(".term")) {
      closeAll();
      terms.forEach(dock);
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    closeAll();
    terms.forEach(dock);
    var active = document.activeElement;
    if (active && active.classList.contains("term")) active.blur();
  });

  window.addEventListener("resize", function () {
    terms.forEach(function (term) {
      if (term.classList.contains("is-open")) place(term);
    });
  });
})();
