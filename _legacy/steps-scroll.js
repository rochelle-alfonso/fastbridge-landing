(function() {
  var howItWorks = document.querySelector('.how-it-works');
  var stepCards = document.querySelectorAll('.step-card');
  if (!howItWorks || !stepCards.length) return;

  var isMobile = window.innerWidth <= 1024;

  var title = howItWorks.querySelector('.how-it-works-title');

  // Toggle scroll-snap on html and sticky title when how-it-works is in viewport (desktop only)
  if (!isMobile) {
    var sectionObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          document.documentElement.classList.add('snap-active');
          if (title) title.classList.add('sticky-active');
        } else {
          document.documentElement.classList.remove('snap-active');
          if (title) title.classList.remove('sticky-active');
        }
      });
    }, { threshold: 0.1 });

    sectionObserver.observe(howItWorks);
  }

  // Fade in steps + play/pause videos as they scroll into view
  var videoObserver = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      var card = entry.target;
      var video = card.querySelector('.step-video');

      if (entry.isIntersecting) {
        card.classList.add('visible');
        if (video) {
          video.currentTime = 0;
          video.play().catch(function() {});
        }
      } else {
        if (video) video.pause();
      }
    });
  }, { threshold: 0.2 });

  for (var i = 0; i < stepCards.length; i++) {
    videoObserver.observe(stepCards[i]);
  }
})();
