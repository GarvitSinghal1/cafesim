// ============================================
// CaféVibe - 3D Environment
// Modern compact café with outdoor seating
// ============================================

// Build the entire game world
function buildWorld(scene) {
    // Add sky with clouds
    createSky(scene);

    // Ground and pathway
    createGround(scene);

    // Café building (compact, modern)
    createCafe(scene);

    // Outdoor seating area
    createOutdoorSeating(scene);

    // Maple trees with falling leaves
    createMapleTrees(scene);

    // Street and surroundings
    createStreet(scene);

    // Lighting
    setupLighting(scene);
}

// ============================================
// SKY WITH CLOUDS
// ============================================
function createSky(scene) {
    // Sky sphere
    const skyGeo = new THREE.SphereGeometry(100, 32, 32);
    const skyMat = new THREE.MeshBasicMaterial({
        color: 0x87ceeb,
        side: THREE.BackSide
    });

    // Create gradient effect using vertex colors
    const skyColors = skyGeo.attributes.position.array;
    const colors = new Float32Array(skyColors.length);

    for (let i = 0; i < skyColors.length; i += 3) {
        const y = skyColors[i + 1];
        const t = (y + 100) / 200; // 0 to 1 from bottom to top

        // Blend from warm orange (horizon) to blue (top)
        colors[i] = 0.9 - t * 0.4;     // R
        colors[i + 1] = 0.7 - t * 0.1; // G  
        colors[i + 2] = 0.6 + t * 0.4; // B
    }

    skyGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    skyMat.vertexColors = true;
    skyMat.color.setHex(0xffffff);

    const sky = new THREE.Mesh(skyGeo, skyMat);
    scene.add(sky);

    // Clouds
    const cloudMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.9
    });

    for (let i = 0; i < 15; i++) {
        const cloud = createCloud();
        cloud.position.set(
            (Math.random() - 0.5) * 150,
            30 + Math.random() * 30,
            (Math.random() - 0.5) * 150
        );
        cloud.scale.setScalar(1 + Math.random() * 2);
        scene.add(cloud);
    }
}

function createCloud() {
    const group = new THREE.Group();
    const cloudMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.85
    });

    // Multiple spheres for fluffy cloud
    const positions = [
        { x: 0, y: 0, z: 0, s: 3 },
        { x: 2, y: 0.5, z: 0, s: 2.5 },
        { x: -2, y: 0.3, z: 0.5, s: 2.8 },
        { x: 1, y: 0.8, z: -0.5, s: 2 },
        { x: -1, y: 0.5, z: 0.3, s: 2.2 }
    ];

    positions.forEach(p => {
        const sphere = new THREE.Mesh(
            new THREE.SphereGeometry(p.s, 8, 8),
            cloudMat
        );
        sphere.position.set(p.x, p.y, p.z);
        group.add(sphere);
    });

    return group;
}

// ============================================
// GROUND & PATH
// ============================================
function createGround(scene) {
    // Main grass ground
    const groundMat = new THREE.MeshStandardMaterial({
        color: 0x4a7c4a,
        roughness: 0.9
    });
    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(100, 100),
        groundMat
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    scene.add(ground);

    // Stone pathway from street to café
    const pathMat = new THREE.MeshStandardMaterial({
        color: 0x8b8b8b,
        roughness: 0.7
    });
    const path = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 12),
        pathMat
    );
    path.rotation.x = -Math.PI / 2;
    path.position.set(0, 0.01, 5);
    path.receiveShadow = true;
    scene.add(path);

    // Patio area (stone)
    const patio = new THREE.Mesh(
        new THREE.PlaneGeometry(8, 6),
        pathMat
    );
    patio.rotation.x = -Math.PI / 2;
    patio.position.set(0, 0.02, 2);
    patio.receiveShadow = true;
    scene.add(patio);
}

