import {
  JOINERY_TYPES,
  DRAWER_SLIDES,
  HINGES,
  SHELF_SYSTEMS,
  PLINTH_SYSTEMS,
  CONSTRUCTION_TYPES,
  DOOR_OVERLAY_TYPES,
} from "../data/constants.js";

/**
 * Production-grade cut list generator with full joinery and hardware logic
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
  const { doorGap: dg, edgeBanding: ebt, sawKerf: sk } = tolerances;

  const joinery =
    JOINERY_TYPES[hardware.joinery.toUpperCase()] || JOINERY_TYPES.BUTT;
  const plinth = PLINTH_SYSTEMS[hardware.plinth] || PLINTH_SYSTEMS.NONE;
  const shelfSys = SHELF_SYSTEMS[hardware.shelfSystem] || SHELF_SYSTEMS.FIXED;
  const doorOverlay =
    DOOR_OVERLAY_TYPES[hardware.doorOverlay] || DOOR_OVERLAY_TYPES.FULL;
  const construction =
    CONSTRUCTION_TYPES[hardware.construction] || CONSTRUCTION_TYPES.ASSEMBLED;

  const parts = [];
  let partNum = 1;

  const add = (part) => {
    parts.push({ ...part, id: partNum++ });
  };

  // ── PLINTH CALCULATION ─────────────────────────────────────────────────────
  const plinthHeight = plinth.height;
  const effectiveHeight = H - plinthHeight; // Height available for cabinet box

  if (plinthHeight > 0) {
    // Plinth front rail
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
      note: `${plinthHeight}mm toe-kick, ${plinth.setback}mm setback`,
    });

    // Plinth side rails (left & right)
    add({
      part: "Plinth Side Rail",
      section: "Base",
      material: "Carcass 18mm",
      qty: 2,
      length: D - plinth.setback - ct,
      width: plinthHeight,
      thickness: ct,
      grain: "length",
      edgeBand: "top edge",
      note: "Side plinth rails",
    });
  }

  // ── MAIN CARCASS ───────────────────────────────────────────────────────────
  // Top Panel: full width × depth (minus back panel thickness)
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
    note: "Full width top",
    machining: joinery.requiresBoring
      ? "Dowel/cam holes required on underside"
      : "None",
  });

  // Bottom Panel: same as top
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
    note: `Full width bottom, sits on ${plinthHeight}mm plinth`,
    machining: joinery.requiresBoring
      ? "Dowel/cam holes required on topside"
      : "None",
  });

  // Left & Right Sides
  const sideHeight = effectiveHeight - ct * 2; // Height minus top & bottom
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
        ? "Dado grooves for dividers"
        : joinery.requiresBoring
          ? "Boring for joinery"
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
        ? "Dado grooves for dividers"
        : joinery.requiresBoring
          ? "Boring for joinery"
          : "None",
  });

  // Back Panel
  add({
    part: "Back Panel",
    section: "Carcass",
    material: "Back Panel 9mm",
    qty: 1,
    length: L - ct * 2,
    width: effectiveHeight,
    thickness: bt,
    grain: "height",
    edgeBand: "none",
    note: "Full back panel, sits in rabbet",
  });

  // ── VERTICAL DIVIDERS ──────────────────────────────────────────────────────
  const dividerCount = sections.length - 1;
  if (dividerCount > 0) {
    const dividerHeight = sideHeight - joinery.dividerReduction;
    add({
      part: "Vertical Divider",
      section: "Carcass",
      material: "Carcass 18mm",
      qty: dividerCount,
      length: dividerHeight,
      width: D - bt,
      thickness: ct,
      grain: "height",
      edgeBand: "front edge",
      note: `${dividerCount} internal dividers, ${joinery.name}`,
      machining: joinery.requiresBoring
        ? `Boring for ${joinery.name}`
        : joinery.id === "dado"
          ? "Sits in dado groove"
          : "Butt joint",
    });
  }

  // ── SECTION-SPECIFIC PARTS ─────────────────────────────────────────────────
  // Normalize section widths to actual cabinet length
  const totalW = sections.reduce((a, s) => a + s.width, 0) || 1;
  const normSections = sections.map((s) => ({
    ...s,
    _actualWidth: Math.round((s.width / totalW) * L),
  }));

  normSections.forEach((section, idx) => {
    const sectionWidth = section._actualWidth;
    const isFirstSection = idx === 0;
    const isLastSection = idx === normSections.length - 1;

    // Interior width = section width minus one panel thickness per side
    // (first & last share wall with outer sides, internal sections have dividers)
    const interiorWidth =
      sectionWidth - ct * (isFirstSection || isLastSection ? 1 : 2);
    const interiorHeight = sideHeight;
    const interiorDepth = D - bt - ct;

    // ── DOORS ──
    if (section.type === "closed") {
      const hinge = HINGES[hardware.hinge] || HINGES["blum-clip-top-110"];
      const doorWidth = sectionWidth - doorOverlay.gapPerSide * 2;
      const doorHeight = effectiveHeight - doorOverlay.gapPerSide * 2;

      add({
        part: `Door Panel`,
        section: section.label,
        material: "Door 18mm",
        qty: 1,
        length: doorHeight,
        width: doorWidth,
        thickness: dt,
        grain: "height",
        edgeBand: "all 4 edges",
        note: `${section.label} ${doorOverlay.name} door`,
        machining: `Hinge cup boring: ${hinge.cupDiameter}mm × ${hinge.cupDepth}mm deep`,
        hardware: `${hinge.brand} ${hinge.model} × ${hinge.hingesPerDoor(doorHeight)} pcs`,
      });
    }

    // ── SHELVES ──
    if (section.shelves > 0) {
      const shelfWidth = interiorWidth - shelfSys.clearance * 2 - ebt * 2;
      const shelfDepth = interiorDepth - shelfSys.clearance - ebt;

      add({
        part: `Shelf`,
        section: section.label,
        material: "Shelf 18mm",
        qty: section.shelves,
        length: shelfWidth,
        width: shelfDepth,
        thickness: sht,
        grain: "width",
        edgeBand: "front edge",
        note: `${section.label} ${shelfSys.adjustable ? "adjustable" : "fixed"} shelves`,
        machining:
          shelfSys.id === "fixed" ? "Dado into sides or screwed" : "None",
        hardware: shelfSys.adjustable
          ? `${shelfSys.name} × ${shelfSys.pinsPerShelf} per shelf`
          : "None",
      });

      // Add shelf pin holes to side panels (if adjustable)
      if (shelfSys.adjustable) {
        // This would be added to a separate machining schedule, not the cut list
      }
    }

    // ── DRAWERS ──
    const drawerCount = section.drawers.count;
    if (drawerCount > 0) {
      const slide =
        DRAWER_SLIDES[hardware.drawerSlide] || DRAWER_SLIDES["blum-tandem-550"];
      const drawerHeight = section.drawers.height;

      // Check if drawer height is compatible with selected slide
      const slideCompatible =
        slide.heights[0] <= drawerHeight &&
        drawerHeight <= slide.heights[slide.heights.length - 1];

      const drawerBoxWidth =
        interiorWidth - slide.clearancePerSide * 2 - ebt * 2;
      const drawerBoxDepth = Math.min(interiorDepth - 50, slide.maxDepth); // 50mm setback for slides
      const drawerFaceWidth = sectionWidth - doorOverlay.gapPerSide * 2;
      const drawerFaceHeight = drawerHeight - doorOverlay.gapPerSide;

      // Drawer box sides (left & right per drawer)
      add({
        part: `Drawer Box Side`,
        section: section.label,
        material: "Drawer Side 12mm",
        qty: drawerCount * 2,
        length: drawerBoxDepth,
        width: drawerHeight - dbt,
        thickness: dst,
        grain: "length",
        edgeBand: "top edge",
        note: `${section.label} drawer sides (×2 per drawer)`,
        machining: construction.requiresCamLocks
          ? "Cam lock boring"
          : "Groove for bottom panel",
      });

      // Drawer box front & back
      add({
        part: `Drawer Box Front/Back`,
        section: section.label,
        material: "Drawer Side 12mm",
        qty: drawerCount * 2,
        length: drawerBoxWidth - dst * 2,
        width: drawerHeight - dbt,
        thickness: dst,
        grain: "length",
        edgeBand: "top edge",
        note: `${section.label} drawer front & back panels`,
        machining: construction.requiresCamLocks
          ? "Cam lock boring"
          : "Groove for bottom panel",
      });

      // Drawer bottom
      add({
        part: `Drawer Bottom`,
        section: section.label,
        material: "Drawer Bottom 6mm",
        qty: drawerCount,
        length: drawerBoxDepth - 10,
        width: drawerBoxWidth - dst * 2,
        thickness: dbt,
        grain: "length",
        edgeBand: "none",
        note: `${section.label} drawer base`,
      });

      // Drawer face (decorative front)
      add({
        part: `Drawer Face`,
        section: section.label,
        material: "Drawer Face 18mm",
        qty: drawerCount,
        length: drawerFaceHeight,
        width: drawerFaceWidth,
        thickness: dt,
        grain: "height",
        edgeBand: "all 4 edges",
        note: `${section.label} decorative drawer front`,
        machining: "Handle drilling as per template",
        hardware: `${slide.brand} ${slide.model} × ${drawerCount} sets`,
      });
    }
  });

  return parts;
}

/**
 * Hardware schedule generator
 */
