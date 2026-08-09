import React from "react";

// Fiber-grain texture for the paper card (see .vault-preview-paper::before /
// ::after) — feTurbulence gives the irregular fiber noise, feDiffuseLighting
// turns that into subtle raised/recessed shading instead of flat static, so
// it reads as paper grain rather than a screen-door noise overlay.
function PaperFiberFilters() {
  return (
    <svg aria-hidden="true" className="absolute h-0 w-0 overflow-hidden">
      <filter id="vault-paper-fibers" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={4} seed={11} result="n" />
        <feDiffuseLighting in="n" lightingColor="#ffffff" surfaceScale={1.5} result="l">
          <feDistantLight azimuth={238} elevation={58} />
        </feDiffuseLighting>
      </filter>
      <filter id="vault-paper-fibers-fine" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="1.9" numOctaves={3} seed={4} result="n" />
        <feDiffuseLighting in="n" lightingColor="#ffffff" surfaceScale={1.1}>
          <feDistantLight azimuth={225} elevation={62} />
        </feDiffuseLighting>
      </filter>
    </svg>
  );
}

interface PaperPageShellProps {
  backgroundImage: string;
  children: React.ReactNode;
}

// Scenic background + centered "paper card" page shell shared by any
// full-page feature that wants the Resource Vault's look (currently Vault
// and Bookmarks). Renders inside AppLayout, which already mounts the
// persistent nav/theme-toggle/settings chrome as a fixed overlay, so this
// only needs to supply the scene + paper card, not its own theme wiring.
export default function PaperPageShell({ backgroundImage, children }: PaperPageShellProps) {
  return (
    <div className="vault-preview-scene" style={{ backgroundImage: `url(${backgroundImage})` }}>
      <div className="vault-preview-scrim" />
      <PaperFiberFilters />

      <div className="vault-preview-stage">
        <div className="vault-preview-paper">
          <div className="vault-preview-paper-scroll">{children}</div>
        </div>
      </div>
    </div>
  );
}