// ============================================
// MODERN COMPACT CAFÉ - PROPER WALLS
// ============================================
function createCafe(scene) {
    const cafeGroup = new THREE.Group();

    // Materials - double sided for interior visibility
    const wallMat = new THREE.MeshStandardMaterial({
        color: 0x2a2a2a,
        roughness: 0.8,
        side: THREE.DoubleSide
    });
    const interiorWallMat = new THREE.MeshStandardMaterial({
        color: 0x3d3d3d,
        roughness: 0.7,
        side: THREE.DoubleSide
    });
    const glassMat = new THREE.MeshStandardMaterial({
        color: 0x88ccff,
        transparent: true,
        opacity: 0.3,
        metalness: 0.9,
        roughness: 0.1,
        side: THREE.DoubleSide
    });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5a4535, roughness: 0.7 });
    const accentMat = new THREE.MeshStandardMaterial({ color: 0xff6b35, metalness: 0.3 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6 });
    const brickMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.9 });

    // Floor
    const floor = new THREE.Mesh(
        new THREE.BoxGeometry(8, 0.15, 5),
        new THREE.MeshStandardMaterial({ color: 0x4a4540, roughness: 0.8 })
    );
    floor.position.set(0, 0.075, -4);
    floor.receiveShadow = true;
    cafeGroup.add(floor);

    // Back wall (interior visible)
    const backWall = new THREE.Mesh(
        new THREE.BoxGeometry(8, 3.5, 0.2),
        interiorWallMat
    );
    backWall.position.set(0, 1.75, -6.4);
    backWall.castShadow = true;
    cafeGroup.add(backWall);

    // Left wall (solid)
    const leftWall = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 3.5, 5),
        wallMat
    );
    leftWall.position.set(-3.9, 1.75, -4);
    leftWall.castShadow = true;
    cafeGroup.add(leftWall);

    // Right wall (solid)
    const rightWall = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 3.5, 5),
        wallMat
    );
    rightWall.position.set(3.9, 1.75, -4);
    rightWall.castShadow = true;
    cafeGroup.add(rightWall);

    // Front wall - left section (with door hole)
    const frontWallLeft = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 3.5, 0.2),
        wallMat
    );
    frontWallLeft.position.set(-3.2, 1.75, -1.5);
    cafeGroup.add(frontWallLeft);

    // Front wall - right section
    const frontWallRight = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 3.5, 0.2),
        wallMat
    );
    frontWallRight.position.set(3.2, 1.75, -1.5);
    cafeGroup.add(frontWallRight);

    // Front wall - above window
    const frontWallTop = new THREE.Mesh(
        new THREE.BoxGeometry(5.2, 0.8, 0.2),
        wallMat
    );
    frontWallTop.position.set(0, 3.1, -1.5);
    cafeGroup.add(frontWallTop);

    // Front wall - below window
    const frontWallBottom = new THREE.Mesh(
        new THREE.BoxGeometry(5.2, 0.5, 0.2),
        wallMat
    );
    frontWallBottom.position.set(0, 0.25, -1.5);
    cafeGroup.add(frontWallBottom);

    // Large front window
    const frontWindow = new THREE.Mesh(
        new THREE.PlaneGeometry(5, 2.2),
        glassMat
    );
    frontWindow.position.set(0, 1.8, -1.49);
    cafeGroup.add(frontWindow);

    // Window frame
    const windowFrame = new THREE.Mesh(
        new THREE.BoxGeometry(5.2, 0.08, 0.1),
        woodMat
    );
    windowFrame.position.set(0, 2.9, -1.45);
    cafeGroup.add(windowFrame);

    // Roof
    const roof = new THREE.Mesh(
        new THREE.BoxGeometry(8.4, 0.3, 5.4),
        roofMat
    );
    roof.position.set(0, 3.65, -4);
    roof.castShadow = true;
    cafeGroup.add(roof);

    // Orange accent stripe
    const accent = new THREE.Mesh(
        new THREE.BoxGeometry(8.5, 0.15, 5.5),
        accentMat
    );
    accent.position.set(0, 3.45, -4);
    cafeGroup.add(accent);

    // Awning over entrance
    const awning = new THREE.Mesh(
        new THREE.BoxGeometry(3, 0.1, 1.5),
        accentMat
    );
    awning.position.set(-2, 2.8, -0.9);
    cafeGroup.add(awning);

    // Door frame
    const doorFrame = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 2.3, 0.15),
        woodMat
    );
    doorFrame.position.set(-2.5, 1.15, -1.45);
    cafeGroup.add(doorFrame);

    // Counter
    const counter = createCounter();
    counter.position.set(0, 0, -5.2);
    cafeGroup.add(counter);

    // Decorative elements outside
    // Planters
    const planterMat = new THREE.MeshStandardMaterial({ color: 0x5a4535 });
    const plantMat = new THREE.MeshStandardMaterial({ color: 0x2d5a27 });

    [-3, 3].forEach(x => {
        const planter = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.4, 0.5),
            planterMat
        );
        planter.position.set(x, 0.2, -1);
        cafeGroup.add(planter);

        const plant = new THREE.Mesh(
            new THREE.SphereGeometry(0.3, 8, 8),
            plantMat
        );
        plant.position.set(x, 0.55, -1);
        cafeGroup.add(plant);
    });

    // Sign
    const signGroup = new THREE.Group();
    const signBoard = new THREE.Mesh(
        new THREE.BoxGeometry(2.5, 0.7, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
    );
    signGroup.add(signBoard);

    const signText = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 0.45, 0.05),
        accentMat
    );
    signText.position.z = 0.07;
    signGroup.add(signText);

    signGroup.position.set(0, 4.1, -1.3);
    cafeGroup.add(signGroup);

    scene.add(cafeGroup);

    // Add neighborhood buildings
    createNeighborhood(scene);

    return cafeGroup;
}

