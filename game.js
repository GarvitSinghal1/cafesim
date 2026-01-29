// ============================================
// CaféVibe - Main Game Logic
// ============================================

// Three.js globals
let scene, camera, renderer;
let clock, raycaster;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
let prevTime = performance.now();

// Game objects
let interactableObjects = [];
let fallingLeaves = null;

// Game state
const gameState = {
    mode: null,
    isPaused: false,
    isPlaying: false,
    money: 100,
    rating: 5.0,
    customersServed: 0,
    activeOrders: [],
    customers: [],
    menuPrices: {}
};

// Physics grab system
let physicsState = {
    grabbedObject: null,
    isGrabbing: false
};

// Mini-game state
let miniGameState = {
    active: false,
    type: null,
    markerPos: 0,
    markerDirection: 1,
    targetStart: 35,
    targetEnd: 65,
    tapProgress: 0,
    tapRequired: 12,
    quality: 0,
    callback: null
};

// Held items (for serving)
let heldItems = [];

// Audio context
let audioContext, masterGain;

// ============================================
// INITIALIZATION
// ============================================
async function init() {
    updateLoadingProgress(10);

    // Setup Three.js
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x87ceeb, 30, 100);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, CONFIG.CAMERA_HEIGHT, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('game-container').appendChild(renderer.domElement);

    updateLoadingProgress(30);

    // Build world
    buildWorld(scene);

    // Create falling leaves
    fallingLeaves = createFallingLeaves(scene);

    // Initialize physics
    if (typeof initPhysics === 'function') {
        initPhysics();
    }

    updateLoadingProgress(60);

    // Collect interactable objects
    scene.traverse(obj => {
        if (obj.userData && obj.userData.interactable) {
            interactableObjects.push(obj);
        }
    });

    // Setup input
    clock = new THREE.Clock();
    raycaster = new THREE.Raycaster();

    setupEventListeners();
    setupAudio();
    initMenuPrices();

    updateLoadingProgress(100);

    // Hide loading, show menu
    setTimeout(() => {
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('blocker').style.display = 'flex';
    }, 500);

    // Start render loop
    animate();
}

function updateLoadingProgress(percent) {
    const fill = document.getElementById('loading-fill');
    if (fill) fill.style.width = percent + '%';
}

function initMenuPrices() {
    MENU_ITEMS.forEach(item => {
        gameState.menuPrices[item.id] = item.basePrice;
    });
}

// ============================================
// EVENT LISTENERS
// ============================================
function setupEventListeners() {
    // Pointer lock
    renderer.domElement.addEventListener('click', () => {
        if (gameState.isPlaying && !gameState.isPaused && !miniGameState.active) {
            renderer.domElement.requestPointerLock();
        }
    });

    document.addEventListener('pointerlockchange', () => {
        if (document.pointerLockElement === renderer.domElement) {
            document.addEventListener('mousemove', onMouseMove);
        } else {
            document.removeEventListener('mousemove', onMouseMove);
        }
    });

    // Keyboard
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    // Window resize
    window.addEventListener('resize', onWindowResize);

    // Music controls
    document.querySelectorAll('.music-track').forEach(track => {
        track.addEventListener('click', () => {
            document.querySelectorAll('.music-track').forEach(t => t.classList.remove('active'));
            track.classList.add('active');
        });
    });

    document.getElementById('volume-slider').addEventListener('input', (e) => {
        if (masterGain) masterGain.gain.value = e.target.value / 100;
    });
}

function onMouseMove(event) {
    if (!gameState.isPlaying || gameState.isPaused) return;

    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;

    camera.rotation.order = 'YXZ';
    camera.rotation.y -= movementX * 0.002;
    camera.rotation.x -= movementY * 0.002;
    camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
}

function onKeyDown(event) {
    if (!gameState.isPlaying) return;

    switch (event.code) {
        case 'KeyW': moveForward = true; break;
        case 'KeyS': moveBackward = true; break;
        case 'KeyA': moveLeft = true; break;
        case 'KeyD': moveRight = true; break;
        case 'KeyE': tryInteract(); break;
        case 'KeyH': toggleRecipePanel(); break;
        case 'Tab':
            event.preventDefault();
            if (!gameState.isPaused) openShop();
            break;
        case 'Escape':
            // Cancel mini-game first
            if (miniGameState.active) {
                cancelMiniGame();
            } else if (document.getElementById('shop-modal').style.display === 'flex') {
                closeShop();
            } else {
                togglePause();
            }
            break;
    }
}

