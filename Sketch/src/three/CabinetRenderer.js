import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

/**
 * Three.js Cabinet Renderer - Infurnia-style 3D Visualization
 * * Features:
 * - Interactive 3D view with orbit controls
 * - Realistic materials (wood, metal handles)
 * - Section highlighting on hover
 * - Exploded view mode
 * - Dimension annotations in 3D space
 * - Smooth animated doors and drawers toggle
 */

export class CabinetRenderer {
  constructor(container, config) {
    this.container = container;
    this.config = config;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.cabinetGroup = null;
    this.selectedSection = null;
    this.hoveredSection = null;
    this.dimensionLines = [];

    // Animation states
    this.isDoorsOpen = false;
    this.isExploded = false; // NEW
    this.doorHinges = [];
    this.drawers = [];

    this.init();
  }

  init() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf8f9fa);

    this.camera = new THREE.PerspectiveCamera(50, width / height, 1, 10000);
    this.camera.position.set(0, 1200, 3500);
    this.camera.lookAt(0, 1100, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    this.container.style.position = "relative";
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.1;
    this.controls.minDistance = 800;
    this.controls.maxDistance = 6000;
    this.controls.enablePan = true;
    this.controls.panSpeed = 0.8;
    this.controls.rotateSpeed = 0.6;
    this.controls.target.set(0, 1100, 0);

    this.setupLighting();
    this.setupHelpers();
    this.setupUI();

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.setupEventListeners();
    this.buildCabinet();
    this.animate();
  }

  setupUI() {
    this.toggleButton = document.createElement("button");
    this.toggleButton.innerText = "Open Doors & Drawers";
    this.toggleButton.style.position = "absolute";
    this.toggleButton.style.bottom = "20px";
    this.toggleButton.style.right = "20px";
    this.toggleButton.style.padding = "12px 24px";
    this.toggleButton.style.backgroundColor = "#2563eb";
    this.toggleButton.style.color = "#ffffff";
    this.toggleButton.style.border = "none";
    this.toggleButton.style.borderRadius = "8px";
    this.toggleButton.style.cursor = "pointer";
    this.toggleButton.style.fontFamily = "system-ui, -apple-system, sans-serif";
    this.toggleButton.style.fontWeight = "600";
    this.toggleButton.style.fontSize = "10px";
    this.toggleButton.style.boxShadow =
      "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)";
    this.toggleButton.style.transition = "all 0.2s ease";

    this.toggleButton.onmouseover = () => {
      this.toggleButton.style.backgroundColor = "#1d4ed8";
      this.toggleButton.style.transform = "translateY(-1px)";
    };
    this.toggleButton.onmouseout = () => {
      this.toggleButton.style.backgroundColor = "#2563eb";
      this.toggleButton.style.transform = "translateY(0)";
    };

    this.toggleButton.onclick = () => this.toggleDoors();
    this.container.appendChild(this.toggleButton);
  }

  toggleDoors() {
    this.isDoorsOpen = !this.isDoorsOpen;
    this.toggleButton.innerText = this.isDoorsOpen
      ? "Close Doors & Drawers"
      : "Open Doors & Drawers";

    this.doorHinges.forEach((door) => {
      door.userData.targetY = this.isDoorsOpen ? -Math.PI / 2.0 : 0;
    });

    this.drawers.forEach((drawer) => {
      drawer.userData.targetZ = this.isDoorsOpen
        ? drawer.userData.openOffset
        : 0;
    });
  }

  // NEW: Expose explode state handler for React
  setExploded(isExploded) {
    this.isExploded = isExploded;
  }

  setupLighting() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambient);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
    mainLight.position.set(1500, 2500, 1500);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.left = -2500;
    mainLight.shadow.camera.right = 2500;
    mainLight.shadow.camera.top = 2500;
    mainLight.shadow.camera.bottom = -2500;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 6000;
    mainLight.shadow.bias = -0.0001;
    this.scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.6);
    fillLight.position.set(-1500, 1200, 800);
    this.scene.add(fillLight);

    const backLight = new THREE.DirectionalLight(0xffffff, 0.4);
    backLight.position.set(0, 800, -1500);
    this.scene.add(backLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x888888, 0.5);
    hemiLight.position.set(0, 2500, 0);
    this.scene.add(hemiLight);
  }

  setupHelpers() {
    const groundGeometry = new THREE.PlaneGeometry(6000, 6000);
    const groundMaterial = new THREE.ShadowMaterial({ opacity: 0.2 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -5;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const gridHelper = new THREE.GridHelper(4000, 50, 0x999999, 0xcccccc);
    gridHelper.position.y = 0;
    gridHelper.material.opacity = 0.25;
    gridHelper.material.transparent = true;
    this.scene.add(gridHelper);

    this.axesHelper = new THREE.AxesHelper(800);
    this.axesHelper.visible = false;
    this.scene.add(this.axesHelper);
  }

  createMaterials() {
    return {
      carcass: new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.5,
        metalness: 0.0,
      }),
      door: new THREE.MeshStandardMaterial({
        color: 0xf5f5f5,
        roughness: 0.3,
        metalness: 0.05,
      }),
      shelf: new THREE.MeshStandardMaterial({
        color: 0xe8d4b8,
        roughness: 0.6,
        metalness: 0.0,
      }),
      drawerFace: new THREE.MeshStandardMaterial({
        color: 0xf0f0f0,
        roughness: 0.4,
        metalness: 0.0,
      }),
      handle: new THREE.MeshStandardMaterial({
        color: 0x505050,
        roughness: 0.2,
        metalness: 0.9,
      }),
      back: new THREE.MeshStandardMaterial({
        color: 0xf8f8f8,
        roughness: 0.7,
        metalness: 0.0,
      }),
      highlight: new THREE.MeshStandardMaterial({
        color: 0x4a9eff,
        roughness: 0.3,
        metalness: 0.2,
        emissive: 0x2563eb,
        emissiveIntensity: 0.4,
      }),
      hover: new THREE.MeshStandardMaterial({
        color: 0x6bb6ff,
        roughness: 0.3,
        metalness: 0.1,
        emissive: 0x3b82f6,
        emissiveIntensity: 0.3,
      }),
    };
  }

  buildCabinet() {
    if (this.cabinetGroup) {
      this.scene.remove(this.cabinetGroup);
      this.cabinetGroup.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      });
    }

    this.doorHinges = [];
    this.drawers = [];
    this.isDoorsOpen = false;
    this.selectedSection = null;
    this.hoveredSection = null;
    if (this.toggleButton) this.toggleButton.innerText = "Open Doors & Drawers";

    this.cabinetGroup = new THREE.Group();
    this.cabinetGroup.name = "cabinet";

    // NEW: Save materials globally so we can reference them in selection/hover
    this.materials = this.createMaterials();
    const { overall, materials: matThickness, sections } = this.config;
    const { length: L, height: H, depth: D } = overall;
    const ct = matThickness.carcass;
    const bt = matThickness.back;

    this.cabinetGroup.position.set(-L / 2, 0, -D / 2);

    this.buildCarcassStructure(this.materials, L, H, D, ct, bt);
    this.buildSections(this.materials, sections, L, H, D, ct, bt);
    this.addDimensionAnnotations(L, H, D);

    // NEW: Final configuration for selections and explode states
    this.setupObjectMetadata();

    this.scene.add(this.cabinetGroup);
    this.centerCamera(L, H, D);
  }

  // NEW: Store initial states for hovering and exploding
  setupObjectMetadata() {
    const box = new THREE.Box3().setFromObject(this.cabinetGroup);
    const center = new THREE.Vector3();
    box.getCenter(center);

    this.cabinetGroup.traverse((obj) => {
      if (obj.isMesh || obj.isLineSegments) {
        // 1. Store original materials for hover restoration
        if (obj.isMesh) {
          obj.userData.originalMaterial = obj.material;
        }

        // 2. Store base positions and calculate explode vectors
        obj.userData.originalPosition = obj.position.clone();

        const objBox = new THREE.Box3().setFromObject(obj);
        const objCenter = new THREE.Vector3();
        objBox.getCenter(objCenter);

        // Create an outward direction relative to the overall cabinet center
        const dir = new THREE.Vector3()
          .subVectors(objCenter, center)
          .normalize();
        if (dir.lengthSq() === 0) dir.set(0, 0, 1);

        obj.userData.explodeDirection = dir;
      }
    });
  }

  buildCarcassStructure(materials, L, H, D, ct, bt) {
    const topGeo = new THREE.BoxGeometry(L, ct, D - bt);
    const top = new THREE.Mesh(topGeo, materials.carcass);
    top.position.set(L / 2, H - ct / 2, (D + bt) / 2);
    top.castShadow = true;
    top.receiveShadow = true;
    this.cabinetGroup.add(top);

    const topEdges = new THREE.EdgesGeometry(topGeo);
    const topLines = new THREE.LineSegments(
      topEdges,
      new THREE.LineBasicMaterial({ color: 0x333333, linewidth: 1 }),
    );
    topLines.position.copy(top.position);
    this.cabinetGroup.add(topLines);

    const bottom = new THREE.Mesh(topGeo, materials.carcass);
    bottom.position.set(L / 2, ct / 2, (D + bt) / 2);
    bottom.castShadow = true;
    bottom.receiveShadow = true;
    this.cabinetGroup.add(bottom);

    const bottomEdges = new THREE.EdgesGeometry(topGeo);
    const bottomLines = new THREE.LineSegments(
      bottomEdges,
      new THREE.LineBasicMaterial({ color: 0x333333, linewidth: 1 }),
    );
    bottomLines.position.copy(bottom.position);
    this.cabinetGroup.add(bottomLines);

    const sideGeo = new THREE.BoxGeometry(ct, H - ct * 2, D - bt);
    const leftSide = new THREE.Mesh(sideGeo, materials.carcass);
    leftSide.position.set(ct / 2, H / 2, (D + bt) / 2);
    leftSide.castShadow = true;
    leftSide.receiveShadow = true;
    this.cabinetGroup.add(leftSide);

    const leftEdges = new THREE.EdgesGeometry(sideGeo);
    const leftLines = new THREE.LineSegments(
      leftEdges,
      new THREE.LineBasicMaterial({ color: 0x333333, linewidth: 1 }),
    );
    leftLines.position.copy(leftSide.position);
    this.cabinetGroup.add(leftLines);

    const rightSide = new THREE.Mesh(sideGeo, materials.carcass);
    rightSide.position.set(L - ct / 2, H / 2, (D + bt) / 2);
    rightSide.castShadow = true;
    rightSide.receiveShadow = true;
    this.cabinetGroup.add(rightSide);

    const rightEdges = new THREE.EdgesGeometry(sideGeo);
    const rightLines = new THREE.LineSegments(
      rightEdges,
      new THREE.LineBasicMaterial({ color: 0x333333, linewidth: 1 }),
    );
    rightLines.position.copy(rightSide.position);
    this.cabinetGroup.add(rightLines);

    const backGeo = new THREE.BoxGeometry(L - ct * 2, H, bt);
    const back = new THREE.Mesh(backGeo, materials.back);
    back.position.set(L / 2, H / 2, bt / 2);
    back.receiveShadow = true;
    this.cabinetGroup.add(back);

    const backEdges = new THREE.EdgesGeometry(backGeo);
    const backLines = new THREE.LineSegments(
      backEdges,
      new THREE.LineBasicMaterial({ color: 0x666666, linewidth: 1 }),
    );
    backLines.position.copy(back.position);
    this.cabinetGroup.add(backLines);
  }

  buildSections(materials, sections, L, H, D, ct, bt) {
    const totalWidth = sections.reduce((sum, s) => sum + s.width, 0);
    const scale = L / totalWidth;
    let currentX = ct;

    sections.forEach((section, idx) => {
      const sectionWidth = section.width * scale;
      const sectionGroup = new THREE.Group();
      sectionGroup.name = `section-${section.id}`;
      sectionGroup.userData = { section, index: idx };

      if (idx > 0) {
        const dividerGeo = new THREE.BoxGeometry(ct, H - ct * 2, D - bt);
        const divider = new THREE.Mesh(dividerGeo, materials.carcass);
        divider.position.set(currentX - ct / 2, H / 2, (D + bt) / 2);
        divider.castShadow = true;
        divider.receiveShadow = true;
        sectionGroup.add(divider);

        const dividerEdges = new THREE.EdgesGeometry(dividerGeo);
        const dividerLines = new THREE.LineSegments(
          dividerEdges,
          new THREE.LineBasicMaterial({ color: 0x333333, linewidth: 1 }),
        );
        dividerLines.position.copy(divider.position);
        sectionGroup.add(dividerLines);
      }

      const interiorX = currentX;
      const interiorWidth =
        sectionWidth - (idx === sections.length - 1 ? ct : 0);
      const interiorHeight = H - ct * 2;
      const interiorDepth = D - bt - ct;

      if (section.type === "open") {
        this.buildOpenSection(
          sectionGroup,
          materials,
          interiorX,
          interiorWidth,
          interiorHeight,
          interiorDepth,
          ct,
          section,
          D,
          bt,
        );
      } else {
        this.buildClosedSection(
          sectionGroup,
          materials,
          interiorX,
          interiorWidth,
          interiorHeight,
          interiorDepth,
          ct,
          H,
          section,
          D,
        );
      }

      this.cabinetGroup.add(sectionGroup);
      currentX += sectionWidth;
    });
  }

  buildOpenSection(group, materials, x, w, h, d, ct, section, D, bt) {
    const shelfCount = section.shelves || 0;
    if (shelfCount > 0) {
      const shelfSpacing = h / (shelfCount + 1);
      for (let i = 0; i < shelfCount; i++) {
        const shelfY = ct + (i + 1) * shelfSpacing;
        const shelfGeo = new THREE.BoxGeometry(w - 20, 18, d - 20);
        const shelf = new THREE.Mesh(shelfGeo, materials.shelf);
        shelf.position.set(x + w / 2, shelfY, (D + bt) / 2);
        shelf.castShadow = true;
        shelf.receiveShadow = true;
        group.add(shelf);

        const shelfEdges = new THREE.EdgesGeometry(shelfGeo);
        const shelfLines = new THREE.LineSegments(
          shelfEdges,
          new THREE.LineBasicMaterial({ color: 0x555555, linewidth: 1 }),
        );
        shelfLines.position.copy(shelf.position);
        group.add(shelfLines);
      }
    }
  }

  buildClosedSection(group, materials, x, w, h, d, ct, totalH, section, D) {
    const doorGap = 2;
    const doorWidth = w - doorGap * 2;
    const doorHeight = totalH - doorGap * 2;

    const doorHinge = new THREE.Group();
    doorHinge.position.set(x + doorGap, totalH / 2, D + 5);

    const doorGeo = new THREE.BoxGeometry(doorWidth, doorHeight, 18);
    doorGeo.translate(doorWidth / 2, 0, 0);

    const doorMat = materials.door.clone();
    doorMat.transparent = true;
    doorMat.opacity = 0.75;
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.castShadow = true;
    door.receiveShadow = true;
    doorHinge.add(door);

    const doorEdges = new THREE.EdgesGeometry(doorGeo);
    const doorLines = new THREE.LineSegments(
      doorEdges,
      new THREE.LineBasicMaterial({ color: 0x333333, linewidth: 1.5 }),
    );
    doorHinge.add(doorLines);

    const handleGeo = new THREE.CylinderGeometry(6, 6, totalH * 0.18, 16);
    const handle = new THREE.Mesh(handleGeo, materials.handle);
    handle.position.set(doorWidth - 25, 0, 10);
    handle.castShadow = true;
    doorHinge.add(handle);

    doorHinge.rotation.y = 0;
    doorHinge.userData = { targetY: 0 };
    this.doorHinges.push(doorHinge);
    group.add(doorHinge);

    const drawerCount = section.drawers?.count || 0;
    const drawerHeight = section.drawers?.height || 120;
    const placement = section.drawers?.placement || "bottom";

    let drawerAreaStart, drawerAreaEnd, shelfAreaStart, shelfAreaEnd;

    if (drawerCount > 0) {
      const totalDrawerHeight = drawerCount * drawerHeight;
      if (placement === "bottom") {
        drawerAreaStart = ct;
        drawerAreaEnd = ct + totalDrawerHeight;
        shelfAreaStart = drawerAreaEnd;
        shelfAreaEnd = totalH - ct;
      } else if (placement === "top") {
        shelfAreaStart = ct;
        shelfAreaEnd = totalH - ct - totalDrawerHeight;
        drawerAreaStart = shelfAreaEnd;
        drawerAreaEnd = totalH - ct;
      } else {
        drawerAreaStart = ct;
        drawerAreaEnd = totalH - ct;
        shelfAreaStart = 0;
        shelfAreaEnd = 0;
      }

      for (let i = 0; i < drawerCount; i++) {
        const drawerY = drawerAreaStart + i * drawerHeight + drawerHeight / 2;

        const drawerGroupTarget = new THREE.Group();
        drawerGroupTarget.userData = { targetZ: 0, openOffset: d * 0.65 };

        const drawerBoxGeo = new THREE.BoxGeometry(
          w - 50,
          drawerHeight - 15,
          d - 80,
        );
        const drawerBox = new THREE.Mesh(drawerBoxGeo, materials.drawerFace);
        drawerBox.position.set(x + w / 2, drawerY, D - d / 2);
        drawerBox.castShadow = true;
        drawerBox.receiveShadow = true;
        drawerGroupTarget.add(drawerBox);

        const drawerEdges = new THREE.EdgesGeometry(drawerBoxGeo);
        const drawerLines = new THREE.LineSegments(
          drawerEdges,
          new THREE.LineBasicMaterial({ color: 0x444444, linewidth: 1 }),
        );
        drawerLines.position.copy(drawerBox.position);
        drawerGroupTarget.add(drawerLines);

        const drawerFaceGeo = new THREE.BoxGeometry(
          w - doorGap * 4,
          drawerHeight - 8,
          12,
        );
        const drawerFace = new THREE.Mesh(drawerFaceGeo, materials.door);
        drawerFace.position.set(x + w / 2, drawerY, D + 2);
        drawerFace.castShadow = true;
        drawerGroupTarget.add(drawerFace);

        const faceEdges = new THREE.EdgesGeometry(drawerFaceGeo);
        const faceLines = new THREE.LineSegments(
          faceEdges,
          new THREE.LineBasicMaterial({ color: 0x333333, linewidth: 1 }),
        );
        faceLines.position.copy(drawerFace.position);
        drawerGroupTarget.add(faceLines);

        const dHandleGeo = new THREE.CylinderGeometry(3, 3, w * 0.45, 12);
        dHandleGeo.rotateZ(Math.PI / 2);
        const dHandle = new THREE.Mesh(dHandleGeo, materials.handle);
        dHandle.position.set(x + w / 2, drawerY, D + 10);
        dHandle.castShadow = true;
        drawerGroupTarget.add(dHandle);

        this.drawers.push(drawerGroupTarget);
        group.add(drawerGroupTarget);
      }
    } else {
      shelfAreaStart = ct;
      shelfAreaEnd = totalH - ct;
    }

    const shelfCount = section.shelves || 0;
    if (shelfCount > 0 && shelfAreaEnd > shelfAreaStart) {
      const shelfAreaHeight = shelfAreaEnd - shelfAreaStart;
      const shelfSpacing = shelfAreaHeight / (shelfCount + 1);
      for (let i = 0; i < shelfCount; i++) {
        const shelfY = shelfAreaStart + (i + 1) * shelfSpacing;
        const shelfGeo = new THREE.BoxGeometry(w - 25, 18, d - 30);
        const shelf = new THREE.Mesh(shelfGeo, materials.shelf);
        shelf.position.set(x + w / 2, shelfY, D - d / 2);
        shelf.castShadow = true;
        shelf.receiveShadow = true;
        group.add(shelf);

        const shelfEdges = new THREE.EdgesGeometry(shelfGeo);
        const shelfLines = new THREE.LineSegments(
          shelfEdges,
          new THREE.LineBasicMaterial({ color: 0x555555, linewidth: 1 }),
        );
        shelfLines.position.copy(shelf.position);
        group.add(shelfLines);
      }
    }
  }

  addDimensionAnnotations(L, H, D) {
    this.dimensionLines.forEach((line) => this.scene.remove(line));
    this.dimensionLines = [];

    const color = 0x2563eb;
    const lineMaterial = new THREE.LineBasicMaterial({ color, linewidth: 2 });

    const widthPoints = [
      new THREE.Vector3(-L / 2, -100, D / 2 + 100),
      new THREE.Vector3(L / 2, -100, D / 2 + 100),
    ];
    const widthLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(widthPoints),
      lineMaterial,
    );
    this.scene.add(widthLine);
    this.dimensionLines.push(widthLine);

    const heightPoints = [
      new THREE.Vector3(-L / 2 - 100, 0, 0),
      new THREE.Vector3(-L / 2 - 100, H, 0),
    ];
    const heightLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(heightPoints),
      lineMaterial,
    );
    this.scene.add(heightLine);
    this.dimensionLines.push(heightLine);
  }

  setupEventListeners() {
    window.addEventListener("resize", () => this.onWindowResize(), false);
    this.renderer.domElement.addEventListener(
      "mousemove",
      (e) => this.onMouseMove(e),
      false,
    );
    this.renderer.domElement.addEventListener(
      "click",
      (e) => this.onClick(e),
      false,
    );
    window.addEventListener("keydown", (e) => this.onKeyDown(e), false);
  }

  onWindowResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  // NEW: Extracted material update logic to run properly on hover/click
  updateHighlighting() {
    // 1. Reset all to original
    this.cabinetGroup.traverse((obj) => {
      if (obj.isMesh && obj.userData.originalMaterial) {
        obj.material = obj.userData.originalMaterial;
      }
    });

    // 2. Apply highlight to selected
    if (this.selectedSection) {
      this.selectedSection.traverse((obj) => {
        if (obj.isMesh && obj.userData.originalMaterial) {
          obj.material = this.materials.highlight;
        }
      });
    }

    // 3. Apply hover to hovered (if it's not the selected one)
    if (this.hoveredSection && this.hoveredSection !== this.selectedSection) {
      this.hoveredSection.traverse((obj) => {
        if (obj.isMesh && obj.userData.originalMaterial) {
          obj.material = this.materials.hover;
        }
      });
    }
  }

  onMouseMove(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(
      this.cabinetGroup.children,
      true,
    );

    let activeSection = null;

    if (intersects.length > 0) {
      let parent = intersects[0].object;
      while (parent && parent.parent !== this.cabinetGroup) {
        if (parent.userData.section) {
          activeSection = parent;
          break;
        }
        parent = parent.parent;
      }
    }

    // Only update materials if the hovered target changed
    if (this.hoveredSection !== activeSection) {
      this.hoveredSection = activeSection;
      this.updateHighlighting();
    }

    this.renderer.domElement.style.cursor = activeSection
      ? "pointer"
      : "default";
  }

  onClick(event) {
    if (this.hoveredSection) {
      // Toggle selection off if already selected, otherwise select it
      if (this.selectedSection === this.hoveredSection) {
        this.selectedSection = null;
      } else {
        this.selectedSection = this.hoveredSection;
      }

      // Ensure material changes happen immediately
      this.updateHighlighting();

      this.container.dispatchEvent(
        new CustomEvent("sectionselected", {
          detail: {
            section: this.selectedSection
              ? this.selectedSection.userData.section
              : null,
          },
        }),
      );
    }
  }

  onKeyDown(event) {
    switch (event.key.toLowerCase()) {
      case "a":
        this.axesHelper.visible = !this.axesHelper.visible;
        break;
      case "r":
        this.centerCamera(
          this.config.overall.length,
          this.config.overall.height,
          this.config.overall.depth,
        );
        break;
      case "f":
        this.camera.position.set(
          0,
          this.config.overall.height / 2,
          this.config.overall.length * 1.5,
        );
        this.controls.target.set(0, this.config.overall.height / 2, 0);
        break;
      case "s":
        this.camera.position.set(
          this.config.overall.length * 1.5,
          this.config.overall.height / 2,
          0,
        );
        this.controls.target.set(0, this.config.overall.height / 2, 0);
        break;
      case "t":
        this.camera.position.set(0, this.config.overall.height * 2, 0);
        this.controls.target.set(0, 0, 0);
        break;
    }
  }

  centerCamera(L, H, D) {
    const maxDim = Math.max(L, H, D);
    const distance = maxDim * 1.4;

    this.camera.position.set(-distance * 0.4, H * 0.8, distance * 0.8);
    this.controls.target.set(0, H * 0.5, 0);
    this.controls.update();
  }

  updateConfig(newConfig) {
    this.config = newConfig;
    this.buildCabinet();
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const lerpFactor = 0.1;

    // Smooth door/drawer animation
    if (this.doorHinges.length > 0) {
      this.doorHinges.forEach((door) => {
        door.rotation.y +=
          (door.userData.targetY - door.rotation.y) * lerpFactor;
      });
    }

    if (this.drawers.length > 0) {
      this.drawers.forEach((drawer) => {
        drawer.position.z +=
          (drawer.userData.targetZ - drawer.position.z) * lerpFactor;
      });
    }

    // NEW: Smooth Explode animation interpolating saved originalPosition and direction
    const explodeDistance = 350;
    if (this.cabinetGroup) {
      this.cabinetGroup.traverse((obj) => {
        if (
          (obj.isMesh || obj.isLineSegments) &&
          obj.userData.originalPosition
        ) {
          const targetPos = obj.userData.originalPosition.clone();

          if (this.isExploded) {
            const offset = obj.userData.explodeDirection
              .clone()
              .multiplyScalar(explodeDistance);
            targetPos.add(offset);
          }

          obj.position.lerp(targetPos, lerpFactor);
        }
      });
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.controls.dispose();
    this.renderer.dispose();
    if (this.toggleButton && this.container.contains(this.toggleButton)) {
      this.container.removeChild(this.toggleButton);
    }
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
    window.removeEventListener("resize", this.onWindowResize);
  }
}
