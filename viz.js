/* v10: Fig. 01 persistent percentile separation under offered load */
(function () {
  var RM = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var NS = "http://www.w3.org/2000/svg";
  var F = [];

  var gGrid = document.getElementById("pgrid");
  var gLine = document.getElementById("plines");
  var gLab = document.getElementById("plabels");
  if (gGrid && gLine && gLab) {
    var W = 900, H = 300, PAD = 64, N = 420, PW = W - PAD;
    var PLOT_TOP = 20, PLOT_BOTTOM = 216;
    var LOAD_TOP = 257, LOAD_BOTTOM = 289;
    var LO = Math.log10(0.5), HI = Math.log10(2000);
    var CYCLE = 720, BASE_LOAD = 0.24, PEAK_LOAD = 0.92;
    var SEED = 0x8ac3f17;
    var clock = 550;
    var hist = [];
    var response = { mean: 0, p99: 0, p999: 0, p9999: 0 };

    function noiseAt(i, salt) {
      var x = (i + salt + SEED) | 0;
      x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
      x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
      x ^= x >>> 16;
      return (x >>> 0) / 4294967296;
    }

    function smoothNoise(i, salt, span) {
      var a = Math.floor(i / span);
      var u = (i - a * span) / span;
      u = u * u * (3 - 2 * u);
      return noiseAt(a, salt) * (1 - u) + noiseAt(a + 1, salt) * u;
    }

    function phaseAt(i) {
      var p = i % CYCLE;
      return p < 0 ? p + CYCLE : p;
    }

    function offeredLoad(p) {
      if (p < 120) return BASE_LOAD;
      if (p < 230) return 0.41;
      if (p < 330) return 0.63;
      if (p < 430) return PEAK_LOAD;
      if (p < 520) return 0.56;
      if (p < 620) return 0.34;
      return BASE_LOAD;
    }

    function loadPressure(load) {
      var u = (load - BASE_LOAD) / (PEAK_LOAD - BASE_LOAD);
      u = Math.max(0, Math.min(1, u));
      return Math.pow(u, 1.35);
    }

    function follow(current, target, rise, fall) {
      var rate = target > current ? rise : fall;
      return current + (target - current) * rate;
    }

    function sample(i) {
      var p = phaseAt(i);
      var load = offeredLoad(p);
      var target = loadPressure(load);

      response.mean = follow(response.mean, target, 0.22, 0.14);
      response.p99 = follow(response.p99, target, 0.15, 0.08);
      response.p999 = follow(response.p999, target, 0.065, 0.025);
      response.p9999 = follow(response.p9999, target, 0.038, 0.016);

      var mean = 1.10 * (
        1 +
        response.mean * 0.095 +
        (smoothNoise(i, 0x50, 23) - 0.5) * 0.01
      );
      var p99 = 6.05 * (
        1 +
        response.p99 * 0.13 +
        (smoothNoise(i, 0x99, 17) - 0.5) * 0.035
      );

      var p999Base = 29.5 * (
        1 +
        (smoothNoise(i, 0x999, 10) - 0.5) * 0.12 +
        Math.sin(i * 0.31) * 0.015
      );
      var p999 = p999Base * (
        1 +
        response.p999 * (
          2.6 +
          (smoothNoise(i, 0x3999, 13) - 0.5) * 0.35
        )
      );

      var coarse = noiseAt(Math.floor(i / 5), 0x9999);
      var fine = noiseAt(i, 0x4999);
      var p9999Base = 163 * (
        1 +
        (coarse - 0.5) * 0.18 +
        (smoothNoise(i, 0x5999, 19) - 0.5) * 0.10 +
        (fine - 0.5) * 0.025
      );
      var p9999 = p9999Base * (
        1 +
        response.p9999 * (
          7.8 +
          coarse * 0.65 +
          (fine - 0.5) * 0.18
        )
      );

      p99 = Math.max(p99, mean * 4.2);
      p999 = Math.max(p999, p99 * 3.2);
      p9999 = Math.max(p9999, p999 * 2.4);

      return {
        i: i,
        load: load,
        mean: mean,
        p99: p99,
        p999: p999,
        p9999: p9999
      };
    }

    function tx(i) {
      return i * (PW / (N - 1));
    }

    function ly(ms) {
      return PLOT_BOTTOM -
        ((Math.log10(ms) - LO) / (HI - LO)) *
        (PLOT_BOTTOM - PLOT_TOP);
    }

    function loadY(load) {
      return LOAD_BOTTOM - load * (LOAD_BOTTOM - LOAD_TOP);
    }

    [1, 10, 100, 1000].forEach(function (ms) {
      var line = document.createElementNS(NS, "line");
      line.setAttribute("x1", 0);
      line.setAttribute("x2", PW);
      line.setAttribute("y1", ly(ms));
      line.setAttribute("y2", ly(ms));
      line.setAttribute("stroke", "#1c2228");
      line.setAttribute("stroke-width", 1);
      gGrid.appendChild(line);
    });

    var separator = document.createElementNS(NS, "line");
    separator.setAttribute("x1", 0);
    separator.setAttribute("x2", PW);
    separator.setAttribute("y1", 244);
    separator.setAttribute("y2", 244);
    separator.setAttribute("stroke", "#1c2228");
    separator.setAttribute("stroke-width", 1);
    gGrid.appendChild(separator);

    var loadBase = document.createElementNS(NS, "line");
    loadBase.setAttribute("x1", 0);
    loadBase.setAttribute("x2", PW);
    loadBase.setAttribute("y1", LOAD_BOTTOM);
    loadBase.setAttribute("y2", LOAD_BOTTOM);
    loadBase.setAttribute("stroke", "#20262b");
    loadBase.setAttribute("stroke-width", 1);
    gGrid.appendChild(loadBase);

    var loadLabel = document.createElementNS(NS, "text");
    loadLabel.setAttribute("x", 0);
    loadLabel.setAttribute("y", 252);
    loadLabel.setAttribute("font-size", "9");
    loadLabel.setAttribute("font-family", "IBM Plex Mono,ui-monospace,Menlo,monospace");
    loadLabel.setAttribute("letter-spacing", ".1em");
    loadLabel.setAttribute("fill", "#5c5854");
    loadLabel.textContent = "offered load";
    gGrid.appendChild(loadLabel);

    var loadPath = document.createElementNS(NS, "path");
    loadPath.setAttribute("fill", "none");
    loadPath.setAttribute("stroke", "#66756d");
    loadPath.setAttribute("stroke-width", 1.2);
    loadPath.setAttribute("stroke-opacity", 0.72);
    loadPath.setAttribute("stroke-linejoin", "miter");
    gGrid.appendChild(loadPath);

    var SER = [
      { k: "mean", n: "mean", o: 0.3, w: 1, c: "#4ecf8a" },
      { k: "p99", n: "p99", o: 0.62, w: 1.15, c: "#4ecf8a" },
      { k: "p999", n: "p99.9", o: 0.94, w: 1.3, c: "#a5d9b6" },
      { k: "p9999", n: "p99.99", o: 0.98, w: 1.5, c: "#d4786a" }
    ];

    SER.forEach(function (sr) {
      var polyline = document.createElementNS(NS, "polyline");
      polyline.setAttribute("fill", "none");
      polyline.setAttribute("stroke", sr.c);
      polyline.setAttribute("stroke-width", sr.w);
      polyline.setAttribute("stroke-opacity", sr.o);
      polyline.setAttribute("stroke-linejoin", "round");
      polyline.setAttribute("stroke-linecap", "round");
      gLine.appendChild(polyline);
      sr.el = polyline;

      var label = document.createElementNS(NS, "text");
      label.setAttribute("x", W - 4);
      label.setAttribute("text-anchor", "end");
      label.setAttribute("font-size", "10");
      label.setAttribute("font-family", "IBM Plex Mono,ui-monospace,Menlo,monospace");
      label.setAttribute("letter-spacing", ".08em");
      label.setAttribute("fill", sr.c);
      label.setAttribute("fill-opacity", Math.max(0.62, sr.o));
      label.textContent = sr.n;
      gLab.appendChild(label);
      sr.tx = label;
    });

    for (var i = clock - N - CYCLE + 1; i <= clock; i++) {
      var point = sample(i);
      if (i > clock - N) hist.push(point);
    }

    function drawLoad() {
      var y = loadY(hist[0].load);
      var d = "M 0 " + y.toFixed(1);
      for (var i = 1; i < N; i++) {
        var nextY = loadY(hist[i].load);
        if (nextY !== y) {
          d += " H " + tx(i).toFixed(1) + " V " + nextY.toFixed(1);
          y = nextY;
        }
      }
      d += " H " + PW.toFixed(1);
      loadPath.setAttribute("d", d);
    }

    function draw() {
      SER.forEach(function (sr) {
        var points = "";
        for (var i = 0; i < N; i++) {
          points +=
            tx(i).toFixed(1) + "," +
            ly(hist[i][sr.k]).toFixed(1) + " ";
        }
        sr.el.setAttribute("points", points.trim());
        var labelY = ly(hist[N - 1][sr.k]) + 3.5;
        labelY = Math.max(PLOT_TOP + 4, Math.min(PLOT_BOTTOM - 3, labelY));
        sr.tx.setAttribute("y", labelY.toFixed(1));
      });
      drawLoad();
    }

    draw();
    F.push(function () {
      clock++;
      hist.shift();
      hist.push(sample(clock));
      draw();
    });
  }

  F.forEach(function (f) { f(); });
  if (RM) return;
  var t = null;
  function frame() {
    F.forEach(function (f) { f(); });
  }
  function start() {
    if (!t && !document.hidden) t = setInterval(frame, 80);
  }
  function stop() {
    if (t) clearInterval(t);
    t = null;
  }
  start();
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop();
    else start();
  });
})();