function onKeyUp(event) {
    switch (event.code) {
        case 'KeyW': moveForward = false; break;
        case 'KeyS': moveBackward = false; break;
        case 'KeyA': moveLeft = false; break;
        case 'KeyD': moveRight = false; break;
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// ============================================
// GAME FLOW
// ============================================
function startGame(mode) {
    gameState.mode = mode;
    gameState.isPlaying = true;
    gameState.money = CONFIG.STARTING_MONEY;
    gameState.rating = 5.0;
    gameState.customersServed = 0;
    gameState.activeOrders = [];
    gameState.customers = [];
    heldItems = [];

    document.getElementById('blocker').style.display = 'none';
    document.getElementById('hud').style.display = 'block';
    document.getElementById('crosshair').style.display = 'block';

    // Position player behind counter
    camera.position.set(0, CONFIG.CAMERA_HEIGHT, -4);
    camera.rotation.set(0, 0, 0);

    updateHUD();

    // Start spawning customers
    setTimeout(spawnCustomer, 1000);
    spawnCustomerLoop();

    renderer.domElement.requestPointerLock();
}

function togglePause() {
    gameState.isPaused = !gameState.isPaused;
    document.getElementById('pause-menu').style.display = gameState.isPaused ? 'flex' : 'none';

    if (gameState.isPaused) {
        document.exitPointerLock();
    }
}

function resumeGame() {
    gameState.isPaused = false;
    document.getElementById('pause-menu').style.display = 'none';
    renderer.domElement.requestPointerLock();
}

function quitToMenu() {
    gameState.isPlaying = false;
    gameState.isPaused = false;

    // Clear customers
    gameState.customers.forEach(c => scene.remove(c));
    gameState.customers = [];
    gameState.activeOrders = [];

    document.getElementById('pause-menu').style.display = 'none';
    document.getElementById('hud').style.display = 'none';
    document.getElementById('crosshair').style.display = 'none';
    document.getElementById('orders-panel').innerHTML = '';
    document.getElementById('blocker').style.display = 'flex';

    document.exitPointerLock();
}

// ============================================
// ANIMATION LOOP
// ============================================
function animate() {
    requestAnimationFrame(animate);

    const time = performance.now();
    const delta = (time - prevTime) / 1000;

    if (gameState.isPlaying && !gameState.isPaused) {
        updateMovement(delta);
        updateCustomers(delta);
        updateFallingLeaves(fallingLeaves, delta);
        checkInteractionPrompt();

        // Update physics
        if (typeof updatePhysics === 'function') {
            updatePhysics(delta);
        }
    }

    updateMiniGame();
    updateGrabbedObject();

    prevTime = time;
    renderer.render(scene, camera);
}

function updateMovement(delta) {
    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize();

    if (moveForward || moveBackward) velocity.z -= direction.z * CONFIG.MOVE_SPEED * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * CONFIG.MOVE_SPEED * delta;

    // Apply movement
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0));

    camera.position.add(forward.multiplyScalar(-velocity.z * delta));
    camera.position.add(right.multiplyScalar(-velocity.x * delta));

    // Clamp position
    camera.position.x = Math.max(CONFIG.BOUNDS.minX, Math.min(CONFIG.BOUNDS.maxX, camera.position.x));
    camera.position.z = Math.max(CONFIG.BOUNDS.minZ, Math.min(CONFIG.BOUNDS.maxZ, camera.position.z));
    camera.position.y = CONFIG.CAMERA_HEIGHT;
}

// ============================================
// INTERACTION SYSTEM
// ============================================
function checkInteractionPrompt() {
    const prompt = document.getElementById('interact-prompt');

    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(interactableObjects, true);

    if (intersects.length > 0) {
        let target = intersects[0].object;
        while (target && !target.userData.type) {
            target = target.parent;
        }

        if (target && target.userData.type) {
            let text = 'Press <span>E</span> to ';

            if (physicsState.isGrabbing) {
                text += 'drop';

                if (target.userData.type === 'espresso') text = 'Press <span>E</span> to pour espresso';
                else if (target.userData.type === 'milk') text = 'Press <span>E</span> to froth milk';
                else if (target.userData.type === 'syrup') text = `Press <span>E</span> to add ${target.userData.syrupType}`;
                else if (target.userData.type === 'trash') text = 'Press <span>E</span> to trash item';
                else if (target.userData.type === 'customer') text = 'Press <span>E</span> to serve customer';
            } else {
                switch (target.userData.type) {
                    case 'cup_dispenser': text += 'get cup'; break;
                    case 'pastry': text += 'get pastry'; break;
                    case 'espresso': text += 'use machine'; break;
                    case 'customer': text += 'serve'; break;
                    default: text += 'interact';
                }
            }

            prompt.innerHTML = text;
            prompt.style.display = 'block';
            return;
        }
    }

    // No target - show drop if holding something
    if (physicsState.isGrabbing) {
        prompt.innerHTML = 'Press <span>E</span> to drop';
        prompt.style.display = 'block';
    } else {
        prompt.style.display = 'none';
    }
}

