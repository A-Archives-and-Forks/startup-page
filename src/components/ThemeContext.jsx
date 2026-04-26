import React from "react";

const resolveTheme = (themeMode) => {
  if (
    themeMode === "system" &&
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }

  return themeMode === "dark" ? "dark" : "light";
};

export const ThemeContext = React.createContext();

const getInitialThemeMode = (initialThemeMode) => {
  if (initialThemeMode) {
    return initialThemeMode;
  }

  if (typeof window !== "undefined" && window.localStorage) {
    const storedThemeMode = window.localStorage.getItem("color-theme-mode");
    if (typeof storedThemeMode === "string") {
      return storedThemeMode;
    }

    const storedTheme = window.localStorage.getItem("color-theme");
    if (storedTheme === "light" || storedTheme === "dark") {
      return storedTheme;
    }
  }

  return "system";
};

const getInitialThemePalette = (initialThemePalette) => {
  if (initialThemePalette) {
    return initialThemePalette;
  }

  if (typeof window !== "undefined" && window.localStorage) {
    const storedThemePalette = window.localStorage.getItem("color-theme-palette");
    if (typeof storedThemePalette === "string") {
      return storedThemePalette;
    }
  }

  return "zen";
};

export default function ThemeProvider({ initialThemeMode, initialThemePalette, children }) {
  const [themeMode, setThemeMode] = React.useState(() => getInitialThemeMode(initialThemeMode));
  const [themePalette, setThemePalette] = React.useState(() => getInitialThemePalette(initialThemePalette));
  const [theme, setTheme] = React.useState(() => resolveTheme(getInitialThemeMode(initialThemeMode)));

  const applyTheme = React.useCallback((rawThemeMode, rawThemePalette) => {
    const resolvedTheme = resolveTheme(rawThemeMode);
    const root = window.document.documentElement;
    const isDark = resolvedTheme === "dark";

    root.classList.remove(isDark ? "light" : "dark");
    root.classList.add(resolvedTheme);
    root.dataset.theme = rawThemePalette;

    localStorage.setItem("color-theme", resolvedTheme);
    localStorage.setItem("color-theme-mode", rawThemeMode);
    localStorage.setItem("color-theme-palette", rawThemePalette);
    setTheme(resolvedTheme);
  }, []);

  React.useEffect(() => {
    applyTheme(themeMode, themePalette);
  }, [applyTheme, themeMode, themePalette]);

  React.useEffect(() => {
    if (themeMode !== "system") {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => applyTheme("system", themePalette);

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [applyTheme, themeMode, themePalette]);

  return (
    <ThemeContext.Provider value={{ theme, themeMode, setThemeMode, themePalette, setThemePalette }}>
      {children}
    </ThemeContext.Provider>
  );
};
