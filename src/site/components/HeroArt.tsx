import { useEffect, useRef, useState } from "react";

export function HeroArt() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 56.25rem)");
    let stopScene: (() => void) | undefined;
    let cancelled = false;
    let generation = 0;

    const updateScene = async () => {
      const current = ++generation;
      stopScene?.();
      stopScene = undefined;
      setReady(false);
      if (!desktop.matches || !sceneRef.current) return;
      const container = sceneRef.current;
      try {
        const { mountHeroScene } = await import("./heroScene");
        if (cancelled || current !== generation || !desktop.matches || container !== sceneRef.current) return;
        stopScene = mountHeroScene(container, () => setReady(false));
        setReady(true);
      } catch {
        if (!cancelled && current === generation) setReady(false);
      }
    };

    void updateScene();
    desktop.addEventListener("change", updateScene);
    return () => {
      cancelled = true;
      generation++;
      desktop.removeEventListener("change", updateScene);
      stopScene?.();
    };
  }, []);

  return (
    <div className="hero__art" aria-hidden="true" data-scene-ready={ready}>
      <div className="hero-art__fallback">
        <div className="hero-art__pedestal" />
        <div className="hero-art__lipstick"><span /></div>
        <div className="hero-art__bottle"><span>the<br /><i>beauty</i><br />edit</span></div>
        <div className="hero-art__compact"><span /></div>
      </div>
      <div className="hero-art__scene" ref={sceneRef} />
      <div className="hero-art__caption"><span>Makeup · skincare · fragrance</span></div>
    </div>
  );
}