function tryInteract() {
    // Handle mini-game input
    if (miniGameState.active) {
        handleMiniGameInput();
        return;
    }

    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(interactableObjects, true);

    let target = null;
    if (intersects.length > 0) {
        target = intersects[0].object;
        while (target && !target.userData.type) {
            target = target.parent;
        }
    }

    // If holding something
    if (physicsState.isGrabbing) {
        if (!target) {
            // Drop item
            dropItem();
            return;
        }

        const heldItem = physicsState.grabbedObject;
        const heldType = heldItem.userData.itemType;

        switch (target.userData.type) {
            case 'espresso':
                if (heldType === 'cup') {
                    startMiniGame('timing', () => {
                        addToCup(heldItem, 'espresso');
                    });
                }
                break;

            case 'milk':
                if (heldType === 'cup') {
                    startMiniGame('tap', () => {
                        addToCup(heldItem, 'milk');
                    });
                }
                break;

            case 'syrup':
                if (heldType === 'cup') {
                    addToCup(heldItem, target.userData.syrupType);
                    playSound('pour');
                }
                break;

            case 'trash':
                trashItem();
                break;

            case 'customer':
                serveToCustomer(target);
                break;

            default:
                dropItem();
        }
    } else {
        // Picking up items
        if (!target) return;

        switch (target.userData.type) {
            case 'cup_dispenser':
                grabCup();
                break;

            case 'pastry':
                grabPastry();
                break;
        }
    }
}

// ============================================
// ITEM HANDLING
// ============================================
function grabCup() {
    const cupGroup = new THREE.Group();
    const cupMat = new THREE.MeshStandardMaterial({ color: 0xf5f5dc });

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.12, 12), cupMat);
    body.position.y = 0.06;
    cupGroup.add(body);

    // Liquid (starts empty)
    const liquid = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.045, 0.02, 12),
        new THREE.MeshStandardMaterial({ color: 0x3d2817, transparent: true, opacity: 0 })
    );
    liquid.position.y = 0.05;
    liquid.name = 'liquid';
    cupGroup.add(liquid);

    cupGroup.userData = {
        itemType: 'cup',
        contents: { espresso: false, milk: false, vanilla: false, caramel: false, chocolate: false },
        quality: 100
    };

    scene.add(cupGroup);

    physicsState.grabbedObject = cupGroup;
    physicsState.isGrabbing = true;

    playSound('pickup');
    showNotification('Cup grabbed!', 'Take it to a station');
}

function grabPastry() {
    const pastryGroup = new THREE.Group();
    const pastry = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xdaa520 })
    );
    pastry.scale.y = 0.6;
    pastryGroup.add(pastry);

    pastryGroup.userData = {
        itemType: 'pastry',
        quality: 100
    };

    scene.add(pastryGroup);

    physicsState.grabbedObject = pastryGroup;
    physicsState.isGrabbing = true;

    playSound('pickup');
}

function dropItem() {
    if (!physicsState.grabbedObject) return;

    const obj = physicsState.grabbedObject;

    // If we have real physics, throw it
    if (typeof throwObject === 'function' && obj.userData.physicsBody) {
        throwObject(obj, camera, 8);
    } else {
        // Fallback: place object on ground in front of player
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        obj.position.copy(camera.position).add(forward.multiplyScalar(1.5));
        obj.position.y = 0.1;
    }

    physicsState.grabbedObject = null;
    physicsState.isGrabbing = false;
    playSound('drop');
}

// Throw object with physics
function throwItem() {
    if (!physicsState.grabbedObject) return;

    const obj = physicsState.grabbedObject;

    if (typeof throwObject === 'function') {
        // Create physics body if needed
        if (!obj.userData.physicsBody && typeof createPhysicsCup === 'function') {
            if (obj.userData.itemType === 'cup') {
                createPhysicsCup(obj);
            } else if (obj.userData.itemType === 'pastry') {
                createPhysicsPastry(obj);
            }
        }

        throwObject(obj, camera, 10);
    }

    physicsState.grabbedObject = null;
    physicsState.isGrabbing = false;
    playSound('throw');
}

