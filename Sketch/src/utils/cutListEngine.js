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

/**
 * Calculate hinge positions using industry-standard Blum layout:
 * first hinge 100 mm from top edge, last hinge 100 mm from bottom edge,
 * any extra hinges evenly distributed between them.
 */
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

/**
 * Validate config and return array of warning strings.
 * Surface these in the UI before generating any production cut list.
 */
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

  // Detect duplicate labels
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
      if (totalStack > internalHeight)
        warnings.push(
          `Section ${s.label}: Total drawer stack (${totalStack} mm) exceeds internal height (${internalHeight} mm).`,
        );
    }
  });

  return warnings;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN CUT LIST GENERATOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Production-grade cut list generator.
 *
 * All sizes are RAW (pre-edge-band) panel dimensions as they leave the panel saw.
 * Edge-band thickness (ebt) is documented in notes where it affects finished size.
 *
 * Fixed issues (vs. original):
 *  Bug 1  — Back panel height: was effectiveHeight, now effectiveHeight - ct*2
 *  Bug 2  — Plinth side rail: was D - plinth.setback - ct, now D - plinth.setback
 *  Bug 3  — Interior width: always ct*2 (was ct*1 for end sections — wrong)
 *  Bug W3 — Section width rounding: last section absorbs remainder
 *  Bug W2 — Door/drawer face notes now document pre/post edge-band finished sizes
 *  Bug W4 — Inset door height uses internalHeight, overlay uses effectiveHeight
 */
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

  // Heights
  const plinthHeight = plinth.height;
  const effectiveHeight = H - plinthHeight; // top of plinth → top of cabinet
  const internalHeight = effectiveHeight - ct * 2; // clear space between top & bottom panels

  // ── 1. PLINTH ─────────────────────────────────────────────────────────────
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

    // FIXED Bug 2: removed erroneous - ct from length
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

  // ── 2. CARCASS ────────────────────────────────────────────────────────────
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

  const sideHeight = internalHeight; // side panels fit between top & bottom

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

  // FIXED Bug 1: Back panel height was effectiveHeight (too tall by ct*2 = 36 mm).
  // It must be internalHeight so it sits flush inside the box.
  add({
    part: "Back Panel",
    section: "Carcass",
    material: "Back Panel 9mm",
    qty: 1,
    length: L - ct * 2,
    width: internalHeight, // = effectiveHeight - ct*2
    thickness: bt,
    grain: "height",
    edgeBand: "none",
    note: "Back panel — fits flush inside carcass box (between top/bottom/sides)",
  });

  // ── 3. VERTICAL DIVIDERS ─────────────────────────────────────────────────
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

  // ── 4. SECTION PARTS ──────────────────────────────────────────────────────

  // Normalise widths — FIXED Bug W3: last section absorbs rounding remainder.
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

    // FIXED Bug 3: always ct*2 — each section is bounded by a ct-thick panel on each side.
    const interiorWidth = sw - ct * 2;
    const interiorDepth = D - bt - ct;

    // ── DOORS ────────────────────────────────────────────────────────────────
    if (section.type === "closed") {
      const hinge = HINGES[hardware.hinge] || HINGES["blum-clip-top-110"];

      // FIXED Bug W4: inset doors size against internalHeight; overlay against effectiveHeight
      const doorWidth =
        doorOverlay.id === "inset"
          ? interiorWidth - gapPerSide * 2
          : sw - gapPerSide * 2;
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
        length: doorHeight,
        width: doorWidth,
        thickness: dt,
        grain: "height",
        edgeBand: "all 4 edges",
        // FIXED Bug W2: documents pre-band and post-band sizes clearly
        note: `${section.label} — ${doorOverlay.name} door. Pre-band: ${doorHeight}×${doorWidth} mm. Post-band: ${doorHeight + ebt * 2}×${doorWidth + ebt * 2} mm`,
        machining: `Hinge cup: ⌀${hinge.cupDiameter} mm × ${hinge.cupDepth} mm deep, ${hinge.boringDistance} mm from hinge edge. 100 mm from top/bottom (Blum std).`,
        hardware: `${hinge.brand} ${hinge.model} × ${hingeCount} pcs`,
      });
    }

    // ── SHELVES ───────────────────────────────────────────────────────────────
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

    // ── DRAWERS ───────────────────────────────────────────────────────────────
    const drawerCount = section.drawers.count;
    if (drawerCount > 0) {
      const slide =
        DRAWER_SLIDES[hardware.drawerSlide] || DRAWER_SLIDES["blum-tandem-550"];
      const drawerHeight = section.drawers.height;

      // Outer width of the assembled drawer box (side-to-side)
      const drawerBoxOuterWidth =
        interiorWidth - slide.clearancePerSide * 2 - ebt * 2;

      // Depth capped at slide spec with 50 mm setback for rear bracket
      const drawerBoxDepth = clamp(
        interiorDepth - 50,
        slide.minDepth,
        slide.maxDepth,
      );

      // Drawer side panels
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
        note: `${section.label} — drawer sides (×2 per drawer × ${drawerCount} drawers)`,
        machining: construction.requiresCamLocks
          ? "Cam lock boring on front/back ends"
          : "Groove for bottom panel, 6 mm from bottom edge",
      });

      // Drawer front & back panels — fit BETWEEN the two side panels
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
        note: `${section.label} — drawer F/B (×2 per drawer × ${drawerCount}). Fits between side panels.`,
        machining: construction.requiresCamLocks
          ? "Cam lock boring"
          : "Groove for bottom panel, 6 mm from bottom edge",
      });

      // Drawer bottom panel
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
        note: `${section.label} — drawer base. Slides into 6 mm groove.`,
      });

      // Drawer face (decorative front)
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
        note: `${section.label} — drawer front. Pre-band: ${drawerFaceHeight}×${drawerFaceWidth} mm. Post-band: ${drawerFaceHeight + ebt * 2}×${drawerFaceWidth + ebt * 2} mm`,
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

