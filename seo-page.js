(function () {
  var toc = document.querySelector('.seo-toc');
  if (!toc) return;

  var links = Array.prototype.slice.call(toc.querySelectorAll('a[href^="#"]'));
  var sections = links
    .map(function (link) {
      var id = link.getAttribute('href').slice(1);
      var el = document.getElementById(id);
      if (!el) return null;
      return {
        id: id,
        el: el,
        link: link,
        li: link.closest('li')
      };
    })
    .filter(Boolean);

  if (!sections.length) return;

  var activeId = null;

  function setActive(id) {
    if (id === activeId) return;
    activeId = id;
    sections.forEach(function (section) {
      var on = section.id === id;
      if (section.li) section.li.classList.toggle('is-active', on);
      if (on) section.link.setAttribute('aria-current', 'location');
      else section.link.removeAttribute('aria-current');
    });
  }

  function update() {
    var marker = Math.min(160, Math.round(window.innerHeight * 0.28));
    var current = sections[0].id;
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].el.getBoundingClientRect().top <= marker) {
        current = sections[i].id;
      }
    }
    setActive(current);
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      update();
      ticking = false;
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', update, { passive: true });
  update();
})();
