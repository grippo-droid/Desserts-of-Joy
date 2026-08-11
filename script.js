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

  if (sections.length && 'IntersectionObserver' in window) {
    var visible = new Set();

    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      });

      if (!visible.size) return;

      // topmost section currently in the reading band wins
      var top = null;
      visible.forEach(function (section) {
        if (!top || section.offsetTop < top.offsetTop) top = section;
      });
      setActive(top.id);
    }, {
      // reading band: just under the nav, down to 55% of the viewport
      rootMargin: '-' + (nav.offsetHeight + 8) + 'px 0px -45% 0px',
      threshold: 0
    });

    sections.forEach(function (section) { spy.observe(section); });
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
