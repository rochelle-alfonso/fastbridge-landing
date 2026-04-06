(function() {
  var textItems = document.querySelectorAll('.step-text-item');
  var images = document.querySelectorAll('.steps-right .step-image');
  if (!textItems.length || !images.length) return;

  var currentStep = 0;

  function updateStep(index) {
    if (index === currentStep) return;
    currentStep = index;
    textItems.forEach(function(item) {
      item.classList.remove('active');
    });
    textItems[index].classList.add('active');
  }

  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        var step = parseInt(entry.target.dataset.step);
        updateStep(step);
      }
    });
  }, {
    root: null,
    threshold: 0.5
  });

  images.forEach(function(img) {
    observer.observe(img);
  });
})();
