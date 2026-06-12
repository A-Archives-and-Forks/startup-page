import { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Route, Routes } from "react-router-dom";
import "@/assets/styles/index.css";
import { hydrateSettingsFromIndexedDb } from "@/lib/settings";
import { useSettingsStore } from "@/features/settings/stores";

import AppLayout from "@/components/layout/AppLayout";

// Secondary routes are split out of the first-paint bundle — they load on
// navigation, so the dashboard shell isn't blocked downloading their code.
const BookmarksPage = lazy(() => import("@/pages/BookmarksPage"));
const ResourceVaultPage = lazy(() => import("@/pages/ResourceVaultPage"));
const WeatherPreviewPage = lazy(() => import("@/pages/WeatherPreview"));

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element was not found.");

// Render immediately — the store already hydrates from localStorage synchronously.
createRoot(rootElement).render(
  <StrictMode>
    <HashRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" />
            <Route path="/bookmarks" element={<BookmarksPage />} />
            <Route path="/resources" element={<ResourceVaultPage />} />
          </Route>
          <Route path="/weather-preview" element={<WeatherPreviewPage />} />
        </Routes>
      </Suspense>
    </HashRouter>
  </StrictMode>,
);

// Sync from IndexedDB in the background (more reliable than localStorage for large settings).
void hydrateSettingsFromIndexedDb().then(() => {
  useSettingsStore.getState().reloadSettings();
});
