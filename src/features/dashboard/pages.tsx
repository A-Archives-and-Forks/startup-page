/*eslint-disable*/
import React from "react";
import { useNavigate } from "react-router-dom";

import { useSettingsStore } from "@/features/settings/stores";
import {
  DASHBOARD_LARGE_TILE,
  DASHBOARD_TALL_TILE,
  DASHBOARD_TILE,
  DASHBOARD_WIDE_TILE,
  GRID_FEATURE,
  GRID_SINGLE,
  GRID_SOLAR,
  GRID_TALL,
  GRID_WIDE,
} from "@/lib/dashboard-dimensions";

import Clock from "@/features/dashboard/components/Clock";
import FeaturePanel from "@/features/dashboard/components/FeaturePanel";
import Unsplash from "@/features/media/components/Unsplash";
import SearchBox from "@/features/dashboard/components/Search";
import Bookmark from "@/features/bookmarks/components/Bookmark";
import ResourceVaultPreview from "@/features/resourceVault/components/ResourceVaultPreview";

import desert from "@/assets/media/desert.mp4";

// The WebGL-heavy tiles (large inline GLSL shaders) are split into their own
// chunks so the dashboard grid paints and becomes interactive immediately while
// these stream in and compile their shaders off the first-paint critical path.
const SolarGraph = React.lazy(() => import("@/features/media/solarGraph"));
const WeatherBox = React.lazy(() =>
  import("@/features/weather/components/WeatherBox").then((m) => ({ default: m.WeatherBox })),
);

const BOOKMARK_CATEGORY_KEY = "startup-page.active-bookmark-category";

function DecorativeVideoTile({
  className,
  src,
  fallbackSrc,
  width,
  height,
  left,
  top,
}: {
  className?: string;
  src?: string;
  fallbackSrc?: string;
  width?: string;
  height?: string;
  left?: string;
  top?: string;
}) {
  const [activeSrc, setActiveSrc] = React.useState(src || fallbackSrc);

  React.useEffect(() => {
    setActiveSrc(src || fallbackSrc);
  }, [src, fallbackSrc]);

  return (
    <div className={`${className} relative overflow-hidden`}>
      <video
        key={activeSrc}
        className="absolute max-w-none object-cover"
        style={{ width, height, left, top }}
        src={activeSrc}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        referrerPolicy="no-referrer"
        onError={() => {
          if (activeSrc !== fallbackSrc) setActiveSrc(fallbackSrc);
        }}
      />
    </div>
  );
}

