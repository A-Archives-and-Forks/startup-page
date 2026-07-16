import React, { useEffect, useRef, useState } from "react";

const VERTEX_SHADER = `
attribute vec2 a_position;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_intensity;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
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
  float amp = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);

  for (int i = 0; i < 5; i++) {
    value += amp * noise(p);
    p = m * p + vec2(8.3, 3.1);
    amp *= 0.52;
  }

  return value;
}

float curtainColumns(vec2 uv, float phase) {
  float broad = fbm(vec2(uv.x * 3.1 + phase * 0.07, phase * 0.16));
  float medium = fbm(vec2(uv.x * 8.4 - phase * 0.04, 4.0 + phase * 0.13));
  float fine = fbm(vec2(uv.x * 21.0 + phase * 0.03, uv.y * 0.45 + phase * 0.08));
  float hair = fbm(vec2(uv.x * 48.0, uv.y * 1.2 + phase * 0.12));

  float columns = smoothstep(0.28, 0.84, broad) * 0.68;
  columns += smoothstep(0.38, 0.9, medium) * 0.36;
  columns += pow(smoothstep(0.48, 0.94, fine), 2.1) * 0.36;
  columns += pow(smoothstep(0.56, 1.0, hair), 4.0) * 0.18;

  return columns;
}

float curtainTexture(vec2 uv, float phase) {
  float verticalWash = fbm(vec2(uv.x * 2.0 + phase * 0.05, uv.y * 1.65 + phase * 0.04));
  float streaks = curtainColumns(uv, phase);
  float hanging = smoothstep(0.04, 0.2, uv.y) * (1.0 - smoothstep(0.96, 1.04, uv.y));
  float topWeight = 0.72 + smoothstep(0.58, 1.0, uv.y) * 0.32;
  float lowerGlow = exp(-abs(uv.y - 0.36) / 0.22) * 0.28;
  float softGaps = 1.0 - smoothstep(0.48, 0.86, fbm(vec2(uv.x * 5.7 + 9.0, phase * 0.11)));

  return (streaks * topWeight + verticalWash * 0.26 + lowerGlow) * hanging * mix(0.64, 1.0, softGaps);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float aspect = u_resolution.x / max(u_resolution.y, 1.0);
  vec2 p = vec2((uv.x - 0.5) * aspect + 0.5, uv.y);

  float phase = u_time * 0.35;
  float lowerFade = smoothstep(0.2, 0.34, uv.y);
  float upperFade = 1.0 - smoothstep(0.98, 1.0, uv.y);
  float breath = 0.88 + 0.12 * sin(phase * 0.16);

  float curtain = curtainTexture(p, phase);
  float secondLayer = curtainTexture(vec2(p.x * 0.82 + 0.09, p.y), phase + 11.0) * 0.54;
  float cloudyVeil = fbm(vec2(p.x * 2.2, p.y * 2.4 + sin(phase * 0.09) * 0.18));
  float broadHaze = smoothstep(0.26, 0.88, cloudyVeil) * 0.34;
  float glow = clamp((curtain + secondLayer + broadHaze) * breath, 0.0, 1.65);

  vec3 green = vec3(0.42, 0.92, 0.62);
  vec3 yellow = vec3(0.86, 0.83, 0.42);
  vec3 teal = vec3(0.20, 0.72, 0.70);
  vec3 blue = vec3(0.18, 0.42, 0.95);
  vec3 purple = vec3(0.58, 0.26, 0.92);
  vec3 red = vec3(0.96, 0.22, 0.34);
  vec3 blueShadow = vec3(0.16, 0.28, 0.42);
  float warmth = smoothstep(0.42, 0.92, fbm(vec2(p.x * 7.0 + 3.0, phase * 0.08)));
  float tealMix = smoothstep(0.25, 0.86, fbm(vec2(p.x * 4.2 - 6.0, p.y * 0.7)));
  float blueMix = smoothstep(0.38, 0.9, fbm(vec2(p.x * 5.8 + 11.0, p.y * 1.1 + phase * 0.05)));
  float purpleMix = smoothstep(0.5, 0.94, fbm(vec2(p.x * 8.8 - 4.0, p.y * 1.8 + phase * 0.04)));
  float redMix = smoothstep(0.62, 0.98, fbm(vec2(p.x * 6.2 + 18.0, p.y * 0.9 - phase * 0.03)));
  vec3 color = mix(green, yellow, warmth * 0.55);
  color = mix(color, teal, tealMix * 0.32);
  color = mix(color, blue, blueMix * 0.26);
  color = mix(color, purple, purpleMix * 0.2 * smoothstep(0.44, 0.9, uv.y));
  color = mix(color, red, redMix * 0.15 * smoothstep(0.54, 0.96, uv.y));
  color = mix(blueShadow, color, 0.78 + glow * 0.18);
  color *= 0.72 + glow * 0.52;

  float alpha = clamp(glow * 0.58, 0.0, 0.72) * lowerFade * upperFade * u_intensity;
  gl_FragColor = vec4(color, alpha);
}
`;