function trashItem() {
    if (!physicsState.grabbedObject) return;

    scene.remove(physicsState.grabbedObject);
    physicsState.grabbedObject = null;
    physicsState.isGrabbing = false;

    playSound('trash');
    showNotification('Trashed!', '');
}

function addToCup(cup, contentType) {
    if (!cup.userData.contents) return;

    cup.userData.contents[contentType] = true;

    // Update liquid visual
    const liquid = cup.getObjectByName('liquid');
    if (liquid) {
        liquid.material.opacity = Math.min(1, liquid.material.opacity + 0.4);

        // Color based on contents
        if (cup.userData.contents.espresso && cup.userData.contents.milk) {
            liquid.material.color.setHex(0x8b7355); // Latte color
        } else if (cup.userData.contents.espresso) {
            liquid.material.color.setHex(0x3d2817); // Espresso
        }

        if (cup.userData.contents.chocolate) liquid.material.color.setHex(0x4a3520);
        if (cup.userData.contents.caramel) liquid.material.color.setHex(0x8b6914);
        if (cup.userData.contents.vanilla) liquid.material.color.setHex(0xa08060);
    }

    // Show what was added
    const qualityStr = miniGameState.quality >= 80 ? 'PERFECT!' :
        miniGameState.quality >= 50 ? 'Good!' : 'OK';
    showQualityPopup(miniGameState.quality);
}

function updateGrabbedObject() {
    if (!physicsState.isGrabbing || !physicsState.grabbedObject) return;

    // Position in front of camera
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);

    const targetPos = camera.position.clone()
        .add(forward.multiplyScalar(0.5))
        .add(new THREE.Vector3(0, -0.2, 0));

    physicsState.grabbedObject.position.lerp(targetPos, 0.3);
    physicsState.grabbedObject.rotation.y = camera.rotation.y;
}

// ============================================
// SERVING CUSTOMERS
// ============================================
function serveToCustomer(customerObj) {
    if (!physicsState.grabbedObject) {
        showNotification('Nothing to serve!', 'Grab a cup or pastry first');
        return;
    }

    const held = physicsState.grabbedObject;
    const heldType = held.userData.itemType;

    // Make sure we have the root customer object
    let customer = customerObj;
    while (customer.parent && customer.parent !== scene) {
        if (customer.userData && customer.userData.type === 'customer') break;
        customer = customer.parent;
    }

    // Check if customer is still entering
    if (customer.userData && customer.userData.state === 'entering') {
        showNotification('Wait!', 'Customer is still walking to counter');
        return;
    }

    // Find customer's order - match by userData.order reference or direct customer match
    let orderIndex = gameState.activeOrders.findIndex(o => o.customer === customer);

    // If not found, try to find by customer position (fallback)
    if (orderIndex === -1) {
        // Also check if any order has this customer in the list
        for (let i = 0; i < gameState.activeOrders.length; i++) {
            const order = gameState.activeOrders[i];
            if (order.customer && order.customer.uuid === customer.uuid) {
                orderIndex = i;
                break;
            }
        }
    }

    if (orderIndex === -1) {
        // Debug: Check if customer has an order but isn't in activeOrders
        if (customer.userData && customer.userData.order) {
            showNotification('Order pending', 'Wait for customer to reach counter');
        } else {
            showNotification('No order!', 'This customer has no order');
        }
        return;
    }

    const order = gameState.activeOrders[orderIndex];
    let matchFound = false;
    let quality = held.userData.quality || 100;

    // Check if item matches any order item
    if (heldType === 'pastry') {
        // Check for pastry in order
        matchFound = order.items.some(item => item.type === 'pastry');
    } else if (heldType === 'cup') {
        // Check drink match
        const contents = held.userData.contents;

        for (const item of order.items) {
            if (item.type === 'drink') {
                const recipe = DRINK_RECIPES[item.id];
                if (recipe) {
                    // Check all recipe requirements
                    let matches = true;
                    for (const [ingredient, required] of Object.entries(recipe)) {
                        if (required && !contents[ingredient]) {
                            matches = false;
                            break;
                        }
                    }
                    if (matches) {
                        matchFound = true;
                        break;
                    }
                }
            }
        }
    }

    if (matchFound) {
        completeOrder(orderIndex, quality);

        // Remove held item
        scene.remove(physicsState.grabbedObject);
        physicsState.grabbedObject = null;
        physicsState.isGrabbing = false;
    } else {
        showNotification('Wrong item!', 'Check the order again');
        playSound('error');
    }
}

