"use client";
import React, { useEffect, useRef } from "react";

export type RevealProps = {
  children: React.ReactNode;
  className?: string;
  rootMargin?: string;
  threshold?: number;
  once?: boolean;
  as?: React.ElementType;
};

export default function Reveal({
  children,
  className,
  rootMargin = "0px 0px -10% 0px",
  threshold = 0.15,
  once = true,
  as: Tag = "div",
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const node = ref.current;

    // Start hidden
    node.classList.add("reveal");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            node.classList.add("in-view");
            if (once) observer.unobserve(node);
          } else if (!once) {
            node.classList.remove("in-view");
          }
        });
      },
      { root: null, rootMargin, threshold }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [rootMargin, threshold, once]);

  return (
    <Tag ref={ref as any} className={className}>
      {children}
    </Tag>
  );
}