export function generateHardwareSchedule(config) {
  const { sections, hardware, overall } = config;
  const schedule = [];

  const hinge = HINGES[hardware.hinge];
  const slide = DRAWER_SLIDES[hardware.drawerSlide];
  const shelfSys = SHELF_SYSTEMS[hardware.shelfSystem];

  // Count doors
  const doorCount = sections.filter(
    (s) => s.type === "closed" && s.drawers.count === 0,
  ).length;
  if (doorCount > 0 && hinge) {
    const hingesPerDoor = hinge.hingesPerDoor(overall.height);
    schedule.push({
      category: "Hinges",
      item: `${hinge.brand} ${hinge.model}`,
      qty: doorCount * hingesPerDoor,
      unitCost: hinge.cost,
      totalCost: doorCount * hingesPerDoor * hinge.cost,
      note: `${hingesPerDoor} hinges per door`,
    });
  }

  // Count drawer slides
  const totalDrawers = sections.reduce((sum, s) => sum + s.drawers.count, 0);
  if (totalDrawers > 0 && slide) {
    schedule.push({
      category: "Drawer Slides",
      item: `${slide.brand} ${slide.model}`,
      qty: totalDrawers,
      unitCost: slide.cost,
      totalCost: totalDrawers * slide.cost,
      note: `${slide.type} slides`,
    });
  }

  // Count shelf pins
  const totalShelves = sections.reduce((sum, s) => sum + s.shelves, 0);
  if (totalShelves > 0 && shelfSys.adjustable) {
    const pinsNeeded = totalShelves * shelfSys.pinsPerShelf;
    schedule.push({
      category: "Shelf Hardware",
      item: `${shelfSys.name}`,
      qty: pinsNeeded,
      unitCost: shelfSys.cost,
      totalCost: pinsNeeded * shelfSys.cost,
      note: `${shelfSys.pinsPerShelf} pins per shelf`,
    });
  }

  return schedule;
}

