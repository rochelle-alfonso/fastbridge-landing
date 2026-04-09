(function() {
  var blogGrid = document.querySelector('.blog-grid');
  var blogCards = document.querySelectorAll('.blog-card');
  var dotsContainer = document.querySelector('.blog-dots');
  var currentBlog = 0;
  var totalBlogs = blogCards.length;

  // Create dots
  for (var i = 0; i < totalBlogs; i++) {
    var dot = document.createElement('div');
    dot.className = 'blog-dot' + (i === 0 ? ' blog-dot--active' : '');
    dot.dataset.index = i;
    dot.addEventListener('click', function() {
      goToBlog(parseInt(this.dataset.index));
    });
    dotsContainer.appendChild(dot);
  }

  function goToBlog(index) {
    currentBlog = index;
    for (var j = 0; j < totalBlogs; j++) {
      blogCards[j].style.transform = 'translateX(-' + (index * 100) + '%)';
    }
    var dots = dotsContainer.querySelectorAll('.blog-dot');
    for (var d = 0; d < dots.length; d++) {
      dots[d].classList.remove('blog-dot--active');
    }
    dots[index].classList.add('blog-dot--active');
  }

  // Touch swipe support
  var startX = 0;
  var diffX = 0;

  blogGrid.addEventListener('touchstart', function(e) {
    startX = e.touches[0].clientX;
  }, { passive: true });

  blogGrid.addEventListener('touchmove', function(e) {
    diffX = e.touches[0].clientX - startX;
  }, { passive: true });

  blogGrid.addEventListener('touchend', function() {
    if (Math.abs(diffX) > 50) {
      if (diffX < 0 && currentBlog < totalBlogs - 1) {
        goToBlog(currentBlog + 1);
      } else if (diffX > 0 && currentBlog > 0) {
        goToBlog(currentBlog - 1);
      }
    }
    diffX = 0;
  });
})();