// ============================================
// NEIGHBORHOOD BUILDINGS
// ============================================
function createNeighborhood(scene) {
    // Left building - Bookshop
    const bookshop = createBuilding({
        width: 6, height: 4.5, depth: 5,
        wallColor: 0x6b4423,
        roofColor: 0x3d2817,
        windowColor: 0xffe4b5,
        hasAwning: true,
        awningColor: 0x2d5a27
    });
    bookshop.position.set(-8, 0, -4);
    scene.add(bookshop);

    // Right building - Bakery
    const bakery = createBuilding({
        width: 5, height: 4, depth: 5,
        wallColor: 0xf5e6d3,
        roofColor: 0x8b4513,
        windowColor: 0xfff8dc,
        hasAwning: true,
        awningColor: 0xdc143c
    });
    bakery.position.set(7.5, 0, -4);
    scene.add(bakery);

    // Far left - Apartment
    const apartment = createBuilding({
        width: 5, height: 8, depth: 6,
        wallColor: 0x8b8b8b,
        roofColor: 0x4a4a4a,
        windowColor: 0x87ceeb,
        floors: 3
    });
    apartment.position.set(-14, 0, -5);
    scene.add(apartment);

    // Far right - House
    const house = createBuilding({
        width: 4, height: 3.5, depth: 4,
        wallColor: 0xdeb887,
        roofColor: 0x8b4513,
        windowColor: 0xfffacd,
        hasChimney: true
    });
    house.position.set(13, 0, -3);
    scene.add(house);
}