/**
 * Hardware bill-of-materials.
 * FIXED Bug H1: All closed sections get hinges (not just those without drawers).
 * FIXED Bug H2: Handle/pull line item now included.
 */
export function generateHardwareSchedule(config) {
  const { sections, hardware, overall, materials, tolerances } = config;
  const schedule = [];

  const hinge = HINGES[hardware.hinge];
  const slide = DRAWER_SLIDES[hardware.drawerSlide];
  const shelfSys = SHELF_SYSTEMS[hardware.shelfSystem];
  const plinth = PLINTH_SYSTEMS[hardware.plinth] || PLINTH_SYSTEMS.none;
  const doorOverlay =
    DOOR_OVERLAY_TYPES[hardware.doorOverlay] || DOOR_OVERLAY_TYPES.full;
  const construction = CONSTRUCTION_TYPES[hardware.construction];
  const ct = materials.carcass;
  const ebt = tolerances.edgeBanding;

  const effectiveHeight = overall.height - plinth.height;
  const internalHeight = effectiveHeight - ct * 2;

  // Hinges — ALL closed sections get a door, regardless of drawer presence
  const closedSections = sections.filter((s) => s.type === "closed");
  if (closedSections.length > 0 && hinge) {
    const doorHeight =
      doorOverlay.id === "inset"
        ? internalHeight - doorOverlay.gapPerSide * 2
        : effectiveHeight - doorOverlay.gapPerSide * 2;

    const { count: hingesPerDoor } = hingeLayout(
      doorHeight,
      hinge.hingesPerDoor,
    );
    const total = closedSections.length * hingesPerDoor;

    schedule.push({
      category: "Hinges",
      item: `${hinge.brand} ${hinge.model}`,
      qty: total,
      unitCost: hinge.cost,
      totalCost: total * hinge.cost,
      note: `${hingesPerDoor} hinges/door × ${closedSections.length} doors. Blum std: 100 mm from ends.`,
    });
  }

  // Drawer slides
  const totalDrawers = sections.reduce((sum, s) => sum + s.drawers.count, 0);
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
  const totalShelves = sections.reduce((sum, s) => sum + s.shelves, 0);
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

  // Handles / pulls — one per door + one per drawer face
  const handleQty = closedSections.length + totalDrawers;
  if (handleQty > 0) {
    schedule.push({
      category: "Handles / Pulls",
      item: "Bar handle (specify model & finish)",
      qty: handleQty,
      unitCost: 0,
      totalCost: 0,
      note: `${closedSections.length} door + ${totalDrawers} drawer handles. Unit cost TBC.`,
    });
  }

  // Cam locks (flat-pack)
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

/**
 * CNC boring / drilling schedule.
 * FIXED Bug H3: Shelf pin holes only target Left/Right Side Panel and Vertical Divider.
 * FIXED Bug H4: Hinge positions use Blum standard (100 mm from door ends).
 */
export function generateMachiningSchedule(cutList, config) {
  const { hardware, materials, tolerances } = config;
  const hinge = HINGES[hardware.hinge];
  const shelfSys = SHELF_SYSTEMS[hardware.shelfSystem];
  const joinery = JOINERY_TYPES[hardware.joinery.toUpperCase()];

  const machining = [];

  // 1. Hinge cup boring
  const doors = cutList.filter((p) => p.part === "Door Panel");
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

  // 2. Shelf pin holes — FIXED: only structural side panels & dividers
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

  // 3. Dowel / cam lock boring for joinery
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
        note: "Position per assembly drawing — 32 mm pitch system",
      });
    });
  }

  return machining;
}
