(function() {
  // Disable scroll lock on smaller screens
  if (window.innerWidth <= 1024) return;

  var stepsScroll = document.querySelector('.steps-scroll');
  if (!stepsScroll) return;

  var howItWorks = stepsScroll.closest('.how-it-works');
  var stepCards = stepsScroll.querySelectorAll('.step-card');
  var totalSteps = stepCards.length;
  var currentStep = 0;
  var isLocked = false;
  var cooldown = false;
  var transitioning = false;
  var scrollCount = 0;
  var lastDirection = null;
  var resetTimer = null;
  var exitThreshold = 2;
  var justLocked = false;

  stepCards[0].classList.add('active');

  // Get all step videos
  var stepVideos = [];
  for (var v = 0; v < totalSteps; v++) {
    stepVideos.push(stepCards[v].querySelector('.step-video'));
  }

  function updateVideos() {
    for (var v = 0; v < totalSteps; v++) {
      var video = stepVideos[v];
      if (!video) continue;
      if (v === currentStep) {
        video.currentTime = 0;
        var playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.catch(function() {});
        }
      } else {
        video.pause();
      }
    }
  }

  // On mobile (no scroll lock), let all videos autoplay
  function isMobile() {
    return window.innerWidth <= 1024;
  }

  if (isMobile()) {
    // Use IntersectionObserver to play/pause videos as they scroll into view
    var videoObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        var video = entry.target;
        if (entry.isIntersecting) {
          video.play().catch(function() {});
        } else {
          video.pause();
        }
      });
    }, { threshold: 0.3 });

    for (var v = 0; v < totalSteps; v++) {
      if (stepVideos[v]) {
        videoObserver.observe(stepVideos[v]);
      }
    }
  } else {
    // Pause all videos initially on desktop
    for (var v = 0; v < totalSteps; v++) {
      if (stepVideos[v]) stepVideos[v].pause();
    }
  }

  function isSectionInFullView() {
    var rect = howItWorks.getBoundingClientRect();
    return rect.top <= 2 && rect.top >= -50;
  }

  function lockSection() {
    if (isLocked) return;
    isLocked = true;
    var rect = howItWorks.getBoundingClientRect();
    var scrollY = window.pageYOffset || document.documentElement.scrollTop;
    window.scrollTo(0, scrollY + rect.top);
    document.body.style.overflow = 'hidden';
    justLocked = true;
    updateVideos();
  }

  function unlockSection() {
    isLocked = false;
    cooldown = true;
    document.body.style.overflow = '';
    // Pause all videos when leaving section
    for (var v = 0; v < totalSteps; v++) {
      if (stepVideos[v]) stepVideos[v].pause();
    }
    setTimeout(function() { cooldown = false; }, 1500);
  }

  function exitToNext() {
    unlockSection();
    requestAnimationFrame(function() {
      var nextSection = howItWorks.nextElementSibling;
      if (nextSection) nextSection.scrollIntoView({ behavior: 'smooth' });
    });
  }

  function exitToPrev() {
    goToStep(0);
    unlockSection();
    requestAnimationFrame(function() {
      var prevSection = howItWorks.previousElementSibling;
      if (prevSection) {
        prevSection.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }

  function goToStep(index) {
    if (index < 0 || index >= totalSteps || transitioning) return;
    transitioning = true;
    currentStep = index;

    for (var i = 0; i < totalSteps; i++) {
      if (i <= currentStep) {
        stepCards[i].classList.add('active');
      } else {
        stepCards[i].classList.remove('active');
      }
    }

    updateVideos();

    setTimeout(function() {
      transitioning = false;
    }, 1000);
  }

  window.addEventListener('scroll', function() {
    if (!isLocked && !cooldown && isSectionInFullView()) {
      lockSection();
    }
  }, { passive: true });

  window.addEventListener('wheel', function(e) {
    if (!isLocked || transitioning) return;

    // Skip the first wheel event after locking (it's the same scroll that triggered the lock)
    if (justLocked) {
      justLocked = false;
      return;
    }

    var direction = e.deltaY > 0 ? 'down' : 'up';

    // Scrolling down: go to next step, or exit if at last step
    if (direction === 'down') {
      if (currentStep < totalSteps - 1) {
        goToStep(currentStep + 1);
      } else {
        exitToNext();
      }
      return;
    }

    // Scrolling up: go to previous step, or exit section if at first step
    if (direction === 'up') {
      if (currentStep > 0) {
        goToStep(currentStep - 1);
        return;
      }

      // At first step, scrolling up — need multiple scrolls to exit
      if (direction === lastDirection) {
        scrollCount++;
      } else {
        scrollCount = 1;
        lastDirection = direction;
      }

      if (resetTimer) clearTimeout(resetTimer);
      resetTimer = setTimeout(function() {
        scrollCount = 0;
        lastDirection = null;
      }, 1000);

      if (scrollCount >= exitThreshold) {
        scrollCount = 0;
        lastDirection = null;
        exitToPrev();
      }
    }
  }, { passive: true });
})();