function createBuilding(options) {
    const group = new THREE.Group();

    const {
        width = 5,
        height = 4,
        depth = 5,
        wallColor = 0x888888,
        roofColor = 0x444444,
        windowColor = 0xadd8e6,
        hasAwning = false,
        awningColor = 0xff6b35,
        floors = 1,
        hasChimney = false
    } = options;

    const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.8 });
    const roofMat = new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.7 });
    const windowMat = new THREE.MeshStandardMaterial({
        color: windowColor,
        transparent: true,
        opacity: 0.6
    });

    // Main building
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, depth),
        wallMat
    );
    body.position.y = height / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Roof
    const roof = new THREE.Mesh(
        new THREE.BoxGeometry(width + 0.3, 0.2, depth + 0.3),
        roofMat
    );
    roof.position.y = height + 0.1;
    group.add(roof);

    // Windows
    const windowsPerFloor = Math.floor(width / 1.5);
    const floorHeight = height / floors;

    for (let f = 0; f < floors; f++) {
        for (let w = 0; w < windowsPerFloor; w++) {
            const win = new THREE.Mesh(
                new THREE.PlaneGeometry(0.6, 0.8),
                windowMat
            );
            win.position.set(
                -width / 2 + 1 + w * 1.4,
                floorHeight * (f + 0.6),
                depth / 2 + 0.01
            );
            group.add(win);
        }
    }

    // Awning
    if (hasAwning) {
        const awning = new THREE.Mesh(
            new THREE.BoxGeometry(width * 0.8, 0.1, 1),
            new THREE.MeshStandardMaterial({ color: awningColor })
        );
        awning.position.set(0, 2.5, depth / 2 + 0.5);
        group.add(awning);
    }

    // Chimney
    if (hasChimney) {
        const chimney = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 1, 0.5),
            roofMat
        );
        chimney.position.set(width / 4, height + 0.5, 0);
        group.add(chimney);
    }

    return group;
}

function createCounter() {
    const counterGroup = new THREE.Group();
    const counterMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.6 });
    const topMat = new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: 0.5 });

    // Counter base
    const base = new THREE.Mesh(
        new THREE.BoxGeometry(6, 1, 0.8),
        counterMat
    );
    base.position.y = 0.5;
    base.castShadow = true;
    counterGroup.add(base);

    // Counter top
    const top = new THREE.Mesh(
        new THREE.BoxGeometry(6.2, 0.1, 1),
        topMat
    );
    top.position.y = 1.05;
    counterGroup.add(top);

    // Equipment on counter (facing player)
    const espresso = createEspressoMachine();
    espresso.position.set(-2, 1.1, 0.2);
    espresso.userData = { type: 'espresso', interactable: true };
    counterGroup.add(espresso);

    const milk = createMilkStation();
    milk.position.set(-0.8, 1.1, 0.2);
    milk.userData = { type: 'milk', interactable: true };
    counterGroup.add(milk);

    const cups = createCupDispenser();
    cups.position.set(0.8, 1.1, 0.2);
    cups.userData = { type: 'cup_dispenser', interactable: true };
    counterGroup.add(cups);

    // Syrups
    const syrupX = [1.8, 2.1, 2.4];
    const syrupColors = [0xf5e6d3, 0xc68e17, 0x3c1414];
    const syrupTypes = ['vanilla', 'caramel', 'chocolate'];

    syrupX.forEach((x, i) => {
        const syrup = createSyrupBottle(syrupColors[i]);
        syrup.position.set(x, 1.1, 0.2);
        syrup.userData = { type: 'syrup', syrupType: syrupTypes[i], interactable: true };
        counterGroup.add(syrup);
    });

    // Pastry display
    const pastryCase = createPastryDisplay();
    pastryCase.position.set(-0.2, 1.1, -0.2);
    pastryCase.userData = { type: 'pastry', interactable: true };
    counterGroup.add(pastryCase);

    // Trash bin beside counter
    const trash = createTrashBin();
    trash.position.set(-3.5, 0, 0.5);
    trash.userData = { type: 'trash', interactable: true };
    counterGroup.add(trash);

    return counterGroup;
}

// Equipment creation functions
function createEspressoMachine() {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xc0392b, metalness: 0.8, roughness: 0.2 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0xbdc3c7, metalness: 0.9, roughness: 0.1 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.4), bodyMat);
    body.position.y = 0.25;
    group.add(body);

    const top = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.1, 0.45), metalMat);
    top.position.y = 0.55;
    group.add(top);

    // Portafilter
    const filter = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.15, 8), metalMat);
    filter.position.set(0, 0.1, 0.25);
    filter.rotation.x = Math.PI / 6;
    group.add(filter);

    return group;
}

