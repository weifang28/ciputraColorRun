"use client";

import React from "react";

/**
 * Floating decorative assets shown inside the Documentation section.
 * Uses files from /public/assets.
 */

const ASSETS = [
  "/assets/asset4.svg",   // aurora / large decorative
  "/assets/asset10.svg",  // star / flower
  "/assets/asset7.svg",
  "/assets/asset5.svg",
  "/assets/asset3.svg",
  "/assets/asset6.svg",
];

const POSITIONS = [
  // large decorative near top-left featured
  { top: "8%", left: "6%", size: 140, cls: "large rotate", delay: "0s" },
  // small accent near top-right featured
  { top: "12%", left: "64%", size: 56, cls: "small rotate-slow", delay: "0.12s" },
  // lower-left near thumbnails
  { top: "62%", left: "8%", size: 48, cls: "petal rotate", delay: "0.22s" },
  // lower-right near thumbnails
  { top: "62%", left: "82%", size: 64, cls: "petal", delay: "0.3s" },

  // extra small confetti around center grid
  { top: "34%", left: "28%", size: 28, cls: "confetti tiny-rotate", delay: "0.08s" },
  { top: "46%", left: "48%", size: 24, cls: "confetti tiny-rotate-2", delay: "0.18s" },
  { top: "46%", left: "68%", size: 30, cls: "confetti tiny-rotate-3", delay: "0.26s" },
];

// small decorative single-item overlay per thumb (lightweight)
const THUMB_OVERLAYS = [
  { offsetTop: "6%", offsetRight: "6%", size: 28, asset: "/assets/asset10.svg", cls: "thumb-petal" },
  { offsetTop: "8%", offsetLeft: "6%", size: 22, asset: "/assets/asset5.svg", cls: "thumb-spark" },
];

export default function DocDecor() {
  return (
    <>
      <div className="doc-decor" aria-hidden>
        {POSITIONS.map((p, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`decor-${i}`}
            src={ASSETS[i % ASSETS.length]}
            alt=""
            className={`doc-decor-item ${p.cls}`}
            style={{
              top: p.top,
              left: p.left,
              width: p.size,
              height: p.size,
              animationDelay: p.delay,
            }}
            draggable={false}
          />
        ))}
      </div>

      {/* Small static overlays that will be positioned via CSS relative to grid.
          Add lightweight markup so we can absolutely position near thumbnails.
          The grid items are not modified — overlays are positioned absolutely inside section. */}
      <div className="doc-thumb-overlays" aria-hidden>
        {THUMB_OVERLAYS.map((t, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`thumb-ov-${i}`}
            src={t.asset}
            alt=""
            className={`doc-thumb-item ${t.cls}`}
            style={{
              top: t.offsetTop,
              right: (t as any).offsetRight,
              left: (t as any).offsetLeft,
              width: t.size,
              height: t.size,
            }}
            draggable={false}
          />
        ))}
      </div>
    </>
  );
}