(function () {
  var wrap = document.querySelector(".spine");
  var svg = document.getElementById("glog");
  if (!wrap || !svg) return;
  var NS = "http://www.w3.org/2000/svg";

  function build() {
    var W = 132;
    var H = wrap.offsetHeight;
    var bb = wrap.getBoundingClientRect();
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.textContent = "";
    var TX = 22, BX = 84, flow = [];

    function add(t, a) {
      var e = document.createElementNS(NS, t);
      for (var k in a) e.setAttribute(k, a[k]);
      svg.appendChild(e);
      return e;
    }
    function pair(d) {
      add("path", { d: d, stroke: "#20262b", "stroke-width": 1.5, fill: "none" });
      flow.push(add("path", {
        d: d,
        stroke: "#4ecf8a",
        "stroke-width": 1.5,
        fill: "none",
        "stroke-linecap": "round"
      }));
    }

    pair("M " + TX + " 0 L " + TX + " " + H);
    var ly = Math.min(H - 14, 150);
    var mt = add("text", { x: TX - 8, y: ly });
    mt.textContent = "mgrazianoc";
    mt.setAttribute("transform", "rotate(-90 " + (TX - 8) + " " + ly + ")");

    [].slice.call(wrap.querySelectorAll("[data-repo]")).forEach(function (rp) {
      var hd = rp.querySelector(".repo-h").getBoundingClientRect();
      var y0 = hd.top - bb.top + 5;
      var nodes = [].slice.call(rp.querySelectorAll(".patch")).map(function (pt) {
        return pt.querySelector("a").getBoundingClientRect().top - bb.top + 11;
      });
      if (!nodes.length) return;
      var yEnd = nodes[nodes.length - 1];
      pair(
        "M " + TX + " " + y0 +
        " Q " + TX + " " + (y0 + 22) + " " + (TX + 26) + " " + (y0 + 22) +
        " L " + (BX - 24) + " " + (y0 + 22) +
        " Q " + BX + " " + (y0 + 22) + " " + BX + " " + (y0 + 48) +
        " L " + BX + " " + yEnd
      );
      add("circle", {
        cx: TX, cy: y0, r: 3.2,
        fill: "#0d0f12", stroke: "#3d6e5b", "stroke-width": 1.4
      });
      nodes.forEach(function (y) {
        add("circle", {
          cx: BX, cy: y, r: 5,
          fill: "#0d0f12", stroke: "#4ecf8a", "stroke-width": 2
        });
      });
      var ds = rp.querySelector(".ds");
      if (ds) {
        var dy = ds.getBoundingClientRect().top - bb.top + 9;
        pair(
          "M " + BX + " " + yEnd +
          " L " + BX + " " + (dy - 22) +
          " Q " + BX + " " + dy + " " + (BX + 24) + " " + dy
        );
        add("circle", { cx: BX + 24, cy: dy, r: 4, fill: "#4ecf8a" });
      }
    });

    var A = [];
    flow.forEach(function (e) {
      var L = e.getTotalLength();
      var P = Math.max(64, L / 4);
      e.setAttribute("stroke-dasharray", "16 " + (P - 16));
      A.push({ e: e, p: P, o: 0 });
    });
    svg._a = A;
  }

  build();
  window.addEventListener("resize", build);
  window.addEventListener("load", build);
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  setInterval(function () {
    (svg._a || []).forEach(function (a) {
      a.o = (a.o + 1.2) % a.p;
      a.e.setAttribute("stroke-dashoffset", -a.o);
    });
  }, 34);
})();

