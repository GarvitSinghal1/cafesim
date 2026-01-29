// ============================================
// CaféVibe - Asset Loading System
// High-quality GLTF model loader
// ============================================

// Asset manager
const AssetManager = {
    loader: null,
    dracoLoader: null,
    loadedModels: {},
    // CDN-hosted models from KhronosGroup glTF-Sample-Assets (CC0/CC-BY)
    modelPaths: {
        // Direct CDN links - no download needed!
        chair: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/SheenChair/glTF-Binary/SheenChair.glb',
        plant: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/DiffuseTransmissionPlant/glTF-Binary/DiffuseTransmissionPlant.glb',
        teacup: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/DiffuseTransmissionTeacup/glTF-Binary/DiffuseTransmissionTeacup.glb',
        character: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/RiggedFigure/glTF-Binary/RiggedFigure.glb',
        // Local paths (for downloaded models)
        cafe: null,
        espressoMachine: null,
        coffeeCup: null,
        table: null,
        tree: null,
        pastry: null,
        counter: null
    },
    pendingLoads: 0,
    onLoadComplete: null,
    loadProgress: {}
};

// Initialize the GLTF loader
function initAssetLoader() {
    if (typeof THREE.GLTFLoader === 'undefined') {
        console.warn('GLTFLoader not available, using procedural models');
        return false;
    }

    AssetManager.loader = new THREE.GLTFLoader();

    // Optional: Set up DRACO decoder for compressed models
    if (typeof THREE.DRACOLoader !== 'undefined') {
        AssetManager.dracoLoader = new THREE.DRACOLoader();
        AssetManager.dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
        AssetManager.loader.setDRACOLoader(AssetManager.dracoLoader);
    }

    console.log('Asset loader initialized');
    return true;
}

// Load a single GLTF model
function loadModel(name, path, onLoad) {
    if (!AssetManager.loader) {
        console.warn(`Cannot load ${name}: loader not initialized`);
        if (onLoad) onLoad(null);
        return;
    }

    if (!path) {
        console.warn(`No path specified for ${name}`);
        if (onLoad) onLoad(null);
        return;
    }

    AssetManager.pendingLoads++;

    AssetManager.loader.load(
        path,
        (gltf) => {
            console.log(`Loaded model: ${name}`);
            AssetManager.loadedModels[name] = gltf;
            AssetManager.pendingLoads--;

            if (onLoad) onLoad(gltf);

            // Check if all models are loaded
            if (AssetManager.pendingLoads === 0 && AssetManager.onLoadComplete) {
                AssetManager.onLoadComplete();
            }
        },
        (progress) => {
            const percent = (progress.loaded / progress.total * 100).toFixed(1);
            console.log(`Loading ${name}: ${percent}%`);
        },
        (error) => {
            console.error(`Error loading ${name}:`, error);
            AssetManager.pendingLoads--;
            if (onLoad) onLoad(null);
        }
    );
}

// Load all configured models
function loadAllModels(onComplete) {
    AssetManager.onLoadComplete = onComplete;

    let hasModelsToLoad = false;

    for (const [name, path] of Object.entries(AssetManager.modelPaths)) {
        if (path) {
            hasModelsToLoad = true;
            loadModel(name, path);
        }
    }

    // If no models to load, complete immediately
    if (!hasModelsToLoad && onComplete) {
        setTimeout(onComplete, 0);
    }
}

// Get a loaded model by name (returns a clone)
function getModel(name) {
    const gltf = AssetManager.loadedModels[name];
    if (!gltf) return null;

    // Clone the scene to allow multiple instances
    const model = gltf.scene.clone();

    // Copy animations if available
    if (gltf.animations && gltf.animations.length > 0) {
        model.userData.animations = gltf.animations;
    }

    return model;
}

// Check if a model exists
function hasModel(name) {
    return AssetManager.modelPaths[name] !== null && AssetManager.loadedModels[name] !== undefined;
}

// Set model path (for dynamic configuration)
function setModelPath(name, path) {
    AssetManager.modelPaths[name] = path;
}

// ============================================
// High-Quality Replace Functions
// These will use loaded models if available,
// otherwise fall back to procedural geometry
// ============================================

// Create a high-quality or fallback espresso machine
function createHQEspressoMachine() {
    if (hasModel('espressoMachine')) {
        const model = getModel('espressoMachine');
        model.scale.setScalar(0.5);
        enableShadows(model);
        return model;
    }

    // Fallback: use the procedural version
    if (typeof createEspressoMachine === 'function') {
        return createEspressoMachine();
    }

    // Mini fallback
    const machine = new THREE.Group();
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.5, 0.4),
        new THREE.MeshStandardMaterial({ color: 0xcc2222, metalness: 0.8, roughness: 0.3 })
    );
    body.position.y = 0.25;
    machine.add(body);
    return machine;
}

