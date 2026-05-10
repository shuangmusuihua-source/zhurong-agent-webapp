/**
 * WebGL 弥散渐变水波纹背景
 * 用于商务现代白主题
 */

class WaterRippleBackground {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    if (!this.gl) {
      console.warn('WebGL not supported, falling back to CSS gradient');
      this.fallbackGradient();
      return;
    }

    this.time = 0;
    this.ripples = [];
    this.init();
  }

  init() {
    const gl = this.gl;

    // 顶点着色器
    const vertexShaderSource = `
      attribute vec2 a_position;
      varying vec2 v_uv;
      void main() {
        v_uv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    // 片段着色器 - 弥散渐变水波纹
    const fragmentShaderSource = `
      precision mediump float;
      varying vec2 v_uv;
      uniform float u_time;
      uniform vec2 u_resolution;

      // 简化的噪声函数
      float noise(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
      }

      // 平滑噪声
      float smoothNoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);

        float a = noise(i);
        float b = noise(i + vec2(1.0, 0.0));
        float c = noise(i + vec2(0.0, 1.0));
        float d = noise(i + vec2(1.0, 1.0));

        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      // 分形噪声
      float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;
        for (int i = 0; i < 4; i++) {
          value += amplitude * smoothNoise(p);
          p *= 2.0;
          amplitude *= 0.5;
        }
        return value;
      }

      void main() {
        vec2 uv = v_uv;
        vec2 center = vec2(0.5, 0.5);

        // 多层水波纹
        float ripple1 = sin(length(uv - center) * 20.0 - u_time * 0.5) * 0.5 + 0.5;
        float ripple2 = sin(length(uv - center + vec2(0.1, 0.05)) * 15.0 - u_time * 0.3) * 0.5 + 0.5;
        float ripple3 = sin(length(uv - center - vec2(0.05, 0.1)) * 25.0 - u_time * 0.7) * 0.5 + 0.5;

        // 噪声扰动
        float n = fbm(uv * 3.0 + u_time * 0.1);

        // 混合波纹
        float ripple = (ripple1 + ripple2 + ripple3) / 3.0;
        ripple = ripple * 0.3 + n * 0.7;

        // 渐变颜色 - 清新蓝色系
        vec3 color1 = vec3(0.976, 0.980, 0.988); // #f8fafc
        vec3 color2 = vec3(0.878, 0.949, 0.976); // 浅蓝
        vec3 color3 = vec3(0.796, 0.925, 0.957); // 更浅蓝

        // 根据波纹值混合颜色
        vec3 color = mix(color1, color2, ripple * 0.5);
        color = mix(color, color3, n * 0.3);

        // 添加微妙的径向渐变
        float dist = length(uv - center);
        color = mix(color, color1, dist * 0.5);

        gl_FragColor = vec4(color, 1.0);
      }
    `;

    // 编译着色器
    const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

    // 创建程序
    this.program = gl.createProgram();
    gl.attachShader(this.program, vertexShader);
    gl.attachShader(this.program, fragmentShader);
    gl.linkProgram(this.program);

    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(this.program));
      return;
    }

    // 创建顶点缓冲
    const vertices = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1
    ]);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // 获取属性位置
    this.positionLocation = gl.getAttribLocation(this.program, 'a_position');
    this.timeLocation = gl.getUniformLocation(this.program, 'u_time');
    this.resolutionLocation = gl.getUniformLocation(this.program, 'u_resolution');

    // 设置视口
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // 开始动画
    this.animate();
  }

  compileShader(type, source) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  resize() {
    const gl = this.gl;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  animate() {
    const gl = this.gl;

    this.time += 0.016;

    gl.clearColor(0.976, 0.980, 0.988, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.program);

    gl.enableVertexAttribArray(this.positionLocation);
    gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.uniform1f(this.timeLocation, this.time);
    gl.uniform2f(this.resolutionLocation, this.canvas.width, this.canvas.height);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    requestAnimationFrame(() => this.animate());
  }

  fallbackGradient() {
    // CSS 渐变回退方案
    this.canvas.style.background = `
      radial-gradient(ellipse at 30% 20%, rgba(56, 189, 248, 0.1) 0%, transparent 50%),
      radial-gradient(ellipse at 70% 80%, rgba(14, 165, 233, 0.08) 0%, transparent 50%),
      radial-gradient(ellipse at 50% 50%, rgba(224, 242, 254, 0.3) 0%, transparent 70%),
      #f8fafc
    `;
  }
}

// 初始化
function initWaterRippleBackground() {
  const container = document.querySelector('.webgl-background');
  if (!container) return;

  const canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  container.appendChild(canvas);

  new WaterRippleBackground(canvas);
}

// DOM 加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWaterRippleBackground);
} else {
  initWaterRippleBackground();
}
