/**
 * Hero ribbon gradient — shader (ShaderGradient-style) + mesh + procedural
 */
(function () {
  var canvas = document.getElementById('gradient-canvas');
  var glCanvas = document.getElementById('gradient-canvas-gl');
  var previewFrame = document.querySelector('.preview-frame');
  var ctx = null;
  var stopsEl = document.getElementById('stops');
  var jsonOut = document.getElementById('json-out');
  var shaderRenderer = null;

  function get2d() {
    if (!ctx) ctx = canvas.getContext('2d', { alpha: false });
    return ctx;
  }

  var MESH_PATH = '../../assets/figma-hero/hero-gradient-layer-light.png';
  var REFERENCE_PATH = '../../assets/figma-hero/hero-gradient-layer.png';

  var PRESETS = {
    darkHero: {
      renderEngine: 'mesh',
      mode: 'dark',
      bgTop: '#0a0a12',
      bgBottom: '#020308',
      bgGlow: '#141c32',
      lightBg: '#f4f5f7',
      meshThreshold: 0.1,
      meshSoftness: 0.14,
      tintStrength: 0.35,
      meshIntensity: 1,
      horizon: 0.5,
      reflect: true,
      reflectOpacity: 0.78,
      reflectBlur: 14,
      glowSpread: 0.34,
      leftBloom: 1.2,
      rightTaper: 0.38,
      wedgePower: 1.05,
      coreIntensity: 1,
      coreWidth: 1.5,
      grain: 0.034,
      arcs: true,
      arcOpacity: 0.26,
      vignette: 0.4,
      stops: [
        { pos: 0.0, color: '#ff2a8a' },
        { pos: 0.08, color: '#ff5a28' },
        { pos: 0.18, color: '#ffbb44' },
        { pos: 0.28, color: '#ffd080' },
        { pos: 0.38, color: '#c878ff' },
        { pos: 0.46, color: '#5ec8ff' },
        { pos: 0.52, color: '#f8feff' },
        { pos: 0.58, color: '#7ee8ff' },
        { pos: 0.7, color: '#2a72e8' },
        { pos: 0.86, color: '#1a4088' },
        { pos: 1.0, color: '#081428' },
      ],
    },
    shaderHero: {
      renderEngine: 'shader',
      mode: 'dark',
      animate: true,
      color1: '#ff2a8a',
      color2: '#ff9a3d',
      color3: '#5ec8ff',
      bgTop: '#0a0a12',
      bgBottom: '#020308',
      bgGlow: '#141c32',
      lightBg: '#f4f5f7',
      frequency: 5.5,
      speed: 0.4,
      strength: 4,
      density: 1.3,
      amplitude: 1,
      brightness: 1.2,
      rotationZ: 50,
      grain: 0.045,
      meshThreshold: 0.1,
      meshSoftness: 0.14,
      horizon: 0.5,
      stops: [
        { pos: 0.0, color: '#ff2a8a' },
        { pos: 0.18, color: '#ff9a3d' },
        { pos: 0.52, color: '#f8feff' },
        { pos: 0.72, color: '#2a72e8' },
        { pos: 1.0, color: '#081428' },
      ],
    },
    lightSwap: {
      renderEngine: 'mesh',
      mode: 'light',
      bgTop: '#0a0a12',
      bgBottom: '#020308',
      bgGlow: '#12182a',
      lightBg: '#f4f5f7',
      meshThreshold: 0.08,
      meshSoftness: 0.12,
      tintStrength: 0.55,
      meshIntensity: 0.65,
      horizon: 0.42,
      reflect: false,
      reflectOpacity: 0.5,
      reflectBlur: 10,
      glowSpread: 0.2,
      leftBloom: 0.9,
      rightTaper: 0.55,
      wedgePower: 1,
      coreIntensity: 0.72,
      coreWidth: 1,
      grain: 0.012,
      arcs: false,
      arcOpacity: 0.1,
      vignette: 0.08,
      stops: [
        { pos: 0.08, color: '#ff8ec4' },
        { pos: 0.16, color: '#ffb380' },
        { pos: 0.28, color: '#9ed4ff' },
        { pos: 0.55, color: '#6eb0ff' },
        { pos: 0.85, color: '#c8e4ff' },
      ],
    },
  };

  var state = clone(PRESETS.shaderHero);
  state.width = 1440;
  state.height = 924;
  state.previewScale = 0.55;
  state.showReference = false;

  var meshImage = null;
  var refImage = null;
  var meshReady = false;

  function clone(o) {
    return JSON.parse(JSON.stringify(o));
  }

  function hexToRgb(hex) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    };
  }

  function luma(rgb) {
    return (rgb.r * 0.299 + rgb.g * 0.587 + rgb.b * 0.114) / 255;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function colorAtStops(stops, t) {
    t = Math.max(0, Math.min(1, t));
    for (var i = 0; i < stops.length - 1; i++) {
      var a = stops[i];
      var b = stops[i + 1];
      if (t >= a.pos && t <= b.pos) {
        var u = (t - a.pos) / (b.pos - a.pos || 1);
        var ca = hexToRgb(a.color);
        var cb = hexToRgb(b.color);
        return {
          r: ca.r + (cb.r - ca.r) * u,
          g: ca.g + (cb.g - ca.g) * u,
          b: ca.b + (cb.b - ca.b) * u,
        };
      }
    }
    return hexToRgb(stops[stops.length - 1].color);
  }

  function screenBlend(bg, fg, alpha) {
    function ch(b, f) {
      var bi = b / 255;
      var fi = (f / 255) * alpha;
      return (1 - (1 - bi) * (1 - fi)) * 255;
    }
    return {
      r: ch(bg.r, fg.r) | 0,
      g: ch(bg.g, fg.g) | 0,
      b: ch(bg.b, fg.b) | 0,
    };
  }

  function sampleBackground(nx, ny) {
    if (state.mode === 'light') return hexToRgb(state.lightBg);
    var top = hexToRgb(state.bgTop);
    var bot = hexToRgb(state.bgBottom);
    var glow = hexToRgb(state.bgGlow || '#141c32');
    var t = Math.max(0, Math.min(1, ny * 0.95 + 0.02));
    var base = {
      r: lerp(top.r, bot.r, t),
      g: lerp(top.g, bot.g, t),
      b: lerp(top.b, bot.b, t),
    };
    var gx = nx - 0.22;
    var gy = ny - 0.48;
    var gd = Math.sqrt(gx * gx + gy * gy);
    var g = Math.max(0, 1 - gd / 0.58) * 0.38;
    return {
      r: lerp(base.r, glow.r, g),
      g: lerp(base.g, glow.g, g),
      b: lerp(base.b, glow.b, g),
    };
  }

  function recolorPixel(src, tint, amount) {
    var sl = Math.max(luma(src), 0.02);
    var tl = Math.max(luma(tint), 0.02);
    var scale = sl / tl;
    var r = tint.r * scale;
    var g = tint.g * scale;
    var b = tint.b * scale;
    return {
      r: lerp(src.r, Math.min(255, r), amount),
      g: lerp(src.g, Math.min(255, g), amount),
      b: lerp(src.b, Math.min(255, b), amount),
    };
  }

  function smoothstep(edge0, edge1, x) {
    var t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0 || 1)));
    return t * t * (3 - 2 * t);
  }

  /* ——— Mesh: exact shape from hero-gradient-layer.png ——— */
  function drawMesh(w, h) {
    if (!meshReady || !meshImage) {
      drawBackground(w, h);
      get2d().fillStyle = '#333';
      get2d().font = '16px sans-serif';
      get2d().fillText('Loading mesh image…', 40, 60);
      return;
    }

    var off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    var octx = off.getContext('2d');
    octx.drawImage(meshImage, 0, 0, w, h);
    var src = octx.getImageData(0, 0, w, h).data;
    var out = get2d().createImageData(w, h);
    var d = out.data;

    var th = state.meshThreshold;
    var soft = state.meshSoftness;
    var tintAmt = state.tintStrength;
    var inten = state.meshIntensity;
    var isLight = state.mode === 'light';

    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var i = (y * w + x) * 4;
        var nx = x / w;
        var ny = y / h;
        var bg = sampleBackground(nx, ny);
        var sr = src[i];
        var sg = src[i + 1];
        var sb = src[i + 2];
        var srcRgb = { r: sr, g: sg, b: sb };
        var L = luma(srcRgb);

        var mask = smoothstep(th, th + soft, L) * inten;
        var tint = colorAtStops(state.stops, nx);

        var pixel;
        if (mask < 0.004) {
          pixel = bg;
        } else if (isLight) {
          var rec = recolorPixel(srcRgb, tint, tintAmt);
          pixel = {
            r: lerp(bg.r, rec.r, mask * 0.7),
            g: lerp(bg.g, rec.g, mask * 0.7),
            b: lerp(bg.b, rec.b, mask * 0.7),
          };
        } else {
          var fromSrc = screenBlend(bg, srcRgb, mask);
          var recolored = recolorPixel(srcRgb, tint, tintAmt);
          var fromTint = screenBlend(bg, recolored, mask);
          pixel = {
            r: lerp(fromSrc.r, fromTint.r, tintAmt),
            g: lerp(fromSrc.g, fromTint.g, tintAmt),
            b: lerp(fromSrc.b, fromTint.b, tintAmt),
          };
        }

        d[i] = pixel.r;
        d[i + 1] = pixel.g;
        d[i + 2] = pixel.b;
        d[i + 3] = 255;
      }
    }
    get2d().putImageData(out, 0, 0);
    drawGrain(w, h);
  }

  /* ——— Procedural fallback ——— */
  function drawBackground(w, h) {
    var c = get2d();
    if (state.mode === 'light') {
      c.fillStyle = state.lightBg;
      c.fillRect(0, 0, w, h);
      return;
    }
    var g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, state.bgTop);
    g.addColorStop(0.45, state.bgBottom);
    g.addColorStop(1, '#000000');
    get2d().fillStyle = g;
    get2d().fillRect(0, 0, w, h);
    var rad = get2d().createRadialGradient(w * 0.22, h * 0.48, 0, w * 0.22, h * 0.48, w * 0.75);
    rad.addColorStop(0, state.bgGlow || '#141c30');
    rad.addColorStop(0.55, 'rgba(10,12,20,0.4)');
    rad.addColorStop(1, 'rgba(0,0,0,0)');
    get2d().fillStyle = rad;
    get2d().fillRect(0, 0, w, h);
  }

  function wedgeHeight(nx) {
    var p = state.wedgePower || 1;
    return state.glowSpread * Math.pow(1 - nx, p);
  }

  function sigmaAt(nx) {
    var left = state.glowSpread * state.leftBloom;
    var right = state.glowSpread * state.rightTaper;
    return right + (left - right) * Math.pow(1 - nx, 1.65);
  }

  function drawRibbonField(w, h, opts) {
    opts = opts || {};
    var hy = h * state.horizon;
    var strength = opts.strength == null ? 1 : opts.strength;
    var img = get2d().createImageData(w, h);
    var d = img.data;
    var bgData = get2d().getImageData(0, 0, w, h).data;
    var isLight = state.mode === 'light';

    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var i = (y * w + x) * 4;
        var nx = x / w;
        var ny = y / h;
        var dy = Math.abs(y - hy) / h;
        var maxH = wedgeHeight(nx);
        if (dy > maxH) {
          d[i] = bgData[i];
          d[i + 1] = bgData[i + 1];
          d[i + 2] = bgData[i + 2];
          d[i + 3] = 255;
          continue;
        }
        var wedge = Math.pow(1 - dy / maxH, 0.55);
        var sig = sigmaAt(nx);
        var vert = Math.exp(-(dy * dy) / (2 * sig * sig)) * wedge;
        var edgeTaper = Math.min(1, nx * 8) * Math.min(1, (1 - nx) * 5 + 0.12);
        vert *= edgeTaper;
        var col = colorAtStops(state.stops, nx);
        var intensity = vert * strength * state.coreIntensity;
        if (isLight) intensity *= 0.48;
        var bg = { r: bgData[i], g: bgData[i + 1], b: bgData[i + 2] };
        var out = isLight
          ? {
              r: bg.r + (col.r - bg.r) * intensity,
              g: bg.g + (col.g - bg.g) * intensity,
              b: bg.b + (col.b - bg.b) * intensity,
            }
          : screenBlend(bg, col, intensity);
        d[i] = out.r;
        d[i + 1] = out.g;
        d[i + 2] = out.b;
        d[i + 3] = 255;
      }
    }
    get2d().putImageData(img, 0, 0);
  }

  function drawLeftBloom(w, h) {
    if (state.mode === 'light') return;
    var hy = h * state.horizon;
    get2d().save();
    get2d().globalCompositeOperation = 'screen';
    get2d().filter = 'blur(' + Math.round(h * 0.048) + 'px)';
    [
      { x: w * 0.08, color: '#ff3d9a', rx: w * 0.32, ry: h * state.glowSpread * 1.15 },
      { x: w * 0.2, color: '#ff8a30', rx: w * 0.18, ry: h * state.glowSpread * 0.75 },
      { x: w * 0.28, color: '#ffcc55', rx: w * 0.1, ry: h * state.glowSpread * 0.35 },
    ].forEach(function (b) {
      var c = hexToRgb(b.color);
      var g = get2d().createRadialGradient(b.x, hy, 0, b.x, hy, Math.max(b.rx, b.ry));
      g.addColorStop(0, 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',0.9)');
      g.addColorStop(0.4, 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',0.25)');
      g.addColorStop(1, 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',0)');
      get2d().fillStyle = g;
      get2d().beginPath();
      get2d().ellipse(b.x, hy, b.rx, b.ry, 0, 0, Math.PI * 2);
      get2d().fill();
    });
    get2d().filter = 'none';
    get2d().restore();
  }

  function drawCoreLine(w, h) {
    var hy = h * state.horizon;
    var isLight = state.mode === 'light';
    get2d().save();
    get2d().globalCompositeOperation = isLight ? 'source-over' : 'screen';
    var line = get2d().createLinearGradient(0, 0, w, 0);
    state.stops.forEach(function (s) {
      line.addColorStop(s.pos, s.color);
    });
    var whiteBoost = get2d().createLinearGradient(0, 0, w, 0);
    whiteBoost.addColorStop(0, 'rgba(255,255,255,0)');
    whiteBoost.addColorStop(0.28, 'rgba(255,200,120,0.5)');
    whiteBoost.addColorStop(0.52, 'rgba(255,255,255,1)');
    whiteBoost.addColorStop(0.62, 'rgba(180,245,255,0.95)');
    whiteBoost.addColorStop(1, 'rgba(60,140,255,0.2)');
    var hh = state.coreWidth * (isLight ? 1 : 1.8);
    get2d().globalAlpha = 0.88 * state.coreIntensity;
    get2d().fillStyle = line;
    get2d().fillRect(0, hy - hh, w, hh * 2);
    if (!isLight) {
      get2d().globalAlpha = 0.98 * state.coreIntensity;
      get2d().fillStyle = whiteBoost;
      get2d().fillRect(0, hy - 1.2, w, 2.4);
    }
    get2d().restore();
  }

  function drawReflection(w, h) {
    if (!state.reflect || state.mode === 'light') return;
    var hy = h * state.horizon;
    get2d().save();
    get2d().globalCompositeOperation = 'screen';
    get2d().globalAlpha = state.reflectOpacity;
    get2d().filter = 'blur(' + state.reflectBlur + 'px)';
    get2d().translate(0, hy * 2);
    get2d().scale(1, -1);
    drawRibbonField(w, h, { strength: 0.7 });
    get2d().filter = 'blur(' + (state.reflectBlur + 5) + 'px)';
    drawLeftBloom(w, h);
    drawCoreLine(w, h);
    get2d().filter = 'none';
    get2d().restore();
  }

  function drawArcs(w, h) {
    if (!state.arcs) return;
    var hy = h * state.horizon;
    get2d().save();
    get2d().strokeStyle = 'rgba(140, 210, 255, ' + state.arcOpacity + ')';
    get2d().lineWidth = 1.3;
    get2d().lineCap = 'round';
    get2d().globalCompositeOperation = state.mode === 'light' ? 'source-over' : 'screen';
    [
      [w * 0.45, hy - h * 0.02, w * 0.76, hy - h * 0.15, w * 1.02, hy - h * 0.02],
      [w * 0.5, hy - h * 0.05, w * 0.86, hy - h * 0.2, w * 1.05, hy - h * 0.07],
      [w * 0.48, hy + h * 0.02, w * 0.78, hy + h * 0.15, w * 1.0, hy + h * 0.03],
    ].forEach(function (pts) {
      get2d().beginPath();
      get2d().moveTo(pts[0], pts[1]);
      get2d().quadraticCurveTo(pts[2], pts[3], pts[4], pts[5]);
      get2d().stroke();
    });
    get2d().restore();
  }

  function drawProcedural(w, h) {
    drawBackground(w, h);
    drawRibbonField(w, h, { strength: 1 });
    drawLeftBloom(w, h);
    drawCoreLine(w, h);
    drawReflection(w, h);
    drawArcs(w, h);
    drawVignette(w, h);
    drawGrain(w, h);
  }

  function drawVignette(w, h) {
    if (state.vignette <= 0) return;
    var g = get2d().createRadialGradient(w * 0.5, h * 0.5, w * 0.15, w * 0.5, h * 0.5, w * 0.92);
    var edge =
      state.mode === 'light'
        ? 'rgba(244,245,247,' + state.vignette + ')'
        : 'rgba(0,0,0,' + state.vignette + ')';
    g.addColorStop(0.5, 'rgba(0,0,0,0)');
    g.addColorStop(1, edge);
    get2d().fillStyle = g;
    get2d().fillRect(0, 0, w, h);
  }

  function drawGrain(w, h) {
    if (state.grain <= 0) return;
    var img = get2d().getImageData(0, 0, w, h);
    var d = img.data;
    var amount = state.grain * 255;
    for (var i = 0; i < d.length; i += 4) {
      var n = (Math.random() - 0.5) * amount;
      d[i] = Math.max(0, Math.min(255, d[i] + n));
      d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
      d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
    }
    get2d().putImageData(img, 0, 0);
  }

  function drawReferenceOverlay(w, h) {
    if (!state.showReference || !refImage) return;
    var c = get2d();
    c.save();
    c.globalAlpha = 0.5;
    c.drawImage(refImage, 0, 0, w, h);
    c.restore();
  }

  function getShaderParams() {
    return {
      animate: state.animate !== false,
      frozenTime: state.frozenTime || 0,
      color1: state.color1 || '#ff2a8a',
      color2: state.color2 || '#ff9a3d',
      color3: state.color3 || '#5ec8ff',
      bgTop: state.bgTop,
      bgBottom: state.bgBottom,
      bgGlow: state.bgGlow,
      frequency: state.frequency,
      speed: state.speed,
      strength: state.strength,
      density: state.density,
      amplitude: state.amplitude,
      brightness: state.brightness,
      grain: state.grain,
      rotationZ: state.rotationZ,
      horizon: state.horizon,
      maskLow: state.meshThreshold,
      maskHigh: state.meshThreshold + state.meshSoftness,
      tintStrength: state.tintStrength || 0,
    };
  }

  function ensureShader() {
    if (shaderRenderer) return;
    if (!global.HeroGradientShader || !glCanvas) return;
    try {
      shaderRenderer = new global.HeroGradientShader(glCanvas, {});
      shaderRenderer.resize(state.width, state.height);
      if (meshImage) shaderRenderer.setMaskImage(meshImage);
    } catch (e) {
      console.warn('[hero-gradient] WebGL shader failed', e);
      state.renderEngine = 'mesh';
    }
  }

  function stopShader() {
    if (shaderRenderer) {
      shaderRenderer.stop();
      shaderRenderer.destroy();
      shaderRenderer = null;
    }
  }

  function renderShaderStatic() {
    ensureShader();
    if (!shaderRenderer) return;
    shaderRenderer.resize(state.width, state.height);
    if (meshImage) shaderRenderer.setMaskImage(meshImage);
    shaderRenderer.render(getShaderParams(), state.frozenTime || 0);
  }

  function render() {
    var w = state.width;
    var h = state.height;
    var scaleW = Math.round(w * state.previewScale);
    var scaleH = Math.round(h * state.previewScale);

    if (state.renderEngine === 'shader') {
      ensureShader();
      if (previewFrame) previewFrame.classList.add('is-shader');
      if (shaderRenderer) {
        shaderRenderer.resize(w, h);
        if (meshImage) shaderRenderer.setMaskImage(meshImage);
      }
      glCanvas.style.width = scaleW + 'px';
      glCanvas.style.height = scaleH + 'px';
      if (shaderRenderer) {
        if (state.animate) {
          if (!shaderRenderer._raf) shaderRenderer.start(getShaderParams);
        } else {
          shaderRenderer.stop();
          shaderRenderer.render(getShaderParams(), state.frozenTime || 0);
        }
      }
      syncControlsFromState();
      return;
    }

    stopShader();
    if (previewFrame) previewFrame.classList.remove('is-shader');
    canvas.width = w;
    canvas.height = h;

    if (state.renderEngine === 'mesh') {
      drawMesh(w, h);
      if (state.vignette > 0 && state.mode === 'dark') drawVignette(w, h);
    } else if (state.renderEngine === 'procedural') {
      drawProcedural(w, h);
    }
    drawReferenceOverlay(w, h);

    canvas.style.width = scaleW + 'px';
    canvas.style.height = scaleH + 'px';
    syncControlsFromState();
  }

  function syncControlsFromState() {
    document.getElementById('bg-top').value = state.bgTop;
    document.getElementById('bg-bottom').value = state.bgBottom;
    if (document.getElementById('bg-glow')) {
      document.getElementById('bg-glow').value = state.bgGlow || '#141c32';
    }
    document.getElementById('light-bg').value = state.lightBg;
    document.querySelectorAll('[name="render-engine"]').forEach(function (r) {
      r.checked = r.value === state.renderEngine;
    });
    document.querySelectorAll('[name="mode"]').forEach(function (r) {
      r.checked = r.value === state.mode;
    });
    var refToggle = document.getElementById('show-reference');
    if (refToggle) refToggle.checked = state.showReference;
    var meshPanel = document.getElementById('mesh-controls');
    var procPanel = document.getElementById('procedural-controls');
    var shaderPanel = document.getElementById('shader-controls');
    if (meshPanel) meshPanel.hidden = state.renderEngine !== 'mesh';
    if (procPanel) procPanel.hidden = state.renderEngine !== 'procedural';
    if (shaderPanel) shaderPanel.hidden = state.renderEngine !== 'shader';
    if (document.getElementById('color1')) document.getElementById('color1').value = state.color1 || '#ff2a8a';
    if (document.getElementById('color2')) document.getElementById('color2').value = state.color2 || '#ff9a3d';
    if (document.getElementById('color3')) document.getElementById('color3').value = state.color3 || '#5ec8ff';
    var anim = document.getElementById('shader-animate');
    if (anim) anim.checked = state.animate !== false;
  }

  function applyPreset(name) {
    state = Object.assign(state, clone(PRESETS[name]));
    renderStopsUI();
    loadControls();
    render();
  }

  function applyChainPreset(chainId) {
    if (!CHAIN_THEMES || !CHAIN_THEMES.chains[chainId]) return;
    var chain = CHAIN_THEMES.chains[chainId];
    var base = clone(PRESETS.lightSwap);
    base.stops = clone(chain.gradientStops);
    state = Object.assign(state, base);
    state.width = 1440;
    state.height = 1024;
    renderStopsUI();
    loadControls();
    render();
  }

  var CHAIN_THEMES = null;

  function loadChainThemes(cb) {
    fetch('chain-themes.json')
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        CHAIN_THEMES = data;
        var sel = document.getElementById('chain-preset');
        if (!sel) return;
        Object.keys(data.chains).forEach(function (id) {
          var opt = document.createElement('option');
          opt.value = id;
          opt.textContent = data.chains[id].label;
          sel.appendChild(opt);
        });
        sel.addEventListener('change', function () {
          if (sel.value) applyChainPreset(sel.value);
        });
        if (cb) cb();
      })
      .catch(function (e) {
        console.warn('[hero-gradient] chain themes unavailable', e);
      });
  }

  global.applyChainPreset = applyChainPreset;

  function loadControls() {
    var map = {
      'bg-top': 'bgTop',
      'bg-bottom': 'bgBottom',
      'bg-glow': 'bgGlow',
      'light-bg': 'lightBg',
      'horizon': 'horizon',
      'glow-spread': 'glowSpread',
      'left-bloom': 'leftBloom',
      'right-taper': 'rightTaper',
      'core-intensity': 'coreIntensity',
      'core-width': 'coreWidth',
      'reflect-opacity': 'reflectOpacity',
      'reflect-blur': 'reflectBlur',
      'grain': 'grain',
      'vignette': 'vignette',
      'arc-opacity': 'arcOpacity',
      'mesh-threshold': 'meshThreshold',
      'mesh-softness': 'meshSoftness',
      'tint-strength': 'tintStrength',
      'mesh-intensity': 'meshIntensity',
      'shader-frequency': 'frequency',
      'shader-speed': 'speed',
      'shader-strength': 'strength',
      'shader-density': 'density',
      'shader-amplitude': 'amplitude',
      'shader-brightness': 'brightness',
      'shader-rotation': 'rotationZ',
    };
    Object.keys(map).forEach(function (id) {
      var el = document.getElementById(id);
      if (el && state[map[id]] != null) el.value = state[map[id]];
    });
    if (document.getElementById('horizon-val')) {
      document.getElementById('horizon-val').textContent = Math.round(state.horizon * 100) + '%';
    }
    ['glow-spread', 'left-bloom', 'right-taper', 'core-intensity', 'core-width', 'grain', 'vignette', 'arc-opacity', 'mesh-threshold', 'mesh-softness', 'tint-strength', 'mesh-intensity'].forEach(function (id) {
      var el = document.getElementById(id);
      var val = document.getElementById(id + '-val');
      if (el && val) val.textContent = parseFloat(el.value).toFixed(2).replace(/\.00$/, '');
    });
    if (document.getElementById('reflect-opacity-val')) {
      document.getElementById('reflect-opacity-val').textContent =
        Math.round(state.reflectOpacity * 100) + '%';
    }
    if (document.getElementById('reflect-blur-val')) {
      document.getElementById('reflect-blur-val').textContent = state.reflectBlur + 'px';
    }
    document.getElementById('reflect').checked = state.reflect;
    document.getElementById('arcs').checked = state.arcs;
  }

  function bindRange(id, key, fmt) {
    var el = document.getElementById(id);
    if (!el) return;
    var valEl = document.getElementById(id + '-val');
    function sync() {
      state[key] = parseFloat(el.value);
      if (valEl) valEl.textContent = fmt ? fmt(state[key]) : el.value;
      render();
    }
    el.addEventListener('input', sync);
    if (state[key] != null) {
      el.value = state[key];
      if (valEl) valEl.textContent = fmt ? fmt(state[key]) : String(state[key]);
    }
  }

  function bindColor(id, key) {
    var el = document.getElementById(id);
    if (!el) return;
    state[key] = el.value;
    el.addEventListener('input', function () {
      state[key] = el.value;
      render();
    });
  }

  function bindCheck(id, key) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', function () {
      state[key] = el.checked;
      render();
    });
  }

  function renderStopsUI() {
    stopsEl.innerHTML = '';
    state.stops.forEach(function (stop, i) {
      var row = document.createElement('div');
      row.className = 'stop';
      row.innerHTML =
        '<input type="color" value="' + stop.color + '">' +
        '<input type="range" min="0" max="100" value="' + Math.round(stop.pos * 100) + '">' +
        '<span class="pos-val">' + Math.round(stop.pos * 100) + '%</span>' +
        '<button type="button" title="Remove">×</button>';
      row.querySelector('input[type="color"]').addEventListener('input', function (e) {
        stop.color = e.target.value;
        render();
      });
      row.querySelector('input[type="range"]').addEventListener('input', function (e) {
        stop.pos = parseInt(e.target.value, 10) / 100;
        row.querySelector('.pos-val').textContent = e.target.value + '%';
        render();
      });
      row.querySelector('button').addEventListener('click', function () {
        if (state.stops.length > 2) {
          state.stops.splice(i, 1);
          renderStopsUI();
          render();
        }
      });
      stopsEl.appendChild(row);
    });
  }

  var meshImg = new Image();
  meshImg.onload = function () {
    meshImage = meshImg;
    meshReady = true;
    if (shaderRenderer) shaderRenderer.setMaskImage(meshImage);
    render();
  };
  meshImg.onerror = function () {
    state.renderEngine = 'procedural';
    render();
  };
  meshImg.src = MESH_PATH;

  var refImg = new Image();
  refImg.onload = function () {
    refImage = refImg;
    if (state.showReference) render();
  };
  refImg.src = REFERENCE_PATH;

  document.getElementById('add-stop').addEventListener('click', function () {
    state.stops.push({ pos: 0.5, color: '#4fc3ff' });
    state.stops.sort(function (a, b) {
      return a.pos - b.pos;
    });
    renderStopsUI();
    render();
  });
  document.getElementById('preset-dark').addEventListener('click', function () {
    applyPreset('shaderHero');
  });
  document.getElementById('preset-light').addEventListener('click', function () {
    applyPreset('lightSwap');
  });
  if (document.getElementById('preset-mesh')) {
    document.getElementById('preset-mesh').addEventListener('click', function () {
      applyPreset('darkHero');
    });
  }
  document.getElementById('download-png').addEventListener('click', function () {
    if (state.renderEngine === 'shader' && shaderRenderer) {
      renderShaderStatic();
    }
    var link = document.createElement('a');
    link.download = 'hero-gradient-' + state.renderEngine + '-' + state.width + 'x' + state.height + '.png';
    link.href =
      state.renderEngine === 'shader' && glCanvas
        ? glCanvas.toDataURL('image/png')
        : canvas.toDataURL('image/png');
    link.click();
  });
  if (document.getElementById('freeze-frame')) {
    document.getElementById('freeze-frame').addEventListener('click', function () {
      state.animate = false;
      state.frozenTime = (performance.now() - (shaderRenderer ? shaderRenderer._startTime : 0)) / 1000;
      var anim = document.getElementById('shader-animate');
      if (anim) anim.checked = false;
      render();
    });
  }
  document.getElementById('copy-json').addEventListener('click', function () {
    var text = JSON.stringify(
      (function () {
        var o = clone(state);
        delete o.previewScale;
        delete o.showReference;
        return o;
      })(),
      null,
      2
    );
    navigator.clipboard.writeText(text).then(function () {
      jsonOut.textContent = text;
      jsonOut.classList.add('is-open');
    });
  });
  document.getElementById('import-json').addEventListener('click', function () {
    var raw = window.prompt('Paste gradient JSON config');
    if (!raw) return;
    try {
      state = Object.assign(state, JSON.parse(raw));
      if (!state.stops || !state.stops.length) throw new Error('missing stops');
      renderStopsUI();
      loadControls();
      render();
    } catch (e) {
      window.alert('Invalid JSON: ' + e.message);
    }
  });

  document.querySelectorAll('[name="render-engine"]').forEach(function (r) {
    r.addEventListener('change', function () {
      if (r.checked) {
        state.renderEngine = r.value;
        stopShader();
        render();
      }
    });
  });
  document.querySelectorAll('[name="mode"]').forEach(function (r) {
    r.addEventListener('change', function () {
      if (r.checked) {
        state.mode = r.value;
        render();
      }
    });
  });
  bindColor('bg-top', 'bgTop');
  bindColor('bg-bottom', 'bgBottom');
  bindColor('bg-glow', 'bgGlow');
  bindColor('light-bg', 'lightBg');
  bindColor('color1', 'color1');
  bindColor('color2', 'color2');
  bindColor('color3', 'color3');
  bindCheck('shader-animate', 'animate');
  bindCheck('reflect', 'reflect');
  bindCheck('arcs', 'arcs');
  bindCheck('show-reference', 'showReference');
  bindRange('horizon', 'horizon', function (v) {
    return Math.round(v * 100) + '%';
  });
  bindRange('glow-spread', 'glowSpread');
  bindRange('left-bloom', 'leftBloom');
  bindRange('right-taper', 'rightTaper');
  bindRange('core-intensity', 'coreIntensity');
  bindRange('core-width', 'coreWidth');
  bindRange('reflect-opacity', 'reflectOpacity', function (v) {
    return Math.round(v * 100) + '%';
  });
  bindRange('reflect-blur', 'reflectBlur', function (v) {
    return v + 'px';
  });
  bindRange('grain', 'grain');
  bindRange('vignette', 'vignette');
  bindRange('arc-opacity', 'arcOpacity');
  bindRange('mesh-threshold', 'meshThreshold');
  bindRange('mesh-softness', 'meshSoftness');
  bindRange('tint-strength', 'tintStrength');
  bindRange('mesh-intensity', 'meshIntensity');
  bindRange('shader-frequency', 'frequency');
  bindRange('shader-speed', 'speed');
  bindRange('shader-strength', 'strength');
  bindRange('shader-density', 'density');
  bindRange('shader-amplitude', 'amplitude');
  bindRange('shader-brightness', 'brightness');
  bindRange('shader-rotation', 'rotationZ', function (v) {
    return Math.round(v) + '°';
  });

  renderStopsUI();
  loadControls();
  syncControlsFromState();
  loadChainThemes();
})();