function completeOrder(orderIndex, quality) {
    const order = gameState.activeOrders[orderIndex];
    const customer = order.customer;

    // Calculate payment
    let payment = order.items.reduce((sum, item) => {
        return sum + (gameState.menuPrices[item.id] || 4);
    }, 0);

    // Quality bonus/penalty
    let tipMultiplier = 1;
    if (quality >= 80) {
        tipMultiplier = 1.3;
        showQualityPopup(100);
    } else if (quality >= 50) {
        tipMultiplier = 1.1;
        showQualityPopup(70);
    } else {
        tipMultiplier = 0.8;
        showQualityPopup(30);
    }

    const tip = Math.floor(payment * 0.2 * tipMultiplier);
    const total = payment + tip;

    gameState.money += total;
    gameState.customersServed++;

    // Update rating
    const ratingChange = quality >= 80 ? 0.1 : quality >= 50 ? 0 : -0.1;
    gameState.rating = Math.max(1, Math.min(5, gameState.rating + ratingChange));

    updateHUD();

    // Remove order and customer
    gameState.activeOrders.splice(orderIndex, 1);

    // Animate customer leaving
    animateCustomerLeave(customer);

    showNotification(`+$${total}`, tip > 0 ? `Tip: $${tip}` : '');
    playSound('coin');

    updateOrdersDisplay();
}

// ============================================
// CUSTOMERS & ORDERS
// ============================================
function spawnCustomerLoop() {
    if (!gameState.isPlaying) return;

    const interval = CONFIG.CUSTOMER_SPAWN_INTERVAL[gameState.mode] || 6000;

    setTimeout(() => {
        if (gameState.isPlaying && !gameState.isPaused) {
            if (gameState.customers.length < CONFIG.MAX_CUSTOMERS) {
                spawnCustomer();
            }
        }
        spawnCustomerLoop();
    }, interval);
}

function spawnCustomer() {
    if (gameState.customers.length >= CONFIG.MAX_CUSTOMERS) return;

    // Select customer type
    const types = Object.keys(CUSTOMER_TYPES);
    const customerType = types[Math.floor(Math.random() * types.length)];
    const typeData = CUSTOMER_TYPES[customerType];

    // Create customer
    const customer = createCustomerNPC(typeData.color);
    customer.position.set(0, 0, 9); // Start at street
    customer.userData = {
        type: 'customer',
        customerType: customerType,
        state: 'entering',
        order: generateOrder(),
        interactable: true
    };

    scene.add(customer);
    interactableObjects.push(customer);
    gameState.customers.push(customer);

    // Walk to counter
    animateCustomerEnter(customer);
}

function createCustomerNPC(color) {
    const group = new THREE.Group();
    const skinColor = 0xf5d0c5;
    const skinMat = new THREE.MeshStandardMaterial({ color: skinColor });
    const clothesMat = new THREE.MeshStandardMaterial({ color: color });

    // Legs
    const legMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    [-0.08, 0.08].forEach(x => {
        const leg = new THREE.Mesh(
            new THREE.CylinderGeometry(0.06, 0.06, 0.5, 8),
            legMat
        );
        leg.position.set(x, 0.25, 0);
        group.add(leg);
    });

    // Torso
    const torso = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.22, 0.55, 12),
        clothesMat
    );
    torso.position.y = 0.75;
    group.add(torso);

    // Arms
    [-0.25, 0.25].forEach(x => {
        const arm = new THREE.Mesh(
            new THREE.CylinderGeometry(0.04, 0.05, 0.4, 8),
            skinMat
        );
        arm.position.set(x, 0.7, 0);
        arm.rotation.z = x > 0 ? 0.3 : -0.3;
        group.add(arm);
    });

    // Head
    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 16, 16),
        skinMat
    );
    head.position.y = 1.2;
    group.add(head);

    // Hair
    const hairColors = [0x2b1a0f, 0x5a3d1e, 0x8b4513, 0x333333, 0xdaa520];
    const hairColor = hairColors[Math.floor(Math.random() * hairColors.length)];
    const hair = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: hairColor })
    );
    hair.position.y = 1.25;
    group.add(hair);

    // Eyes
    [-0.05, 0.05].forEach(x => {
        const eye = new THREE.Mesh(
            new THREE.SphereGeometry(0.02, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0x111111 })
        );
        eye.position.set(x, 1.22, 0.13);
        group.add(eye);
    });

    // Order bubble (empty placeholder - will be updated when order is set)
    const orderBubble = new THREE.Group();
    orderBubble.position.y = 1.65;
    orderBubble.name = 'orderBubble';
    orderBubble.visible = false;
    group.add(orderBubble);

    return group;
}

