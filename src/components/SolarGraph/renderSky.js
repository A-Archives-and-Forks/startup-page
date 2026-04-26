import { getSkyColors } from './colors';
import { gaussianDistribution } from './solarMath';

// Render sky gradient background based on sun position
export function renderSky(ctx, width, height, lst, sunrise) {
  // Calculate elevation factor: 0 = deep night, 1 = solar noon
  const sunY = gaussianDistribution(lst);
  const maxY = gaussianDistribution(12); // peak at noon
  const horizonY = gaussianDistribution(sunrise);

  let elevationFactor = 0;
  if (sunY > horizonY) {
    elevationFactor = Math.min(1, (sunY - horizonY) / (maxY - horizonY));
  } else {
    // Below horizon — check how close to horizon
    const nightDepth = Math.max(0, 1 - sunY / horizonY);
    elevationFactor = Math.max(0, 0.15 * (1 - nightDepth));
  }

  const { top, bottom } = getSkyColors(elevationFactor);

  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, top);
  gradient.addColorStop(1, bottom);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}