/* Common symptoms: each figure moves as the diagnosis, not as a chart chrome. */
(function () {
  var RM = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var cards = document.querySelectorAll("[data-sym]");
  if (!cards.length || RM) return;

  function rng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6d2b79f5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var F = [];
  var BASE = 76;

  function hist(svg, kind, seed) {
    var r = rng(seed);
    var bars = [].slice.call(svg.querySelectorAll("rect")).map(function (el, i) {
      return {
        el: el,
        h: +el.getAttribute("height"),
        rust: el.getAttribute("fill") === "#d4786a",
        flash: r(),
        i: i
      };
    });
    var t = 0;
    return function () {
      t++;
      var pile = (t % 90) / 90;
      bars.forEach(function (b) {
        var h = b.h;
        if (kind === "bimodal") {
          if (b.rust) h = b.h * (0.62 + 0.38 * (0.5 + 0.5 * Math.sin(t / 28)));
          else h = b.h * (0.985 + 0.025 * Math.sin(t / 22 + b.i * 0.55));
        } else if (kind === "tail") {
          if (b.rust) {
            b.flash *= 0.91;
            if (r() < 0.035) b.flash = 1;
            h = b.h * (0.55 + 0.7 * b.flash);
          } else {
            h = b.h * (0.985 + 0.02 * Math.sin(t / 26 + b.i * 0.4));
          }
        } else if (kind === "clip") {
          if (b.rust) h = b.h * (0.22 + 0.9 * pile);
          else h = b.h * (0.985 + 0.02 * Math.sin(t / 24 + b.i * 0.45));
        }
        if (h < 0.4) h = 0.4;
        b.el.setAttribute("y", (BASE - h).toFixed(2));
        b.el.setAttribute("height", h.toFixed(2));
      });
    };
  }

  function n(r, s) {
    return (r() - 0.5) * s;
  }

  function ySaw(x, r) {
    var p = 30.15;
    var u = x - Math.floor(x / p) * p;
    if (u < 0) u += p;
    return 57.3 - (u / p) * 51.1 + n(r, 2.1);
  }

  function yComb(x, r) {
    var p = 37.45;
    var u = x - Math.floor(x / p) * p;
    if (u < 0) u += p;
    if (u < 1.25) return 7.6 + n(r, 0.8);
    if (u < 2.5) return 43.3;
    return 58.8 + n(r, 1.4);
  }

  function ySteps(x, r) {
    var p = 248;
    var u = x - Math.floor(x / p) * p;
    if (u < 0) u += p;
    var floors = [61.6, 55.2, 48.3, 33.4, 7.1];
    var i = Math.min(4, Math.floor(u / 49.6));
    return floors[i] + n(r, 1.05);
  }

  function trace(svg, fn, seed) {
    var pl = svg.querySelector("polyline");
    if (!pl) return function () {};
    var r = rng(seed);
    var N = 200;
    var dx = 240 / (N - 1);
    var x = 0;
    var hist = [];
    for (var i = 0; i < N; i++) {
      hist.push(fn(x, r));
      x += dx;
    }
    function draw() {
      var pts = "";
      for (var i = 0; i < N; i++) {
        var y = hist[i];
        if (y < 6) y = 6;
        if (y > 72) y = 72;
        pts += (i * dx).toFixed(1) + "," + y.toFixed(1) + " ";
      }
      pl.setAttribute("points", pts.trim());
    }
    draw();
    return function () {
      hist.shift();
      hist.push(fn(x, r));
      x += dx;
      draw();
    };
  }

  [].forEach.call(cards, function (card) {
    var kind = card.getAttribute("data-sym");
    var svg = card.querySelector("svg");
    if (!svg) return;
    if (kind === "bimodal") F.push(hist(svg, kind, 0xb10d));
    else if (kind === "tail") F.push(hist(svg, kind, 0x7a11));
    else if (kind === "clip") F.push(hist(svg, kind, 0xc11e));
    else if (kind === "saw") F.push(trace(svg, ySaw, 0x5a17));
    else if (kind === "comb") F.push(trace(svg, yComb, 0xc0b1));
    else if (kind === "steps") F.push(trace(svg, ySteps, 0x57e9));
  });

  var t = setInterval(function () {
    F.forEach(function (f) { f(); });
  }, 80);
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      clearInterval(t);
      t = null;
    } else if (!t) {
      t = setInterval(function () {
        F.forEach(function (f) { f(); });
      }, 80);
    }
  });
})();

