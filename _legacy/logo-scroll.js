(function() {
  var track = document.querySelector('.chains-track');
  if (!track) return;

  // Count original logos (first half)
  var logos = track.querySelectorAll('.chain-logo');
  var half = logos.length / 2;

  // Calculate exact width of first set including gaps
  var firstSetWidth = 0;
  for (var i = 0; i < half; i++) {
    firstSetWidth += logos[i].offsetWidth;
  }
  // Add gaps (60px each, between logos)
  firstSetWidth += half * 60;

  // Set CSS custom property for exact scroll distance
  track.style.setProperty('--scroll-width', '-' + firstSetWidth + 'px');
})();
