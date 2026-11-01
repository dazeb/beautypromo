import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export function mountHeroScene(container: HTMLElement, onContextLost: () => void) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-3, 3, 3, -3, 0.1, 40);
  camera.position.set(4, 3.5, 9);
  camera.lookAt(0, 0.3, 0);
  scene.add(new THREE.HemisphereLight(0xfff3f8, 0xc994b3, 2.3));

  const keyLight = new THREE.DirectionalLight(0xfff3df, 4.2);
  keyLight.position.set(-4, 7, 6);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(512, 512);
  keyLight.shadow.camera.left = -4;
  keyLight.shadow.camera.right = 4;
  keyLight.shadow.camera.top = 5;
  keyLight.shadow.camera.bottom = -4;
  keyLight.shadow.bias = -0.0004;
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0xffc7d4, 2.2);
  fillLight.position.set(5, 2, -3);
  scene.add(fillLight);

  const gold = new THREE.MeshStandardMaterial({ color: 0xcfb88e, metalness: 0.6, roughness: 0.32 });
  const pedestalPink = new THREE.MeshPhysicalMaterial({ color: 0xe8a0bf, metalness: 0.15, roughness: 0.4, clearcoat: 0.3 });
  const pink = new THREE.MeshPhysicalMaterial({ color: 0xee6caa, metalness: 0.08, roughness: 0.3, clearcoat: 1 });
  const roseChrome = new THREE.MeshPhysicalMaterial({ color: 0xe6a4c8, metalness: 0.25, roughness: 0.35, clearcoat: 0.3 });
  const blush = new THREE.MeshPhysicalMaterial({ color: 0xf5c0d8, metalness: 0.08, roughness: 0.38, clearcoat: 0.25, clearcoatRoughness: 0.2 });
  const powder = new THREE.MeshStandardMaterial({ color: 0xeaa2c4, metalness: 0.12, roughness: 0.66 });
  const group = new THREE.Group();
  scene.add(group);

  const cylinder = (radius: number, height: number, material: THREE.Material, segments = 64) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, segments), material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };
  const rounded = (width: number, height: number, depth: number, radius: number, material: THREE.Material) => {
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(width, height, depth, 4, radius), material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };

  const base = cylinder(2.2, 0.24, pedestalPink);
  base.scale.z = 0.83;
  base.position.y = -1.68;
  group.add(base);
  const baseTrim = cylinder(2.21, 0.045, gold);
  baseTrim.scale.z = 0.83;
  baseTrim.position.y = -1.54;
  group.add(baseTrim);
  const baseTop = cylinder(2.17, 0.07, new THREE.MeshStandardMaterial({ color: 0xecd2c0, metalness: 0.2, roughness: 0.4 }));
  baseTop.scale.z = 0.83;
  baseTop.position.y = -1.48;
  group.add(baseTop);

  const bottle = new THREE.Group();
  bottle.position.set(-0.12, -0.36, 0);
  bottle.rotation.y = -0.14;
  group.add(bottle);
  bottle.add(rounded(1.28, 1.95, 0.72, 0.15, blush));
  const bottleBase = rounded(1.2, 0.12, 0.68, 0.05, gold);
  bottleBase.position.y = -0.92;
  bottle.add(bottleBase);
  const bottleNeck = cylinder(0.28, 0.18, gold);
  bottleNeck.position.y = 1.02;
  bottle.add(bottleNeck);
  const bottleCap = rounded(0.75, 0.48, 0.53, 0.07, gold);
  bottleCap.position.y = 1.32;
  bottle.add(bottleCap);

  const labelCanvas = document.createElement("canvas");
  labelCanvas.width = 512;
  labelCanvas.height = 512;
  const labelContext = labelCanvas.getContext("2d");
  if (labelContext) {
    labelContext.fillStyle = "#fff1f8";
    labelContext.fillRect(0, 0, 512, 512);
    labelContext.strokeStyle = "#c09b76";
    labelContext.lineWidth = 3;
    labelContext.strokeRect(22, 22, 468, 468);
    labelContext.fillStyle = "#b63876";
    labelContext.textAlign = "center";
    labelContext.font = "28px Georgia";
    labelContext.fillText("THE", 256, 125);
    labelContext.font = "italic 100px Georgia";
    labelContext.fillText("beauty", 256, 244);
    labelContext.font = "50px Georgia";
    labelContext.fillText("EDIT", 256, 315);
    labelContext.font = "22px Georgia";
    labelContext.fillText("A LITTLE LUXURY", 256, 406);
  }
  const labelTexture = new THREE.CanvasTexture(labelCanvas);
  labelTexture.colorSpace = THREE.SRGBColorSpace;
  const label = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.86), new THREE.MeshBasicMaterial({ map: labelTexture }));
  label.position.set(0, 0.04, 0.365);
  bottle.add(label);

  const lipstick = new THREE.Group();
  lipstick.position.set(-1.4, -0.56, 0.45);
  lipstick.rotation.z = -0.14;
  group.add(lipstick);
  const lipstickCase = cylinder(0.32, 1.32, roseChrome);
  lipstick.add(lipstickCase);
  const lipstickBand = cylinder(0.33, 0.18, gold);
  lipstickBand.position.y = 0.7;
  lipstick.add(lipstickBand);
  const lipstickHolder = cylinder(0.245, 0.24, gold);
  lipstickHolder.position.y = 0.88;
  lipstick.add(lipstickHolder);
  const lipstickTip = cylinder(0.19, 0.65, pink);
  lipstickTip.position.y = 1.29;
  lipstick.add(lipstickTip);
  const tipTop = new THREE.Mesh(new THREE.SphereGeometry(0.19, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), pink);
  tipTop.position.y = 1.61;
  lipstick.add(tipTop);

  const compact = new THREE.Group();
  compact.position.set(1.32, -0.65, 0.6);
  compact.rotation.set(Math.PI / 2 - 0.28, 0, -0.2);
  group.add(compact);
  const compactBase = cylinder(0.7, 0.24, gold);
  compact.add(compactBase);
  const compactPowder = cylinder(0.59, 0.06, powder);
  compactPowder.position.y = 0.145;
  compact.add(compactPowder);
  const compactRing = new THREE.Mesh(new THREE.TorusGeometry(0.53, 0.012, 8, 64), gold);
  compactRing.rotation.x = Math.PI / 2;
  compactRing.position.y = 0.18;
  compact.add(compactRing);

  for (const [x, y, z, size] of [[-1.8, 1.7, -0.1, 0.06], [1.5, 1.5, -0.3, 0.08], [1.9, 0.45, 0.1, 0.04]]) {
    const bead = new THREE.Mesh(new THREE.SphereGeometry(size, 16, 12), gold);
    bead.position.set(x, y, z);
    group.add(bead);
  }

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let frame = 0;
  let visible = true;
  let lost = false;
  let lastRendered = 0;
  let pointerX = 0;
  let pointerY = 0;
  let motionTime = 0;

  const resize = () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (!width || !height) return;
    const viewHeight = 5.3;
    camera.left = -viewHeight * width / height / 2;
    camera.right = -camera.left;
    camera.top = viewHeight / 2;
    camera.bottom = -camera.top;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    renderer.render(scene, camera);
  };

  const draw = (time: number) => {
    frame = 0;
    if (!visible || document.hidden || lost) return;
    if (time - lastRendered >= 1000 / 30) {
      const delta = Math.min(Math.max((time - lastRendered) / 1000, 0), 0.05);
      motionTime += delta;
      group.rotation.y += (pointerX * 0.16 - group.rotation.y) * 0.08;
      group.rotation.x += (pointerY * 0.08 - group.rotation.x) * 0.08;
      group.position.y = Math.sin(motionTime * 0.65) * 0.045;
      bottle.position.y = -0.36 + Math.sin(motionTime * 0.9) * 0.055;
      lipstick.position.y = -0.56 + Math.sin(motionTime * 0.9 + 1.5) * 0.04;
      compact.rotation.z = -0.2 + Math.sin(motionTime * 0.7) * 0.035;
      renderer.render(scene, camera);
      lastRendered = time;
    }
    if (!reducedMotion.matches) frame = requestAnimationFrame(draw);
  };
  const refresh = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    if (!visible || document.hidden || lost) return;
    if (reducedMotion.matches) {
      group.position.y = 0;
      group.rotation.set(0, 0, 0);
      bottle.position.y = -0.36;
      lipstick.position.y = -0.56;
      compact.rotation.z = -0.2;
      renderer.render(scene, camera);
    } else {
      frame = requestAnimationFrame(draw);
    }
  };
  const move = (event: PointerEvent) => {
    const bounds = container.getBoundingClientRect();
    pointerX = (event.clientX - bounds.left) / bounds.width - 0.5;
    pointerY = (event.clientY - bounds.top) / bounds.height - 0.5;
  };
  const leave = () => { pointerX = 0; pointerY = 0; };
  const contextLost = (event: Event) => {
    event.preventDefault();
    lost = true;
    cancelAnimationFrame(frame);
    onContextLost();
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  const visibilityObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    refresh();
  });
  visibilityObserver.observe(container);
  container.addEventListener("pointermove", move);
  container.addEventListener("pointerleave", leave);
  renderer.domElement.addEventListener("webglcontextlost", contextLost);
  document.addEventListener("visibilitychange", refresh);
  reducedMotion.addEventListener("change", refresh);
  resize();
  refresh();

  return () => {
    cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    visibilityObserver.disconnect();
    container.removeEventListener("pointermove", move);
    container.removeEventListener("pointerleave", leave);
    renderer.domElement.removeEventListener("webglcontextlost", contextLost);
    document.removeEventListener("visibilitychange", refresh);
    reducedMotion.removeEventListener("change", refresh);
    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.dispose();
    });
    labelTexture.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}