/* What I measure: restrained, deterministic instrument motion. */
(function () {
  var rows = document.querySelectorAll("[data-measure]");
  if (!rows.length) return;

  var RM = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (RM) return;

  function rng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6d2b79f5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function running(row, seed) {
    var r = rng(seed);
    var selection = row.querySelector("[data-running-selection]");
    var link = row.querySelector("[data-running-link]");
    var heat = [].slice.call(row.querySelectorAll("[data-heat]")).map(function (el) {
      return { el: el, phase: r() * Math.PI * 2, level: 0.48 + r() * 0.34 };
    });
    var stacks = [].slice.call(row.querySelectorAll("[data-running-stack]"));
    var phase = r();
    var targets = [256, 365, 429];

    return function () {
      phase = (phase + 0.0055) % 1;
      var x = 28 + phase * 498;
      var center = x + 36;
      var zone = Math.min(2, Math.floor(phase * 3));
      selection.setAttribute("x", x.toFixed(1));
      link.setAttribute("d", "M" + center.toFixed(1) + " 37V44L" + targets[zone] + " 50");
      heat.forEach(function (cell, i) {
        var breathe = Math.sin(phase * Math.PI * 8 + cell.phase + i * 0.11);
        cell.el.setAttribute("fill-opacity", (cell.level + breathe * 0.1).toFixed(2));
      });
      stacks.forEach(function (el) {
        var selected = +el.getAttribute("data-stack-zone") === zone;
        el.setAttribute("fill-opacity", selected ? "1" : ".58");
        el.setAttribute("stroke-opacity", selected ? "1" : ".65");
      });
    };
  }

  function waiting(row, seed) {
    var r = rng(seed);
    var blocks = [].slice.call(row.querySelectorAll("[data-block]")).map(function (el) {
      return {
        el: el,
        center: +el.getAttribute("x") + +el.getAttribute("width") / 2,
        level: 0.72 + r() * 0.22
      };
    });
    var cursor = row.querySelector("[data-wait-cursor]");
    var phase = r();

    return function () {
      phase = (phase + 0.0045) % 1;
      var edge = 34 + phase * 552;
      cursor.setAttribute("x1", edge.toFixed(1));
      cursor.setAttribute("x2", edge.toFixed(1));
      blocks.forEach(function (block) {
        var distance = edge - block.center;
        var opacity = distance >= 0 ? block.level : 0.16;
        if (distance >= 0 && distance < 54) opacity = 1;
        block.el.setAttribute("fill-opacity", opacity.toFixed(2));
        block.el.setAttribute("stroke-opacity", distance >= 0 ? ".95" : ".35");
      });
    };
  }

  function waking(row, seed) {
    var r = rng(seed);
    var cells = [].slice.call(row.querySelectorAll("[data-weight]")).map(function (el) {
      return {
        el: el,
        weight: +el.getAttribute("data-weight"),
        phase: r() * Math.PI * 2
      };
    });
    var focus = row.querySelector("[data-wake-focus]");
    var tick = Math.floor(r() * 24);
    var hot = Math.floor(r() * cells.length);

    return function () {
      tick++;
      if (tick % 30 === 0) {
        var total = 0;
        cells.forEach(function (cell) { total += cell.weight; });
        var pick = r() * total;
        for (var i = 0; i < cells.length; i++) {
          pick -= cells[i].weight;
          if (pick <= 0) {
            hot = i;
            break;
          }
        }
      }
      cells.forEach(function (cell, i) {
        var drift = Math.sin(tick / 22 + cell.phase) * 0.08;
        var opacity = 0.12 + cell.weight * 0.72 + drift;
        if (i === hot) opacity = Math.min(1, opacity + 0.2);
        cell.el.setAttribute("fill-opacity", opacity.toFixed(2));
      });
      var el = cells[hot].el;
      focus.setAttribute("x", (+el.getAttribute("x") - 2).toFixed(1));
      focus.setAttribute("y", (+el.getAttribute("y") - 2).toFixed(1));
      focus.setAttribute("stroke-opacity", (0.52 + 0.3 * Math.sin(tick / 9)).toFixed(2));
    };
  }

  function retained(row, seed) {
    var r = rng(seed);
    var tracks = [].slice.call(row.querySelectorAll("[data-life]")).map(function (el) {
      var x = +el.getAttribute("x");
      var width = +el.getAttribute("width");
      return {
        el: el,
        x: x,
        width: width,
        end: x + width,
        retained: el.hasAttribute("data-retained")
      };
    });
    var cursor = row.querySelector("[data-life-cursor]");
    var phase = 0.12 + r() * 0.3;

    return function () {
      phase = (phase + 0.004) % 1;
      var x = 48 + phase * 540;
      cursor.setAttribute("x1", x.toFixed(1));
      cursor.setAttribute("x2", x.toFixed(1));
      tracks.forEach(function (track) {
        var visible = Math.max(0, Math.min(track.width, x - track.x));
        track.el.setAttribute("width", visible.toFixed(1));
        if (!visible) {
          track.el.setAttribute("fill-opacity", "0");
        } else if (x > track.end && !track.retained) {
          track.el.setAttribute("fill-opacity", ".34");
        } else {
          track.el.setAttribute("fill-opacity", track.retained ? ".95" : ".78");
        }
      });
    };
  }

  function mapped(row, seed) {
    var r = rng(seed);
    var pages = [].slice.call(row.querySelectorAll("[data-page]")).map(function (el) {
      return {
        el: el,
        resident: el.getAttribute("data-resident") === "1",
        color: el.getAttribute("fill"),
        age: 0
      };
    });
    var fault = row.querySelector("[data-page-fault]");
    var tick = Math.floor(r() * 18);
    var current = 6;

    return function () {
      tick++;
      if (tick % 24 === 0) {
        current = Math.floor(r() * pages.length);
        var page = pages[current];
        page.resident = true;
        if (r() < 0.32) {
          var evicted = pages[Math.floor(r() * pages.length)];
          if (evicted !== page) evicted.resident = false;
        }
        page.age = 16;
        fault.setAttribute("x", (+page.el.getAttribute("x") - 2).toFixed(1));
        fault.setAttribute("y", (+page.el.getAttribute("y") - 2).toFixed(1));
      }
      pages.forEach(function (page, i) {
        if (page.age > 0) page.age--;
        if (page.age > 0) {
          page.el.setAttribute("fill", "#d4786a");
          page.el.setAttribute("fill-opacity", (0.68 + page.age / 50).toFixed(2));
        } else if (page.resident) {
          page.el.setAttribute("fill", page.color === "#171b20" ? "#315f4a" : page.color);
          page.el.setAttribute("fill-opacity", (0.72 + 0.12 * Math.sin(tick / 28 + i)).toFixed(2));
        } else {
          page.el.setAttribute("fill", "#171b20");
          page.el.setAttribute("fill-opacity", "1");
        }
      });
      fault.setAttribute("stroke-opacity", pages[current].age > 0 ? (pages[current].age / 16).toFixed(2) : "0");
    };
  }

  var makers = {
    running: running,
    waiting: waiting,
    waking: waking,
    retained: retained,
    mapped: mapped
  };
  var seeds = {
    running: 0x0c0ffee,
    waiting: 0x0ffc0de,
    waking: 0x0a11ce5,
    retained: 0x0decade,
    mapped: 0x0add355
  };
  var instruments = [];

  [].forEach.call(rows, function (row) {
    var name = row.getAttribute("data-measure");
    if (!makers[name]) return;
    instruments.push({
      row: row,
      active: !("IntersectionObserver" in window),
      step: makers[name](row, seeds[name])
    });
  });

  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        instruments.forEach(function (instrument) {
          if (instrument.row === entry.target) {
            instrument.active = entry.isIntersecting && entry.intersectionRatio > 0;
          }
        });
      });
    }, { rootMargin: "120px 0px" });
    instruments.forEach(function (instrument) { observer.observe(instrument.row); });
  }

  var timer = null;
  function frame() {
    instruments.forEach(function (instrument) {
      if (instrument.active) instrument.step();
    });
  }
  function start() {
    if (!timer && !document.hidden) timer = setInterval(frame, 90);
  }
  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  start();
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop();
    else start();
  });
})();

