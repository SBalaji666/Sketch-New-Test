import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

/**
 * Three.js Cabinet Renderer - Infurnia-style 3D Visualization
 * * Features:
 * - Interactive 3D view with orbit controls
 * - Realistic materials (wood, metal handles)
 * - Section highlighting on hover
 * - Exploded view mode
 * - Dimension annotations in 3D space
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
    
    this.init();
  }

  init() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf8f9fa);

    // Camera - restored to standard +Z facing origin
    this.camera = new THREE.PerspectiveCamera(50, width / height, 1, 10000);
    this.camera.position.set(0, 1200, 3500); 
    this.camera.lookAt(0, 1100, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    
    this.container.appendChild(this.renderer.domElement);

    // Controls
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

    // Lighting setup
    this.setupLighting();

    // Grid and helpers
    this.setupHelpers();

    // Raycaster for interaction
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // Event listeners
    this.setupEventListeners();

    // Build initial cabinet
    this.buildCabinet();

    // Start animation loop
    this.animate();
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
      carcass: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0.0 }),
      door: new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.3, metalness: 0.05 }),
      shelf: new THREE.MeshStandardMaterial({ color: 0xe8d4b8, roughness: 0.6, metalness: 0.0 }),
      drawerFace: new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.4, metalness: 0.0 }),
      handle: new THREE.MeshStandardMaterial({ color: 0x505050, roughness: 0.2, metalness: 0.9 }),
      back: new THREE.MeshStandardMaterial({ color: 0xf8f8f8, roughness: 0.7, metalness: 0.0 }),
      highlight: new THREE.MeshStandardMaterial({ color: 0x4a9eff, roughness: 0.3, metalness: 0.2, emissive: 0x2563eb, emissiveIntensity: 0.4 }),
      hover: new THREE.MeshStandardMaterial({ color: 0x6bb6ff, roughness: 0.3, metalness: 0.1, emissive: 0x3b82f6, emissiveIntensity: 0.3 }),
    };
  }

  buildCabinet() {
    if (this.cabinetGroup) {
      this.scene.remove(this.cabinetGroup);
      this.cabinetGroup.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      });
    }

    this.cabinetGroup = new THREE.Group();
    this.cabinetGroup.name = 'cabinet';
    
    const materials = this.createMaterials();
    const { overall, materials: matThickness, sections } = this.config;
    const { length: L, height: H, depth: D } = overall;
    const ct = matThickness.carcass;
    const bt = matThickness.back;

    this.cabinetGroup.position.set(-L / 2, 0, -D / 2);

    this.buildCarcassStructure(materials, L, H, D, ct, bt);
    this.buildSections(materials, sections, L, H, D, ct, bt);
    this.addDimensionAnnotations(L, H, D);

    this.scene.add(this.cabinetGroup);
    this.centerCamera(L, H, D);
  }

  buildCarcassStructure(materials, L, H, D, ct, bt) {
    // Top panel (Z inverted: back is at 0, front is at D)
    const topGeo = new THREE.BoxGeometry(L, ct, D - bt);
    const top = new THREE.Mesh(topGeo, materials.carcass);
    top.position.set(L / 2, H - ct / 2, (D + bt) / 2);
    top.castShadow = true;
    top.receiveShadow = true;
    this.cabinetGroup.add(top);
    
    const topEdges = new THREE.EdgesGeometry(topGeo);
    const topLines = new THREE.LineSegments(topEdges, new THREE.LineBasicMaterial({ color: 0x333333, linewidth: 1 }));
    topLines.position.copy(top.position);
    this.cabinetGroup.add(topLines);

    // Bottom panel
    const bottom = new THREE.Mesh(topGeo, materials.carcass);
    bottom.position.set(L / 2, ct / 2, (D + bt) / 2);
    bottom.castShadow = true;
    bottom.receiveShadow = true;
    this.cabinetGroup.add(bottom);
    
    const bottomEdges = new THREE.EdgesGeometry(topGeo);
    const bottomLines = new THREE.LineSegments(bottomEdges, new THREE.LineBasicMaterial({ color: 0x333333, linewidth: 1 }));
    bottomLines.position.copy(bottom.position);
    this.cabinetGroup.add(bottomLines);

    // Left side
    const sideGeo = new THREE.BoxGeometry(ct, H - ct * 2, D - bt);
    const leftSide = new THREE.Mesh(sideGeo, materials.carcass);
    leftSide.position.set(ct / 2, H / 2, (D + bt) / 2);
    leftSide.castShadow = true;
    leftSide.receiveShadow = true;
    this.cabinetGroup.add(leftSide);
    
    const leftEdges = new THREE.EdgesGeometry(sideGeo);
    const leftLines = new THREE.LineSegments(leftEdges, new THREE.LineBasicMaterial({ color: 0x333333, linewidth: 1 }));
    leftLines.position.copy(leftSide.position);
    this.cabinetGroup.add(leftLines);

    // Right side
    const rightSide = new THREE.Mesh(sideGeo, materials.carcass);
    rightSide.position.set(L - ct / 2, H / 2, (D + bt) / 2);
    rightSide.castShadow = true;
    rightSide.receiveShadow = true;
    this.cabinetGroup.add(rightSide);
    
    const rightEdges = new THREE.EdgesGeometry(sideGeo);
    const rightLines = new THREE.LineSegments(rightEdges, new THREE.LineBasicMaterial({ color: 0x333333, linewidth: 1 }));
    rightLines.position.copy(rightSide.position);
    this.cabinetGroup.add(rightLines);

    // Back panel (Positioned at Z = bt/2 so it sits exactly at the back origin)
    const backGeo = new THREE.BoxGeometry(L - ct * 2, H, bt);
    const back = new THREE.Mesh(backGeo, materials.back);
    back.position.set(L / 2, H / 2, bt / 2);
    back.receiveShadow = true;
    this.cabinetGroup.add(back);
    
    const backEdges = new THREE.EdgesGeometry(backGeo);
    const backLines = new THREE.LineSegments(backEdges, new THREE.LineBasicMaterial({ color: 0x666666, linewidth: 1 }));
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
        const dividerLines = new THREE.LineSegments(dividerEdges, new THREE.LineBasicMaterial({ color: 0x333333, linewidth: 1 }));
        dividerLines.position.copy(divider.position);
        sectionGroup.add(dividerLines);
      }

      const interiorX = currentX;
      const interiorWidth = sectionWidth - (idx === sections.length - 1 ? ct : 0);
      const interiorHeight = H - ct * 2;
      const interiorDepth = D - bt - ct;

      if (section.type === 'open') {
        this.buildOpenSection(sectionGroup, materials, interiorX, interiorWidth, interiorHeight, interiorDepth, ct, section, D, bt);
      } else {
        this.buildClosedSection(sectionGroup, materials, interiorX, interiorWidth, interiorHeight, interiorDepth, ct, H, section, D);
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
        // Centered inside the carcass depth
        shelf.position.set(x + w / 2, shelfY, (D + bt) / 2);
        shelf.castShadow = true;
        shelf.receiveShadow = true;
        group.add(shelf);
        
        const shelfEdges = new THREE.EdgesGeometry(shelfGeo);
        const shelfLines = new THREE.LineSegments(shelfEdges, new THREE.LineBasicMaterial({ color: 0x555555, linewidth: 1 }));
        shelfLines.position.copy(shelf.position);
        group.add(shelfLines);
      }
    }
  }

  buildClosedSection(group, materials, x, w, h, d, ct, totalH, section, D) {
    const doorGap = 2;
    
    // Door panel (Moved to D + 5 to sit at the front)
    const doorGeo = new THREE.BoxGeometry(w - doorGap * 2, totalH - doorGap * 2, 18);
    const doorMat = materials.door.clone();
    doorMat.transparent = true;
    doorMat.opacity = 0.85; 
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(x + w / 2, totalH / 2, D + 5);
    door.castShadow = true;
    door.receiveShadow = true;
    group.add(door);
    
    const doorEdges = new THREE.EdgesGeometry(doorGeo);
    const doorLines = new THREE.LineSegments(doorEdges, new THREE.LineBasicMaterial({ color: 0x333333, linewidth: 1.5 }));
    doorLines.position.copy(door.position);
    group.add(doorLines);

    // Handle (Moved to D + 15)
    const handleGeo = new THREE.CylinderGeometry(6, 6, totalH * 0.18, 16);
    const handle = new THREE.Mesh(handleGeo, materials.handle);
    handle.position.set(x + w * 0.85, totalH / 2, D + 15);
    handle.castShadow = true;
    group.add(handle);

    const drawerCount = section.drawers?.count || 0;
    const drawerHeight = section.drawers?.height || 120;
    const placement = section.drawers?.placement || 'bottom';
    
    let drawerAreaStart, drawerAreaEnd, shelfAreaStart, shelfAreaEnd;
    
    if (drawerCount > 0) {
      const totalDrawerHeight = drawerCount * drawerHeight;
      if (placement === 'bottom') {
        drawerAreaStart = ct;
        drawerAreaEnd = ct + totalDrawerHeight;
        shelfAreaStart = drawerAreaEnd;
        shelfAreaEnd = totalH - ct;
      } else if (placement === 'top') {
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
        const drawerY = drawerAreaStart + (i * drawerHeight) + (drawerHeight / 2);
        
        // Drawer box
        const drawerBoxGeo = new THREE.BoxGeometry(w - 50, drawerHeight - 15, d - 80);
        const drawerBox = new THREE.Mesh(drawerBoxGeo, materials.drawerFace);
        drawerBox.position.set(x + w / 2, drawerY, D - d / 2);
        drawerBox.castShadow = true;
        drawerBox.receiveShadow = true;
        group.add(drawerBox);
        
        const drawerEdges = new THREE.EdgesGeometry(drawerBoxGeo);
        const drawerLines = new THREE.LineSegments(drawerEdges, new THREE.LineBasicMaterial({ color: 0x444444, linewidth: 1 }));
        drawerLines.position.copy(drawerBox.position);
        group.add(drawerLines);
        
        // Drawer face
        const drawerFaceGeo = new THREE.BoxGeometry(w - doorGap * 4, drawerHeight - 8, 12);
        const drawerFace = new THREE.Mesh(drawerFaceGeo, materials.door);
        drawerFace.position.set(x + w / 2, drawerY, D + 2);
        drawerFace.castShadow = true;
        group.add(drawerFace);
        
        const faceEdges = new THREE.EdgesGeometry(drawerFaceGeo);
        const faceLines = new THREE.LineSegments(faceEdges, new THREE.LineBasicMaterial({ color: 0x333333, linewidth: 1 }));
        faceLines.position.copy(drawerFace.position);
        group.add(faceLines);

        // Drawer handle
        const dHandleGeo = new THREE.CylinderGeometry(3, 3, w * 0.45, 12);
        dHandleGeo.rotateZ(Math.PI / 2);
        const dHandle = new THREE.Mesh(dHandleGeo, materials.handle);
        dHandle.position.set(x + w / 2, drawerY, D + 10);
        dHandle.castShadow = true;
        group.add(dHandle);
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
        const shelfLines = new THREE.LineSegments(shelfEdges, new THREE.LineBasicMaterial({ color: 0x555555, linewidth: 1 }));
        shelfLines.position.copy(shelf.position);
        group.add(shelfLines);
      }
    }
  }

  addDimensionAnnotations(L, H, D) {
    this.dimensionLines.forEach(line => this.scene.remove(line));
    this.dimensionLines = [];

    const color = 0x2563eb;
    const lineMaterial = new THREE.LineBasicMaterial({ color, linewidth: 2 });

    const widthPoints = [
      new THREE.Vector3(-L / 2, -100, D / 2 + 100),
      new THREE.Vector3(L / 2, -100, D / 2 + 100),
    ];
    const widthLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(widthPoints),
      lineMaterial
    );
    this.scene.add(widthLine);
    this.dimensionLines.push(widthLine);

    const heightPoints = [
      new THREE.Vector3(-L / 2 - 100, 0, 0),
      new THREE.Vector3(-L / 2 - 100, H, 0),
    ];
    const heightLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(heightPoints),
      lineMaterial
    );
    this.scene.add(heightLine);
    this.dimensionLines.push(heightLine);
  }

  setupEventListeners() {
    window.addEventListener('resize', () => this.onWindowResize(), false);
    this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e), false);
    this.renderer.domElement.addEventListener('click', (e) => this.onClick(e), false);
    window.addEventListener('keydown', (e) => this.onKeyDown(e), false);
  }

  onWindowResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  onMouseMove(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.cabinetGroup.children, true);

    if (this.hoveredSection) {
      this.hoveredSection.traverse(obj => {
        if (obj.material && obj.userData.originalMaterial) {
          obj.material = obj.userData.originalMaterial;
        }
      });
      this.hoveredSection = null;
    }

    if (intersects.length > 0) {
      let parent = intersects[0].object;
      while (parent && parent.parent !== this.cabinetGroup) {
        parent = parent.parent;
      }
      if (parent && parent.userData.section) {
        this.hoveredSection = parent;
        this.renderer.domElement.style.cursor = 'pointer';
      }
    } else {
      this.renderer.domElement.style.cursor = 'default';
    }
  }

  onClick(event) {
    if (this.hoveredSection) {
      if (this.selectedSection === this.hoveredSection) {
        this.selectedSection = null;
      } else {
        this.selectedSection = this.hoveredSection;
      }
      this.container.dispatchEvent(new CustomEvent('sectionselected', { 
        detail: { section: this.hoveredSection.userData.section } 
      }));
    }
  }

  onKeyDown(event) {
    switch (event.key.toLowerCase()) {
      case 'a':
        this.axesHelper.visible = !this.axesHelper.visible;
        break;
      case 'r':
        this.centerCamera(this.config.overall.length, this.config.overall.height, this.config.overall.depth);
        break;
      case 'f':
        // Front view (Restored to +Z)
        this.camera.position.set(0, this.config.overall.height / 2, this.config.overall.length * 1.5);
        this.controls.target.set(0, this.config.overall.height / 2, 0);
        break;
      case 's':
        // Side view (Restored to +X)
        this.camera.position.set(this.config.overall.length * 1.5, this.config.overall.height / 2, 0);
        this.controls.target.set(0, this.config.overall.height / 2, 0);
        break;
      case 't':
        this.camera.position.set(0, this.config.overall.height * 2, 0);
        this.controls.target.set(0, 0, 0);
        break;
    }
  }

  centerCamera(L, H, D) {
    const maxDim = Math.max(L, H, D);
    const distance = maxDim * 1.6;
    
    // Isometric view correctly facing front
    this.camera.position.set(distance * 0.6, H * 0.8, distance * 0.8);
    this.controls.target.set(0, H * 0.5, 0);
    this.controls.update();
  }

  updateConfig(newConfig) {
    this.config = newConfig;
    this.buildCabinet();
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.controls.dispose();
    this.renderer.dispose();
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
    window.removeEventListener('resize', this.onWindowResize);
  }
}