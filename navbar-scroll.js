(function() {
  var navbar = document.querySelector('.navbar');
  var howItWorks = document.querySelector('.how-it-works');
  var lastScrollY = window.pageYOffset;
  var hoverZone = 60; // pixels from top to trigger navbar on hover
  var hideTimer = null;

  function isInHowItWorks() {
    if (!howItWorks) return false;
    var rect = howItWorks.getBoundingClientRect();
    return rect.top <= 0 && rect.bottom >= 0;
  }

  function checkBlur() {
    if (window.scrollY > 10) {
      navbar.classList.add('navbar--scrolled');
    } else {
      navbar.classList.remove('navbar--scrolled');
    }

    if (isInHowItWorks()) {
      navbar.classList.add('navbar--dark');
    } else {
      navbar.classList.remove('navbar--dark');
    }
  }

  window.addEventListener('scroll', function() {
    var currentScrollY = window.pageYOffset;

    checkBlur();

    // Always show at the very top
    if (currentScrollY <= 10) {
      navbar.classList.remove('navbar--hidden');
      lastScrollY = currentScrollY;
      return;
    }

    // Hide in how-it-works section
    if (isInHowItWorks()) {
      navbar.classList.add('navbar--hidden');
      lastScrollY = currentScrollY;
      return;
    }

    // Scrolling up — show navbar, then auto-hide after 2s of no scrolling
    if (currentScrollY < lastScrollY) {
      navbar.classList.remove('navbar--hidden');
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(function() {
        if (window.pageYOffset > 10) {
          navbar.classList.add('navbar--hidden');
        }
      }, 2000);
    }
    // Scrolling down — hide navbar
    else if (currentScrollY > lastScrollY) {
      navbar.classList.add('navbar--hidden');
      if (hideTimer) clearTimeout(hideTimer);
    }

    lastScrollY = currentScrollY;
  }, { passive: true });

  // Show navbar when cursor is near the top of the viewport (not in how-it-works)
  document.addEventListener('mousemove', function(e) {
    if (e.clientY <= hoverZone && !isInHowItWorks()) {
      navbar.classList.remove('navbar--hidden');
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(function() {
        if (window.pageYOffset > 10) {
          navbar.classList.add('navbar--hidden');
        }
      }, 2000);
    }
  }, { passive: true });

  checkBlur();
})();
