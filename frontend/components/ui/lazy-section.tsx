"use client";

import React, { useEffect, useRef, useState } from "react";

/**
 * Observes whether a DOM element is within (or near) the viewport and whether
 * the browser tab is visible. Used to pause offscreen rAF/interval/particle loops.
 */
export function useViewportVisibility(
  ref: React.RefObject<Element | null>,
  rootMargin = "100px"
) {
  const [isInView, setIsInView] = useState(true);
  const [isTabVisible, setIsTabVisible] = useState(
    typeof document === "undefined" ? true : !document.hidden
  );

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(!document.hidden);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, rootMargin]);

  return isInView && isTabVisible;
}

interface LazySectionProps {
  children: React.ReactNode;
  className?: string;
  minHeight?: string | number;
  rootMargin?: string;
  fallback?: React.ReactNode;
}

/**
 * Defers mounting heavy/animated children (and triggering their next/dynamic
 * bundle fetches) until the container approaches the viewport.
 */
export function LazySection({
  children,
  className = "",
  minHeight,
  rootMargin = "200px",
  fallback = null,
}: LazySectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasEntered, setHasEntered] = useState(false);

  useEffect(() => {
    if (hasEntered) return;
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setHasEntered(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasEntered(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasEntered, rootMargin]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={!hasEntered && minHeight ? { minHeight } : undefined}
    >
      {hasEntered ? children : fallback}
    </div>
  );
}
