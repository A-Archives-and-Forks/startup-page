// Color palettes and interpolation helpers

// Parse hex color to [r, g, b] (0-255)
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Linearly interpolate between two [r,g,b] arrays
function lerpRgb(a, b, t) {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

// Convert [r,g,b] to CSS string
function rgbString(rgb, alpha = 1) {
  return `rgba(${Math.round(rgb[0])},${Math.round(rgb[1])},${Math.round(rgb[2])},${alpha})`;
}

// Interpolate through an array of color stops [{pos, color}]
// pos: 0-1, color: hex string
export function interpolateColorStops(stops, t) {
  t = Math.max(0, Math.min(1, t));
  if (t <= stops[0].pos) return hexToRgb(stops[0].color);
  if (t >= stops[stops.length - 1].pos) return hexToRgb(stops[stops.length - 1].color);

  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i].pos && t <= stops[i + 1].pos) {
      const local = (t - stops[i].pos) / (stops[i + 1].pos - stops[i].pos);
      return lerpRgb(hexToRgb(stops[i].color), hexToRgb(stops[i + 1].color), local);
    }
  }
  return hexToRgb(stops[stops.length - 1].color);
}

// Sky color stops based on sun elevation (normalized 0-1 where 0=deepest night, 1=noon)
const SKY_TOP_STOPS = [
  { pos: 0.0, color: '#0a0a1a' },  // deep night
  { pos: 0.15, color: '#0d1b2a' }, // late night
  { pos: 0.3, color: '#1b0a2e' },  // pre-dawn purple
  { pos: 0.45, color: '#2c3e6b' }, // dawn blue
  { pos: 0.6, color: '#4a90d9' },  // morning blue
  { pos: 1.0, color: '#2c5f8a' },  // midday deep blue
];

const SKY_BOTTOM_STOPS = [
  { pos: 0.0, color: '#0d1b2a' },  // deep night
  { pos: 0.15, color: '#1a1a2e' }, // late night
  { pos: 0.3, color: '#ff6b35' },  // dawn orange
  { pos: 0.45, color: '#ffd166' }, // dawn gold
  { pos: 0.6, color: '#87CEEB' },  // morning sky
  { pos: 1.0, color: '#87CEEB' },  // midday sky
];

// Get sky gradient colors based on sun elevation factor (0=night, 1=noon)
export function getSkyColors(elevationFactor) {
  const top = interpolateColorStops(SKY_TOP_STOPS, elevationFactor);
  const bottom = interpolateColorStops(SKY_BOTTOM_STOPS, elevationFactor);
  return {
    top: rgbString(top),
    bottom: rgbString(bottom),
  };
}

// Sun glow color based on time of day (0-24)
export function getSunGlowColor(hour) {
  const stops = [
    { pos: 0.0, color: '#f0a030' },  // midnight warm
    { pos: 0.25, color: '#ff8c42' }, // sunrise orange
    { pos: 0.5, color: '#7ab8f5' },  // midday blue
    { pos: 0.75, color: '#ff6b35' }, // sunset orange
    { pos: 1.0, color: '#f0a030' },  // midnight warm
  ];
  const rgb = interpolateColorStops(stops, hour / 24);
  return rgbString(rgb);
}

// Horizon glow color for sunrise
export function getSunriseHorizonColor(intensity) {
  const stops = [
    { pos: 0.0, color: '#8b0000' },  // deep red
    { pos: 0.3, color: '#ff4500' },  // orange-red
    { pos: 0.6, color: '#ff8c42' },  // orange
    { pos: 1.0, color: '#ffd166' },  // gold
  ];
  return interpolateColorStops(stops, intensity);
}

// Horizon glow color for sunset
export function getSunsetHorizonColor(intensity) {
  const stops = [
    { pos: 0.0, color: '#4a0020' },  // deep crimson
    { pos: 0.3, color: '#c41e3a' },  // crimson
    { pos: 0.6, color: '#ff4500' },  // burnt orange
    { pos: 1.0, color: '#ff8c42' },  // amber
  ];
  return interpolateColorStops(stops, intensity);
}

export { hexToRgb, lerpRgb, rgbString };
