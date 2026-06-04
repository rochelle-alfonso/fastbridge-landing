/**
 * ShaderGradient-inspired animated plane shader + hero mesh mask (vanilla WebGL2)
 */
(function (global) {
  var VERT = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

  var FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uMask;
uniform float uTime;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform vec3 uBgTop;
uniform vec3 uBgBottom;
uniform vec3 uBgGlow;
uniform float uFrequency;
uniform float uSpeed;
uniform float uStrength;
uniform float uDensity;
uniform float uAmplitude;
uniform float uBrightness;
uniform float uGrain;
uniform float uMaskLow;
uniform float uMaskHigh;
uniform float uRotation;
uniform float uTint;
uniform float uHorizon;

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = mod289(vec3(i.x, i.x + i1.x, i.x + 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

vec2 rot(vec2 p, float a) {
  float c = cos(a), s = sin(a);
  return vec2(c * p.x - s * p.y, s * p.x + c * p.y);
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

vec3 screen(vec3 a, vec3 b) {
  return 1.0 - (1.0 - a) * (1.0 - b);
}

void main() {
  vec2 uv = vUv;
  vec2 p = rot(uv - 0.5, uRotation) + 0.5;
  float t = uTime * uSpeed;

  vec2 q = vec2(
    snoise(p * uFrequency + vec2(t, t * 0.62)),
    snoise(p * uFrequency * 1.17 - vec2(t * 0.85, t * 0.4))
  );
  vec2 r = vec2(
    snoise(p * uDensity + q * uAmplitude + t * 0.35),
    snoise(p * uDensity * 1.08 - q * uAmplitude * 0.9 + t * 0.55)
  );
  float n = snoise(p * uFrequency + r * 2.15 + t * 0.2);
  float n2 = snoise(p * uDensity * 0.85 + vec2(n, -n) + t * 0.15);

  float nx = p.x;
  float ribbon = smoothstep(0.02, 0.22, nx + n * 0.18);
  vec3 flow = mix(uColor1, uColor2, smoothstep(-0.15, 0.42, nx + n * 0.32 + n2 * 0.12));
  flow = mix(flow, uColor3, smoothstep(0.28, 0.92, nx + n * 0.1));
  flow *= (0.55 + 0.45 * ribbon) * uStrength * 0.22 * uBrightness;

  float hy = uHorizon;
  float dy = abs(uv.y - hy);
  float vert = exp(-pow(dy / 0.22, 2.0) * (1.0 + nx * 0.35));
  flow *= vert;

  vec3 bg = mix(uBgBottom, uBgTop, clamp(uv.y * 1.05, 0.0, 1.0));
  float gd = length(uv - vec2(0.22, hy));
  bg = mix(bg, uBgGlow, max(0.0, 1.0 - gd / 0.58) * 0.38);

  float maskL = dot(texture(uMask, uv).rgb, vec3(0.299, 0.587, 0.114));
  float mask = smoothstep(uMaskLow, uMaskHigh, maskL);

  vec3 lit = screen(bg, flow);
  vec3 col = mix(bg, lit, mask);

  float grain = (hash(uv * 512.0 + uTime) - 0.5) * uGrain;
  col += grain;

  outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

  function hexToRgb(hex) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
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
      throw new Error(gl.getShaderInfoLog(sh) || 'shader compile failed');
    }
    return sh;
  }

  function HeroGradientShader(canvas, options) {
    this.canvas = canvas;
    this.opts = options || {};
    this.gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false });
    if (!this.gl) throw new Error('WebGL2 not available');
    this.gl.enable(this.gl.BLEND);
    this._init();
    this._startTime = performance.now();
    this._raf = null;
    this._maskTex = null;
    this._uniforms = {};
  }

  HeroGradientShader.prototype._init = function () {
    var gl = this.gl;
    var vs = compile(gl, gl.VERTEX_SHADER, VERT);
    var fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    this.prog = gl.createProgram();
    gl.attachShader(this.prog, vs);
    gl.attachShader(this.prog, fs);
    gl.linkProgram(this.prog);
    if (!gl.getProgramParameter(this.prog, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(this.prog) || 'program link failed');
    }
    gl.deleteShader(vs);
    gl.deleteShader(fs);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    this._aPos = gl.getAttribLocation(this.prog, 'aPos');
    gl.enableVertexAttribArray(this._aPos);
    gl.vertexAttribPointer(this._aPos, 2, gl.FLOAT, false, 0, 0);

    var names = [
      'uMask', 'uTime', 'uColor1', 'uColor2', 'uColor3', 'uBgTop', 'uBgBottom', 'uBgGlow',
      'uFrequency', 'uSpeed', 'uStrength', 'uDensity', 'uAmplitude', 'uBrightness', 'uGrain',
      'uMaskLow', 'uMaskHigh', 'uRotation', 'uTint', 'uHorizon',
    ];
    var self = this;
    names.forEach(function (n) {
      self._uniforms[n] = gl.getUniformLocation(self.prog, n);
    });

    this._maskTex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this._maskTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.uniform1i(this._uniforms.uMask, 0);
  };

  HeroGradientShader.prototype.setMaskImage = function (img) {
    var gl = this.gl;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this._maskTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    this._maskReady = true;
  };

  HeroGradientShader.prototype.resize = function (w, h) {
    this.canvas.width = w;
    this.canvas.height = h;
    this.gl.viewport(0, 0, w, h);
  };

  HeroGradientShader.prototype.render = function (params, timeSec) {
    if (!this._maskReady) return false;
    var gl = this.gl;
    var p = params;
    gl.useProgram(this.prog);
    gl.uniform1f(this._uniforms.uTime, timeSec);
    gl.uniform3fv(this._uniforms.uColor1, hexToRgb(p.color1));
    gl.uniform3fv(this._uniforms.uColor2, hexToRgb(p.color2));
    gl.uniform3fv(this._uniforms.uColor3, hexToRgb(p.color3));
    gl.uniform3fv(this._uniforms.uBgTop, hexToRgb(p.bgTop));
    gl.uniform3fv(this._uniforms.uBgBottom, hexToRgb(p.bgBottom));
    gl.uniform3fv(this._uniforms.uBgGlow, hexToRgb(p.bgGlow || '#141c32'));
    gl.uniform1f(this._uniforms.uFrequency, p.frequency);
    gl.uniform1f(this._uniforms.uSpeed, p.speed);
    gl.uniform1f(this._uniforms.uStrength, p.strength);
    gl.uniform1f(this._uniforms.uDensity, p.density);
    gl.uniform1f(this._uniforms.uAmplitude, p.amplitude);
    gl.uniform1f(this._uniforms.uBrightness, p.brightness);
    gl.uniform1f(this._uniforms.uGrain, p.grain);
    gl.uniform1f(this._uniforms.uMaskLow, p.maskLow);
    gl.uniform1f(this._uniforms.uMaskHigh, p.maskHigh);
    gl.uniform1f(this._uniforms.uRotation, (p.rotationZ * Math.PI) / 180);
    gl.uniform1f(this._uniforms.uHorizon, p.horizon);
    gl.uniform1f(this._uniforms.uTint, p.tintStrength || 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    return true;
  };

  HeroGradientShader.prototype.start = function (getParams) {
    var self = this;
    function frame() {
      self._raf = requestAnimationFrame(frame);
      var params = getParams();
      if (!params.animate) {
        self.render(params, params.frozenTime || 0);
        return;
      }
      var t = (performance.now() - self._startTime) / 1000;
      self.render(params, t);
    }
    frame();
  };

  HeroGradientShader.prototype.stop = function () {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
  };

  HeroGradientShader.prototype.destroy = function () {
    this.stop();
    var gl = this.gl;
    if (this._maskTex) gl.deleteTexture(this._maskTex);
    if (this.prog) gl.deleteProgram(this.prog);
  };

  HeroGradientShader.prototype.toDataURL = function () {
    return this.canvas.toDataURL('image/png');
  };

  global.HeroGradientShader = HeroGradientShader;
})(typeof window !== 'undefined' ? window : global);
