(function() {
  var slides = [
    {
      bg: 'assets/hero-bg.jpg',
      chain: 'MegaETH',
      chainIcon: 'assets/megaeth-icon.svg',
      token: 'MUSD',
      tokenIcon: 'assets/musd-icon-outer.svg',
      tokenInner: 'assets/musd-icon-inner.svg',
      hasCompositeIcon: true
    },
    {
      bg: 'assets/Hero-bg_citrea.jpg',
      chain: 'Citrea Mainnet',
      chainIcon: 'assets/citrea-icon.png',
      token: 'USDC',
      tokenIcon: 'assets/usdc-icon.png',
      hasCompositeIcon: false
    },
    {
      bg: 'assets/Hero-bg_monad.jpg',
      chain: 'Monad',
      chainIcon: 'assets/monad-icon.png',
      token: 'USDC',
      tokenIcon: 'assets/usdc-icon.png',
      hasCompositeIcon: false
    },
    {
      bg: 'assets/Hero-bg_optimisim.jpg',
      chain: 'Optimism',
      chainIcon: 'assets/op-icon.png',
      token: 'USDC',
      tokenIcon: 'assets/usdc-icon.png',
      hasCompositeIcon: false
    },
    {
      bg: 'assets/Hero-bg_polygon.jpg',
      chain: 'Polygon',
      chainIcon: 'assets/polygon-icon.png',
      token: 'USDC',
      tokenIcon: 'assets/usdc-icon.png',
      hasCompositeIcon: false
    },
    {
      bg: 'assets/Hero-bg_arbitrum.jpg',
      chain: 'Arbitrum',
      chainIcon: 'assets/arb-icon.png',
      token: 'USDC',
      tokenIcon: 'assets/usdc-icon.png',
      hasCompositeIcon: false
    },
    {
      bg: 'assets/Hero-bg_avalanche.jpg',
      chain: 'Avalanche',
      chainIcon: 'assets/avax-icon.png',
      token: 'USDC',
      tokenIcon: 'assets/usdc-icon.png',
      hasCompositeIcon: false
    },
    {
      bg: 'assets/Hero-bg_ethereum.jpg',
      chain: 'Ethereum',
      chainIcon: 'assets/eth-icon.png',
      token: 'USDC',
      tokenIcon: 'assets/usdc-icon.png',
      hasCompositeIcon: false
    },
    {
      bg: 'assets/Hero-bg_hyperliquid.jpg',
      chain: 'Hyperliquid',
      chainIcon: 'assets/hyperliquid-icon.png',
      token: 'USDC',
      tokenIcon: 'assets/usdc-icon.png',
      hasCompositeIcon: false
    },
    {
      bg: 'assets/Hero-bg_base.jpg',
      chain: 'Base',
      chainIcon: 'assets/base-icon.png',
      token: 'USDC',
      tokenIcon: 'assets/usdc-icon.png',
      hasCompositeIcon: false
    },
    {
      bg: 'assets/Hero-bg_bnb.jpg',
      chain: 'BNB Chain',
      chainIcon: 'assets/bnb-icon.png',
      token: 'USDC',
      tokenIcon: 'assets/usdc-icon.png',
      hasCompositeIcon: false
    },
    {
      bg: 'assets/Hero-bg_kaia.jpg',
      chain: 'Kaia',
      chainIcon: 'assets/kaia-icon.png',
      token: 'USDC',
      tokenIcon: 'assets/usdc-icon.png',
      hasCompositeIcon: false
    },
    {
      bg: 'assets/Hero-bg_scroll.jpg',
      chain: 'Scroll',
      chainIcon: 'assets/scroll-icon.png',
      token: 'USDC',
      tokenIcon: 'assets/usdc-icon.png',
      hasCompositeIcon: false
    }
  ];

  var heroBg = document.querySelector('.hero-bg');
  var currentImg = document.querySelector('.hero-bg-img');
  var dots = document.querySelectorAll('.dot');
  var chainField = document.querySelectorAll('.bridge-field')[0];
  var tokenField = document.querySelectorAll('.bridge-field')[1];
  var currentSlide = 0;
  var transitioning = false;

  // Preload and cache images in memory
  var imageCache = [];
  slides.forEach(function(s) {
    var bg = new Image(); bg.src = s.bg; imageCache.push(bg);
    var icon = new Image(); icon.src = s.chainIcon; imageCache.push(icon);
    var token = new Image(); token.src = s.tokenIcon; imageCache.push(token);
  });

  function fadeSwap(el, newHTML) {
    // Fade out
    el.style.transition = 'opacity 0.15s ease-in-out, transform 0.15s ease-in-out';
    el.style.opacity = '0';
    el.style.transform = 'translateY(4px)';

    setTimeout(function() {
      el.innerHTML = newHTML;

      el.style.transition = 'none';
      el.style.transform = 'translateY(-4px)';

      requestAnimationFrame(function() {
        requestAnimationFrame(function() {
          // Fade in
          el.style.transition = 'opacity 0.15s ease-in-out, transform 0.15s ease-in-out';
          el.style.opacity = '1';
          el.style.transform = 'translateY(0)';
        });
      });
    }, 150);
  }

  function updateCard(slide) {
    // Update chain field with fade
    var chainLeft = chainField.querySelector('.field-left');
    fadeSwap(chainLeft,
      '<img src="' + slide.chainIcon + '" alt="' + slide.chain + '" class="token-icon" style="border-radius:50%">' +
      '<span class="field-text">' + slide.chain + '</span>'
    );

    // Update token field with fade
    var tokenLeft = tokenField.querySelector('.field-left');
    if (slide.hasCompositeIcon) {
      fadeSwap(tokenLeft,
        '<div class="musd-icon">' +
          '<img src="' + slide.tokenIcon + '" alt="" class="musd-outer">' +
          '<img src="' + slide.tokenInner + '" alt="" class="musd-inner">' +
        '</div>' +
        '<span class="field-text">' + slide.token + '</span>'
      );
    } else {
      fadeSwap(tokenLeft,
        '<img src="' + slide.tokenIcon + '" alt="' + slide.token + '" class="token-icon" style="border-radius:50%">' +
        '<span class="field-text">' + slide.token + '</span>'
      );
    }
  }

  // Pre-create all background images and keep them in DOM (hidden)
  var bgImages = [];
  var pixelOverlay = document.getElementById('pixel-overlay');
  slides.forEach(function(s, i) {
    var img = document.createElement('img');
    img.src = s.bg;
    img.alt = '';
    img.className = 'hero-bg-img';
    img.style.opacity = i === 0 ? '1' : '0';
    img.style.position = i === 0 ? '' : 'absolute';
    img.style.inset = '0';
    img.style.transition = 'opacity 0.8s ease-in-out';
    if (i > 0) {
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
    }
    heroBg.insertBefore(img, pixelOverlay);
    bgImages.push(img);
  });
  // Remove the original static image from HTML
  if (currentImg && currentImg !== bgImages[0]) {
    currentImg.remove();
  }

  function goToSlide(index) {
    if (index === currentSlide || transitioning) return;
    transitioning = true;
    currentSlide = index;
    var slide = slides[index];

    // Crossfade: show new, hide old
    for (var i = 0; i < bgImages.length; i++) {
      bgImages[i].style.opacity = i === index ? '1' : '0';
    }

    setTimeout(function() {
      transitioning = false;
    }, 800);

    // Update card content
    updateCard(slide);

    // Update dots
    dots.forEach(function(dot) {
      dot.classList.remove('dot-active');
    });
    dots[index].classList.add('dot-active');
  }

  var autoTimer = null;

  function nextSlide() {
    var next = (currentSlide + 1) % slides.length;
    goToSlide(next);
  }

  function startTimer() {
    if (!autoTimer) {
      autoTimer = setInterval(nextSlide, 3000);
    }
  }

  function stopTimer() {
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
    }
  }

  function resetTimer() {
    stopTimer();
    startTimer();
  }

  // Watch hero visibility
  var hero = document.querySelector('.hero');
  var wasVisible = true;
  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        if (!wasVisible) {
          // Reset transitioning flag in case it was stuck
          transitioning = false;
        }
        startTimer();
        wasVisible = true;
      } else {
        stopTimer();
        wasVisible = false;
      }
    });
  }, { threshold: 0.1 });

  observer.observe(hero);

  // Click handlers — reset timer on manual click
  dots.forEach(function(dot) {
    dot.addEventListener('click', function() {
      goToSlide(parseInt(dot.dataset.slide));
      resetTimer();
    });
    dot.style.cursor = 'pointer';
  });
})();