// Compile and link without blocking status checks — status verified lazily in rAF.
function createProgram(gl) {
  const vs = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vs, VERTEX_SHADER);
  gl.compileShader(vs);
  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fs, FRAGMENT_SHADER);
  gl.compileShader(fs);
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  return program;
}

interface AuroraLightsProps {
  intensity?: number;
}

export default function AuroraLights({ intensity = 1 }: AuroraLightsProps): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [supported, setSupported] = useState(true);
  const intensityRef = useRef(intensity);
  intensityRef.current = intensity;

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext("webgl", {
      antialias: false,
      alpha: true,
      premultipliedAlpha: false,
      powerPreference: "low-power",
    });

    if (!canvas || !gl) {
      setSupported(false);
      return undefined;
    }

    let animationFrame = 0;
    const program = createProgram(gl);
    const khrParallel = gl.getExtension("KHR_parallel_shader_compile") as { COMPLETION_STATUS_KHR: number } | null;

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

    const startedAt = performance.now();

    let glReady = false;
    let position = -1;
    let resolution: WebGLUniformLocation | null = null;
    let time: WebGLUniformLocation | null = null;
    let intensityUniform: WebGLUniformLocation | null = null;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1);
      const width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      const height = Math.max(1, Math.floor(canvas.clientHeight * dpr));

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      gl.viewport(0, 0, width, height);
    }

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    const AURORA_FRAME_MS = 1000 / 24;
    let lastFrameTime = 0;

    function render(now: number) {
      animationFrame = requestAnimationFrame(render);
      if (!canvas.clientWidth) return; // hidden (ancestor display:none) — skip GPU work

      if (!glReady) {
        if (khrParallel && !gl.getProgramParameter(program, khrParallel.COMPLETION_STATUS_KHR)) return;
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
          setSupported(false);
          cancelAnimationFrame(animationFrame);
          return;
        }
        position        = gl.getAttribLocation(program, "a_position");
        resolution      = gl.getUniformLocation(program, "u_resolution");
        time            = gl.getUniformLocation(program, "u_time");
        intensityUniform = gl.getUniformLocation(program, "u_intensity");
        glReady = true;
      }

      if (now - lastFrameTime < AURORA_FRAME_MS) return;
      lastFrameTime = now;

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(resolution, canvas.width, canvas.height);
      gl.uniform1f(time, (now - startedAt) / 1000);
      gl.uniform1f(intensityUniform, Math.max(0, Math.min(intensityRef.current, 1)));
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    animationFrame = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, []);

  if (!supported) {
    return <div className="weather-aurora-fallback absolute inset-0 pointer-events-none" aria-hidden="true" />;
  }

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full pointer-events-none mix-blend-screen" aria-hidden="true" />;
}