function createOrderBubble(orderItems) {
    const group = new THREE.Group();

    // Create canvas for text
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Draw bubble background
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.roundRect(5, 5, 246, 118, 15);
    ctx.fill();

    ctx.strokeStyle = '#ff6b35';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw order text
    ctx.fillStyle = '#333';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';

    if (orderItems && orderItems.length > 0) {
        const text = orderItems.map(item => item.icon + ' ' + item.name).join('\n');
        const lines = text.split('\n');
        lines.forEach((line, i) => {
            ctx.fillText(line, 128, 40 + i * 35, 230);
        });
    }

    // Create texture
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    // Create sprite/plane
    const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(0.8, 0.4, 1);
    group.add(sprite);

    return group;
}

function updateOrderBubble(customer) {
    // Remove old bubble
    const oldBubble = customer.getObjectByName('orderBubble');
    if (oldBubble) {
        customer.remove(oldBubble);
    }

    // Create new bubble with order text
    const orderItems = customer.userData.order;
    const newBubble = createOrderBubble(orderItems);
    newBubble.position.y = 1.65;
    newBubble.name = 'orderBubble';
    newBubble.visible = true;
    customer.add(newBubble);
}

function generateOrder() {
    const items = [];

    // Random drink
    const drinks = MENU_ITEMS.filter(i => i.type === 'drink');
    const drink = drinks[Math.floor(Math.random() * drinks.length)];
    items.push(drink);

    // Sometimes add pastry
    if (Math.random() < 0.3) {
        const pastries = MENU_ITEMS.filter(i => i.type === 'pastry');
        const pastry = pastries[Math.floor(Math.random() * pastries.length)];
        items.push(pastry);
    }

    return items;
}

function animateCustomerEnter(customer) {
    const queueIndex = gameState.customers.indexOf(customer);
    const targetPos = QUEUE_POSITIONS[queueIndex % QUEUE_POSITIONS.length];

    const animate = () => {
        if (!customer.userData || customer.userData.state !== 'entering') return;

        const dx = targetPos.x - customer.position.x;
        const dz = targetPos.z - customer.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist > 0.1) {
            customer.position.x += dx * 0.08;
            customer.position.z += dz * 0.08;
            customer.rotation.y = Math.atan2(dx, dz);
            requestAnimationFrame(animate);
        } else {
            customer.userData.state = 'waiting';
            customer.rotation.y = Math.PI; // Face counter

            // Show order bubble with actual order text
            updateOrderBubble(customer);

            // Add to active orders
            addOrder(customer);
        }
    };

    animate();
}

function animateCustomerLeave(customer) {
    customer.userData.state = 'leaving';

    // Hide order bubble
    const bubble = customer.getObjectByName('orderBubble');
    if (bubble) bubble.visible = false;

    const animate = () => {
        if (customer.userData.state !== 'leaving') return;

        customer.position.z += 0.1;
        customer.rotation.y = 0;

        if (customer.position.z < 12) {
            requestAnimationFrame(animate);
        } else {
            // Remove customer
            scene.remove(customer);
            const idx = gameState.customers.indexOf(customer);
            if (idx > -1) gameState.customers.splice(idx, 1);

            const objIdx = interactableObjects.indexOf(customer);
            if (objIdx > -1) interactableObjects.splice(objIdx, 1);
        }
    };

    animate();
}

function addOrder(customer) {
    const order = {
        customer: customer,
        items: customer.userData.order,
        startTime: Date.now()
    };

    gameState.activeOrders.push(order);
    updateOrdersDisplay();
}

function updateOrdersDisplay() {
    const panel = document.getElementById('orders-panel');
    panel.innerHTML = '';

    gameState.activeOrders.forEach((order, index) => {
        const card = document.createElement('div');
        card.className = 'order-card';

        const customerType = order.customer.userData.customerType;
        const typeData = CUSTOMER_TYPES[customerType];

        card.innerHTML = `
            <div class="order-customer">${typeData.name} #${index + 1}</div>
            <div class="order-items">${order.items.map(i => i.icon + ' ' + i.name).join(', ')}</div>
            <div class="order-timer">Waiting...</div>
        `;

        panel.appendChild(card);
    });
}

