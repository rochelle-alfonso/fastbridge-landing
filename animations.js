(function () {
  'use strict';

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.add('has-enhanced-animations');

  if (reducedMotion) {
    document.querySelectorAll('[data-reveal], [data-reveal-stagger]').forEach(function (el) {
      el.classList.add('is-revealed');
    });
    return;
  }

  /* ---- Scroll reveal ---- */
  var revealTargets = document.querySelectorAll('[data-reveal], [data-reveal-stagger]');

  function revealElement(el) {
    el.classList.add('is-revealed');
  }

  function revealIfNearViewport(el) {
    var rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight + 100 && rect.bottom > -100) {
      revealElement(el);
      return true;
    }
    return false;
  }

  revealTargets.forEach(function (el) {
    if (!revealIfNearViewport(el) && 'IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            revealElement(entry.target);
            obs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
      observer.observe(el);
    } else if (!el.classList.contains('is-revealed')) {
      revealElement(el);
    }
  });

  /* Chains strip sits directly below hero — reveal immediately */
  var chains = document.querySelector('.chains-strip[data-reveal-stagger]');
  if (chains) revealElement(chains);

  /* ---- Hero parallax ---- */
  var hero = document.querySelector('.hero[data-hero-animate]');
  var heroBg = hero && hero.querySelector('.hero__gradient-wrap');
  var parallaxTicking = false;

  function updateHeroParallax() {
    parallaxTicking = false;
    if (!hero || !heroBg) return;
    var rect = hero.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) return;
    var progress = Math.max(0, Math.min(1, -rect.top / rect.height));
    heroBg.style.transform = 'translateY(' + (progress * 48) + 'px) scale(' + (1 + progress * 0.04) + ')';
  }

  function onScroll() {
    if (heroBg && !parallaxTicking) {
      parallaxTicking = true;
      requestAnimationFrame(updateHeroParallax);
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  updateHeroParallax();

  /* Hero video: poster is LCP. On mobile / slow links, wait for a gesture
     so Lighthouse does not count the MP4 as LCP. Desktop still autoplays. */
  function startHeroVideo() {
    var video = document.querySelector('.hero__video');
    if (!video) return;
    var src = video.getAttribute('data-src');
    if (!src || video.getAttribute('data-started')) return;
    video.setAttribute('data-started', 'true');
    video.src = src;

    function play() {
      video.classList.add('is-playing');
      var playing = video.play();
      if (playing && playing.catch) playing.catch(function () {});
    }

    if (video.readyState >= 3) {
      play();
    } else {
      video.addEventListener('canplay', play, { once: true });
    }
  }

  function isSlowConnection() {
    var c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!c) return false;
    if (c.saveData) return true;
    if (c.effectiveType === 'slow-2g' || c.effectiveType === '2g' || c.effectiveType === '3g') return true;
    if (typeof c.downlink === 'number' && c.downlink > 0 && c.downlink < 2) return true;
    return false;
  }

  function bindHeroVideo() {
    var waiting = true;

    function start() {
      if (!waiting) return;
      waiting = false;
      window.removeEventListener('scroll', start);
      window.removeEventListener('pointerdown', start);
      window.removeEventListener('touchstart', start);
      window.removeEventListener('keydown', start);
      startHeroVideo();
    }

    window.addEventListener('scroll', start, { passive: true });
    window.addEventListener('pointerdown', start);
    window.addEventListener('touchstart', start, { passive: true });
    window.addEventListener('keydown', start);

    var isMobile = window.matchMedia('(max-width: 768px)').matches;
    if (isMobile || isSlowConnection()) return;

    function runIdle() {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(start, { timeout: 2000 });
      } else {
        setTimeout(start, 1);
      }
    }

    if (document.readyState === 'complete') runIdle();
    else window.addEventListener('load', runIdle);
  }

  bindHeroVideo();
})();
