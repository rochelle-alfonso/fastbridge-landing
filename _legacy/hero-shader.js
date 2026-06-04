/**
 * ShaderGradient-style hero background (frosted-canvas + Three.js).
 * Figma 1:143 — neutral cream/white, subtle motion (not peach).
 */
(function () {
  var mount = document.getElementById('hero-shader');
  if (!mount) return;

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var frost = null;
  var activeSpeed = 0.09;

  /* Figma screen 1:143 — #FFFFF9, #F8F8F7, low saturation */
  var FIGMA_COLORS = {
    paletteA: [1.0, 1.0, 0.996],
    paletteB: [0.1, 0.1, 0.09],
    paletteC: [0.52, 0.52, 0.5],
    paletteD: [0.0, 0.01, 0.02],
  };

  var FIGMA_CONFIG = {
    animationSpeed: activeSpeed,
    noiseScale: 0.35,
    noiseStrength: 0.12,
    grainIntensity: 0.012,
    vignetteStrength: 0.55,
    domainWarpStrength: 0.06,
    turbulence: 0.08,
    flowSpeed: 0.1,
    colorSpread: 0.95,
  };

  function setAnimSpeed(speed) {
    if (!frost) return;
    try {
      frost.setConfig({ animationSpeed: speed });
    } catch (e) { /* noop */ }
  }

  function notifyReady() {
    window.dispatchEvent(new Event('hero-shader-ready'));
  }

  window.heroShaderController = {
    show: function () {
      mount.style.opacity = '1';
      setAnimSpeed(activeSpeed);
    },
    hide: function () {
      mount.style.opacity = '0';
      setAnimSpeed(0);
    },
    destroy: function () {
      if (frost) {
        frost.destroy();
        frost = null;
      }
    },
  };

  document.addEventListener('visibilitychange', function () {
    if (!frost) return;
    setAnimSpeed(document.hidden ? 0 : activeSpeed);
  });

  async function init() {
    if (prefersReduced) {
      mount.classList.add('hero-shader--disabled');
      return;
    }

    try {
      var FrostedCanvas = (await import(
        'https://unpkg.com/frosted-canvas@2.0.0/dist/frosted-canvas.es.js'
      )).default;

      /* Preset 1 = Paper Koi — neutral pastels, then Figma-tuned colors */
      frost = new FrostedCanvas(mount, { preset: 1, autoResize: true });
      frost.setColors(FIGMA_COLORS);
      frost.setConfig(FIGMA_CONFIG);
      mount.classList.add('hero-shader--ready');
    } catch (err) {
      console.warn('[hero-shader] WebGL init failed, using CSS fallback only.', err);
      mount.classList.add('hero-shader--failed');
    }
  }

  init().then(notifyReady).catch(notifyReady);
})();
