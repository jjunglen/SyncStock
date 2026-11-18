// "Restock alerts hero" (blocks/restock-hero.liquid): the tabs and the
// carousel arrows. Loaded deferred by Shopify; without it the carousel
// still scrolls by swipe. Runs again when the theme editor re-renders a
// section, so each hero is set up once.
(function () {
  function setUp(hero) {
    if (hero.dataset.syncstockReady) return;
    hero.dataset.syncstockReady = "1";

    var tabs = Array.prototype.slice.call(hero.querySelectorAll('[role="tab"]'));
    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(t.getAttribute("aria-controls"));
        if (panel) panel.hidden = !on;
      });
      if (focus) tab.focus();
    }
    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () {
        select(tab, false);
      });
      tab.addEventListener("keydown", function (e) {
        var next = null;
        if (e.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
        if (e.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
        if (next) {
          e.preventDefault();
          select(next, true);
        }
      });
    });

    var track = hero.querySelector("[data-syncstock-track]");
    var prev = hero.querySelector("[data-syncstock-prev]");
    var next = hero.querySelector("[data-syncstock-next]");
    if (!track || !prev || !next) return;
    // One page of cards at a time
    function step(direction) {
      track.scrollBy({ left: direction * track.clientWidth * 0.9, behavior: "smooth" });
    }
    function update() {
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
    }
    prev.addEventListener("click", function () {
      step(-1);
    });
    next.addEventListener("click", function () {
      step(1);
    });
    track.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  function setUpAll() {
    document.querySelectorAll("[data-syncstock-hero]").forEach(setUp);
  }
  setUpAll();
  document.addEventListener("shopify:section:load", setUpAll);
})();
