import Cookies from "js-cookie";
import defaultSettings from "../config/settings.json";

const SETTINGS_COOKIE_KEY = "settings";
const SETTINGS_LOCAL_STORAGE_KEY = "startup-page.settings";
const SETTINGS_DB_NAME = "startup-page-db";
const SETTINGS_STORE_NAME = "settings";
const SETTINGS_RECORD_KEY = "workspace-settings";

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

function parseSettings(rawSettings) {
  if (!rawSettings) {
    return defaultSettings;
  }

  try {
    return mergeSettings(defaultSettings, JSON.parse(rawSettings));
  } catch (_error) {
    return defaultSettings;
  }
}

function getIndexedDb() {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      resolve(null);
      return;
    }

    const request = window.indexedDB.open(SETTINGS_DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SETTINGS_STORE_NAME)) {
        db.createObjectStore(SETTINGS_STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readSettingsFromIndexedDb() {
  const db = await getIndexedDb();
  if (!db) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SETTINGS_STORE_NAME, "readonly");
    const store = transaction.objectStore(SETTINGS_STORE_NAME);
    const request = store.get(SETTINGS_RECORD_KEY);

    request.onsuccess = () => {
      resolve(request.result || null);
    };
    request.onerror = () => reject(request.error);
  });
}

async function writeSettingsToIndexedDb(settings) {
  const db = await getIndexedDb();
  if (!db) {
    return;
  }

  await new Promise((resolve, reject) => {
    const transaction = db.transaction(SETTINGS_STORE_NAME, "readwrite");
    const store = transaction.objectStore(SETTINGS_STORE_NAME);
    const request = store.put(settings, SETTINGS_RECORD_KEY);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function clearSettingsFromIndexedDb() {
  const db = await getIndexedDb();
  if (!db) {
    return;
  }

  await new Promise((resolve, reject) => {
    const transaction = db.transaction(SETTINGS_STORE_NAME, "readwrite");
    const store = transaction.objectStore(SETTINGS_STORE_NAME);
    const request = store.delete(SETTINGS_RECORD_KEY);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function readSettingsFromLocalStorage() {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }

  return window.localStorage.getItem(SETTINGS_LOCAL_STORAGE_KEY);
}

function writeSettingsToLocalStorage(settings) {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }

  window.localStorage.setItem(
    SETTINGS_LOCAL_STORAGE_KEY,
    JSON.stringify(settings)
  );
}

function clearSettingsFromLocalStorage() {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }

  window.localStorage.removeItem(SETTINGS_LOCAL_STORAGE_KEY);
}

function migrateCookieSettings() {
  const cookieSettings = Cookies.get(SETTINGS_COOKIE_KEY);
  if (!cookieSettings) {
    return null;
  }

  Cookies.remove(SETTINGS_COOKIE_KEY);
  return parseSettings(cookieSettings);
}

export function readSettings() {
  const cachedSettings = readSettingsFromLocalStorage();
  if (cachedSettings) {
    return parseSettings(cachedSettings);
  }

  const migratedCookieSettings = migrateCookieSettings();
  if (migratedCookieSettings) {
    writeSettingsToLocalStorage(migratedCookieSettings);
    void writeSettingsToIndexedDb(migratedCookieSettings);
    return migratedCookieSettings;
  }

  return defaultSettings;
}

export async function writeSettings(settings) {
  const mergedSettings = mergeSettings(defaultSettings, settings);
  writeSettingsToLocalStorage(mergedSettings);
  Cookies.remove(SETTINGS_COOKIE_KEY);
  await writeSettingsToIndexedDb(mergedSettings);
  return mergedSettings;
}

export async function resetSettings() {
  clearSettingsFromLocalStorage();
  Cookies.remove(SETTINGS_COOKIE_KEY);
  await clearSettingsFromIndexedDb();
  writeSettingsToLocalStorage(defaultSettings);
  await writeSettingsToIndexedDb(defaultSettings);
  return defaultSettings;
}

export async function hydrateSettingsFromIndexedDb() {
  const indexedDbSettings = await readSettingsFromIndexedDb();
  if (!indexedDbSettings) {
    return readSettings();
  }

  const mergedSettings = mergeSettings(defaultSettings, indexedDbSettings);
  writeSettingsToLocalStorage(mergedSettings);
  return mergedSettings;
}

export function exportSettingsBlob(settings) {
  return new Blob([JSON.stringify(settings, null, 2)], {
    type: "application/json",
  });
}

export async function importSettingsFromFile(file) {
  const rawFile = await file.text();
  const parsedSettings = parseSettings(rawFile);
  await writeSettings(parsedSettings);
  return parsedSettings;
}
