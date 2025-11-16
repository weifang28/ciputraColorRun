"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_IMAGES = [
  "/Homepage/about/about1.JPG",
  "/Homepage/about/about2.JPG",
  "/Homepage/about/about3.JPG",
  "/Homepage/about/about4.JPG",
  "/Homepage/about/about5.JPG",
  "/Homepage/about/about6.JPG",
  "/Homepage/about/about7.JPG",
];

export default function AboutCarousel({
  images = DEFAULT_IMAGES,
  interval = 2000,
}: {
  images?: string[];
  interval?: number;
}) {
  const imgs = useMemo(() => (images ?? DEFAULT_IMAGES).slice(), [images?.length]);
  const count = imgs.length;

  const [index, setIndex] = useState(0);
  const timerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  // divider ref to toggle AOS animation in sync with slides
  const dividerRef = useRef<HTMLDivElement | null>(null);
  // keep the CSS transition duration in sync with AOS duration (ms)
  const slideFadeDuration = 700; // update if CSS transition changes

  // preload images to avoid flicker / blank frames when switching
  useEffect(() => {
    imgs.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, [imgs]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!count || count <= 1) {
      setIndex(0);
      return;
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const scheduleNext = () => {
      timerRef.current = window.setTimeout(() => {
        if (!mountedRef.current) return;
        setIndex((i) => (i + 1) % count);
        scheduleNext();
      }, interval);
    };
    scheduleNext();
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [count, interval]);

  // debug: confirm index changes
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log("AboutCarousel index ->", index);
  }, [index]);

  // when index changes, re-trigger AOS on the divider so its animation matches the slide
  useEffect(() => {
    const el = dividerRef.current;
    if (!el) return;

    // Remove and re-add our own animation class so divider always animates in sync.
    // This is a reliable fallback when AOS timing is inconsistent.
    el.classList.remove("divider-animate");
    // force reflow so re-adding class restarts animation
    void el.offsetWidth;
    el.classList.add("divider-animate");

    // also refresh AOS if present (keeps AOS-driven attributes in sync)
    if (typeof (window as any).AOS?.refresh === "function") {
      (window as any).AOS.refresh();
    }
  }, [index]);

  return (
    <div className="about-carousel" aria-hidden>
      {imgs.map((src, i) => (
        <div
          key={src + i}
          className={`about-slide ${i === index ? "active" : ""}`}
          style={{ zIndex: i === index ? 2 : 0 }}
        >
          <img
            src={src}
            alt={`About image ${i + 1}`}
            className="about-slide-img"
            loading={i === index ? "eager" : "lazy"}
            draggable={false}
          />
        </div>
      ))}

      {/* Keep the divider (SVG) — render as <img> so it always appears */}
      <div
        ref={dividerRef}
        className="about-divider"
        aria-hidden
        data-aos="fade-left"
        data-aos-duration={String(slideFadeDuration)}
        data-aos-delay="0"
        data-aos-anchor-placement="center-center"
      >
        <img
          src="/Homepage/Divider.svg"
          alt="divider"
          className="about-divider-img"
          loading="eager"
          draggable={false}
        />
      </div>
    </div>
  );
}