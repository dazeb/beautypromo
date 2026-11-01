import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

/** Where each product stands on the pedestal: x/z on the platform, yaw in radians. */
const LAYOUT = {
  bottle: { x: -0.05, z: -0.25, yaw: -0.14 },
  lipstick: { x: -1.35, z: 0.5 },
  compact: { x: 1.3, z: 0.55, lean: 0.28, spin: -0.2 },
};

const COLORS = {
  lipstick: 0xc8325f,
  gold: 0xcfb88e,
  case: 0x34282d,
};

const PEDESTAL_TOP = -1.445;

export function mountHeroScene(container: HTMLElement, onContextLost: () => void) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-3, 3, 3, -3, 0.1, 40);
  camera.position.set(4, 3.5, 9);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();

  scene.add(new THREE.HemisphereLight(0xfff3f8, 0xc994b3, 2.2));
  const keyLight = new THREE.DirectionalLight(0xfff3df, 4.2);
  keyLight.position.set(-4, 7, 6);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.left = -4;
  keyLight.shadow.camera.right = 4;
  keyLight.shadow.camera.top = 5;
  keyLight.shadow.camera.bottom = -4;
  keyLight.shadow.bias = -0.0004;
  keyLight.shadow.radius = 4;
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0xffc7d4, 2.2);
  fillLight.position.set(5, 2, -3);
  scene.add(fillLight);

  const gold = new THREE.MeshStandardMaterial({ color: COLORS.gold, metalness: 0.6, roughness: 0.32 });
  const pedestalPink = new THREE.MeshPhysicalMaterial({ color: 0xe8a0bf, metalness: 0.15, roughness: 0.4, clearcoat: 0.3 });
  const pedestalTop = new THREE.MeshStandardMaterial({ color: 0xecd2c0, metalness: 0.2, roughness: 0.4 });
  const blush = new THREE.MeshPhysicalMaterial({ color: 0xf5c0d8, metalness: 0.08, roughness: 0.38, clearcoat: 0.25, clearcoatRoughness: 0.2 });
  const powder = new THREE.MeshStandardMaterial({ color: 0xeaa2c4, metalness: 0.12, roughness: 0.66 });
  const lipstickCase = new THREE.MeshPhysicalMaterial({ color: COLORS.case, metalness: 0.35, roughness: 0.24, clearcoat: 0.8, clearcoatRoughness: 0.12 });
  const lipstickPink = new THREE.MeshPhysicalMaterial({ color: COLORS.lipstick, metalness: 0.04, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.12 });

  const group = new THREE.Group();
  scene.add(group);

  const shadowed = <T extends THREE.Mesh>(mesh: T) => {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };
  const cylinder = (radius: number, height: number, material: THREE.Material, y = 0) => {
    const mesh = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 64), material));
    mesh.position.y = y;
    return mesh;
  };
  const rounded = (width: number, height: number, depth: number, radius: number, material: THREE.Material, y = 0) => {
    const mesh = shadowed(new THREE.Mesh(new RoundedBoxGeometry(width, height, depth, 4, radius), material));
    mesh.position.y = y;
    return mesh;
  };
  /** Lowers or raises an object until its lowest vertex touches the pedestal. */
  const restOnPedestal = (object: THREE.Object3D) => {
    object.updateMatrixWorld(true);
    object.position.y += PEDESTAL_TOP - new THREE.Box3().setFromObject(object, true).min.y;
  };

  // Pedestal
  const pedestal = new THREE.Group();
  pedestal.scale.z = 0.83;
  pedestal.add(cylinder(2.2, 0.24, pedestalPink, -1.68), cylinder(2.21, 0.045, gold, -1.54), cylinder(2.17, 0.07, pedestalTop, -1.48));
  group.add(pedestal);

  // Perfume bottle
  const bottle = new THREE.Group();
  bottle.add(rounded(1.28, 1.95, 0.72, 0.15, blush));
  bottle.add(rounded(1.2, 0.12, 0.68, 0.05, gold, -0.92));
  bottle.add(cylinder(0.28, 0.18, gold, 1.02));
  bottle.add(rounded(0.75, 0.48, 0.53, 0.07, gold, 1.32));
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
  labelTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const label = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.86), new THREE.MeshBasicMaterial({ map: labelTexture }));
  label.position.set(0, 0.04, 0.365);
  bottle.add(label);
  bottle.position.set(LAYOUT.bottle.x, 0, LAYOUT.bottle.z);
  bottle.rotation.y = LAYOUT.bottle.yaw;
  group.add(bottle);
  restOnPedestal(bottle);

  // Lipstick: black case, gold collar, bullet with the classic slanted cut.
  const bullet = () => {
    const radius = 0.19;
    const geometry = new THREE.CylinderGeometry(radius, radius, 0.66, 64, 1);
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      if (positions.getY(i) > 0) positions.setY(i, positions.getY(i) + positions.getX(i) * 0.55);
    }
    geometry.computeVertexNormals();
    return shadowed(new THREE.Mesh(geometry, lipstickPink));
  };
  const lipstick = new THREE.Group();
  lipstick.add(cylinder(0.32, 0.66, lipstickCase, 0.33));
  lipstick.add(cylinder(0.335, 0.07, gold, 0.69));
  lipstick.add(cylinder(0.32, 0.52, lipstickCase, 0.98));
  lipstick.add(cylinder(0.25, 0.26, gold, 1.37));
  const lipstickBullet = bullet();
  lipstickBullet.position.y = 1.83;
  lipstick.add(lipstickBullet);
  lipstick.position.set(LAYOUT.lipstick.x, 0, LAYOUT.lipstick.z);
  group.add(lipstick);
  restOnPedestal(lipstick);

  // Compact, standing on its rim and leaning back.
  const compact = new THREE.Group();
  compact.add(cylinder(0.7, 0.24, gold));
  compact.add(cylinder(0.59, 0.06, powder, 0.145));
  const compactRing = new THREE.Mesh(new THREE.TorusGeometry(0.53, 0.012, 8, 64), gold);
  compactRing.rotation.x = Math.PI / 2;
  compactRing.position.y = 0.18;
  compact.add(compactRing);
  compact.position.set(LAYOUT.compact.x, 0, LAYOUT.compact.z);
  compact.rotation.set(Math.PI / 2 - LAYOUT.compact.lean, 0, LAYOUT.compact.spin);
  group.add(compact);
  restOnPedestal(compact);

  /** Extents of everything on screen, in camera space, so the camera can frame it exactly. */
  const measure = () => {
    group.updateMatrixWorld(true);
    const inverse = camera.matrixWorldInverse;
    const point = new THREE.Vector3();
    const extent = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
    group.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const positions = object.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        point.fromBufferAttribute(positions, i).applyMatrix4(object.matrixWorld).applyMatrix4(inverse);
        extent.minX = Math.min(extent.minX, point.x);
        extent.maxX = Math.max(extent.maxX, point.x);
        extent.minY = Math.min(extent.minY, point.y);
        extent.maxY = Math.max(extent.maxY, point.y);
      }
    });
    return extent;
  };
  const content = measure();

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
    const aspect = width / height;
    const padding = 1.16;
    const view = Math.max((content.maxY - content.minY) * padding, ((content.maxX - content.minX) * padding) / aspect);
    // Centred sideways; any spare height goes above the products so the pedestal stands near the floor.
    const centerX = (content.minX + content.maxX) / 2;
    const spare = view - (content.maxY - content.minY);
    camera.left = centerX - (view * aspect) / 2;
    camera.right = centerX + (view * aspect) / 2;
    camera.bottom = content.minY - spare * 0.18;
    camera.top = camera.bottom + view;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    renderer.render(scene, camera);
  };

  const rest = () => {
    group.position.y = 0;
    group.rotation.set(0, 0, 0);
  };
  const draw = (time: number) => {
    frame = 0;
    if (!visible || document.hidden || lost) return;
    if (time - lastRendered >= 1000 / 30) {
      const delta = Math.min(Math.max((time - lastRendered) / 1000, 0), 0.05);
      motionTime += delta;
      // Pointer tilt with a slow idle sway; products stay planted on the pedestal.
      group.rotation.y += (pointerX * 0.16 + Math.sin(motionTime * 0.5) * 0.04 - group.rotation.y) * 0.08;
      group.rotation.x += (pointerY * 0.08 - group.rotation.x) * 0.08;
      group.position.y = Math.sin(motionTime * 0.65) * 0.04;
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
      rest();
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
