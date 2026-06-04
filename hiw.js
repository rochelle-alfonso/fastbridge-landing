(function () {
  'use strict';

  var section = document.querySelector('.hiw');
  if (!section) return;

  var steps = Array.prototype.slice.call(section.querySelectorAll('.hiw-step'));
  var panel = section.querySelector('#hiw-panel');
  if (!steps.length) return;

  var video = section.querySelector('#hiw-widget-video');
  var STEP_VIDEOS = [
    'assets/hiw-step-1.webm?v=2',
    'assets/hiw-step-2.webm?v=2',
    'assets/hiw-step-3.webm?v=2'
  ];

  // Fallback step length, used only when the cinematic video can't drive the
  // sequence (missing element, load/decode error, or play() rejection).
  var STEP_DURATION = 6000;
  var currentIndex = 0;
  var timerId = null;
  var timerEndsAt = 0;
  var isVisible = false;
  var useVideo = !!video;
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mobileQuery = window.matchMedia('(max-width: 768px)');

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

  // ----- Video playback -----
  function playVideo() {
    if (!useVideo || !isVisible || reducedMotion) return;
    var p = video.play();
    if (p && typeof p.catch === 'function') {
      p.catch(function () {
        // Autoplay blocked or decode failed — keep the sequence moving.
        fallBackToTimer();
      });
    }
  }

  function loadStepVideo(index) {
    if (!useVideo) return;
    var src = STEP_VIDEOS[index];
    if (!src) {
      fallBackToTimer();
      return;
    }
    if (video.getAttribute('src') !== src) {
      video.setAttribute('src', src);
      video.load();
    } else {
      try { video.currentTime = 0; } catch (e) {}
    }
    playVideo();
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
  }

  function goToStep(index) {
    if (index < 0 || index >= steps.length) return;
    clearTimer();
    setActiveStep(index);
    if (useVideo) {
      loadStepVideo(index);
    } else {
      scheduleAdvance(STEP_DURATION);
    }
  }

  if (useVideo) {
    video.addEventListener('ended', function () {
      if (reducedMotion) return;
      goToStep((currentIndex + 1) % steps.length);
    });
    video.addEventListener('error', fallBackToTimer);
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
          if (useVideo) video.pause();
        }
      });
    }, { threshold: 0.55 });

    observer.observe(trigger);
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      clearTimer();
      if (useVideo) video.pause();
    } else if (isVisible && !reducedMotion) {
      if (useVideo) {
        playVideo();
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
