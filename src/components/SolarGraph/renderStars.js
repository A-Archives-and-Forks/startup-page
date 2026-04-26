import { gaussianDistribution } from './solarMath';

// Generate a stable star field (called once on mount)
export function createStarField(count = 400) {
  const stars = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random(),         // normalized 0-1
      y: Math.random(),         // normalized 0-1
      size: 0.5 + Math.random() * 1.5,
      baseBrightness: 0.4 + Math.random() * 0.6,
      twinkleFreq: 0.5 + Math.random() * 2.0,
      twinklePhase: Math.random() * Math.PI * 2,
      twinkleAmplitude: 0.1 + Math.random() * 0.3,
      // Slight color variation: warm-white vs cool-white
      warmth: Math.random(),
    });
  }
  return stars;
}

// Render stars with twinkle and fade based on sky brightness
export function renderStars(ctx, width, height, stars, time, lst, sunrise) {
  const sunY = gaussianDistribution(lst);
  const horizonY = gaussianDistribution(sunrise);

  // Fade stars when sun is above horizon
  let starOpacity = 1;
  if (sunY > horizonY) {
    const maxY = gaussianDistribution(12);
    const range = maxY - horizonY;
    starOpacity = Math.max(0, 1 - ((sunY - horizonY) / range) * 1.5);
  }

  if (starOpacity <= 0.01) return;

  for (const star of stars) {
    const twinkle =
      star.baseBrightness +
      star.twinkleAmplitude *
        Math.sin(time * star.twinkleFreq + star.twinklePhase);
    const alpha = Math.max(0, Math.min(1, twinkle)) * starOpacity;

    if (alpha < 0.02) continue;

    const x = star.x * width;
    const y = star.y * height;

    // Color: blend between cool white and warm white
    const r = Math.round(220 + star.warmth * 35);
    const g = Math.round(220 + star.warmth * 20);
    const b = Math.round(235 - star.warmth * 30);

    ctx.beginPath();
    ctx.arc(x, y, star.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
    ctx.fill();
  }
}