/* Sticky section navigation: scroll position is the source of truth. */
(function () {
  var nav = document.querySelector(".nav");
  var tray = document.querySelector(".nav-links");
  if (!nav || !tray) return;

  var heroLink = nav.querySelector(".nav-me");
  var links = [].slice.call(tray.querySelectorAll("a"));
  var items = links.map(function (link) {
    var href = link.getAttribute("href") || "";
    if (href.charAt(0) === "#") {
      var id = href.slice(1);
      var target = document.getElementById(id);
      return target ? { id: id, link: link, target: target } : null;
    }
    var section = link.getAttribute("data-section");
    if (!section) return null;
    var mapped = document.getElementById(section);
    return mapped ? { id: section, link: link, target: mapped } : null;
  }).filter(function (item) { return item; });

  if (!items.length) return;

  var reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)");
  var mobile = window.matchMedia && window.matchMedia("(max-width: 960px)");
  var activeId = "__unset__";
  var queued = false;
  var checkTray = true;

  function centerIfHidden(item) {
    if (!mobile || !mobile.matches || tray.scrollWidth <= tray.clientWidth) return;

    var trayBox = tray.getBoundingClientRect();
    var linkBox = item.link.getBoundingClientRect();
    if (linkBox.left >= trayBox.left && linkBox.right <= trayBox.right) return;

    var left = tray.scrollLeft +
      linkBox.left - trayBox.left -
      (tray.clientWidth - linkBox.width) / 2;
    var maxLeft = tray.scrollWidth - tray.clientWidth;
    left = Math.max(0, Math.min(maxLeft, left));
    tray.scrollTo({
      left: Math.round(left),
      behavior: reduceMotion && reduceMotion.matches ? "auto" : "smooth"
    });
  }

  function update() {
    queued = false;
    var cutoff = nav.getBoundingClientRect().bottom + 20;
    var active = null;

    items.forEach(function (item) {
      if (item.target.getBoundingClientRect().top <= cutoff) active = item;
    });

    var root = document.documentElement;
    var atEnd = window.scrollY + window.innerHeight >= root.scrollHeight - 2;
    if (atEnd) active = items[items.length - 1];

    var nextId = active ? active.id : null;
    var changed = nextId !== activeId;
    var shouldCheckTray = checkTray;
    checkTray = false;

    if (changed) {
      if (heroLink) heroLink.removeAttribute("aria-current");
      links.forEach(function (link) {
        link.removeAttribute("aria-current");
      });
      if (active) active.link.setAttribute("aria-current", "location");
      else if (heroLink) heroLink.setAttribute("aria-current", "location");
      activeId = nextId;
    }

    if (active && (changed || shouldCheckTray)) centerIfHidden(active);
  }

  function schedule() {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(update);
  }

  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", function () {
    checkTray = true;
    schedule();
  });
  window.addEventListener("load", function () {
    checkTray = true;
    schedule();
  });
  schedule();
})();
