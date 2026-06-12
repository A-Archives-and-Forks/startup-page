const CURVE_COLOR = '#f0ebd8';
const HORIZON_COLOR = '#f0ebd8';

// Map elevation (degrees) to canvas Y
function elevToCanvasY(elevation, maxEl, minEl, horizonY, canvasHeight) {
  if (elevation >= 0) {
    return horizonY * (1 - elevation / maxEl);
  }
  const below = canvasHeight - horizonY;
  return horizonY + (Math.abs(elevation) / Math.abs(minEl)) * below;
}

// Convert solar hour + elevation (degrees) to canvas coordinates
export function solarToCanvas(hour, elevation, width, height, solar, horizonY) {
  const x = (hour / 24) * width;
  const y = elevToCanvasY(
    elevation,
    solar.maxElevation,
    solar.minElevation,
    horizonY,
    height
  );
  return { x, y };
}

// Cache the Path2D for the solar curve — rebuilt only when solar data or canvas size changes.
// Using object identity for `solar` is safe because calculateSolarContext always returns a new object.
let _cachedPath: Path2D | null = null;
let _cacheTag: { solar: object; width: number; height: number } | null = null;

function getSolarPath(solar, width, height, horizonY): Path2D {
  if (
    _cacheTag &&
    _cacheTag.solar === solar &&
    _cacheTag.width === width &&
    _cacheTag.height === height
  ) {
    return _cachedPath!;
  }
  const path = new Path2D();
  const { curveHours, curveElevations } = solar;
  for (let i = 0; i < curveHours.length; i++) {
    const { x, y } = solarToCanvas(curveHours[i], curveElevations[i], width, height, solar, horizonY);
    if (i === 0) path.moveTo(x, y);
    else path.lineTo(x, y);
  }
  _cachedPath = path;
  _cacheTag = { solar, width, height };
  return path;
}

// Render the solar elevation curve and horizon line
export function renderCurve(ctx, width, height, solar) {
  // Position horizon proportional to annual elevation range
  const horizonFrac =
    solar.maxElevation / (solar.maxElevation - solar.minElevation);
  const horizonY = Math.max(
    height * 0.2,
    Math.min(height * 0.85, height * horizonFrac)
  );
  const crispHorizonY = Math.round(horizonY) + 0.5;

  // Reuse cached Path2D — the 1440-point loop only runs when data or canvas size changes
  const path = getSolarPath(solar, width, height, horizonY);

  // Multi-width soft glow without shadowBlur (shadowBlur on complex paths is the main perf bottleneck)
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.strokeStyle = 'rgba(240, 235, 216, 0.07)';
  ctx.lineWidth = 9;
  ctx.stroke(path);

  ctx.strokeStyle = 'rgba(240, 235, 216, 0.13)';
  ctx.lineWidth = 5;
  ctx.stroke(path);

  ctx.strokeStyle = CURVE_COLOR;
  ctx.lineWidth = 1.6;
  ctx.stroke(path);

  ctx.restore();

  // Horizon line — two strokes, no shadowBlur
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, crispHorizonY);
  ctx.lineTo(width, crispHorizonY);
  ctx.strokeStyle = 'rgba(240, 235, 216, 0.12)';
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, crispHorizonY);
  ctx.lineTo(width, crispHorizonY);
  ctx.strokeStyle = HORIZON_COLOR;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.58;
  ctx.stroke();
  ctx.restore();

  return { horizonY: crispHorizonY };
}