function createMilkStation() {
    const group = new THREE.Group();
    const metalMat = new THREE.MeshStandardMaterial({ color: 0xbdc3c7, metalness: 0.8, roughness: 0.2 });

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.35, 12), metalMat);
    body.position.y = 0.175;
    group.add(body);

    const wand = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.2, 6), metalMat);
    wand.position.set(0.1, 0.25, 0);
    wand.rotation.z = -0.3;
    group.add(wand);

    return group;
}

function createCupDispenser() {
    const group = new THREE.Group();
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x95a5a6, metalness: 0.7, roughness: 0.3 });
    const cupMat = new THREE.MeshStandardMaterial({ color: 0xf5f5dc });

    const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.4, 12), metalMat);
    cylinder.position.y = 0.2;
    group.add(cylinder);

    // Stack of cups
    for (let i = 0; i < 4; i++) {
        const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.05, 10), cupMat);
        cup.position.y = 0.05 + i * 0.04;
        group.add(cup);
    }

    return group;
}

function createSyrupBottle(color) {
    const group = new THREE.Group();
    const bottleMat = new THREE.MeshStandardMaterial({
        color: color,
        transparent: true,
        opacity: 0.8
    });
    const capMat = new THREE.MeshStandardMaterial({ color: 0x333333 });

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.18, 10), bottleMat);
    body.position.y = 0.09;
    group.add(body);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.06, 8), bottleMat);
    neck.position.y = 0.21;
    group.add(neck);

    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.04, 8), capMat);
    cap.position.y = 0.26;
    group.add(cap);

    return group;
}

function createPastryDisplay() {
    const group = new THREE.Group();
    const glassMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.3
    });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5d4e37 });

    // Case
    const caseGeo = new THREE.BoxGeometry(0.8, 0.35, 0.5);
    const caseMesh = new THREE.Mesh(caseGeo, glassMat);
    caseMesh.position.y = 0.175;
    group.add(caseMesh);

    // Base
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.05, 0.55), woodMat);
    group.add(base);

    // Pastries
    const pastryColors = [0xdaa520, 0x8b4513, 0xf5deb3];
    for (let i = -0.2; i <= 0.2; i += 0.2) {
        const pastry = new THREE.Mesh(
            new THREE.SphereGeometry(0.06, 8, 8),
            new THREE.MeshStandardMaterial({ color: pastryColors[Math.floor(Math.random() * 3)] })
        );
        pastry.scale.y = 0.6;
        pastry.position.set(i, 0.1, 0);
        group.add(pastry);
    }

    return group;
}

function createTrashBin() {
    const group = new THREE.Group();
    const binMat = new THREE.MeshStandardMaterial({ color: 0x444444 });

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.18, 0.5, 10), binMat);
    body.position.y = 0.25;
    group.add(body);

    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 10), binMat);
    lid.position.y = 0.52;
    group.add(lid);

    return group;
}

// ============================================
// OUTDOOR SEATING
// ============================================
function createOutdoorSeating(scene) {
    const seatingGroup = new THREE.Group();

    // Tables and chairs positions (on patio)
    const tablePositions = [
        { x: -2.5, z: 1 },
        { x: 2.5, z: 1 },
        { x: -2.5, z: 4 },
        { x: 2.5, z: 4 },
        { x: 0, z: 5.5 }
    ];

    tablePositions.forEach(pos => {
        // Use HQ models if available
        const table = typeof createHQTable === 'function' ? createHQTable() : createOutdoorTable();
        table.position.set(pos.x, 0, pos.z);
        seatingGroup.add(table);

        // Chairs facing table (2 per table) - use HQ models
        const chair1 = typeof createHQChair === 'function' ? createHQChair() : createOutdoorChair();
        chair1.position.set(pos.x - 0.6, 0, pos.z);
        chair1.rotation.y = Math.PI / 2; // Face inward
        seatingGroup.add(chair1);

        const chair2 = typeof createHQChair === 'function' ? createHQChair() : createOutdoorChair();
        chair2.position.set(pos.x + 0.6, 0, pos.z);
        chair2.rotation.y = -Math.PI / 2; // Face inward
        seatingGroup.add(chair2);
    });

    // Umbrellas
    tablePositions.slice(0, 4).forEach(pos => {
        const umbrella = createUmbrella();
        umbrella.position.set(pos.x, 0, pos.z);
        seatingGroup.add(umbrella);
    });

    scene.add(seatingGroup);
}