function updateCustomers(delta) {
    // Make order bubbles face camera
    gameState.customers.forEach(customer => {
        const bubble = customer.getObjectByName('orderBubble');
        if (bubble && bubble.visible) {
            bubble.lookAt(camera.position);
        }
    });
}

// ============================================
// MINI-GAMES
// ============================================
function startMiniGame(type, callback) {
    miniGameState.active = true;
    miniGameState.type = type;
    miniGameState.callback = callback;
    miniGameState.quality = 0;
    miniGameState.markerPos = 0;
    miniGameState.markerDirection = 1;
    miniGameState.tapProgress = 0;
    miniGameState.startTime = Date.now();

    const overlay = document.getElementById('minigame-overlay');
    overlay.style.display = 'flex';

    if (type === 'timing') {
        document.getElementById('minigame-title').textContent = '☕ Pulling Espresso';
        document.getElementById('minigame-instruction').textContent = 'Press E in the green zone!';
        document.getElementById('timing-bar').style.display = 'block';
        document.getElementById('tap-meter').style.display = 'none';
        document.getElementById('tap-count').style.display = 'none';

        miniGameState.targetStart = 30 + Math.random() * 20;
        miniGameState.targetEnd = miniGameState.targetStart + 20;

        const target = document.getElementById('timing-target');
        target.style.left = miniGameState.targetStart + '%';
        target.style.width = (miniGameState.targetEnd - miniGameState.targetStart) + '%';
    } else if (type === 'tap') {
        document.getElementById('minigame-title').textContent = '🥛 Frothing Milk';
        document.getElementById('minigame-instruction').textContent = 'Tap E rapidly!';
        document.getElementById('timing-bar').style.display = 'none';
        document.getElementById('tap-meter').style.display = 'block';
        document.getElementById('tap-count').style.display = 'block';
        document.getElementById('tap-fill').style.width = '0%';
    }

    document.exitPointerLock();
}

function handleMiniGameInput() {
    if (!miniGameState.active) return;

    if (miniGameState.type === 'timing') {
        const pos = miniGameState.markerPos;
        const inPerfect = pos >= miniGameState.targetStart + 5 && pos <= miniGameState.targetEnd - 5;
        const inGood = pos >= miniGameState.targetStart && pos <= miniGameState.targetEnd;

        if (inPerfect) {
            miniGameState.quality = 100;
        } else if (inGood) {
            miniGameState.quality = 70;
        } else if (pos >= miniGameState.targetStart - 10 && pos <= miniGameState.targetEnd + 10) {
            miniGameState.quality = 40;
        } else {
            miniGameState.quality = 10;
        }
        endMiniGame();
    } else if (miniGameState.type === 'tap') {
        miniGameState.tapProgress++;
        document.getElementById('tap-fill').style.width = (miniGameState.tapProgress / miniGameState.tapRequired * 100) + '%';

        if (miniGameState.tapProgress >= miniGameState.tapRequired) {
            const elapsed = Date.now() - miniGameState.startTime;
            miniGameState.quality = elapsed < 2000 ? 100 : elapsed < 3500 ? 70 : 40;
            endMiniGame();
        }
    }
}

function updateMiniGame() {
    if (!miniGameState.active) return;

    if (miniGameState.type === 'timing') {
        miniGameState.markerPos += miniGameState.markerDirection * 1.2;
        if (miniGameState.markerPos >= 100 || miniGameState.markerPos <= 0) {
            miniGameState.markerDirection *= -1;
        }
        document.getElementById('timing-marker').style.left = miniGameState.markerPos + '%';
    } else if (miniGameState.type === 'tap') {
        if (miniGameState.tapProgress > 0) {
            miniGameState.tapProgress -= 0.03;
            document.getElementById('tap-fill').style.width =
                Math.max(0, miniGameState.tapProgress / miniGameState.tapRequired * 100) + '%';
        }
    }
}

function endMiniGame() {
    document.getElementById('minigame-overlay').style.display = 'none';

    if (miniGameState.callback) {
        miniGameState.callback();
    }

    miniGameState.active = false;

    // Re-lock pointer
    setTimeout(() => {
        if (renderer && renderer.domElement && gameState.isPlaying) {
            renderer.domElement.requestPointerLock();
        }
    }, 100);
}

