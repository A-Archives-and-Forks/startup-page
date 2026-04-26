import { gaussianDistribution } from './solarMath';
import { getSunriseHorizonColor, getSunsetHorizonColor, rgbString } from './colors';
import { solarToCanvas } from './renderCurve';

// Render dramatic sunrise/sunset horizon glow
export function renderHorizonGlow(ctx, width, lst, amplitudeScale, sunrise, horizonY) {
  const elevation = gaussianDistribution(lst);
  const horizonElevation = gaussianDistribution(sunrise);

  const { x: sunX } = solarToCanvas(lst, elevation, width, amplitudeScale, horizonY);
  const { y: horizonCanvasY } = solarToCanvas(lst, horizonElevation, width, amplitudeScale, horizonY);

  // Only show glow when sun is near the horizon
  const elDiff = elevation - horizonElevation;
  const maxEl = gaussianDistribution(12) - horizonElevation;

  // Bell-curve intensity: peaks when sun is at horizon, fades as it rises/sets
  const distFromHorizon = Math.abs(elDiff) / maxEl;
  if (distFromHorizon > 0.4) return; // Too far from horizon

  const intensity = Math.max(0, 1 - distFromHorizon / 0.4);
  const bellIntensity = Math.pow(intensity, 1.5);

  if (bellIntensity < 0.02) return;

  const isMorning = lst < 12;
  const colorFn = isMorning ? getSunriseHorizonColor : getSunsetHorizonColor;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  // Main horizontal glow band at horizon
  const glowHeight = 60 * bellIntensity;
  const glowWidth = width * 0.6;

  // Center glow on sun's x position
  const centerX = sunX;

  // Radial gradient for the main glow
  const mainGlow = ctx.createRadialGradient(
    centerX, horizonCanvasY,
    5,
    centerX, horizonCanvasY,
    glowWidth * 0.5
  );

  const color1 = colorFn(0.8);
  const color2 = colorFn(0.5);
  const color3 = colorFn(0.2);

  mainGlow.addColorStop(0, rgbString(color1, 0.35 * bellIntensity));
  mainGlow.addColorStop(0.3, rgbString(color2, 0.15 * bellIntensity));
  mainGlow.addColorStop(0.7, rgbString(color3, 0.05 * bellIntensity));
  mainGlow.addColorStop(1, 'rgba(0,0,0,0)');

  ctx.fillStyle = mainGlow;
  ctx.fillRect(0, horizonCanvasY - glowHeight, width, glowHeight * 2);

  // Secondary wider, softer glow
  const wideGlow = ctx.createRadialGradient(
    centerX, horizonCanvasY,
    10,
    centerX, horizonCanvasY,
    glowWidth * 0.8
  );
  wideGlow.addColorStop(0, rgbString(color2, 0.12 * bellIntensity));
  wideGlow.addColorStop(0.5, rgbString(color3, 0.04 * bellIntensity));
  wideGlow.addColorStop(1, 'rgba(0,0,0,0)');

  ctx.fillStyle = wideGlow;
  ctx.fillRect(0, horizonCanvasY - glowHeight * 1.5, width, glowHeight * 3);

  ctx.restore();
}
