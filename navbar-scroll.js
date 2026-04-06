(function() {
  var navbar = document.querySelector('.navbar');
  var stepsScroll = document.querySelector('.steps-scroll');
  var scrollTimer = null;

  function hideNavbar() {
    navbar.classList.add('navbar--hidden');
    if (scrollTimer) clearTimeout(scrollTimer);
    scrollTimer = setTimeout(function() {
      navbar.classList.remove('navbar--hidden');
    }, 150);
  }

  function checkBlur() {
    if (window.scrollY > 10) {
      navbar.classList.add('navbar--scrolled');
    } else {
      navbar.classList.remove('navbar--scrolled');
    }
  }

  function onScroll() {
    checkBlur();
    hideNavbar();
  }

  window.addEventListener('scroll', function() {
    requestAnimationFrame(onScroll);
  }, { passive: true });

  // Also listen on the steps scroll container
  if (stepsScroll) {
    stepsScroll.addEventListener('scroll', function() {
      requestAnimationFrame(hideNavbar);
    }, { passive: true });
  }

  checkBlur();
})();
