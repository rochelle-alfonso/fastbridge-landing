(function() {
  var slides = [
    {
      bg: 'assets/hero-bg.png',
      chain: 'MegaETH',
      chainIcon: 'assets/megaeth-icon.svg',
      token: 'MUSD',
      tokenIcon: 'assets/musd-icon-outer.svg',
      tokenInner: 'assets/musd-icon-inner.svg',
      hasCompositeIcon: true
    },
    {
      bg: 'assets/Hero-bg_citrea.png',
      chain: 'Citrea Mainnet',
      chainIcon: 'assets/citrea-icon.png',
      token: 'USDC',
      tokenIcon: 'assets/usdc-icon.png',
      hasCompositeIcon: false
    },
    {
      bg: 'assets/Hero-bg_monad.png',
      chain: 'Monad',
      chainIcon: 'assets/monad-icon.png',
      token: 'USDC',
      tokenIcon: 'assets/usdc-icon.png',
      hasCompositeIcon: false
    },
    {
      bg: 'assets/Hero-bg_optimisim.png',
      chain: 'Optimism',
      chainIcon: 'assets/op-icon.png',
      token: 'USDC',
      tokenIcon: 'assets/usdc-icon.png',
      hasCompositeIcon: false
    },
    {
      bg: 'assets/Hero-bg_polygon.png',
      chain: 'Polygon',
      chainIcon: 'assets/polygon-icon.png',
      token: 'USDC',
      tokenIcon: 'assets/usdc-icon.png',
      hasCompositeIcon: false
    },
    {
      bg: 'assets/Hero-bg_arbitrum.png',
      chain: 'Arbitrum',
      chainIcon: 'assets/arb-icon.png',
      token: 'USDC',
      tokenIcon: 'assets/usdc-icon.png',
      hasCompositeIcon: false
    },
    {
      bg: 'assets/Hero-bg_avalanche.png',
      chain: 'Avalanche',
      chainIcon: 'assets/avax-icon.png',
      token: 'USDC',
      tokenIcon: 'assets/usdc-icon.png',
      hasCompositeIcon: false
    },
    {
      bg: 'assets/Hero-bg_ethereum.png',
      chain: 'Ethereum',
      chainIcon: 'assets/eth-icon.png',
      token: 'USDC',
      tokenIcon: 'assets/usdc-icon.png',
      hasCompositeIcon: false
    },
    {
      bg: 'assets/Hero-bg_hyperliquid.png',
      chain: 'Hyperliquid',
      chainIcon: 'assets/hyperliquid-icon.png',
      token: 'USDC',
      tokenIcon: 'assets/usdc-icon.png',
      hasCompositeIcon: false
    },
    {
      bg: 'assets/Hero-bg_base.png',
      chain: 'Base',
      chainIcon: 'assets/base-icon.png',
      token: 'USDC',
      tokenIcon: 'assets/usdc-icon.png',
      hasCompositeIcon: false
    },
    {
      bg: 'assets/Hero-bg_bnb.png',
      chain: 'BNB Chain',
      chainIcon: 'assets/bnb-icon.png',
      token: 'USDC',
      tokenIcon: 'assets/usdc-icon.png',
      hasCompositeIcon: false
    },
    {
      bg: 'assets/Hero-bg_kaia.png',
      chain: 'Kaia',
      chainIcon: 'assets/kaia-icon.png',
      token: 'USDC',
      tokenIcon: 'assets/usdc-icon.png',
      hasCompositeIcon: false
    },
    {
      bg: 'assets/Hero-bg_scroll.png',
      chain: 'Scroll',
      chainIcon: 'assets/scroll-icon.png',
      token: 'USDC',
      tokenIcon: 'assets/usdc-icon.png',
      hasCompositeIcon: false
    },
    {
      bg: 'assets/Hero-bg_sophon.png',
      chain: 'Sophon',
      chainIcon: 'assets/sophon-icon.png',
      token: 'USDC',
      tokenIcon: 'assets/usdc-icon.png',
      hasCompositeIcon: false
    },
    {
      bg: 'assets/Hero-bg_tron.png',
      chain: 'Tron',
      chainIcon: 'assets/tron-icon.png',
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

  // Preload images
  slides.forEach(function(s) {
    new Image().src = s.bg;
    new Image().src = s.chainIcon;
    new Image().src = s.tokenIcon;
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

  function goToSlide(index) {
    if (index === currentSlide || transitioning) return;
    transitioning = true;
    currentSlide = index;
    var slide = slides[index];

    // Crossfade background
    var newImg = document.createElement('img');
    newImg.src = slide.bg;
    newImg.alt = '';
    newImg.className = 'hero-bg-img hero-bg-img--next';
    heroBg.insertBefore(newImg, document.getElementById('pixel-overlay'));
    newImg.offsetHeight;
    newImg.classList.add('hero-bg-img--visible');

    setTimeout(function() {
      currentImg.remove();
      newImg.classList.remove('hero-bg-img--next', 'hero-bg-img--visible');
      currentImg = newImg;
      transitioning = false;
    }, 1200);

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
