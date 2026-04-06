(function() {
  var stepsScroll = document.querySelector('.steps-scroll');
  if (!stepsScroll) return;

  var scrollCount = 0;
  var lastDirection = null;
  var resetTimer = null;
  var threshold = 2;

  stepsScroll.addEventListener('wheel', function(e) {
    var atTop = stepsScroll.scrollTop <= 0;
    var atBottom = stepsScroll.scrollTop + stepsScroll.clientHeight >= stepsScroll.scrollHeight - 5;
    var direction = e.deltaY > 0 ? 'down' : 'up';

    // If at the top and scrolling up, or at bottom and scrolling down
    if ((atTop && direction === 'up') || (atBottom && direction === 'down')) {
      if (direction === lastDirection) {
        scrollCount++;
      } else {
        scrollCount = 1;
        lastDirection = direction;
      }

      // Reset count after inactivity
      if (resetTimer) clearTimeout(resetTimer);
      resetTimer = setTimeout(function() {
        scrollCount = 0;
        lastDirection = null;
      }, 1000);

      if (scrollCount >= threshold) {
        scrollCount = 0;
        lastDirection = null;

        // Find the next/previous section
        var howItWorks = stepsScroll.closest('.how-it-works');
        if (direction === 'down') {
          var nextSection = howItWorks.nextElementSibling;
          if (nextSection) {
            nextSection.scrollIntoView({ behavior: 'smooth' });
          }
        } else {
          var prevSection = howItWorks.previousElementSibling;
          if (prevSection) {
            prevSection.scrollIntoView({ behavior: 'smooth' });
          } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }
      }
    } else {
      scrollCount = 0;
      lastDirection = null;
    }
  }, { passive: true });
})();
