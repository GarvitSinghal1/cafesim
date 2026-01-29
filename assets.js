// ============================================
// CaféVibe - Asset Loading System
// High-quality GLTF model loader
// ============================================

// Asset manager
const AssetManager = {
    loader: null,
    dracoLoader: null,
    loadedModels: {},
    modelPaths: {
        // Update these paths when you have the actual models
        // Example: cafe: 'assets/models/cafe.glb',
        cafe: null,
        espressoMachine: null,
        coffeeCup: null,
        table: null,
        chair: null,
        tree: null,
        customer: null,
        pastry: null,
        counter: null
    },
    pendingLoads: 0,
    onLoadComplete: null
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
        model.scale.setScalar(0.5); // Adjust scale as needed
        return model;
    }

    // Fallback: use the procedural version
    return createEspressoMachine();
}

// Create a high-quality or fallback coffee cup
function createHQCoffeeCup() {
    if (hasModel('coffeeCup')) {
        const model = getModel('coffeeCup');
        model.scale.setScalar(0.08);
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
        return model;
    }

    // Fallback
    return createOutdoorTable();
}

// Create a high-quality or fallback chair
function createHQChair() {
    if (hasModel('chair')) {
        const model = getModel('chair');
        model.scale.setScalar(1);
        return model;
    }

    // Fallback
    return createOutdoorChair();
}

// Create a high-quality or fallback tree
function createHQTree() {
    if (hasModel('tree')) {
        const model = getModel('tree');
        model.scale.setScalar(2);
        return model;
    }

    // Fallback
    return createMapleTree();
}

// Create a high-quality or fallback customer
function createHQCustomer(color) {
    if (hasModel('customer')) {
        const model = getModel('customer');
        model.scale.setScalar(1);

        // Try to colorize clothing
        model.traverse(child => {
            if (child.isMesh && child.material) {
                if (child.name.toLowerCase().includes('clothes') ||
                    child.name.toLowerCase().includes('shirt')) {
                    child.material = child.material.clone();
                    child.material.color.setHex(color);
                }
            }
        });

        return model;
    }

    // Fallback: procedural NPC
    return createCustomerNPC(color);
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
