(function () {
  'use strict';

  var section = document.querySelector('.hiw');
  if (!section) return;

  var steps = Array.prototype.slice.call(section.querySelectorAll('.hiw-step'));
  var panel = section.querySelector('#hiw-panel');
  if (!steps.length) return;

  var widget = section.querySelector('.hiw__widget');
  var STEP_VIDEOS = [
    {
      webm: 'assets/hiw-step-1.webm?v=3',
      hevc: 'assets/hiw-step-1-hevc.mov?v=2'
    },
    {
      webm: 'assets/hiw-step-2.webm?v=3',
      hevc: 'assets/hiw-step-2-hevc.mov?v=2'
    },
    {
      webm: 'assets/hiw-step-3.webm?v=3',
      hevc: 'assets/hiw-step-3-hevc.mov?v=2'
    }
  ];

  // HEVC alpha .mov on iOS only. Mac Safari uses WebM + Safari-specific CSS mask.
  function useHevcHiwVideos() {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  function isSafariBrowser() {
    var ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/i.test(ua)) return true;
    return /Safari/i.test(ua) && !/Chrome|CriOS|Chromium|Edg|OPR|FxiOS|Firefox/i.test(ua);
  }

  function getStepVideoSrc(step, preferWebm) {
    if (preferWebm || !useHevcHiwVideos()) return step.webm;
    return step.hevc;
  }

  if (isSafariBrowser()) {
    section.classList.add('hiw--safari');
  }

  // Fallback step length, used only when the cinematic videos can't drive the
  // sequence (missing elements, load/decode error, or play() rejection).
  var STEP_DURATION = 6000;
  var currentIndex = 0;
  var timerId = null;
  var timerEndsAt = 0;
  var isVisible = false;
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mobileQuery = window.matchMedia('(max-width: 768px)');

  var videos = [];
  var useVideo = false;

  function getMobileStepOrder(activeIndex, total) {
    var order = [activeIndex];
    var i;
    for (i = activeIndex + 1; i < total; i++) order.push(i);
    for (i = activeIndex - 1; i >= 0; i--) order.push(i);
    return order;
  }

  function updateStepOrder(activeIndex) {
    var sequence = getMobileStepOrder(activeIndex, steps.length);

    steps.forEach(function (step, stepIndex) {
      var item = step.parentElement;
      if (!item) return;

      if (mobileQuery.matches) {
        item.style.setProperty('--step-order', sequence.indexOf(stepIndex));
      } else {
        item.style.removeProperty('--step-order');
      }
    });
  }

  mobileQuery.addEventListener('change', function () {
    updateStepOrder(currentIndex);
  });

  function clearTimer() {
    if (timerId) {
      window.clearTimeout(timerId);
      timerId = null;
    }
  }

  // ----- Fallback timer advance (no usable video) -----
  function scheduleAdvance(delay) {
    clearTimer();
    if (!isVisible || reducedMotion) return;
    timerEndsAt = Date.now() + delay;
    timerId = window.setTimeout(function () {
      timerId = null;
      goToStep((currentIndex + 1) % steps.length);
    }, delay);
  }

  function fallBackToTimer() {
    if (useVideo) useVideo = false;
    scheduleAdvance(STEP_DURATION);
  }

  // ----- Video playback (stacked, crossfaded, preloaded) -----
  function pauseVideos() {
    videos.forEach(function (v) {
      v.pause();
    });
  }

  // Show the active step's video on top; the others stay loaded but hidden so
  // switching is an opacity crossfade, never an empty/black reload.
  function showActiveVideo() {
    if (!useVideo) return;
    videos.forEach(function (v, i) {
      if (i === currentIndex) {
        v.classList.add('hiw__widget-video--active');
      } else {
        v.classList.remove('hiw__widget-video--active');
        v.pause();
      }
    });
  }

  function playActiveVideo() {
    if (!useVideo || !isVisible || reducedMotion) return;
    var v = videos[currentIndex];
    if (!v) return;
    try { v.currentTime = 0; } catch (e) {}
    var p = v.play();
    if (p && typeof p.catch === 'function') {
      p.catch(function () {
        // Autoplay blocked or decode failed — keep the sequence moving.
        fallBackToTimer();
      });
    }
  }

  function setActiveStep(index) {
    currentIndex = index;

    steps.forEach(function (step, i) {
      var active = i === index;
      step.classList.toggle('hiw-step--active', active);
      step.setAttribute('aria-selected', active ? 'true' : 'false');
      step.setAttribute('tabindex', active ? '0' : '-1');
    });

    if (panel) {
      panel.setAttribute('aria-labelledby', steps[index].id);
    }

    updateStepOrder(index);
    showActiveVideo();
  }

  function goToStep(index) {
    if (index < 0 || index >= steps.length) return;
    clearTimer();
    setActiveStep(index);
    if (useVideo) {
      playActiveVideo();
    } else {
      scheduleAdvance(STEP_DURATION);
    }
  }

  // Build one preloaded <video> per step, stacked inside the widget frame.
  if (widget) {
    widget.innerHTML = '';
    STEP_VIDEOS.forEach(function (step, i) {
      var v = document.createElement('video');
      v.className = 'hiw__widget-video' + (i === 0 ? ' hiw__widget-video--active' : '');
      v.muted = true;
      v.defaultMuted = true;
      v.loop = false;
      v.preload = 'auto';
      v.setAttribute('muted', '');
      v.setAttribute('playsinline', '');
      v.playsInline = true;
      v.setAttribute('aria-hidden', 'true');
      v.src = getStepVideoSrc(step);

      v.addEventListener('ended', function () {
        if (reducedMotion) return;
        if (i === currentIndex) goToStep((currentIndex + 1) % steps.length);
      });
      v.addEventListener('error', function () {
        if (!v.dataset.webmFallback && useHevcHiwVideos()) {
          v.dataset.webmFallback = '1';
          v.src = step.webm;
          v.load();
          if (i === currentIndex && isVisible && !reducedMotion) {
            var p = v.play();
            if (p && typeof p.catch === 'function') p.catch(fallBackToTimer);
          }
          return;
        }
        fallBackToTimer();
      });

      widget.appendChild(v);
      videos.push(v);
    });
    useVideo = videos.length === steps.length;
  }

  steps.forEach(function (step, index) {
    step.addEventListener('click', function () {
      goToStep(index);
    });

    step.addEventListener('keydown', function (event) {
      var nextIndex = currentIndex;

      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        nextIndex = (currentIndex + 1) % steps.length;
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        nextIndex = (currentIndex - 1 + steps.length) % steps.length;
      } else if (event.key === 'Home') {
        nextIndex = 0;
      } else if (event.key === 'End') {
        nextIndex = steps.length - 1;
      } else {
        return;
      }

      event.preventDefault();
      goToStep(nextIndex);
      steps[nextIndex].focus();
    });
  });

  if ('IntersectionObserver' in window) {
    // Trigger on the card itself landing in view (not the tall section's top
    // edge), so the sequence begins from step 1 once the user reaches it.
    var trigger = section.querySelector('.hiw__product-wrap') || section;
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var wasVisible = isVisible;
        isVisible = entry.isIntersecting;

        if (isVisible && !wasVisible) {
          // Card has landed — (re)start the sequence from the first step.
          goToStep(0);
        }

        if (!isVisible && wasVisible) {
          clearTimer();
          if (useVideo) pauseVideos();
        }
      });
    }, { threshold: 0.55 });

    observer.observe(trigger);
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      clearTimer();
      if (useVideo) pauseVideos();
    } else if (isVisible && !reducedMotion) {
      if (useVideo) {
        playActiveVideo();
      } else if (!timerId) {
        goToStep(currentIndex);
      }
    }
  });

  if (reducedMotion) {
    setActiveStep(0);
    return;
  }

  goToStep(0);
})();
