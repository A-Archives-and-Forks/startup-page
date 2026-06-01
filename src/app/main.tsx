import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Route, Routes } from "react-router-dom";
import "@/assets/styles/index.css";
import { hydrateSettings } from "@/lib/settings";
import { ClerkErrorBoundary, ClerkUnavailableProvider } from "@/features/auth/ClerkStatus";

// views without layouts
import IndexPage from "@/features/dashboard/pages";
import WeatherPreviewPage from "@/pages/WeatherPreview";

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

void hydrateSettings().finally(async () => {
  const rootElement = document.getElementById("root");

  if (!rootElement) {
    throw new Error("Root element was not found.");
  }

  const routes = (
    <HashRouter>
      <Routes>
        <Route path="/" element={<IndexPage />} />
        <Route path="/weather-preview" element={<WeatherPreviewPage />} />
      </Routes>
    </HashRouter>
  );

  let content: ReactNode;

  if (CLERK_KEY) {
    // Dynamic import keeps Clerk out of the initial bundle for self-hosted installs
    const { ClerkProvider } = await import("@clerk/clerk-react");
    content = (
      // ClerkErrorBoundary catches invalid keys, network failures, or any other
      // Clerk init error and falls back to local-only mode automatically.
      <ClerkErrorBoundary fallback={<ClerkUnavailableProvider>{routes}</ClerkUnavailableProvider>}>
        <ClerkProvider publishableKey={CLERK_KEY} afterSignInUrl="/#/" afterSignUpUrl="/#/">
          {routes}
        </ClerkProvider>
      </ClerkErrorBoundary>
    );
  } else {
    content = (
      <ClerkUnavailableProvider>
        {routes}
      </ClerkUnavailableProvider>
    );
  }

  createRoot(rootElement).render(<StrictMode>{content}</StrictMode>);
});
