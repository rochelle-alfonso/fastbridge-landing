/**
 * Shader gradient · ShaderGradient-style animated plane, full-frame.
 *
 * The fragment shader simulates a noise-displaced horizontal plane viewed
 * almost edge-on: a sharp horizon line, soft glow flaring upward through
 * a wavy noise envelope, mirrored reflection below, and a 3-stop color
 * sweep along the plane (warm -> hot core -> cool).
 */
(function () {
  'use strict';

  /* ------------------------------------------------------------ shaders */

  var VERT_SRC = '#version 300 es\n' +
    'in vec2 aPos;\n' +
    'out vec2 vUv;\n' +
    'void main() {\n' +
    '  vUv = aPos * 0.5 + 0.5;\n' +
    '  gl_Position = vec4(aPos, 0.0, 1.0);\n' +
    '}\n';

  var FRAG_SRC = '#version 300 es\n' +
    'precision highp float;\n' +
    'in vec2 vUv;\n' +
    'out vec4 outColor;\n' +
    '\n' +
    'uniform float uTime;\n' +
    'uniform vec2  uResolution;\n' +
    'uniform vec3  uColor1;\n' +
    'uniform vec3  uColor2;\n' +
    'uniform vec3  uColor3;\n' +
    'uniform vec3  uBgTop;\n' +
    'uniform vec3  uBgBottom;\n' +
    'uniform float uFrequency;\n' +
    'uniform float uDensity;\n' +
    'uniform float uAmplitude;\n' +
    'uniform float uStrength;\n' +
    'uniform float uSpeed;\n' +
    'uniform float uBrightness;\n' +
    'uniform float uPositionX;\n' +
    'uniform float uHorizon;\n' +
    'uniform float uRotation;\n' +
    'uniform float uReflection;\n' +
    'uniform float uGlowHeight;\n' +
    'uniform float uCoreSharp;\n' +
    'uniform float uGrain;\n' +
    'uniform float uVignette;\n' +
    '\n' +
    /* simplex 2D noise (Ashima) */
    'vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}\n' +
    'vec2 mod289(vec2 x){return x-floor(x*(1.0/289.0))*289.0;}\n' +
    'vec3 permute(vec3 x){return mod289(((x*34.0)+1.0)*x);}\n' +
    'float snoise(vec2 v){\n' +
    '  const vec4 C = vec4(0.211324865405187, 0.366025403784439,\n' +
    '                     -0.577350269189626, 0.024390243902439);\n' +
    '  vec2 i  = floor(v + dot(v, C.yy));\n' +
    '  vec2 x0 = v -   i + dot(i, C.xx);\n' +
    '  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);\n' +
    '  vec4 x12 = x0.xyxy + C.xxzz;\n' +
    '  x12.xy -= i1;\n' +
    '  i = mod289(i);\n' +
    '  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))\n' +
    '         + i.x + vec3(0.0, i1.x, 1.0));\n' +
    '  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);\n' +
    '  m = m*m; m = m*m;\n' +
    '  vec3 x = 2.0 * fract(p * C.www) - 1.0;\n' +
    '  vec3 h = abs(x) - 0.5;\n' +
    '  vec3 ox = floor(x + 0.5);\n' +
    '  vec3 a0 = x - ox;\n' +
    '  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);\n' +
    '  vec3 g;\n' +
    '  g.x  = a0.x  * x0.x  + h.x  * x0.y;\n' +
    '  g.yz = a0.yz * x12.xz + h.yz * x12.yw;\n' +
    '  return 130.0 * dot(m, g);\n' +
    '}\n' +
    '\n' +
    'float fbm(vec2 p) {\n' +
    '  float v = 0.0;\n' +
    '  float a = 0.5;\n' +
    '  for (int i = 0; i < 4; i++) {\n' +
    '    v += a * snoise(p);\n' +
    '    p *= 2.07;\n' +
    '    a *= 0.5;\n' +
    '  }\n' +
    '  return v;\n' +
    '}\n' +
    '\n' +
    'float hash(vec2 p) {\n' +
    '  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);\n' +
    '}\n' +
    '\n' +
    'vec2 rot(vec2 p, float a) {\n' +
    '  float c = cos(a), s = sin(a);\n' +
    '  return vec2(c*p.x - s*p.y, s*p.x + c*p.y);\n' +
    '}\n' +
    '\n' +
    /* warm (color1) -> hot core (color2) in a tight band around corePos
       -> cool (color3) extending right. color2 is intentionally narrow
       so it reads as a small hot accent rather than dominating. */
    'vec3 colorSweep(float t, float corePos) {\n' +
    '  vec3 c = uColor1;\n' +
    '  c = mix(c, uColor2, smoothstep(corePos - 0.05, corePos + 0.02, t)\n' +
    '                     * (1.0 - smoothstep(corePos + 0.02, corePos + 0.10, t)));\n' +
    '  c = mix(c, uColor3, smoothstep(corePos - 0.02, corePos + 0.35, t));\n' +
    '  return c;\n' +
    '}\n' +
    '\n' +
    'void main() {\n' +
    '  vec2 uv = vUv;\n' +
    '  vec2 p  = rot(uv - vec2(0.5, uHorizon), uRotation) + vec2(0.5, uHorizon);\n' +
    '\n' +
    /* corePos: where warm/cool meet on the horizon */
    '  float corePos = clamp(0.5 + uPositionX * 0.22, 0.05, 0.95);\n' +
    '\n' +
    '  float dy     = p.y - uHorizon;\n' +
    '  float adyRaw = abs(dy);\n' +
    '\n' +
    '  float t = uTime * uSpeed;\n' +
    '\n' +
    /* gentle wave that bends the silhouette of the light field; small
       contribution keeps things smooth like the reference rather than
       producing stripy vertical strands. */
    '  float wave = fbm(vec2(p.x * uFrequency + t * 0.55, t * 0.30)) * 0.025;\n' +
    '  wave *= uAmplitude;\n' +
    '  float ady = max(adyRaw - max(wave, 0.0), 0.0);\n' +
    '\n' +
    /* below-horizon attenuation (reflection) */
    '  float above = step(0.0, dy);\n' +
    '  float refl  = mix(uReflection, 1.0, above);\n' +
    '\n' +
    /* asymmetric horizontal scale: warm side compact, cool side extends.
       Use smoothstep on dx so the two regimes blend gradually instead of
       producing a vertical seam at corePos. */
    '  float dx = p.x - corePos;\n' +
    '  float sideMix = smoothstep(-0.08, 0.08, dx);\n' +
    '  float xScale = mix(1.35, 0.55, sideMix);\n' +
    '  float verticalScale = mix(1.05, 0.78, sideMix);\n' +
    '  vec2 toCore = vec2(dx * xScale, ady * verticalScale / max(uGlowHeight, 0.001));\n' +
    '  float d = length(toCore);\n' +
    '\n' +
    /* main glow envelope: tight cluster around the core */
    '  float envelope = exp(-pow(d * 1.25, 1.15));\n' +
    /* secondary very-wide envelope so the cool side keeps a deep,
       low-intensity halo far from the core (matches the blue extending
       across the right half of the reference). Smoothly enabled on
       the cool side via sideMix. */
    '  vec2 wideToCore = vec2(dx * 0.5, ady / max(uGlowHeight * 1.4, 0.001));\n' +
    '  float wideHalo = exp(-pow(length(wideToCore) * 0.85, 1.05)) * sideMix * 0.55;\n' +
    '  envelope += wideHalo;\n' +
    '\n' +
    /* gentle horizontal taper so edges fade to background */
    '  float hTaper = smoothstep(-0.12, 0.06, p.x) * smoothstep(1.14, 0.88, p.x);\n' +
    '  float glow = envelope * refl * hTaper;\n' +
    '\n' +
    /* very gentle directional sheen (a couple of flowing arcs) - not
       speckly rays, just a soft brightness modulation along x and ady */
    '  float sheen = snoise(vec2((p.x - corePos) * uDensity * 3.0 + t * 0.18, ady * 1.6 + t * 0.05));\n' +
    '  glow *= (0.86 + 0.18 * sheen);\n' +
    '\n' +
    /* sharp horizon line; brightest at corePos, taper outward */
    '  float lineFalloff = exp(-pow(adyRaw / 0.0028, 2.0));\n' +
    '  float lineSpread  = exp(-pow(dx * 0.95, 2.0))\n' +
    '                     + 0.18 * exp(-pow(dx * 2.6, 2.0)) * step(0.0, dx);\n' +
    '  float core = lineFalloff * (0.35 + 0.95 * lineSpread) * uCoreSharp;\n' +
    '\n' +
    /* color by horizontal position, with a tiny noise wiggle */
    '  float colorNoise = snoise(vec2(p.x * 2.4 + t * 0.12, adyRaw * 4.5)) * 0.04;\n' +
    '  float xMix = clamp(p.x + colorNoise, 0.0, 1.0);\n' +
    '  vec3 lightCol = colorSweep(xMix, corePos);\n' +
    '\n' +
    /* peach core only appears near the horizon; away from horizon, blend
       back to the pure warm/cool side color so peach does not streak
       vertically through the frame. */
    '  vec3 sideCol = mix(uColor1, uColor3, smoothstep(corePos - 0.08, corePos + 0.45, xMix));\n' +
    '  float coreProximity = exp(-pow(adyRaw * 9.0, 1.6));\n' +
    '  lightCol = mix(sideCol, lightCol, coreProximity);\n' +
    '\n' +
    /* core line uses a brighter, whiter blend at the meeting point */
    '  vec3 coreCol = mix(uColor2, vec3(1.0), 0.35);\n' +
    '\n' +
    '  vec3 light = lightCol * glow * uStrength * 0.28 + coreCol * core * 0.55;\n' +
    '  light *= uBrightness;\n' +
    '\n' +
    /* background */
    '  vec3 bg = mix(uBgBottom, uBgTop, smoothstep(0.0, 1.0, uv.y));\n' +
    '  float underGlow = max(0.0, 1.0 - length((uv - vec2(corePos, uHorizon)) * vec2(1.0, 1.8)) / 0.55);\n' +
    '  bg += mix(uBgTop, uColor3, 0.45) * underGlow * 0.04;\n' +
    '\n' +
    /* composite + soft Reinhard-ish tonemap */
    '  vec3 col = bg + light;\n' +
    '  col = col / (1.0 + max(max(col.r, col.g), col.b) * 0.22);\n' +
    '\n' +
    /* vignette */
    '  float v = length((uv - 0.5) * vec2(1.0, 0.9));\n' +
    '  col *= 1.0 - smoothstep(0.55, 0.95, v) * uVignette;\n' +
    '\n' +
    /* grain */
    '  float g = (hash(uv * uResolution + uTime) - 0.5) * uGrain;\n' +
    '  col += g;\n' +
    '\n' +
    '  outColor = vec4(clamp(col, 0.0, 1.0), 1.0);\n' +
    '}\n';

  /* ------------------------------------------------------------ helpers */

  function hexToRgb(hex) {
    var h = String(hex || '').replace('#', '').trim();
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (h.length !== 6) return [0, 0, 0];
    return [
      parseInt(h.slice(0, 2), 16) / 255,
      parseInt(h.slice(2, 4), 16) / 255,
      parseInt(h.slice(4, 6), 16) / 255,
    ];
  }

  function compile(gl, type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      var info = gl.getShaderInfoLog(sh) || 'shader compile failed';
      gl.deleteShader(sh);
      throw new Error(info);
    }
    return sh;
  }

  function $(id) { return document.getElementById(id); }

  /* --------------------------------------------------------- presets */

  var PRESETS = {
    lightBeams: {
      color1: '#ff2d75', color2: '#ffd6a0', color3: '#3d8aff',
      bgTop: '#04030d', bgBottom: '#02010a',
      frequency: 4.5, density: 1.3, amplitude: 0.45, strength: 4.4,
      speed: 0.35, brightness: 1.25,
      positionX: -0.55, horizon: 0.5, rotation: 0,
      reflection: 0.7, glowHeight: 0.22, coreSharp: 2.2,
      grain: 0.028, vignette: 0.42, animate: true,
    },
    sunset: {
      color1: '#ff3a3a', color2: '#ffb968', color3: '#9d5cff',
      bgTop: '#0a0510', bgBottom: '#06030a',
      frequency: 4.2, density: 1.1, amplitude: 1.1, strength: 4.2,
      speed: 0.35, brightness: 1.25,
      positionX: -0.2, horizon: 0.55, rotation: -2,
      reflection: 0.7, glowHeight: 0.34, coreSharp: 1.3,
      grain: 0.032, vignette: 0.4, animate: true,
    },
    aurora: {
      color1: '#3dffb0', color2: '#6ee6ff', color3: '#a07dff',
      bgTop: '#02060c', bgBottom: '#010305',
      frequency: 6.5, density: 1.6, amplitude: 1.4, strength: 3.6,
      speed: 0.5, brightness: 1.15,
      positionX: -0.6, horizon: 0.48, rotation: 4,
      reflection: 0.6, glowHeight: 0.32, coreSharp: 1.1,
      grain: 0.034, vignette: 0.3, animate: true,
    },
    dawn: {
      color1: '#ff7aa8', color2: '#ffe2b0', color3: '#7fb7ff',
      bgTop: '#0a0814', bgBottom: '#05040a',
      frequency: 3.8, density: 1.0, amplitude: 0.9, strength: 3.4,
      speed: 0.28, brightness: 1.15,
      positionX: -0.3, horizon: 0.52, rotation: 0,
      reflection: 0.82, glowHeight: 0.26, coreSharp: 1.5,
      grain: 0.028, vignette: 0.3, animate: true,
    },
  };

  /* ---------------------------------------------------- renderer */

  function ShaderGradient(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false });
    if (!this.gl) throw new Error('WebGL2 not available');
    this._init();
    this._startTime = performance.now();
    this._frozenTime = 0;
    this._raf = null;
  }

  ShaderGradient.prototype._init = function () {
    var gl = this.gl;
    var vs = compile(gl, gl.VERTEX_SHADER, VERT_SRC);
    var fs = compile(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(prog) || 'link failed');
    }
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    this.prog = prog;

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var aPos = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    this.u = {};
    var names = [
      'uTime', 'uResolution', 'uColor1', 'uColor2', 'uColor3',
      'uBgTop', 'uBgBottom', 'uFrequency', 'uDensity', 'uAmplitude',
      'uStrength', 'uSpeed', 'uBrightness', 'uPositionX', 'uHorizon',
      'uRotation', 'uReflection', 'uGlowHeight', 'uCoreSharp', 'uGrain', 'uVignette',
    ];
    for (var i = 0; i < names.length; i++) {
      this.u[names[i]] = gl.getUniformLocation(prog, names[i]);
    }

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  };

  ShaderGradient.prototype.resize = function (w, h) {
    this.canvas.width = w;
    this.canvas.height = h;
    this.gl.viewport(0, 0, w, h);
  };

  ShaderGradient.prototype.render = function (params, timeSec) {
    var gl = this.gl;
    var u = this.u;
    gl.useProgram(this.prog);
    gl.uniform1f(u.uTime, timeSec);
    gl.uniform2f(u.uResolution, this.canvas.width, this.canvas.height);
    gl.uniform3fv(u.uColor1, hexToRgb(params.color1));
    gl.uniform3fv(u.uColor2, hexToRgb(params.color2));
    gl.uniform3fv(u.uColor3, hexToRgb(params.color3));
    gl.uniform3fv(u.uBgTop, hexToRgb(params.bgTop));
    gl.uniform3fv(u.uBgBottom, hexToRgb(params.bgBottom));
    gl.uniform1f(u.uFrequency, params.frequency);
    gl.uniform1f(u.uDensity, params.density);
    gl.uniform1f(u.uAmplitude, params.amplitude);
    gl.uniform1f(u.uStrength, params.strength);
    gl.uniform1f(u.uSpeed, params.speed);
    gl.uniform1f(u.uBrightness, params.brightness);
    gl.uniform1f(u.uPositionX, params.positionX);
    gl.uniform1f(u.uHorizon, params.horizon);
    gl.uniform1f(u.uRotation, (params.rotation * Math.PI) / 180);
    gl.uniform1f(u.uReflection, params.reflection);
    gl.uniform1f(u.uGlowHeight, params.glowHeight);
    gl.uniform1f(u.uCoreSharp, params.coreSharp);
    gl.uniform1f(u.uGrain, params.grain);
    gl.uniform1f(u.uVignette, params.vignette);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  ShaderGradient.prototype.start = function (getParams) {
    var self = this;
    cancelAnimationFrame(self._raf);
    function frame() {
      self._raf = requestAnimationFrame(frame);
      var p = getParams();
      var t = p.animate
        ? (performance.now() - self._startTime) / 1000
        : self._frozenTime;
      self.render(p, t);
    }
    frame();
  };

  ShaderGradient.prototype.freeze = function () {
    this._frozenTime = (performance.now() - this._startTime) / 1000;
  };

  ShaderGradient.prototype.resume = function () {
    this._startTime = performance.now() - this._frozenTime * 1000;
  };

  ShaderGradient.prototype.toDataURL = function () {
    return this.canvas.toDataURL('image/png');
  };

  /* ------------------------------------------------------------ UI wiring */

  document.addEventListener('DOMContentLoaded', function () {
    var canvas = $('canvas');
    var statusEl = $('status');
    var jsonOut = $('json-out');

    var gradient;
    try {
      gradient = new ShaderGradient(canvas);
    } catch (err) {
      statusEl.textContent = 'WebGL2 required';
      console.error(err);
      return;
    }

    /* control ids and how to read them */
    var fields = {
      color1:      { id: 'color1',      kind: 'color' },
      color2:      { id: 'color2',      kind: 'color' },
      color3:      { id: 'color3',      kind: 'color' },
      bgTop:       { id: 'bg-top',      kind: 'color' },
      bgBottom:    { id: 'bg-bottom',   kind: 'color' },
      frequency:   { id: 'frequency',   kind: 'number', display: function (v) { return v.toFixed(1); } },
      density:     { id: 'density',     kind: 'number', display: function (v) { return v.toFixed(2); } },
      amplitude:   { id: 'amplitude',   kind: 'number', display: function (v) { return v.toFixed(2); } },
      strength:    { id: 'strength',    kind: 'number', display: function (v) { return v.toFixed(1); } },
      brightness:  { id: 'brightness',  kind: 'number', display: function (v) { return v.toFixed(2); } },
      positionX:   { id: 'position-x',  kind: 'number', display: function (v) { return v.toFixed(2); } },
      horizon:     { id: 'horizon',     kind: 'number', display: function (v) { return v.toFixed(2); } },
      rotation:    { id: 'rotation',    kind: 'number', display: function (v) { return v.toFixed(0) + '°'; } },
      reflection:  { id: 'reflection',  kind: 'number', display: function (v) { return v.toFixed(2); } },
      glowHeight:  { id: 'glow-height', kind: 'number', display: function (v) { return v.toFixed(2); } },
      coreSharp:   { id: 'core-sharp',  kind: 'number', display: function (v) { return v.toFixed(2); } },
      speed:       { id: 'speed',       kind: 'number', display: function (v) { return v.toFixed(2); } },
      grain:       { id: 'grain',       kind: 'number', display: function (v) { return v.toFixed(3); } },
      vignette:    { id: 'vignette',    kind: 'number', display: function (v) { return v.toFixed(2); } },
      animate:     { id: 'animate',     kind: 'bool' },
    };

    function readParams() {
      var p = {};
      Object.keys(fields).forEach(function (key) {
        var f = fields[key];
        var el = $(f.id);
        if (!el) { p[key] = null; return; }
        if (f.kind === 'color') p[key] = el.value;
        else if (f.kind === 'bool') p[key] = !!el.checked;
        else p[key] = parseFloat(el.value);
      });
      return p;
    }

    function syncValueLabels() {
      Object.keys(fields).forEach(function (key) {
        var f = fields[key];
        if (f.kind !== 'number') return;
        var el = $(f.id);
        var out = $(f.id + '-val');
        if (el && out) out.textContent = f.display(parseFloat(el.value));
      });
      jsonOut.textContent = JSON.stringify(readParams(), null, 2);
    }

    function applyPreset(name) {
      var preset = PRESETS[name];
      if (!preset) return;
      Object.keys(preset).forEach(function (key) {
        var f = fields[key];
        if (!f) return;
        var el = $(f.id);
        if (!el) return;
        if (f.kind === 'bool') el.checked = !!preset[key];
        else el.value = preset[key];
      });
      syncValueLabels();
    }

    /* wire all controls */
    Object.keys(fields).forEach(function (key) {
      var f = fields[key];
      var el = $(f.id);
      if (!el) return;
      el.addEventListener('input', syncValueLabels);
      el.addEventListener('change', syncValueLabels);
    });

    /* preset buttons */
    document.querySelectorAll('[data-preset]').forEach(function (btn) {
      btn.addEventListener('click', function () { applyPreset(btn.dataset.preset); });
    });

    /* freeze / resume */
    $('freeze').addEventListener('click', function () {
      var box = $('animate');
      gradient.freeze();
      box.checked = false;
      syncValueLabels();
      statusEl.textContent = 'frozen';
    });
    $('resume').addEventListener('click', function () {
      var box = $('animate');
      box.checked = true;
      gradient.resume();
      syncValueLabels();
      statusEl.textContent = 'animating';
    });

    /* export PNG */
    $('download-png').addEventListener('click', function () {
      var a = document.createElement('a');
      a.href = gradient.toDataURL();
      a.download = 'shader-gradient.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
    });

    /* copy JSON */
    $('copy-json').addEventListener('click', function () {
      var text = JSON.stringify(readParams(), null, 2);
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(function () {
          statusEl.textContent = 'copied';
          setTimeout(function () { statusEl.textContent = 'animating'; }, 1200);
        });
      } else {
        jsonOut.textContent = text;
      }
    });

    /* prime UI + start render loop */
    syncValueLabels();
    statusEl.textContent = readParams().animate ? 'animating' : 'paused';
    gradient.start(readParams);
  });
})();
