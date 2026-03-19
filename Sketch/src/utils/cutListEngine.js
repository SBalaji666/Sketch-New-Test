import {
  JOINERY_TYPES,
  DRAWER_SLIDES,
  HINGES,
  SHELF_SYSTEMS,
  PLINTH_SYSTEMS,
  CONSTRUCTION_TYPES,
  DOOR_OVERLAY_TYPES,
} from "../data/constants.js";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function hingeLayout(doorHeight, hingeFn) {
  const count = hingeFn(doorHeight);
  const positions = [];
  if (count === 1) {
    positions.push(doorHeight / 2);
  } else {
    positions.push(100);
    positions.push(doorHeight - 100);
    for (let i = 1; i < count - 1; i++) {
      positions.push(Math.round(100 + (i * (doorHeight - 200)) / (count - 1)));
    }
    positions.sort((a, b) => a - b);
  }
  return { count, positions };
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

export function validateConfig(config) {
  const { overall, materials, sections, hardware } = config;
  const warnings = [];

  const slide = DRAWER_SLIDES[hardware.drawerSlide];
  const plinth = PLINTH_SYSTEMS[hardware.plinth] || PLINTH_SYSTEMS.none;
  const ct = materials.carcass;

  if (overall.depth < 200)
    warnings.push("Cabinet depth < 200 mm — too shallow for any drawer slide.");
  if (overall.height - plinth.height < ct * 4)
    warnings.push("Effective cabinet height is too small for carcass panels.");
  if (overall.length < ct * 2 + 50)
    warnings.push("Cabinet length is too narrow.");

  const seen = new Set();
  sections.forEach((s) => {
    if (seen.has(s.label))
      warnings.push(
        `Duplicate section label "${s.label}" — labels must be unique.`,
      );
    seen.add(s.label);
  });

  sections.forEach((s) => {
    if (s.width < 50) warnings.push(`Section ${s.label}: width < 50 mm.`);

    if (s.drawers.count > 0 && slide) {
      const bt = materials.back;
      const drawerBoxDepth = clamp(
        overall.depth - bt - ct - 50,
        slide.minDepth,
        slide.maxDepth,
      );
      if (drawerBoxDepth < slide.minDepth)
        warnings.push(
          `Section ${s.label}: Cabinet depth too small for ${slide.brand} ${slide.model} (min ${slide.minDepth} mm).`,
        );

      const minH = slide.heights[0];
      const maxH = slide.heights[slide.heights.length - 1];
      if (s.drawers.height < minH || s.drawers.height > maxH)
        warnings.push(
          `Section ${s.label}: Drawer height ${s.drawers.height} mm outside ${slide.brand} ${slide.model} compatible range (${minH}–${maxH} mm).`,
        );

      const effectiveHeight = overall.height - plinth.height;
      const internalHeight = effectiveHeight - ct * 2;
      const totalStack = s.drawers.count * s.drawers.height;

      // Calculate required structural height based on placement
      let requiredStructuralHeight = totalStack;
      if (s.drawers.placement === "custom")
        requiredStructuralHeight += ct * 2; // Needs 2 dividers
      else if (
        s.drawers.placement === "top" ||
        s.drawers.placement === "bottom"
      )
        requiredStructuralHeight += ct; // Needs 1 divider

      if (requiredStructuralHeight > internalHeight)
        warnings.push(
          `Section ${s.label}: Total drawer stack + required dividers (${requiredStructuralHeight} mm) exceeds internal height (${internalHeight} mm).`,
        );
    }
  });

  return warnings;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN CUT LIST GENERATOR
// ─────────────────────────────────────────────────────────────────────────────

export function generateCutList(config) {
  const { overall, materials, tolerances, sections, hardware } = config;
  const { length: L, height: H, depth: D } = overall;
  const {
    carcass: ct,
    back: bt,
    shelf: sht,
    door: dt,
    drawerSide: dst,
    drawerBottom: dbt,
  } = materials;
  const { edgeBanding: ebt } = tolerances;

  const joinery =
    JOINERY_TYPES[hardware.joinery.toUpperCase()] || JOINERY_TYPES.BUTT;
  const plinth = PLINTH_SYSTEMS[hardware.plinth] || PLINTH_SYSTEMS.none;
  const shelfSys = SHELF_SYSTEMS[hardware.shelfSystem] || SHELF_SYSTEMS.fixed;
  const doorOverlay =
    DOOR_OVERLAY_TYPES[hardware.doorOverlay] || DOOR_OVERLAY_TYPES.full;
  const construction =
    CONSTRUCTION_TYPES[hardware.construction] || CONSTRUCTION_TYPES.assembled;

  const parts = [];
  let partNum = 1;
  const add = (part) => parts.push({ ...part, id: partNum++ });

  const plinthHeight = plinth.height;
  const effectiveHeight = H - plinthHeight;
  const internalHeight = effectiveHeight - ct * 2;

  // ── 1. PLINTH ──
  if (plinthHeight > 0) {
    add({
      part: "Plinth Front Rail",
      section: "Base",
      material: "Carcass 18mm",
      qty: 1,
      length: L - ct * 2,
      width: plinthHeight,
      thickness: ct,
      grain: "length",
      edgeBand: "top edge",
      note: `${plinthHeight} mm toe-kick, ${plinth.setback} mm setback`,
    });
    add({
      part: "Plinth Side Rail",
      section: "Base",
      material: "Carcass 18mm",
      qty: 2,
      length: D - plinth.setback,
      width: plinthHeight,
      thickness: ct,
      grain: "length",
      edgeBand: "top edge",
      note: "Side plinth rails — abuts outer face of cabinet side panel",
    });
  }

  // ── 2. CARCASS ──
  add({
    part: "Top Panel",
    section: "Carcass",
    material: "Carcass 18mm",
    qty: 1,
    length: L,
    width: D - bt,
    thickness: ct,
    grain: "length",
    edgeBand: "front edge",
    note: "Full-width top panel",
    machining: joinery.requiresBoring
      ? "Dowel/cam holes on underside at joint positions"
      : "None",
  });
  add({
    part: "Bottom Panel",
    section: "Carcass",
    material: "Carcass 18mm",
    qty: 1,
    length: L,
    width: D - bt,
    thickness: ct,
    grain: "length",
    edgeBand: "front edge",
    note: `Full-width bottom — sits on ${plinthHeight} mm plinth`,
    machining: joinery.requiresBoring
      ? "Dowel/cam holes on topside at joint positions"
      : "None",
  });

  const sideHeight = internalHeight;
  add({
    part: "Left Side Panel",
    section: "Carcass",
    material: "Carcass 18mm",
    qty: 1,
    length: sideHeight,
    width: D - bt,
    thickness: ct,
    grain: "height",
    edgeBand: "front edge",
    note: "Left outer side",
    machining:
      joinery.id === "dado"
        ? "Dado grooves for dividers & fixed shelves"
        : joinery.requiresBoring
          ? `Boring for ${joinery.name}`
          : "None",
  });
  add({
    part: "Right Side Panel",
    section: "Carcass",
    material: "Carcass 18mm",
    qty: 1,
    length: sideHeight,
    width: D - bt,
    thickness: ct,
    grain: "height",
    edgeBand: "front edge",
    note: "Right outer side",
    machining:
      joinery.id === "dado"
        ? "Dado grooves for dividers & fixed shelves"
        : joinery.requiresBoring
          ? `Boring for ${joinery.name}`
          : "None",
  });
  add({
    part: "Back Panel",
    section: "Carcass",
    material: "Back Panel 9mm",
    qty: 1,
    length: L - ct * 2,
    width: internalHeight,
    thickness: bt,
    grain: "height",
    edgeBand: "none",
    note: "Back panel — fits flush inside carcass box",
  });

  // ── 3. VERTICAL DIVIDERS ──
  const dividerCount = sections.length - 1;
  if (dividerCount > 0) {
    add({
      part: "Vertical Divider",
      section: "Carcass",
      material: "Carcass 18mm",
      qty: dividerCount,
      length: sideHeight,
      width: D - bt,
      thickness: ct,
      grain: "height",
      edgeBand: "front edge",
      note: `${dividerCount} internal dividers — ${joinery.name}`,
      machining: joinery.requiresBoring
        ? `Boring for ${joinery.name}`
        : joinery.id === "dado"
          ? "Sits in dado groove"
          : "Butt joint — glue & screw",
    });
  }

  // ── 4. SECTION PARTS ──
  const totalW = sections.reduce((a, s) => a + s.width, 0) || 1;
  let remainingL = L;
  const normSections = sections.map((s, i) => {
    if (i === sections.length - 1) return { ...s, _actualWidth: remainingL };
    const w = Math.round((s.width / totalW) * L);
    remainingL -= w;
    return { ...s, _actualWidth: w };
  });

  const gapPerSide = doorOverlay.gapPerSide;

  normSections.forEach((section) => {
    const sw = section._actualWidth;
    const interiorWidth = sw - ct * 2;
    const interiorDepth = D - bt - ct;

    // ── DOORS & FIXED DIVIDERS ──
    if (section.type === "closed") {
      const hinge = HINGES[hardware.hinge] || HINGES["blum-clip-top-110"];
      const drawerCount = section.drawers?.count || 0;
      const placement = section.drawers?.placement || "bottom";

      const doorWidth =
        doorOverlay.id === "inset"
          ? interiorWidth - gapPerSide * 2
          : sw - gapPerSide * 2;

      if (drawerCount > 0 && placement === "custom") {
        // <-- CUSTOM LOGIC ONLY -->
        const addDivider = (pos) => {
          add({
            part: `Fixed Divider (${pos})`,
            section: section.label,
            material: "Carcass 18mm",
            qty: 1,
            length: interiorWidth,
            width: interiorDepth,
            thickness: ct,
            grain: "length",
            edgeBand: "front edge",
            note: `${section.label} — Structural horizontal divider ${pos} drawer bank.`,
            machining: joinery.requiresBoring
              ? "Boring on left/right edges"
              : "None",
          });
        };

        addDivider("above");
        addDivider("below");

        const totalDrawerStack = drawerCount * section.drawers.height;
        const isFromTop = section.drawers?.customFrom === "top";
        const percentage = (section.drawers?.customPercentage ?? 20) / 100;
        const availableH = internalHeight - totalDrawerStack - ct * 2;

        let offsetMm = Math.round(availableH * percentage);
        offsetMm = clamp(offsetMm, 0, availableH);

        let topCavityH, bottomCavityH;
        if (isFromTop) {
          topCavityH = offsetMm;
          bottomCavityH = availableH - topCavityH;
        } else {
          bottomCavityH = offsetMm;
          topCavityH = availableH - bottomCavityH;
        }

        const addCustomDoor = (prefix, h, coversTop, coversBot) => {
          let doorH = h;
          if (doorOverlay.id !== "inset") {
            if (coversTop) doorH += ct;
            if (coversBot) doorH += ct;
          }
          doorH -= gapPerSide * 2;

          const { count: hingeCount } = hingeLayout(doorH, hinge.hingesPerDoor);
          add({
            part: `${prefix} Door Panel`,
            section: section.label,
            material: "Door 18mm",
            qty: 1,
            length: Math.round(doorH),
            width: Math.round(doorWidth),
            thickness: dt,
            grain: "height",
            edgeBand: "all 4 edges",
            note: `${section.label} — ${prefix.toLowerCase()} door.`,
            machining: `Hinge cup: ⌀${hinge.cupDiameter} mm × ${hinge.cupDepth} mm deep, ${hinge.boringDistance} mm from edge.`,
            hardware: `${hinge.brand} ${hinge.model} × ${hingeCount} pcs`,
          });
        };

        if (topCavityH > 50) addCustomDoor("Top", topCavityH, true, false);
        if (bottomCavityH > 50)
          addCustomDoor("Bottom", bottomCavityH, false, true);
      } else {
        // <-- ORIGINAL LOGIC FOR TOP/BOTTOM/NONE/FULL -->
        const doorHeight =
          doorOverlay.id === "inset"
            ? internalHeight - gapPerSide * 2
            : effectiveHeight - gapPerSide * 2;
        const { count: hingeCount } = hingeLayout(
          doorHeight,
          hinge.hingesPerDoor,
        );

        add({
          part: "Door Panel",
          section: section.label,
          material: "Door 18mm",
          qty: 1,
          length: Math.round(doorHeight),
          width: Math.round(doorWidth),
          thickness: dt,
          grain: "height",
          edgeBand: "all 4 edges",
          note: `${section.label} — ${doorOverlay.name} door. Pre-band: ${Math.round(doorHeight)}×${Math.round(doorWidth)} mm. Post-band: ${Math.round(doorHeight + ebt * 2)}×${Math.round(doorWidth + ebt * 2)} mm`,
          machining: `Hinge cup: ⌀${hinge.cupDiameter} mm × ${hinge.cupDepth} mm deep, ${hinge.boringDistance} mm from hinge edge. 100 mm from top/bottom (Blum std).`,
          hardware: `${hinge.brand} ${hinge.model} × ${hingeCount} pcs`,
        });
      }
    }

    // ── SHELVES ──
    if (section.shelves > 0) {
      const shelfWidth = interiorWidth - shelfSys.clearance * 2 - ebt * 2;
      const shelfDepth = interiorDepth - shelfSys.clearance - ebt;

      add({
        part: "Shelf",
        section: section.label,
        material: "Shelf 18mm",
        qty: section.shelves,
        length: shelfWidth,
        width: shelfDepth,
        thickness: sht,
        grain: "width",
        edgeBand: "front edge",
        note: `${section.label} — ${shelfSys.adjustable ? "adjustable" : "fixed"} shelf × ${section.shelves}`,
        machining:
          shelfSys.id === "fixed"
            ? "Dado into sides or screwed from outside"
            : "None",
        hardware: shelfSys.adjustable
          ? `${shelfSys.name} × ${shelfSys.pinsPerShelf} per shelf`
          : "None",
      });
    }

    // ── DRAWERS ──
    const drawerCount = section.drawers?.count || 0;
    if (drawerCount > 0) {
      const slide =
        DRAWER_SLIDES[hardware.drawerSlide] || DRAWER_SLIDES["blum-tandem-550"];
      const drawerHeight = section.drawers.height;
      const drawerBoxOuterWidth =
        interiorWidth - slide.clearancePerSide * 2 - ebt * 2;
      const drawerBoxDepth = clamp(
        interiorDepth - 50,
        slide.minDepth,
        slide.maxDepth,
      );
      const drawerBoxSideHeight = drawerHeight - dbt;

      add({
        part: "Drawer Box Side",
        section: section.label,
        material: "Drawer Side 12mm",
        qty: drawerCount * 2,
        length: drawerBoxDepth,
        width: drawerBoxSideHeight,
        thickness: dst,
        grain: "length",
        edgeBand: "top edge",
        note: `${section.label} — drawer sides`,
        machining: construction.requiresCamLocks
          ? "Cam lock boring on front/back ends"
          : "Groove for bottom panel, 6 mm from bottom edge",
      });
      const drawerFrontBackLength = drawerBoxOuterWidth - dst * 2;
      add({
        part: "Drawer Box Front/Back",
        section: section.label,
        material: "Drawer Side 12mm",
        qty: drawerCount * 2,
        length: drawerFrontBackLength,
        width: drawerBoxSideHeight,
        thickness: dst,
        grain: "length",
        edgeBand: "top edge",
        note: `${section.label} — drawer F/B`,
        machining: construction.requiresCamLocks
          ? "Cam lock boring"
          : "Groove for bottom panel, 6 mm from bottom edge",
      });
      add({
        part: "Drawer Bottom",
        section: section.label,
        material: "Drawer Bottom 6mm",
        qty: drawerCount,
        length: drawerBoxDepth - 10,
        width: drawerBoxOuterWidth - dst * 2,
        thickness: dbt,
        grain: "length",
        edgeBand: "none",
        note: `${section.label} — drawer base`,
      });

      const drawerFaceWidth =
        doorOverlay.id === "inset"
          ? interiorWidth - gapPerSide * 2
          : sw - gapPerSide * 2;
      const drawerFaceHeight = drawerHeight - gapPerSide;

      add({
        part: "Drawer Face",
        section: section.label,
        material: "Drawer Face 18mm",
        qty: drawerCount,
        length: drawerFaceHeight,
        width: drawerFaceWidth,
        thickness: dt,
        grain: "height",
        edgeBand: "all 4 edges",
        note: `${section.label} — drawer front`,
        machining: "Handle drilling per template",
        hardware: `${slide.brand} ${slide.model} × ${drawerCount} sets`,
      });
    }
  });

  return parts;
}

// ─────────────────────────────────────────────────────────────────────────────
// HARDWARE SCHEDULE
// ─────────────────────────────────────────────────────────────────────────────
// NOTE: Now accepts `cutList` to accurately count hinges dynamically from the
// number of generated doors rather than assuming 1 door per section.
export function generateHardwareSchedule(config, cutList = []) {
  const { sections, hardware, construction } = config;
  const schedule = [];

  const hinge = HINGES[hardware.hinge];
  const slide = DRAWER_SLIDES[hardware.drawerSlide];
  const shelfSys = SHELF_SYSTEMS[hardware.shelfSystem];

  // Hinges (Reads dynamically from the actual generated cutList!)
  const doors = cutList.filter((p) => p.part.includes("Door Panel"));
  if (doors.length > 0 && hinge) {
    let totalHinges = 0;
    doors.forEach((door) => {
      const { count } = hingeLayout(door.length, hinge.hingesPerDoor);
      totalHinges += count;
    });

    schedule.push({
      category: "Hinges",
      item: `${hinge.brand} ${hinge.model}`,
      qty: totalHinges,
      unitCost: hinge.cost,
      totalCost: totalHinges * hinge.cost,
      note: `${totalHinges} total hinges across ${doors.length} door panels.`,
    });
  }

  // Drawer slides
  const totalDrawers = sections.reduce(
    (sum, s) => sum + (s.drawers?.count || 0),
    0,
  );
  if (totalDrawers > 0 && slide) {
    schedule.push({
      category: "Drawer Slides",
      item: `${slide.brand} ${slide.model}`,
      qty: totalDrawers,
      unitCost: slide.cost,
      totalCost: totalDrawers * slide.cost,
      note: `${slide.type} slides, max load ${slide.maxLoad} kg`,
    });
  }

  // Shelf pins
  const totalShelves = sections.reduce((sum, s) => sum + (s.shelves || 0), 0);
  if (totalShelves > 0 && shelfSys.adjustable) {
    const pins = totalShelves * shelfSys.pinsPerShelf;
    schedule.push({
      category: "Shelf Hardware",
      item: shelfSys.name,
      qty: pins,
      unitCost: shelfSys.cost,
      totalCost: pins * shelfSys.cost,
      note: `${shelfSys.pinsPerShelf} pins/shelf × ${totalShelves} shelves`,
    });
  }

  // Handles / pulls
  const handleQty = doors.length + totalDrawers;
  if (handleQty > 0) {
    schedule.push({
      category: "Handles / Pulls",
      item: "Bar handle (specify model & finish)",
      qty: handleQty,
      unitCost: 0,
      totalCost: 0,
      note: `${doors.length} door + ${totalDrawers} drawer handles. Unit cost TBC.`,
    });
  }

  // Cam locks
  if (construction?.requiresCamLocks) {
    const dividerCount = sections.length - 1;
    const camQty = (4 + dividerCount * 2) * 2;
    schedule.push({
      category: "Cam Locks (RTA)",
      item: "Minifix / Rafix 15 mm cam lock",
      qty: camQty,
      unitCost: 0.45,
      totalCost: camQty * 0.45,
      note: `Flat-pack assembly. Approx ${camQty} sets.`,
    });
  }

  return schedule;
}

// ─────────────────────────────────────────────────────────────────────────────
// MACHINING SCHEDULE
// ─────────────────────────────────────────────────────────────────────────────

export function generateMachiningSchedule(cutList, config) {
  const { hardware } = config;
  const hinge = HINGES[hardware.hinge];
  const shelfSys = SHELF_SYSTEMS[hardware.shelfSystem];
  const joinery = JOINERY_TYPES[hardware.joinery.toUpperCase()];

  const machining = [];

  // 1. Hinge cup boring (Updated to find "Top Door", "Bottom Door", etc.)
  const doors = cutList.filter((p) => p.part.includes("Door Panel"));
  doors.forEach((door) => {
    if (!hinge) return;
    const { count: hingeCount, positions } = hingeLayout(
      door.length,
      hinge.hingesPerDoor,
    );

    positions.forEach((yPos, i) => {
      machining.push({
        part: door.part,
        section: door.section,
        operation: "Hinge Cup Boring",
        tool: `${hinge.cupDiameter} mm Forstner`,
        diameter: hinge.cupDiameter,
        depth: hinge.cupDepth,
        xPos: hinge.boringDistance,
        yPos: Math.round(yPos),
        face: "Inside face (hinge side)",
        note: `Hinge ${i + 1}/${hingeCount}`,
      });
    });
  });

  // 2. Shelf pin holes
  if (shelfSys?.adjustable) {
    const sidePanels = cutList.filter(
      (p) =>
        p.part === "Left Side Panel" ||
        p.part === "Right Side Panel" ||
        p.part === "Vertical Divider",
    );
    sidePanels.forEach((panel) => {
      const rowCount = Math.floor(panel.length / shelfSys.rowSpacing);
      for (let i = 1; i <= rowCount; i++) {
        ["front", "rear"].forEach((col) => {
          machining.push({
            part: panel.part,
            section: panel.section,
            operation: "Shelf Pin Hole",
            tool: `${shelfSys.pinDiameter} mm drill`,
            diameter: shelfSys.pinDiameter,
            depth: shelfSys.pinDepth,
            xPos:
              col === "front"
                ? shelfSys.edgeSetback
                : panel.width - shelfSys.edgeSetback,
            yPos: i * shelfSys.rowSpacing,
            face: "Interior face",
            note: `${col} column, row ${i}`,
          });
        });
      }
    });
  }

  // 3. Dowel / cam lock boring
  if (joinery?.requiresBoring) {
    const panels = cutList.filter(
      (p) => p.machining && p.machining.toLowerCase().includes("boring"),
    );
    panels.forEach((panel) => {
      machining.push({
        part: panel.part,
        section: panel.section,
        operation: joinery.id === "dowel" ? "Dowel Boring" : "Cam Lock Boring",
        tool:
          joinery.id === "dowel"
            ? `${joinery.dowelSize} mm drill`
            : `${joinery.camSize} mm Forstner`,
        diameter: joinery.id === "dowel" ? joinery.dowelSize : joinery.camSize,
        depth: joinery.id === "dowel" ? joinery.dowelDepth : joinery.camDepth,
        xPos: null,
        yPos: null,
        face: "Joint face",
        note: "Position per assembly drawing",
      });
    });
  }

  return machining;
}
