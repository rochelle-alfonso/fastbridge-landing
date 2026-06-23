(function () {
  var slides = Array.prototype.slice.call(document.querySelectorAll('.deck-slide'));
  var countEl = document.getElementById('deck-count');
  var prevBtn = document.getElementById('deck-prev');
  var nextBtn = document.getElementById('deck-next');
  var current = 0;
  var DESIGN_W = 1920;
  var DESIGN_H = 1080;
  var VIEWPORT_PAD_X = 48;
  var VIEWPORT_PAD_Y = 88;

  function updateScale() {
    var scale = Math.min(
      (window.innerWidth - VIEWPORT_PAD_X) / DESIGN_W,
      (window.innerHeight - VIEWPORT_PAD_Y) / DESIGN_H
    );
    document.documentElement.style.setProperty('--deck-scale', String(scale));
  }

  function updateNav() {
    if (countEl) countEl.textContent = (current + 1) + ' / ' + slides.length;
    if (prevBtn) prevBtn.disabled = current === 0;
    if (nextBtn) nextBtn.disabled = current === slides.length - 1;
  }

  function setActiveSlide(index) {
    slides.forEach(function (slide, i) {
      slide.classList.toggle('is-active', i === index);
      slide.setAttribute('aria-hidden', i === index ? 'false' : 'true');
    });
  }

  function goTo(index) {
    if (!slides.length) return;
    current = Math.max(0, Math.min(slides.length - 1, index));
    setActiveSlide(current);
    updateNav();
  }

  if (prevBtn) prevBtn.addEventListener('click', function () { goTo(current - 1); });
  if (nextBtn) nextBtn.addEventListener('click', function () { goTo(current + 1); });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
      e.preventDefault();
      goTo(current + 1);
    }
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault();
      goTo(current - 1);
    }
    if (e.key === 'Home') {
      e.preventDefault();
      goTo(0);
    }
    if (e.key === 'End') {
      e.preventDefault();
      goTo(slides.length - 1);
    }
  });

  window.addEventListener('resize', updateScale);
  updateScale();
  goTo(0);

  document.querySelectorAll('.video-preview__player video').forEach(function (video) {
    video.addEventListener('click', function () {
      if (video.paused) video.play();
      else video.pause();
    });
  });
})();
