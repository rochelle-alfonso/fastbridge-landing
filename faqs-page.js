(function() {
  var navWrapper = document.querySelector('.faqs-nav-wrapper');
  var navItems = document.querySelectorAll('.faqs-nav-item');
  var categories = document.querySelectorAll('.faqs-category[data-category]');

  // ========== Scroll-spy: highlight active nav item ==========
  if (navItems.length && categories.length) {
    var spyObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          var id = entry.target.getAttribute('data-category');
          navItems.forEach(function(item) {
            item.classList.toggle('faqs-nav-item--active', item.getAttribute('data-category') === id);
          });
        }
      });
    }, { rootMargin: '-20% 0px -60% 0px' });

    categories.forEach(function(cat) { spyObserver.observe(cat); });
  }

  // ========== Smooth scroll on nav click ==========
  navItems.forEach(function(item) {
    item.addEventListener('click', function(e) {
      e.preventDefault();
      var target = document.querySelector(item.getAttribute('href'));
      if (target) {
        var navHeight = navWrapper ? navWrapper.offsetHeight : 0;
        var top = target.getBoundingClientRect().top + window.pageYOffset - navHeight - 24;
        window.scrollTo({ top: top, behavior: 'smooth' });
      }
    });
  });

  // ========== Section reveal on scroll ==========
  var revealObserver = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px 40px 0px' });

  categories.forEach(function(cat) { revealObserver.observe(cat); });
})();