function cancelMiniGame() {
    document.getElementById('minigame-overlay').style.display = 'none';
    miniGameState.active = false;
    miniGameState.quality = 0;

    showNotification('Cancelled', '');

    setTimeout(() => {
        if (renderer && renderer.domElement && gameState.isPlaying) {
            renderer.domElement.requestPointerLock();
        }
    }, 100);
}

// ============================================
// UI FUNCTIONS
// ============================================
function updateHUD() {
    document.getElementById('money-display').textContent = '$' + gameState.money;
    document.getElementById('rating-display').textContent = gameState.rating.toFixed(1);
    document.getElementById('served-display').textContent = gameState.customersServed;
}

function showNotification(title, text) {
    const notif = document.getElementById('notification');
    notif.querySelector('.notification-title').textContent = title;
    notif.querySelector('.notification-text').textContent = text;
    notif.classList.add('show');

    setTimeout(() => {
        notif.classList.remove('show');
    }, 2000);
}

function showQualityPopup(quality) {
    const popup = document.getElementById('quality-popup');
    popup.className = '';

    if (quality >= 90) {
        popup.textContent = 'PERFECT! ✨';
        popup.classList.add('quality-perfect');
    } else if (quality >= 60) {
        popup.textContent = 'GOOD!';
        popup.classList.add('quality-good');
    } else if (quality >= 30) {
        popup.textContent = 'OK...';
        popup.classList.add('quality-ok');
    } else {
        popup.textContent = 'BAD';
        popup.classList.add('quality-bad');
    }

    popup.classList.add('show');

    setTimeout(() => {
        popup.classList.remove('show');
    }, 1500);
}

function toggleRecipePanel() {
    const panel = document.getElementById('recipe-panel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

function openShop() {
    document.exitPointerLock();
    document.getElementById('shop-modal').style.display = 'flex';
    renderShop();
}

function closeShop() {
    document.getElementById('shop-modal').style.display = 'none';
}

function renderShop() {
    const grid = document.getElementById('shop-grid');
    grid.innerHTML = '';

    UPGRADES.forEach(upgrade => {
        const owned = gameState.ownedUpgrades && gameState.ownedUpgrades.includes(upgrade.id);

        const item = document.createElement('div');
        item.className = 'shop-item' + (owned ? ' owned' : '');
        item.innerHTML = `
            <div class="shop-item-icon">${upgrade.icon}</div>
            <div class="shop-item-name">${upgrade.name}</div>
            <div class="shop-item-desc">${upgrade.desc}</div>
            <div class="shop-item-price">${owned ? 'Owned' : '$' + upgrade.price}</div>
        `;

        if (!owned) {
            item.onclick = () => buyUpgrade(upgrade);
        }

        grid.appendChild(item);
    });
}

function buyUpgrade(upgrade) {
    if (gameState.money < upgrade.price) {
        showNotification('Not enough money!', '');
        return;
    }

    gameState.money -= upgrade.price;
    if (!gameState.ownedUpgrades) gameState.ownedUpgrades = [];
    gameState.ownedUpgrades.push(upgrade.id);

    if (upgrade.effect) upgrade.effect();

    updateHUD();
    renderShop();
    showNotification('Purchased!', upgrade.name);
}

// ============================================
// AUDIO
// ============================================
function setupAudio() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = audioContext.createGain();
        masterGain.connect(audioContext.destination);
        masterGain.gain.value = 0.3;
    } catch (e) {
        console.log('Audio not supported');
    }
}

function playSound(type) {
    if (!audioContext) return;

    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.type = 'sine';

    switch (type) {
        case 'pickup':
            osc.frequency.value = 600;
            gain.gain.value = 0.05;
            break;
        case 'drop':
            osc.frequency.value = 300;
            gain.gain.value = 0.05;
            break;
        case 'pour':
            osc.frequency.value = 250;
            osc.type = 'sawtooth';
            gain.gain.value = 0.03;
            break;
        case 'coin':
            osc.frequency.value = 880;
            gain.gain.value = 0.08;
            break;
        case 'error':
            osc.frequency.value = 200;
            gain.gain.value = 0.1;
            break;
        case 'trash':
            osc.frequency.value = 150;
            gain.gain.value = 0.06;
            break;
    }

    osc.connect(gain);
    gain.connect(masterGain);
    gain.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.2);
    osc.start();
    osc.stop(audioContext.currentTime + 0.2);
}

// ============================================
// START
// ============================================
window.onload = init;