function createOutdoorTable() {
    const group = new THREE.Group();
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.6 });
    const topMat = new THREE.MeshStandardMaterial({ color: 0x5a4a3a });

    // Leg
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.7, 8), metalMat);
    leg.position.y = 0.35;
    group.add(leg);

    // Base
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.03, 12), metalMat);
    base.position.y = 0.015;
    group.add(base);

    // Top
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.04, 16), topMat);
    top.position.y = 0.72;
    top.castShadow = true;
    group.add(top);

    return group;
}

function createOutdoorChair() {
    const group = new THREE.Group();
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.6 });

    // Seat
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.03, 0.35), metalMat);
    seat.position.y = 0.45;
    group.add(seat);

    // Back
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.4, 0.03), metalMat);
    back.position.set(0, 0.65, -0.16);
    group.add(back);

    // Legs
    const legPositions = [
        { x: -0.12, z: -0.12 },
        { x: 0.12, z: -0.12 },
        { x: -0.12, z: 0.12 },
        { x: 0.12, z: 0.12 }
    ];

    legPositions.forEach(pos => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.45, 6), metalMat);
        leg.position.set(pos.x, 0.225, pos.z);
        group.add(leg);
    });

    return group;
}

function createUmbrella() {
    const group = new THREE.Group();
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x5a4a3a });
    const canopyMat = new THREE.MeshStandardMaterial({
        color: 0xff6b35,  // Orange accent
        side: THREE.DoubleSide
    });

    // Pole
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.5, 8), poleMat);
    pole.position.y = 1.25;
    group.add(pole);

    // Canopy
    const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.2, 0.5, 8, 1, true), canopyMat);
    canopy.position.y = 2.3;
    canopy.rotation.x = Math.PI;
    canopy.castShadow = true;
    group.add(canopy);

    return group;
}

// ============================================
// MAPLE TREES WITH FALLING LEAVES
// ============================================
function createMapleTrees(scene) {
    const treePositions = [
        { x: -6, z: 3 },
        { x: 6, z: 3 },
        { x: -5, z: 8 },
        { x: 5, z: 8 },
        { x: 0, z: 10 }
    ];

    treePositions.forEach(pos => {
        const tree = createMapleTree();
        tree.position.set(pos.x, 0, pos.z);
        tree.rotation.y = Math.random() * Math.PI * 2;
        scene.add(tree);
    });
}

function createMapleTree() {
    const group = new THREE.Group();
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3728 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0xcc4422 }); // Red maple

    // Trunk
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, 2, 8), trunkMat);
    trunk.position.y = 1;
    trunk.castShadow = true;
    group.add(trunk);

    // Foliage layers (autumn colors)
    const foliageColors = [0xcc4422, 0xdd6633, 0xee8844];
    const foliageHeights = [2.5, 3.2, 3.8];
    const foliageSizes = [1.8, 1.4, 0.9];

    foliageColors.forEach((color, i) => {
        const foliage = new THREE.Mesh(
            new THREE.SphereGeometry(foliageSizes[i], 8, 8),
            new THREE.MeshStandardMaterial({ color: color })
        );
        foliage.position.y = foliageHeights[i];
        foliage.scale.y = 0.7;
        foliage.castShadow = true;
        group.add(foliage);
    });

    return group;
}

