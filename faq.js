(function() {
  var items = document.querySelectorAll('.faq-item');

  items.forEach(function(item) {
    var btn = item.querySelector('.faq-question');
    btn.addEventListener('click', function() {
      var isOpen = item.classList.contains('faq-item--open');

      // Close all
      items.forEach(function(i) {
        i.classList.remove('faq-item--open');
      });

      // Toggle clicked
      if (!isOpen) {
        item.classList.add('faq-item--open');
      }
    });
  });
})();
