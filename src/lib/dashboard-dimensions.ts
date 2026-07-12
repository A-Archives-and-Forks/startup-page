export const DASHBOARD_TILE_WIDTH_PX = 144;
export const DASHBOARD_TILE_HEIGHT_PX = 144;
export const DASHBOARD_TALL_TILE_HEIGHT_PX = 320;
export const DASHBOARD_WIDE_TILE_WIDTH_PX = 320;

export const DASHBOARD_TILE = "min-h-0 min-w-0";
export const DASHBOARD_TALL_TILE = "min-h-0 min-w-0";
export const DASHBOARD_WIDE_TILE = "min-h-0 min-w-0";
export const DASHBOARD_LARGE_TILE = "min-h-0 min-w-0";

export const GRID_SINGLE = "col-span-1 row-span-1";
export const GRID_TALL = "col-span-1 row-span-2";
export const GRID_WIDE = "col-span-2 row-span-1";
export const GRID_FEATURE = "col-span-3 row-span-2";
export const GRID_SOLAR = "col-span-2 row-span-2";

// User-selectable tile sizes for the editable dashboard grid. "feature" reuses
// the responsive helper so a 3-wide tile clamps to the column count instead of
// overflowing the grid on narrow viewports.
export type TileSize = "small" | "wide" | "tall" | "large" | "feature";

export const TILE_SIZE_SPANS: Record<TileSize, string> = {
  small: "col-span-1 row-span-1",
  wide: "col-span-2 row-span-1",
  tall: "col-span-1 row-span-2",
  large: "col-span-2 row-span-2",
  feature: "grid-feature-responsive row-span-2",
};

export const TILE_SIZE_OPTIONS: { key: TileSize; label: string; title: string }[] = [
  { key: "small", label: "1×1", title: "Small" },
  { key: "wide", label: "2×1", title: "Wide" },
  { key: "tall", label: "1×2", title: "Tall" },
  { key: "large", label: "2×2", title: "Large" },
  { key: "feature", label: "3×2", title: "Feature" },
];

// Default order (matches the original hard-coded dashboard layout) and the
// default size for each tile. Used whenever the user has not customized the
// layout yet, and to append any newly-added tiles that are missing from a
// saved order.
export const DEFAULT_TILE_ORDER: string[] = [
  "videoTall",
  "videoSmall",
  "search",
  "bookmark1",
  "weather",
  "unsplash2",
  "bookmark2",
  "featurePanel",
  "unsplash3",
  "bookmark3",
  "solarGraph",
  "bookmark4",
  "bookmark5",
  "unsplash4",
  "unsplash5",
  "vaultPreview",
  "clock",
];

export const DEFAULT_TILE_SIZES: Record<string, TileSize> = {
  videoTall: "tall",
  videoSmall: "small",
  search: "wide",
  bookmark1: "small",
  weather: "wide",
  unsplash2: "small",
  bookmark2: "small",
  featurePanel: "feature",
  unsplash3: "small",
  bookmark3: "small",
  solarGraph: "large",
  bookmark4: "small",
  bookmark5: "small",
  unsplash4: "small",
  unsplash5: "small",
  vaultPreview: "small",
  clock: "small",
};
