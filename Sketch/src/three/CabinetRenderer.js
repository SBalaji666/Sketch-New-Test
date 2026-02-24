import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

/**
 * Three.js Cabinet Renderer - Infurnia-style 3D Visualization
 * * Features:
 * - Interactive 3D view with orbit controls
 * - Realistic materials (wood, metal handles)
 * - Dynamic configuration mapping (Plinths, Thicknesses, Tolerances)
 * - Section highlighting on hover
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

    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf8f9fa);

    // Camera - isometric-style perspective
    this.camera = new THREE.PerspectiveCamera(50, width / height, 1, 10000);
    
    // Renderer setup
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
    this.controls.maxPolarAngle = Math.PI / 2;
    this.controls.minDistance = 500;
    this.controls.maxDistance = 5000;
    this.controls.enablePan = true;
    this.controls.panSpeed = 0.5;
    this.controls.rotateSpeed = 0.5;

    this.setupLighting();
    this.setupHelpers();

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.setupEventListeners();
    this.buildCabinet();
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
    const config = this.config;
    const { length: L, height: H, depth: D } = config.overall;
    
    // Extract thicknesses and hardware parameters from config
    const ct = config.materials.carcass || 18;
    const bt = config.materials.back || 9;
    const plinthH = config.hardware?.plinth ? parseInt(config.hardware.plinth.split('-')[1]) || 100 : 100;

    // Position cabinet globally so center is at 0,0
    this.cabinetGroup.position.set(-L / 2, 0, -D / 2);

    this.buildCarcassStructure(materials, L, H, D, ct, bt, plinthH);
    this.buildSections(materials, config.sections, L, H, D, ct, bt, plinthH, config.materials, config.tolerances);
    this.addDimensionAnnotations(L, H, D);

    this.scene.add(this.cabinetGroup);
    this.centerCamera(L, H, D);
  }

  buildCarcassStructure(materials, L, H, D, ct, bt, plinthH) {
    const carcassDepth = D - bt;
    const zCenter = (D + bt) / 2; // Shifts carcass forward so back panel sits at Z=0 to Z=bt

    // Plinth (Kickboard) - Recessed 30mm from the front
    const plinthGeo = new THREE.BoxGeometry(L - ct * 2, plinthH, ct);
    const plinth = new THREE.Mesh(plinthGeo, materials.carcass);
    plinth.position.set(L / 2, plinthH / 2, D - 30);
    plinth.castShadow = true;
    this.cabinetGroup.add(plinth);

    // Top panel
    const topGeo = new THREE.BoxGeometry(L, ct, carcassDepth);
    const top = new THREE.Mesh(topGeo, materials.carcass);
    top.position.set(L / 2, H - ct / 2, zCenter);
    top.castShadow = true;
    top.receiveShadow = true;
    this.cabinetGroup.add(top);
    
    this.addEdgeLines(topGeo, top.position, 0x333333);

    // Bottom panel (Sits above the plinth)
    const bottom = new THREE.Mesh(topGeo, materials.carcass);
    bottom.position.set(L / 2, plinthH + ct / 2, zCenter);
    bottom.castShadow = true;
    bottom.receiveShadow = true;
    this.cabinetGroup.add(bottom);
    
    this.addEdgeLines(topGeo, bottom.position, 0x333333);

    // Left side (Floor to top)
    const sideGeo = new THREE.BoxGeometry(ct, H, carcassDepth);
    const leftSide = new THREE.Mesh(sideGeo, materials.carcass);
    leftSide.position.set(ct / 2, H / 2, zCenter);
    leftSide.castShadow = true;
    leftSide.receiveShadow = true;
    this.cabinetGroup.add(leftSide);
    
    this.addEdgeLines(sideGeo, leftSide.position, 0x333333);

    // Right side (Floor to top)
    const rightSide = new THREE.Mesh(sideGeo, materials.carcass);
    rightSide.position.set(L - ct / 2, H / 2, zCenter);
    rightSide.castShadow = true;
    rightSide.receiveShadow = true;
    this.cabinetGroup.add(rightSide);
    
    this.addEdgeLines(sideGeo, rightSide.position, 0x333333);

    // Back panel (Starts above plinth)
    const backH = H - plinthH;
    const backGeo = new THREE.BoxGeometry(L - ct * 2, backH, bt);
    const back = new THREE.Mesh(backGeo, materials.back);
    back.position.set(L / 2, plinthH + backH / 2, bt / 2);
    back.receiveShadow = true;
    this.cabinetGroup.add(back);
    
    this.addEdgeLines(backGeo, back.position, 0x666666);
  }

  buildSections(materials, sections, L, H, D, ct, bt, plinthH, matConfig, tolerances) {
    // Calculate precise interior width mathematically
    const numDividers = sections.length > 0 ? sections.length - 1 : 0;
    const availableInteriorWidth = L - (ct * 2) - (ct * numDividers);
    const totalConfigWidth = sections.reduce((sum, s) => sum + s.width, 0);
    const scale = availableInteriorWidth / totalConfigWidth;
    
    let currentX = ct; // Start drawing after the left carcass panel

    const interiorH = H - plinthH - ct * 2;
    const interiorStartY = plinthH + ct;

    sections.forEach((section, idx) => {
      const interiorWidth = section.width * scale;
      const interiorCenterX = currentX + interiorWidth / 2;
      
      const sectionGroup = new THREE.Group();
      sectionGroup.name = `section-${section.id}`;
      sectionGroup.userData = { section, index: idx };

      const interiorDepth = D - bt - ct;

      if (section.type === 'open') {
        this.buildOpenSection(sectionGroup, materials, interiorCenterX, interiorWidth, interiorH, interiorDepth, interiorStartY, D, bt, section, matConfig);
      } else {
        this.buildClosedSection(sectionGroup, materials, interiorCenterX, interiorWidth, interiorH, interiorDepth, interiorStartY, D, bt, section, matConfig, tolerances);
      }

      this.cabinetGroup.add(sectionGroup);
      
      // Advance X past this section
      currentX += interiorWidth;

      // Add Divider if this isn't the last section
      if (idx < sections.length - 1) {
        const dividerGeo = new THREE.BoxGeometry(ct, interiorH, D - bt);
        const divider = new THREE.Mesh(dividerGeo, materials.carcass);
        divider.position.set(currentX + ct / 2, interiorStartY + interiorH / 2, (D + bt) / 2);
        divider.castShadow = true;
        divider.receiveShadow = true;
        this.cabinetGroup.add(divider);
        
        currentX += ct; // Advance X past the divider
      }
    });
  }

  buildOpenSection(group, materials, x, w, h, d, startY, D, bt, section, matConfig) {
    const shelfCount = section.shelves || 0;
    const shelfThick = matConfig.shelf || 18;

    for (let i = 0; i < shelfCount; i++) {
      const shelfY = startY + ((i + 1) * h) / (shelfCount + 1);
      const shelfGeo = new THREE.BoxGeometry(w - 2, shelfThick, d - 10);
      const shelf = new THREE.Mesh(shelfGeo, materials.shelf);
      shelf.position.set(x, shelfY, (D + bt) / 2);
      shelf.castShadow = true;
      shelf.receiveShadow = true;
      group.add(shelf);
    }
  }

buildClosedSection(group, materials, x, w, h, d, startY, D, bt, section, matConfig, tolerances) {
    const doorGap = tolerances?.doorGap || 2;
    const doorThick = matConfig.door || 18;
    const shelfThick = matConfig.shelf || 18;
    
    const drawerCount = section.drawers?.count || 0;
    const placement = section.drawers?.placement || 'bottom';
    const drawerHeight = section.drawers?.height || 120;

    // 1. FULL DRAWER SECTION (e.g., Section 1)
    if (drawerCount > 0 && placement === 'full') {
      const actualDrawerH = (h - (doorGap * (drawerCount + 1))) / drawerCount;
      
      for (let i = 0; i < drawerCount; i++) {
        const drawerY = startY + doorGap + (i * (actualDrawerH + doorGap)) + actualDrawerH / 2;
        
        // Drawer Face
        const drawerFaceGeo = new THREE.BoxGeometry(w - doorGap * 2, actualDrawerH, doorThick);
        const drawerFace = new THREE.Mesh(drawerFaceGeo, materials.drawerFace);
        drawerFace.position.set(x, drawerY, D + doorThick / 2);
        drawerFace.castShadow = true;
        drawerFace.userData = { originalMaterial: materials.drawerFace, section: section };
        group.add(drawerFace);

        // Drawer Handle
        const handleGeo = new THREE.CylinderGeometry(4, 4, w * 0.4, 16);
        handleGeo.rotateZ(Math.PI / 2);
        const handle = new THREE.Mesh(handleGeo, materials.handle);
        handle.position.set(x, drawerY, D + doorThick + 15);
        handle.castShadow = true;
        group.add(handle);
      }
      
      // Draw shelves even if it's full drawers (if configured)
      if (section.shelves > 0) {
         for (let i = 0; i < section.shelves; i++) {
          const shelfY = startY + ((i + 1) * h) / (section.shelves + 1);
          const shelfGeo = new THREE.BoxGeometry(w - 2, shelfThick, d - 10);
          const shelf = new THREE.Mesh(shelfGeo, materials.shelf);
          shelf.position.set(x, shelfY, (D + bt) / 2);
          shelf.castShadow = true;
          shelf.receiveShadow = true;
          group.add(shelf);
        }
      }
      return; // Skip drawing main door
    }

    // 2. PARTIAL DRAWERS (TOP OR BOTTOM) & DYNAMIC DOOR SIZING
    let doorStartY = startY;
    let doorHeight = h;
    let shelfStartY = startY;
    let shelfHeight = h;

    if (drawerCount > 0) {
      const totalDrawerSpace = drawerCount * drawerHeight;
      doorHeight = h - totalDrawerSpace; // The door takes up whatever space the drawers don't

      for (let i = 0; i < drawerCount; i++) {
        let drawerY;
        
        // Calculate Y position based on placement
        if (placement === 'bottom') {
          drawerY = startY + doorGap + (i * drawerHeight) + (drawerHeight - doorGap * 2) / 2;
          doorStartY = startY + totalDrawerSpace; // Push door up
          shelfStartY = doorStartY;
          shelfHeight = doorHeight;
        } else if (placement === 'top') {
          // Put drawers above the door
          drawerY = startY + doorHeight + doorGap + (i * drawerHeight) + (drawerHeight - doorGap * 2) / 2;
          doorStartY = startY; // Door stays at bottom
          shelfStartY = doorStartY;
          shelfHeight = doorHeight;
        }

        // External Drawer Face
        const drawerFaceGeo = new THREE.BoxGeometry(w - doorGap * 2, drawerHeight - doorGap * 2, doorThick);
        const drawerFace = new THREE.Mesh(drawerFaceGeo, materials.drawerFace);
        drawerFace.position.set(x, drawerY, D + doorThick / 2);
        drawerFace.castShadow = true;
        drawerFace.userData = { originalMaterial: materials.drawerFace, section: section };
        group.add(drawerFace);

        // Drawer Handle
        const handleGeo = new THREE.CylinderGeometry(4, 4, w * 0.4, 16);
        handleGeo.rotateZ(Math.PI / 2);
        const handle = new THREE.Mesh(handleGeo, materials.handle);
        handle.position.set(x, drawerY, D + doorThick + 15);
        handle.castShadow = true;
        group.add(handle);
      }
    }

    // 3. MAIN DOOR PANEL (covers the remaining height)
    if (doorHeight > 0) {
      const doorGeo = new THREE.BoxGeometry(w - doorGap * 2, doorHeight - doorGap * 2, doorThick);
      const door = new THREE.Mesh(doorGeo, materials.door);
      door.position.set(x, doorStartY + doorHeight / 2, D + doorThick / 2);
      door.castShadow = true;
      door.receiveShadow = true;
      door.userData = { originalMaterial: materials.door, section: section }; 
      group.add(door);

      // Door Handle
      const handleGeo = new THREE.CylinderGeometry(4, 4, Math.min(doorHeight * 0.16, 300), 16);
      const handle = new THREE.Mesh(handleGeo, materials.handle);
      
      // Shift handle up or down based on drawer placement for realism
      let handleY = doorStartY + doorHeight / 2; 
      if (placement === 'bottom' && doorHeight > 600) handleY -= doorHeight * 0.2; 
      if (placement === 'top' && doorHeight > 600) handleY += doorHeight * 0.2; 
      
      handle.position.set(x + w / 2 * 0.75, handleY, D + doorThick + 15);
      handle.castShadow = true;
      group.add(handle);
    }

    // 4. INTERNAL SHELVES
    if (section.shelves > 0) {
      for (let i = 0; i < section.shelves; i++) {
        // Distribute shelves only within the height of the door, not the drawers
        const shelfY = shelfStartY + ((i + 1) * shelfHeight) / (section.shelves + 1);
        const shelfGeo = new THREE.BoxGeometry(w - 2, shelfThick, d - 10);
        const shelf = new THREE.Mesh(shelfGeo, materials.shelf);
        shelf.position.set(x, shelfY, (D + bt) / 2);
        shelf.castShadow = true;
        shelf.receiveShadow = true;
        group.add(shelf);
      }
    }
  }

  addEdgeLines(geometry, position, colorHex) {
    const edges = new THREE.EdgesGeometry(geometry);
    const lines = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: colorHex, linewidth: 1 }));
    lines.position.copy(position);
    this.cabinetGroup.add(lines);
  }

  addDimensionAnnotations(L, H, D) {
    this.dimensionLines.forEach(line => this.scene.remove(line));
    this.dimensionLines = [];

    const color = 0x2563eb;
    const lineMaterial = new THREE.LineBasicMaterial({ color, linewidth: 2 });

    // Width Dimension
    const widthPoints = [
      new THREE.Vector3(-L / 2, -100, D + 100),
      new THREE.Vector3(L / 2, -100, D + 100),
    ];
    const widthLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(widthPoints), lineMaterial);
    this.scene.add(widthLine);
    this.dimensionLines.push(widthLine);

    // Height Dimension
    const heightPoints = [
      new THREE.Vector3(-L / 2 - 100, 0, D / 2),
      new THREE.Vector3(-L / 2 - 100, H, D / 2),
    ];
    const heightLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(heightPoints), lineMaterial);
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

    // Reset Hover state
    if (this.hoveredSection) {
      this.hoveredSection.traverse(obj => {
        if (obj.material && obj.userData.originalMaterial) {
          obj.material = obj.userData.originalMaterial;
        }
      });
      this.hoveredSection = null;
    }

    // Apply hover state
    if (intersects.length > 0) {
      let parent = intersects[0].object;
      
      // Navigate up to find the group holding the section data
      let sectionDataContainer = parent;
      while (sectionDataContainer && sectionDataContainer.parent !== this.cabinetGroup && !sectionDataContainer.userData.section) {
        sectionDataContainer = sectionDataContainer.parent;
      }

      // Sometimes data is directly on the door/drawer mesh to isolate the hover effect accurately
      if (parent.userData && parent.userData.originalMaterial) {
         parent.material = this.createMaterials().hover;
         this.hoveredSection = parent;
         this.renderer.domElement.style.cursor = 'pointer';
      } else if (sectionDataContainer && sectionDataContainer.userData.section) {
         this.hoveredSection = sectionDataContainer;
         this.renderer.domElement.style.cursor = 'pointer';
      }
    } else {
      this.renderer.domElement.style.cursor = 'default';
    }
  }

  onClick(event) {
    if (this.hoveredSection) {
      this.selectedSection = this.selectedSection === this.hoveredSection ? null : this.hoveredSection;
      const sectionData = this.hoveredSection.userData.section;
      this.container.dispatchEvent(new CustomEvent('sectionselected', { 
        detail: { section: sectionData } 
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
        this.camera.position.set(0, this.config.overall.height / 2, this.config.overall.length * 1.5);
        this.controls.target.set(0, this.config.overall.height / 2, 0);
        break;
      case 's':
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
    const distance = maxDim * 1.5;
    this.camera.position.set(distance * 0.8, distance * 0.7, distance);
    this.controls.target.set(0, H / 2, 0);
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