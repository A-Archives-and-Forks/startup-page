// Solar position math utilities
// References:
// https://solarsena.com/solar-elevation-angle-altitude/
// https://www.pveducation.org/pvcdrom/properties-of-sunlight/elevation-angle
// https://planetcalc.com/4270/

const TO_RAD = Math.PI / 180.0;

export function deg2rad(deg) {
  return (deg * Math.PI) / 180.0;
}

export function rad2deg(rad) {
  return (rad * 180.0) / Math.PI;
}

export function linspace(start, stop, n) {
  const arr = [];
  const step = (stop - start) / (n - 1);
  for (let i = 0; i < n; i++) {
    arr.push(start + step * i);
  }
  return arr;
}

export function forceRange(v, max) {
  if (v < 0) return v + max;
  if (v >= max) return v - max;
  return v;
}

export function gaussianDistribution(x, mean = 12, std = 5) {
  // Normalized so peak = 1.0; std controls width only, amplitude handled by AMPLITUDE_SCALE
  return Math.exp((-1 * (x - mean) ** 2) / (2 * std ** 2));
}

export function eventTime(date, latitude, longitude, beforeNoon = true, zenith = 90.8) {
  const day = date.getDate();
  let month = date.getMonth() + 1;
  let year = date.getFullYear();

  const N1 = Math.floor((275 * month) / 9);
  const N2 = Math.floor((month + 9) / 12);
  const N3 = 1 + Math.floor((year - 4 * Math.floor(year / 4) + 2) / 3);
  const N = N1 - N2 * N3 + day - 30;

  const lngHour = longitude / 15;

  let t;
  if (beforeNoon) {
    t = N + (6 - lngHour) / 24;
  } else {
    t = N + (18 - lngHour) / 24;
  }

  let M = 0.9856 * t - 3.289;
  let L =
    M +
    1.916 * Math.sin(TO_RAD * M) +
    0.02 * Math.sin(TO_RAD * 2 * M) +
    282.634;
  L = forceRange(L, 360);

  let RA = (1 / TO_RAD) * Math.atan(0.91764 * Math.tan(TO_RAD * L));
  RA = forceRange(RA, 360);

  const Lquadrant = Math.floor(L / 90) * 90;
  const RAquadrant = Math.floor(RA / 90) * 90;
  RA = RA + (Lquadrant - RAquadrant);
  RA = RA / 15;

  const sinDec = 0.39782 * Math.sin(TO_RAD * L);
  const cosDec = Math.cos(Math.asin(sinDec));

  const cosH =
    (Math.cos(TO_RAD * zenith) -
      sinDec * Math.sin(TO_RAD * latitude)) /
    (cosDec * Math.cos(TO_RAD * latitude));

  if (cosH > 1 || cosH < -1) return null;

  let H;
  if (beforeNoon) {
    H = 360 - (1 / TO_RAD) * Math.acos(cosH);
  } else {
    H = (1 / TO_RAD) * Math.acos(cosH);
  }

  H = H / 15;
  const T = H + RA - 0.06571 * t - 6.622;

  let UT = T - lngHour;
  UT = forceRange(UT, 24);

  let hr = forceRange(Math.floor(UT), 24);
  let min = +((UT - Math.floor(UT)) * 60).toFixed(2);
  if (min === 60) {
    hr += 1;
    min = 0;
  }

  let dayOut = day;
  let monthOut = month;
  let yearOut = year;

  if (hr === 24) {
    hr = 0;
    dayOut += 1;
    if (dayOut > new Date(yearOut, monthOut, 0).getDate()) {
      dayOut = 1;
      monthOut += 1;
      if (monthOut > 12) {
        monthOut = 1;
        yearOut += 1;
      }
    }
  }

  return new Date(Date.UTC(yearOut, monthOut - 1, dayOut, hr, min));
}

export function calculateSolarSettings(latitude, longitude) {
  const date = new Date();
  const currentTime = date.getHours() + date.getMinutes() / 60;

  const sunriseDate = eventTime(date, latitude, longitude, true, 90.8);
  const sunrise = sunriseDate
    ? +(sunriseDate.getUTCHours() + sunriseDate.getUTCMinutes() / 60).toFixed(0)
    : 6;

  const sunsetDate = eventTime(date, latitude, longitude, false, 90.8);
  const sunset = sunsetDate
    ? +(sunsetDate.getUTCHours() + sunsetDate.getUTCMinutes() / 60).toFixed(0)
    : 18;

  const civilTwilightDate = eventTime(date, latitude, longitude, true, 96);
  const sunriseCivilTwilight = civilTwilightDate
    ? Math.round(civilTwilightDate.getUTCHours() + civilTwilightDate.getUTCMinutes() / 60)
    : 5;

  return { currentTime, sunrise, sunset, sunriseCivilTwilight };
}

export function getCurrentLst() {
  const now = new Date();
  return (now.getHours() * 60 + now.getMinutes()) / 60;
}