/**
 * Machining/boring schedule generator
 */
export function generateMachiningSchedule(cutList, config) {
  const { hardware, overall } = config;
  const hinge = HINGES[hardware.hinge];
  const shelfSys = SHELF_SYSTEMS[hardware.shelfSystem];
  const joinery = JOINERY_TYPES[hardware.joinery.toUpperCase()];

  const machining = [];

  // Hinge boring for doors
  const doors = cutList.filter((p) => p.part === "Door Panel");
  doors.forEach((door) => {
    if (hinge) {
      const hingeCount = hinge.hingesPerDoor(door.length);
      const spacing = door.length / (hingeCount + 1);

      for (let i = 1; i <= hingeCount; i++) {
        machining.push({
          part: door.part,
          section: door.section,
          operation: "Hinge Cup Boring",
          tool: `${hinge.cupDiameter}mm Forstner bit`,
          diameter: hinge.cupDiameter,
          depth: hinge.cupDepth,
          xPos: hinge.boringDistance,
          yPos: i * spacing,
          face: "Inside face",
        });
      }
    }
  });

  // Shelf pin holes (if adjustable shelves)
  if (shelfSys.adjustable) {
    const sidePanels = cutList.filter((p) => p.part.includes("Side"));
    sidePanels.forEach((panel) => {
      const holes = Math.floor(panel.length / shelfSys.rowSpacing);
      for (let i = 1; i <= holes; i++) {
        // Two rows of holes per side (left & right edge of shelf)
        machining.push({
          part: panel.part,
          section: panel.section,
          operation: "Shelf Pin Hole",
          tool: `${shelfSys.pinDiameter}mm drill bit`,
          diameter: shelfSys.pinDiameter,
          depth: shelfSys.pinDepth,
          xPos: shelfSys.edgeSetback,
          yPos: i * shelfSys.rowSpacing,
          face: "Interior face (both edges)",
        });
      }
    });
  }

  // Dowel/cam lock boring
  if (joinery.requiresBoring) {
    const panels = cutList.filter(
      (p) => p.machining && p.machining.includes("Boring"),
    );
    panels.forEach((panel) => {
      machining.push({
        part: panel.part,
        section: panel.section,
        operation: joinery.id === "dowel" ? "Dowel Boring" : "Cam Lock Boring",
        tool:
          joinery.id === "dowel"
            ? `${joinery.dowelSize}mm drill`
            : `${joinery.camSize}mm Forstner`,
        diameter: joinery.id === "dowel" ? joinery.dowelSize : joinery.camSize,
        depth: joinery.id === "dowel" ? joinery.dowelDepth : joinery.camDepth,
        note: "Position as per assembly drawing",
      });
    });
  }

  return machining;
}
