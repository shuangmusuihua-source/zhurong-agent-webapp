// UROTSURUBAMI 主题 - WebGL 水波纹效果

function initWaterRipple(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) return null;

  return { canvas, gl };
}

function setupWaterRipple(canvasObj) {
  if (!canvasObj) return;

  const { canvas, gl } = canvasObj;

  // 顶点着色器
  const vertexShaderSource = `
    attribute vec2 a_position;
    varying vec2 v_uv;
    void main() {
      v_uv = a_position * 0.5 + 0.5;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  // 片段着色器 - 水波纹效果
  const fragmentShaderSource = `
    precision mediump float;
    varying vec2 v_uv;
    uniform float u_time;
    uniform vec2 u_resolution;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    float fbm(vec2 p) {
      float value = 0.0;
      float amplitude = 0.5;
      for (int i = 0; i < 4; i++) {
        value += amplitude * noise(p);
        p *= 2.0;
        amplitude *= 0.5;
      }
      return value;
    }

    void main() {
      vec2 uv = v_uv;
      vec2 center = vec2(1.5, 1.3);

      float wave1 = sin(length(uv - center) * 12.0 - u_time * 0.75) * 0.5 + 0.5;
      float wave2 = sin(length(uv - center) * 8.0 - u_time * 0.6) * 0.5 + 0.5;
      float wave3 = sin(length(uv - center) * 16.0 - u_time * 0.9) * 0.5 + 0.5;

      float n1 = fbm(uv * 2.0 + u_time * 0.05);
      float n2 = fbm(uv * 3.0 - u_time * 0.075);
      float n3 = fbm(uv * 1.5 + vec2(u_time * 0.04, -u_time * 0.025));

      float waves = wave1 * 0.25 + wave2 * 0.25 + wave3 * 0.25;
      waves = waves * 0.6;

      float noiseCombo = n1 * 0.2 + n2 * 0.15 + n3 * 0.15;
      float final = waves * 0.5 + noiseCombo * 0.5;

      vec3 colorBengara = vec3(0.56, 0.18, 0.08);
      vec3 colorKurotsurubami = vec3(0.33, 0.29, 0.28);
      vec3 color = mix(colorKurotsurubami * 0.08, colorBengara * 0.12, final);

      float highlight = pow(wave1, 3.0) * 0.05;
      color += vec3(highlight);

      gl_FragColor = vec4(color, 1.0);
    }
  `;

  function createShader(gl, type, source) {
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

  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program));
    return;
  }

  const positions = new Float32Array([
    -1, -1,
     1, -1,
    -1,  1,
     1,  1,
  ]);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

  const positionLocation = gl.getAttribLocation(program, 'a_position');
  const timeLocation = gl.getUniformLocation(program, 'u_time');
  const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  const startTime = Date.now();

  function render() {
    const time = (Date.now() - startTime) / 1000;
    gl.clearColor(0.33, 0.29, 0.28, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.enableVertexAttribArray(positionLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.uniform1f(timeLocation, time);
    gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(render);
  }

  render();
}

// 初始化所有水波纹 canvas
document.addEventListener('DOMContentLoaded', () => {
  const canvases = document.querySelectorAll('.water-canvas');
  canvases.forEach(canvas => {
    const canvasObj = initWaterRipple(canvas.id);
    setupWaterRipple(canvasObj);
  });
});