// Create a high-quality or fallback coffee cup
function createHQCoffeeCup() {
    if (hasModel('teacup')) {
        const model = getModel('teacup');
        model.scale.setScalar(0.15);
        centerModel(model);
        enableShadows(model);
        return model;
    }

    // Fallback: procedural cup
    const cupGroup = new THREE.Group();
    const cupMat = new THREE.MeshStandardMaterial({ color: 0xf5f5dc });

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.12, 12), cupMat);
    body.position.y = 0.06;
    cupGroup.add(body);

    const liquid = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.045, 0.02, 12),
        new THREE.MeshStandardMaterial({ color: 0x3d2817, transparent: true, opacity: 0 })
    );
    liquid.position.y = 0.05;
    liquid.name = 'liquid';
    cupGroup.add(liquid);

    return cupGroup;
}

// Create a high-quality or fallback table
function createHQTable() {
    if (hasModel('table')) {
        const model = getModel('table');
        model.scale.setScalar(1);
        enableShadows(model);
        return model;
    }

    // Fallback
    if (typeof createOutdoorTable === 'function') {
        return createOutdoorTable();
    }

    // Mini fallback - simple table
    const table = new THREE.Group();
    const top = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.4, 0.05, 16),
        new THREE.MeshStandardMaterial({ color: 0x8B4513 })
    );
    top.position.y = 0.7;
    table.add(top);

    const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 0.7, 8),
        new THREE.MeshStandardMaterial({ color: 0x333333 })
    );
    leg.position.y = 0.35;
    table.add(leg);
    return table;
}

// Create a high-quality or fallback chair
function createHQChair() {
    if (hasModel('chair')) {
        const model = getModel('chair');
        model.scale.setScalar(0.8);
        centerModel(model);
        enableShadows(model);
        return model;
    }

    // Fallback
    if (typeof createOutdoorChair === 'function') {
        return createOutdoorChair();
    }

    // Mini fallback - simple chair
    const chair = new THREE.Group();
    const seat = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.05, 0.4),
        new THREE.MeshStandardMaterial({ color: 0x666666 })
    );
    seat.position.y = 0.45;
    chair.add(seat);

    const back = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.4, 0.05),
        new THREE.MeshStandardMaterial({ color: 0x666666 })
    );
    back.position.set(0, 0.65, -0.175);
    chair.add(back);
    return chair;
}

// Create a high-quality or fallback plant
function createHQPlant() {
    if (hasModel('plant')) {
        const model = getModel('plant');
        model.scale.setScalar(0.5);
        centerModel(model);
        enableShadows(model);
        return model;
    }

    // Fallback - simple potted plant
    const plant = new THREE.Group();
    const pot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.1, 0.15, 12),
        new THREE.MeshStandardMaterial({ color: 0x8B4513 })
    );
    pot.position.y = 0.075;
    plant.add(pot);

    const foliage = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0x228B22 })
    );
    foliage.position.y = 0.25;
    plant.add(foliage);
    return plant;
}

// Create a high-quality or fallback tree
function createHQTree() {
    if (hasModel('tree')) {
        const model = getModel('tree');
        model.scale.setScalar(2);
        enableShadows(model);
        return model;
    }

    // Fallback
    if (typeof createMapleTree === 'function') {
        return createMapleTree();
    }

    // Mini fallback
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.2, 2, 8),
        new THREE.MeshStandardMaterial({ color: 0x5C4033 })
    );
    trunk.position.y = 1;
    tree.add(trunk);

    const leaves = new THREE.Mesh(
        new THREE.SphereGeometry(1.5, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0xCC4400 })
    );
    leaves.position.y = 3;
    tree.add(leaves);
    return tree;
}

// Create a high-quality or fallback customer
function createHQCustomer(color) {
    if (hasModel('character')) {
        const model = getModel('character');
        model.scale.setScalar(0.8);
        centerModel(model);
        enableShadows(model);

        // Try to colorize clothing
        model.traverse(child => {
            if (child.isMesh && child.material) {
                child.material = child.material.clone();
                child.material.color.setHex(color);
            }
        });

        return model;
    }

    // Fallback: procedural NPC
    if (typeof createCustomerNPC === 'function') {
        return createCustomerNPC(color);
    }

    // Mini fallback
    const npc = new THREE.Group();
    const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.25, 1, 8),
        new THREE.MeshStandardMaterial({ color: color })
    );
    body.position.y = 0.5;
    npc.add(body);

    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0xf5d0c5 })
    );
    head.position.y = 1.2;
    npc.add(head);
    return npc;
}

// ============================================
// Utility: Apply shadows to loaded models
// ============================================
function enableShadows(model, castShadow = true, receiveShadow = true) {
    model.traverse(child => {
        if (child.isMesh) {
            child.castShadow = castShadow;
            child.receiveShadow = receiveShadow;
        }
    });
}

// ============================================
// Utility: Center and ground a model
// ============================================
function centerModel(model) {
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    model.position.x -= center.x;
    model.position.y -= box.min.y; // Ground the model
    model.position.z -= center.z;

    return { center, size };
}
