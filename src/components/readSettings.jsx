import Cookies from 'js-cookie';
import defaultSettings from "../config/settings.json"

function mergeSettings(defaultValue, savedValue) {
  if (Array.isArray(defaultValue)) {
    if (!Array.isArray(savedValue)) {
      return defaultValue;
    }

    return defaultValue.map((item, index) => mergeSettings(item, savedValue[index]));
  }

  if (
    defaultValue &&
    typeof defaultValue === "object" &&
    !Array.isArray(defaultValue)
  ) {
    const source = savedValue && typeof savedValue === "object" ? savedValue : {};
    const merged = { ...source };

    Object.keys(defaultValue).forEach((key) => {
      merged[key] = mergeSettings(defaultValue[key], source[key]);
    });

    return merged;
  }

  return savedValue === undefined ? defaultValue : savedValue;
}

export function readSettings() {
  const settings = Cookies.get('settings');

  if (settings) {
    return mergeSettings(defaultSettings, JSON.parse(settings));
  }

  return defaultSettings;
}

export function writeSettings(settings) {
  Cookies.set('settings', JSON.stringify(settings));
}

export function resetSettings() {
  Cookies.remove('settings');
  return defaultSettings;
}
