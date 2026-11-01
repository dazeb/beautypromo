import { useEffect, useRef, type RefObject } from "react";

/** Reveal content on entry and pause decorative card motion outside the viewport. */
export function useSiteMotion(rootRef: RefObject<HTMLElement | null>, filter: string) {
  const revealed = useRef(new WeakSet<HTMLElement>());

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const animations = new Set<Animation>();
    const elements = root.querySelectorAll<HTMLElement>(".hero__copy, .hero__art, .hero__stats div, .section__head, .featured__card, .brand-tile, .card, .advent__item, .dates__item, .newsletter__card, .journal__card");
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const element = entry.target as HTMLElement;
        element.classList.toggle("is-in-view", entry.isIntersecting);
        if (!entry.isIntersecting || revealed.current.has(element)) continue;
        revealed.current.add(element);
        if (reduced.matches) continue;
        const index = Array.prototype.indexOf.call(element.parentElement?.children ?? [], element) as number;
        const animation = element.animate([
          { opacity: 0, translate: "0 12px" },
          { opacity: 1, translate: "0 0" },
        ], {
          duration: 480,
          delay: Math.min(Math.max(index, 0) % 4, 3) * 55,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "backwards",
        });
        animations.add(animation);
        animation.addEventListener("finish", () => animations.delete(animation), { once: true });
      }
    }, { threshold: 0.08 });

    const stopMotion = () => {
      if (reduced.matches) {
        for (const animation of animations) animation.cancel();
        animations.clear();
      }
    };
    root.classList.add("motion-observed");
    elements.forEach((element) => observer.observe(element));
    reduced.addEventListener("change", stopMotion);
    return () => {
      observer.disconnect();
      reduced.removeEventListener("change", stopMotion);
      animations.forEach((animation) => animation.cancel());
      root.classList.remove("motion-observed");
    };
  }, [rootRef, filter]);
}
