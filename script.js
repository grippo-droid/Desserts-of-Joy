/* =========================================================================
   Desserts of Joy — menu behaviour
   Two small jobs only: raise the nav once it sticks, and keep the active
   category pill in sync with what's on screen.
   ========================================================================= */
(function () {
  'use strict';

  var nav      = document.querySelector('.nav');
  var scroller = document.querySelector('.nav__scroller');
  var sentinel = document.querySelector('.nav-sentinel');
  var pills    = Array.prototype.slice.call(document.querySelectorAll('.pill'));

  if (!nav || !pills.length) return;

  /* --- 1. raised state once the nav detaches from the hero --------------- */
  if (sentinel && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      nav.classList.toggle('is-stuck', !entries[0].isIntersecting);
    }, { threshold: 0 }).observe(sentinel);
  }

  /* --- 2. scroll spy ----------------------------------------------------- */
  var byId = {};
  var sections = [];

  pills.forEach(function (pill) {
    var section = document.querySelector(pill.getAttribute('href'));
    if (!section) return;
    byId[section.id] = pill;
    sections.push(section);
  });

  var current = null;

  function setActive(id) {
    if (id === current) return;
    current = id;

    pills.forEach(function (pill) {
      pill.classList.remove('is-active');
      pill.removeAttribute('aria-current');
    });

    var pill = byId[id];
    if (!pill) return;

    pill.classList.add('is-active');
    pill.setAttribute('aria-current', 'true');
    keepPillInView(pill);
  }

  /* Nudge the pill row horizontally only — never scrollIntoView, which
     would also yank the page vertically mid-scroll. */
  function keepPillInView(pill) {
    if (!scroller || scroller.scrollWidth <= scroller.clientWidth) return;

    var target = pill.offsetLeft - (scroller.clientWidth - pill.offsetWidth) / 2;
    var max    = scroller.scrollWidth - scroller.clientWidth;
    target     = Math.max(0, Math.min(target, max));

    if (Math.abs(target - scroller.scrollLeft) < 4) return;

    var smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (smooth && scroller.scrollTo) {
      scroller.scrollTo({ left: target, behavior: 'smooth' });
    } else {
      scroller.scrollLeft = target;
    }
  }

  /* Scroll spy.

     This used to be an IntersectionObserver watching a fixed reading band
     between the nav and 55% of the viewport. That strands the last
     sections: a section can only cross the band if the page can scroll far
     enough to push it up there, and near the end of the document it cannot.
     On a phone the page ran out of scroll ~80px before "Coffee & Sips"
     would have reached the band, so it and "Cake Glasses" never activated
     and the pill stayed stuck on "Sandwiches".

     Instead: pick the last section whose top has passed a reference line.
     For most of the page that line sits just under the nav. Over the final
     stretch — from the point where the last *reachable* section becomes
     current, to the bottom of the document — the line sweeps down the
     viewport, so the sections that can never reach it still get their turn,
     in order. Behaviour above that stretch is unchanged. */
  if (sections.length) {
    var geom = null;

    function measure() {
      var winH   = window.innerHeight;
      var max    = Math.max(0, document.documentElement.scrollHeight - winH);
      var refTop = nav.offsetHeight + 24;   // reference line, from viewport top
      var tops   = sections.map(function (s) { return s.offsetTop; });

      // the furthest point down the document the fixed line can ever reach
      var reachable  = max + refTop;
      var sweepStart = max;
      tops.forEach(function (top) {
        if (top <= reachable) {
          sweepStart = Math.min(max, Math.max(0, top - refTop));
        }
      });

      geom = { max: max, winH: winH, refTop: refTop, tops: tops,
               sweepStart: sweepStart };
    }

    function update() {
      if (!geom) measure();

      var y = window.pageYOffset || document.documentElement.scrollTop || 0;
      var refTop = geom.refTop;

      if (geom.max > geom.sweepStart && y > geom.sweepStart) {
        var t = (y - geom.sweepStart) / (geom.max - geom.sweepStart);
        t = Math.max(0, Math.min(1, t));
        refTop += t * (geom.winH - geom.refTop - 24);
      }

      var line = y + refTop;
      var pick = null;
      for (var i = 0; i < geom.tops.length; i++) {
        if (geom.tops[i] <= line) pick = sections[i];
      }

      /* Head of the page: the first section has come into view but its
         heading has not yet climbed to the reference line. The old band
         lit the first pill here — keep that, or the nav sits dark for the
         first few hundred px of scrolling. Mirrors the band's lower edge. */
      if (!pick && geom.tops.length && geom.tops[0] <= y + geom.winH * 0.55) {
        pick = sections[0];
      }

      // still nothing: the hero owns the screen, so no pill is current
      setActive(pick ? pick.id : null);
    }

    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { ticking = false; update(); });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () { measure(); update(); });
    window.addEventListener('load', function () { measure(); update(); });
    // webfonts change section heights, which moves every offset
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { measure(); update(); });
    }

    measure();
    update();
  }

  /* --- 3. section reveal ------------------------------------------------
     Only runs if the inline head script set .js-reveal. Every exit path
     ends with content visible: observed sections reveal on intersect,
     a non-scrollable page reveals immediately, and a backstop timer
     reveals anything still hidden no matter what went wrong. */
  var root = document.documentElement;

  if (root.className.indexOf("js-reveal") !== -1) {
    var revealAll = function () {
      sections.forEach(function (s) { s.classList.add("is-revealed"); });
      root.className = root.className.replace(/\bjs-reveal\b/, "");
    };

    if (!sections.length) {
      revealAll();
    } else {
      var revealer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-revealed");
          revealer.unobserve(entry.target);
        });
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0 });

      sections.forEach(function (s) { revealer.observe(s); });

      // A page that cannot scroll will never fire further intersections.
      if (root.scrollHeight <= window.innerHeight + 4) revealAll();

      // Last resort. Losing the animation is fine; losing the menu is not.
      window.setTimeout(revealAll, 5000);
    }
  }

  /* --- 4. immediate feedback on tap (before the scroll settles) ---------- */
  pills.forEach(function (pill) {
    pill.addEventListener('click', function () {
      var section = document.querySelector(pill.getAttribute('href'));
      if (section) setActive(section.id);
    });
  });
}());