export default function Index() {
  const navigate = useNavigate();
  const settings = useSettingsStore((state) => state.settings);
  const hiddenBoxes = settings.layout?.hiddenBoxes || {};
  const showBox = (id: string) => !hiddenBoxes[id];
  const ui = settings.ui || {};
  const decorativeVideo = settings.decorativeVideo || {};
  const bookmarkGroups = Array.isArray(settings.bookmark) ? settings.bookmark : [];
  const bookmarkBoxCategories = settings.layout?.bookmarkBoxCategories || [0, 1, 2, 3, 4];
  const getBookmarkGroupForBox = (boxIndex: number) =>
    bookmarkGroups[bookmarkBoxCategories[boxIndex]] ||
    bookmarkGroups[boxIndex] || { title: "", content: [] };
  const gapClass = ui.gridDensity === "compact" ? "gap-y-4 gap-x-4" : "gap-y-6 gap-x-6";
  const decorativeGap = ui.gridDensity === "compact" ? 16 : 24;
  const tilePx = (ui.tileSize || 9) * 16;
  const tallTilePx = tilePx * 2 + decorativeGap;
  const minWidthFor = (n: number) => n * tilePx + (n - 1) * decorativeGap + 32;
  const gridCss = `
    .dashboard-grid,
    .bookmark-page-grid {
      --dashboard-tile-max: ${tilePx}px;
      --dashboard-gap: ${decorativeGap}px;
      --dashboard-inline-padding: 2rem;
      --dashboard-tile: clamp(88px, calc((100vw - var(--dashboard-inline-padding) - var(--dashboard-gap)) / 2), var(--dashboard-tile-max));
      grid-template-columns: repeat(2, minmax(0, var(--dashboard-tile)));
      grid-auto-rows: var(--dashboard-tile);
    }
    .dashboard-grid .grid-feature-responsive {
      grid-column: span 2 / span 2;
    }
    @media (min-width: ${minWidthFor(3)}px) {
      .dashboard-grid,
      .bookmark-page-grid {
        --dashboard-tile: clamp(88px, calc((100vw - var(--dashboard-inline-padding) - ${decorativeGap * 2}px) / 3), var(--dashboard-tile-max));
        grid-template-columns: repeat(3, minmax(0, var(--dashboard-tile)));
      }
      .dashboard-grid .grid-feature-responsive {
        grid-column: span 3 / span 3;
      }
    }
    @media (min-width: ${minWidthFor(5)}px) {
      .dashboard-grid,
      .bookmark-page-grid {
        --dashboard-tile: clamp(88px, calc((100vw - var(--dashboard-inline-padding) - ${decorativeGap * 4}px) / 5), var(--dashboard-tile-max));
        grid-template-columns: repeat(5, minmax(0, var(--dashboard-tile)));
      }
    }
    @media (min-width: ${minWidthFor(7)}px) {
      .dashboard-grid,
      .bookmark-page-grid {
        --dashboard-tile: clamp(88px, calc((100vw - var(--dashboard-inline-padding) - ${decorativeGap * 6}px) / 7), var(--dashboard-tile-max));
        grid-template-columns: repeat(7, minmax(0, var(--dashboard-tile)));
      }
    }
  `;
  const radiusClass =
    ui.cardStyle === "soft"
      ? "rounded-[2rem]"
      : ui.cardStyle === "sharp"
        ? "rounded-md"
        : "rounded-xl";
  const showDecorativeMedia = ui.showDecorativeMedia !== false;
  const decorativeVideoUrls = Array.isArray(decorativeVideo.urls)
    ? decorativeVideo.urls.filter(
        (value: any) => typeof value === "string" && value.trim() !== "",
      )
    : [];
  const [decorativeVideoUrl] = React.useState(() => {
    if (!decorativeVideoUrls.length) return desert;
    const randomIndex = Math.floor(Math.random() * decorativeVideoUrls.length);
    return decorativeVideoUrls[randomIndex] || desert;
  });

  const openBookmarkView = (categoryIndex: number) => {
    window.localStorage?.setItem(BOOKMARK_CATEGORY_KEY, String(categoryIndex));
    navigate("/bookmarks");
  };

  const panel = (extra = "") => `${radiusClass} ${extra}`;
  const surface = "bg-card text-card-foreground border border-border/60 shadow-lg";
  const mutedSurface = "bg-muted/50 text-foreground border border-border/60 shadow-lg";
  const strongSurface = "bg-primary text-primary-foreground border border-border/40 shadow-lg";

  const renderDecorativeVideo = (variant: "tall" | "small", className: string) => {
    const sceneWidth = tilePx + decorativeGap + tilePx;
    const sceneHeight = tallTilePx;
    const viewports = {
      tall: { x: 0, y: 0, width: tilePx, height: tallTilePx },
      small: { x: tilePx + decorativeGap, y: 0, width: tilePx, height: tilePx },
    };
    const viewport = viewports[variant];
    const zoom = Number(decorativeVideo.zoom ?? decorativeVideo.tall?.zoom ?? 1.6);
    const offsetX = Number(decorativeVideo.offsetX ?? decorativeVideo.tall?.offsetX ?? 0);
    const offsetY = Number(decorativeVideo.offsetY ?? decorativeVideo.tall?.offsetY ?? 0);
    const scaledSceneWidth = sceneWidth * zoom;
    const scaledSceneHeight = sceneHeight * zoom;
    const left = offsetX - viewport.x * zoom;
    const top = offsetY - viewport.y * zoom;

    return (
      <DecorativeVideoTile
        className={className}
        src={decorativeVideoUrl}
        fallbackSrc={desert}
        width={`${scaledSceneWidth}px`}
        height={`${scaledSceneHeight}px`}
        left={`${left}px`}
        top={`${top}px`}
      />
    );
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 pb-10 pt-28">
      <style>{gridCss}</style>
      <div
        className={`dashboard-grid grid w-fit ${gapClass} grid-flow-row-dense content-center justify-center`}
      >
        {/* row 1 */}
        {showDecorativeMedia && showBox("videoTall") && (
          <div className={panel(`overflow-hidden ${GRID_TALL} ${DASHBOARD_TALL_TILE} ${surface}`)}>
            {renderDecorativeVideo("tall", `sticky h-full w-full rounded-xl overflow-hidden`)}
          </div>
        )}
        {showDecorativeMedia && showBox("videoSmall") && (
          <div className={panel(`overflow-hidden ${GRID_SINGLE} ${DASHBOARD_TILE} ${surface}`)}>
            {renderDecorativeVideo("small", `sticky h-full w-full rounded-xl overflow-hidden`)}
          </div>
        )}
        {showBox("search") && (
          <div className={panel(`${GRID_WIDE} ${DASHBOARD_WIDE_TILE} ${strongSurface}`)}>
            <SearchBox />
          </div>
        )}
        {showBox("bookmark1") && (
          <Bookmark
            title={getBookmarkGroupForBox(0).title}
            content={getBookmarkGroupForBox(0).content}
            onTitleClick={() => openBookmarkView(bookmarkBoxCategories[0] ?? 0)}
            cardClass={panel(
              `h-full w-full ${GRID_SINGLE} ${DASHBOARD_TILE} overflow-y-auto ${strongSurface}`,
            )}
          />
        )}
        {showBox("weather") && (
          <div className={panel(`${GRID_WIDE} ${DASHBOARD_WIDE_TILE} overflow-hidden`)}>
            <React.Suspense fallback={null}>
              <WeatherBox />
            </React.Suspense>
          </div>
        )}

        {/* row 2 */}
        {showBox("unsplash2") && (
          <div className={panel(`${GRID_SINGLE} ${DASHBOARD_TILE} ${surface}`)}>
            <Unsplash
              search={settings.unsplash.unsplashBox2}
              cardClass={panel(
                "relative overflow-hidden h-full w-full bg-center bg-no-repeat",
              )}
            />
          </div>
        )}
        {showBox("bookmark2") && (
          <Bookmark
            title={getBookmarkGroupForBox(1).title}
            content={getBookmarkGroupForBox(1).content}
            onTitleClick={() => openBookmarkView(bookmarkBoxCategories[1] ?? 1)}
            cardClass={panel(
              `h-full w-full ${GRID_SINGLE} ${DASHBOARD_TILE} overflow-y-auto ${strongSurface}`,
            )}
          />
        )}
        {showBox("featurePanel") && (
          <div
            className={panel(
              `grid-feature-responsive h-full w-full overflow-visible ${GRID_FEATURE} ${DASHBOARD_LARGE_TILE} ${surface}`,
            )}
          >
            <FeaturePanel />
          </div>
        )}
        {showBox("unsplash3") && (
          <div className={panel(`${GRID_SINGLE} ${DASHBOARD_TILE} ${surface}`)}>
            <Unsplash
              search={settings.unsplash.unsplashBox3}
              cardClass={panel(
                "relative overflow-hidden h-full w-full bg-center bg-no-repeat",
              )}
            />
          </div>
        )}

        {/* row 3 */}
        {showBox("bookmark3") && (
          <Bookmark
            title={getBookmarkGroupForBox(2).title}
            content={getBookmarkGroupForBox(2).content}
            onTitleClick={() => openBookmarkView(bookmarkBoxCategories[2] ?? 2)}
            cardClass={panel(
              `h-full w-full ${GRID_SINGLE} ${DASHBOARD_TILE} overflow-y-auto ${strongSurface}`,
            )}
          />
        )}
        {showBox("solarGraph") && (
          <div
            className={panel(
              `h-full w-full bg-black ${GRID_SOLAR} ${DASHBOARD_LARGE_TILE} border border-border/60 shadow-lg`,
            )}
          >
            <React.Suspense fallback={null}>
              <SolarGraph />
            </React.Suspense>
          </div>
        )}

        {/* row 4 */}
        {showBox("bookmark4") && (
          <Bookmark
            title={getBookmarkGroupForBox(3).title}
            content={getBookmarkGroupForBox(3).content}
            onTitleClick={() => openBookmarkView(bookmarkBoxCategories[3] ?? 3)}
            cardClass={panel(
              `h-full w-full ${GRID_SINGLE} ${DASHBOARD_TILE} overflow-y-auto ${strongSurface}`,
            )}
          />
        )}
        {showBox("bookmark5") && (
          <Bookmark
            title={getBookmarkGroupForBox(4).title}
            content={getBookmarkGroupForBox(4).content}
            onTitleClick={() => openBookmarkView(bookmarkBoxCategories[4] ?? 4)}
            cardClass={panel(
              `h-full w-full ${GRID_SINGLE} ${DASHBOARD_TILE} overflow-y-auto ${strongSurface}`,
            )}
          />
        )}
        {showBox("unsplash4") && (
          <div className={panel(`${GRID_SINGLE} ${DASHBOARD_TILE} ${surface}`)}>
            <Unsplash
              search={settings.unsplash.unsplashBox4}
              cardClass={panel(
                "relative overflow-hidden h-full w-full bg-center bg-no-repeat",
              )}
            />
          </div>
        )}
        {showBox("unsplash5") && (
          <div className={panel(`${GRID_SINGLE} ${DASHBOARD_TILE} ${surface}`)}>
            <Unsplash
              search={settings.unsplash.unsplashBox5}
              cardClass={panel(
                "relative overflow-hidden h-full w-full bg-center bg-no-repeat",
              )}
            />
          </div>
        )}
        {showBox("vaultPreview") && (
          <div className={panel(`${GRID_SINGLE} ${DASHBOARD_TILE} ${strongSurface} overflow-hidden`)}>
            <ResourceVaultPreview
              items={settings.readItems}
              onOpen={() => navigate("/resources")}
            />
          </div>
        )}
        {showBox("clock") && (
          <div className={panel(`${GRID_SINGLE} ${DASHBOARD_TILE} ${mutedSurface}`)}>
            <Clock />
          </div>
        )}
      </div>
    </div>
  );
}
