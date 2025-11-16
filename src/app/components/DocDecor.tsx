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
  // moved closer to the featured docs and thumbnails for a more natural look
  // added `rot` for a small base rotation (wrapper applies this so animations still run)
  { top: "10%", left: "10%", size: 120, cls: "large rotate", delay: "0s", rot: -8 },
  { top: "14%", left: "54%", size: 48, cls: "small rotate-slow", delay: "0.12s", rot: 12 },
  { top: "56%", left: "12%", size: 44, cls: "petal rotate", delay: "0.18s", rot: -14 },
  { top: "58%", left: "72%", size: 56, cls: "petal", delay: "0.22s", rot: 6 },

  // confetti / small accents clustered nearer the grid center/right
  { top: "36%", left: "34%", size: 28, cls: "confetti tiny-rotate", delay: "0.08s", rot: -20 },
  { top: "46%", left: "44%", size: 22, cls: "confetti tiny-rotate-2", delay: "0.18s", rot: 18 },
  { top: "46%", left: "58%", size: 26, cls: "confetti tiny-rotate-3", delay: "0.26s", rot: -10 },
];

// small decorative single-item overlay per thumb (lightweight)
// nudged overlays closer to thumbnails so they read as part of the gallery
const THUMB_OVERLAYS = [
  { offsetTop: "6%", offsetRight: "4%", size: 28, asset: "/assets/asset10.svg", cls: "thumb-petal" },
  { offsetTop: "8%", offsetLeft: "4%", size: 22, asset: "/assets/asset5.svg", cls: "thumb-spark" },
];

export default function DocDecor() {
  return (
    <>
      <div className="doc-decor" aria-hidden>
        {POSITIONS.map((p, i) => (
          // wrapper applies a small static rotation while the img retains animation transforms
          <div
            key={`decor-${i}`}
            className="doc-decor-wrap"
            style={{
              position: "absolute",
              top: p.top,
              left: p.left,
              width: p.size,
              height: p.size,
              transform: `rotate(${p.rot ?? 0}deg)`,
              pointerEvents: "none",
            }}
            aria-hidden
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ASSETS[i % ASSETS.length]}
              alt=""
              className={`doc-decor-item ${p.cls}`}
              style={{
                width: "100%",
                height: "100%",
                animationDelay: p.delay,
                display: "block",
              }}
              draggable={false}
            />
          </div>
        ))}
      </div>

      {/* Small static overlays that will be positioned via CSS relative to grid.
          Add lightweight markup so we can absolutely position near thumbnails.
          The grid items are not modified — overlays are positioned absolutely inside section. */}
      <div className="doc-thumb-overlays" aria-hidden>
        {THUMB_OVERLAYS.map((t, i) => (
          // keep small overlays but allow a tiny rotation for a natural look
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
              transform: `rotate(${(t as any).rot ?? 8}deg)`,
            }}
            draggable={false}
          />
        ))}
      </div>
    </>
  );
}