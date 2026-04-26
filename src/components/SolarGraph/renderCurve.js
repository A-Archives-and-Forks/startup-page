import { gaussianDistribution, linspace } from './solarMath';

const CURVE_COLOR = '#f0ebd8';
const HORIZON_COLOR = '#f0ebd8';
const NUM_POINTS = 500;

// Convert solar hour + elevation to canvas coordinates
function solarToCanvas(hour, elevation, width, amplitudeScale, horizonY) {
  const x = (hour / 24) * width;
  const y = horizonY - elevation * amplitudeScale;
  return { x, y };
}

// Render the solar elevation curve
export function renderCurve(ctx, width, height, amplitudeScale, sunrise) {
  // Position horizon line at ~65% down the canvas
  const horizonY = height * 0.65;

  const hours = linspace(0, 24, NUM_POINTS);

  // Draw the curve
  ctx.beginPath();
  ctx.strokeStyle = CURVE_COLOR;
  ctx.lineWidth = 1.5;
  ctx.shadowBlur = 4;
  ctx.shadowColor = 'rgba(240, 235, 216, 0.3)';

  for (let i = 0; i < hours.length; i++) {
    const elevation = gaussianDistribution(hours[i]);
    const { x, y } = solarToCanvas(hours[i], elevation, width, amplitudeScale, horizonY);
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Draw horizon line
  const sunriseEl = gaussianDistribution(sunrise);
  const { y: hLineY } = solarToCanvas(0, sunriseEl, width, amplitudeScale, horizonY);

  ctx.beginPath();
  ctx.strokeStyle = HORIZON_COLOR;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.6;
  ctx.moveTo(0, hLineY);
  ctx.lineTo(width, hLineY);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Return horizonY for other renderers to use
  return { horizonY, horizonElevation: sunriseEl };
}

export { solarToCanvas };
