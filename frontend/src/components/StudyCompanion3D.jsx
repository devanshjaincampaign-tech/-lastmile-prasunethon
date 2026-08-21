import { useEffect, useRef } from "react";
import * as THREE from "three";

function makeMaterial(color, roughness = 0.42, metalness = 0.08, emissive = 0x000000, emissiveIntensity = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, emissive, emissiveIntensity });
}

export default function StudyCompanion3D({ theme }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    camera.position.set(0, 0.25, 6.4);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const isLight = theme === "light";
    const ambient = new THREE.HemisphereLight(isLight ? 0xffffff : 0xdcefe2, isLight ? 0xb4aa9d : 0x243029, 2.4);
    scene.add(ambient);
    const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
    keyLight.position.set(3, 4, 5);
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(isLight ? 0x5c956c : 0xb8d8c0, 8, 7);
    rimLight.position.set(-2, 1, 2);
    scene.add(rimLight);

    const companion = new THREE.Group();
    scene.add(companion);

    const mint = isLight ? 0x806348 : 0x65766b;
    const shell = isLight ? 0xd7bea0 : 0x272c29;
    const dark = isLight ? 0x34271e : 0x121715;
    const rose = isLight ? 0x875348 : 0x986c73;
    const pageColor = isLight ? 0xffffff : 0xf5eadb;

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.56, 0.68, 8, 20), makeMaterial(mint, 0.34, 0.08, isLight ? 0x000000 : 0x496b57, isLight ? 0 : 0.8));
    body.position.y = -0.34;
    companion.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.61, 32, 24), makeMaterial(shell, 0.3));
    head.position.y = 0.74;
    companion.add(head);

    const hood = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.12, 12, 32, Math.PI * 1.55), makeMaterial(dark, 0.28));
    hood.rotation.x = Math.PI / 2;
    hood.rotation.z = Math.PI * 0.72;
    hood.position.set(0, 0.9, 0.04);
    companion.add(hood);

    const visor = new THREE.Mesh(new THREE.SphereGeometry(0.43, 32, 16, 0, Math.PI * 2, 0.25, Math.PI * 0.48), makeMaterial(dark, 0.2, 0.22));
    visor.scale.set(1.1, 0.52, 0.5);
    visor.position.set(0, 0.7, 0.47);
    companion.add(visor);

    const eyeMaterial = new THREE.MeshBasicMaterial({ color: isLight ? 0xf8ead2 : 0xb8d8c0 });
    const eyeGeometry = new THREE.SphereGeometry(0.075, 16, 12);
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.17, 0.72, 0.68);
    rightEye.position.set(0.17, 0.72, 0.68);
    companion.add(leftEye, rightEye);

    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.28, 12), makeMaterial(mint, 0.3, 0.08, isLight ? 0x000000 : 0x496b57, isLight ? 0 : 0.9));
    antenna.position.set(0, 1.5, 0);
    companion.add(antenna);
    const antennaTip = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), new THREE.MeshBasicMaterial({ color: rose }));
    antennaTip.position.set(0, 1.66, 0);
    companion.add(antennaTip);

    const armMaterial = makeMaterial(shell, 0.38);
    const leftArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.34, 6, 12), armMaterial);
    const rightArm = leftArm.clone();
    leftArm.position.set(-0.57, -0.55, 0.12);
    rightArm.position.set(0.57, -0.55, 0.12);
    leftArm.rotation.z = -0.7;
    rightArm.rotation.z = 0.7;
    companion.add(leftArm, rightArm);

    const book = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.12, 0.78), makeMaterial(rose, 0.5));
    book.position.set(0, -1.02, 0.13);
    book.rotation.x = -0.18;
    companion.add(book);

    const page = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.025, 0.58), makeMaterial(pageColor, 0.82));
    page.position.set(0, -0.94, 0.17);
    page.rotation.x = -0.18;
    companion.add(page);

    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(1.05, 0.025, 12, 64),
      new THREE.MeshBasicMaterial({ color: mint, transparent: true, opacity: isLight ? 0.4 : 0.9, blending: THREE.AdditiveBlending })
    );
    halo.rotation.x = Math.PI / 2.6;
    halo.position.y = 0.05;
    companion.add(halo);

    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(1.15, 48),
      new THREE.MeshBasicMaterial({ color: isLight ? 0x334337 : 0x000000, transparent: true, opacity: isLight ? 0.18 : 0.28 })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0, -1.14, 0);
    companion.add(shadow);

    const pointer = { x: 0, y: 0 };
    const onPointerMove = (event) => {
      pointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
      pointer.y = (event.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    const resize = () => {
      const width = mount.clientWidth || 240;
      const height = mount.clientHeight || 220;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);

    const clock = new THREE.Clock();
    let frameId;
    const animate = () => {
      const elapsed = clock.getElapsedTime();
      const flow = isLight ? 0 : 1;
      companion.position.y = Math.sin(elapsed * (isLight ? 1.5 : 1.05)) * (isLight ? 0.07 : 0.12);
      companion.position.x += (Math.sin(elapsed * 0.72) * 0.09 * flow - companion.position.x) * 0.025;
      companion.rotation.y += (pointer.x * 0.28 - companion.rotation.y) * 0.045;
      companion.rotation.x += (-pointer.y * 0.1 - companion.rotation.x) * 0.045;
      companion.rotation.z += (Math.sin(elapsed * 0.82) * 0.035 * flow - companion.rotation.z) * 0.03;
      const breath = 1 + Math.sin(elapsed * 0.9) * 0.018 * flow;
      companion.scale.set(breath, breath, breath);
      halo.rotation.z = elapsed * (isLight ? 0.18 : 0.11);
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      renderer.dispose();
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
          else object.material.dispose();
        }
      });
      renderer.domElement.remove();
    };
  }, [theme]);

  return (
    <div ref={mountRef} className="study-companion-3d" aria-label="Vishu, the animated 3D LastMile learning companion" role="img" />
  );
}