// ============================================
// STREET
// ============================================
function createStreet(scene) {
    // Road
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.9 });
    const road = new THREE.Mesh(new THREE.PlaneGeometry(100, 6), roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.01, 12);
    scene.add(road);

    // Road markings
    const markingMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    for (let x = -40; x < 40; x += 4) {
        const marking = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 0.15),
            markingMat
        );
        marking.rotation.x = -Math.PI / 2;
        marking.position.set(x, 0.02, 12);
        scene.add(marking);
    }

    // Sidewalk
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
    const sidewalk = new THREE.Mesh(new THREE.PlaneGeometry(100, 2), sidewalkMat);
    sidewalk.rotation.x = -Math.PI / 2;
    sidewalk.position.set(0, 0.015, 9);
    scene.add(sidewalk);
}

// ============================================
// LIGHTING
// ============================================
function setupLighting(scene) {
    // Ambient light - warm
    const ambient = new THREE.AmbientLight(0xffeedd, 0.4);
    scene.add(ambient);

    // Main directional light (sun) - warm autumn
    const sun = new THREE.DirectionalLight(0xffddaa, 0.8);
    sun.position.set(10, 20, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 50;
    sun.shadow.camera.left = -20;
    sun.shadow.camera.right = 20;
    sun.shadow.camera.top = 20;
    sun.shadow.camera.bottom = -20;
    scene.add(sun);

    // Interior point lights (café)
    const interiorLight = new THREE.PointLight(0xffaa77, 0.8, 10);
    interiorLight.position.set(0, 2.5, -4);
    scene.add(interiorLight);

    // Warm accent lights
    const accentLight1 = new THREE.PointLight(0xff9955, 0.5, 8);
    accentLight1.position.set(-2, 2, -5);
    scene.add(accentLight1);

    const accentLight2 = new THREE.PointLight(0xff9955, 0.5, 8);
    accentLight2.position.set(2, 2, -5);
    scene.add(accentLight2);
}

// ============================================
// FALLING MAPLE LEAVES PARTICLE SYSTEM
// ============================================
function createFallingLeaves(scene) {
    const leafCount = 100;
    const leafGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(leafCount * 3);
    const colors = new Float32Array(leafCount * 3);
    const sizes = new Float32Array(leafCount);

    const leafColors = [
        new THREE.Color(0xcc4422), // Red
        new THREE.Color(0xdd6633), // Orange-red
        new THREE.Color(0xee8844), // Orange
        new THREE.Color(0xddaa33)  // Yellow-orange
    ];

    for (let i = 0; i < leafCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 30;
        positions[i * 3 + 1] = Math.random() * 15 + 5;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 30;

        const color = leafColors[Math.floor(Math.random() * leafColors.length)];
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;

        sizes[i] = 0.1 + Math.random() * 0.15;
    }

    leafGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    leafGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    leafGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const leafMaterial = new THREE.PointsMaterial({
        size: 0.15,
        vertexColors: true,
        transparent: true,
        opacity: 0.9
    });

    const leaves = new THREE.Points(leafGeometry, leafMaterial);
    leaves.userData.velocities = [];

    for (let i = 0; i < leafCount; i++) {
        leaves.userData.velocities.push({
            x: (Math.random() - 0.5) * 0.02,
            y: -0.01 - Math.random() * 0.02,
            z: (Math.random() - 0.5) * 0.02,
            rotSpeed: Math.random() * 0.1
        });
    }

    scene.add(leaves);
    return leaves;
}

function updateFallingLeaves(leaves, delta) {
    if (!leaves) return;

    const positions = leaves.geometry.attributes.position.array;
    const velocities = leaves.userData.velocities;

    for (let i = 0; i < velocities.length; i++) {
        const vel = velocities[i];

        // Update position
        positions[i * 3] += vel.x + Math.sin(Date.now() * 0.001 + i) * 0.01;
        positions[i * 3 + 1] += vel.y;
        positions[i * 3 + 2] += vel.z + Math.cos(Date.now() * 0.001 + i) * 0.01;

        // Reset if below ground
        if (positions[i * 3 + 1] < 0) {
            positions[i * 3] = (Math.random() - 0.5) * 30;
            positions[i * 3 + 1] = 15 + Math.random() * 5;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 30;
        }
    }

    leaves.geometry.attributes.position.needsUpdate = true;
}
