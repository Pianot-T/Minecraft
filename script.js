// basic THREE.js setup
let scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // sky blue

let camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

let renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

let controls = new THREE.PointerLockControls(camera, document.body);

// player data
let player = {
    mesh: null,
    velocity: new THREE.Vector3(),
    onGround: false,
};

// toggle first/third person
let thirdPerson = false;

function createPlayer() {
    let geometry = new THREE.BoxGeometry(0.5, 1.8, 0.5);
    let material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    let mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = 3;
    scene.add(mesh);
    player.mesh = mesh;
    camera.position.set(0, 1.6, 0);
    controls.getObject().position.copy(mesh.position);
}

// map of generated cubes
const cubes = new Map();
const cubeSize = 1;
const halfCube = cubeSize / 2;

const cubeGeo = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
const cubeMat = new THREE.MeshPhongMaterial({ color: 0x808080, flatShading: true });

function key(x, y, z) {
    return `${x}|${y}|${z}`;
}

function createCube(x, y, z) {
    let k = key(x, y, z);
    if (cubes.has(k)) return;
    let cube = new THREE.Mesh(cubeGeo, cubeMat);
    cube.position.set(x + halfCube, y + halfCube, z + halfCube);
    scene.add(cube);
    cubes.set(k, cube);
}

// simple terrain generation
function generateChunk(px, pz) {
    let size = 10; // half size
    let cx = Math.floor(px / cubeSize);
    let cz = Math.floor(pz / cubeSize);
    for (let x = cx - size; x <= cx + size; x++) {
        for (let z = cz - size; z <= cz + size; z++) {
            let height = Math.floor(Math.abs((Math.sin(x * 0.5) + Math.cos(z * 0.5)) * 2)) + 1;
            for (let y = 0; y < height; y++) {
                createCube(x * cubeSize, y * cubeSize, z * cubeSize);
            }
        }
    }
}

// basic lighting
let light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(10, 20, 10);
scene.add(light);
let amb = new THREE.AmbientLight(0xcccccc);
scene.add(amb);

createPlayer();

const keys = {};
document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    if (e.key === 'a' || e.key === 'A') {
        thirdPerson = !thirdPerson;
    }
});
document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

// pointer lock to look around
window.addEventListener('click', () => {
    controls.lock();
});

// Android controls
const androidToggle = document.getElementById('androidToggle');
const jumpBtn = document.getElementById('jumpButton');
const joystick = document.getElementById('joystick');
let androidMode = false;
let joystickActive = false;
let joyStart = { x: 0, y: 0 };
let joyDir = { x: 0, y: 0 };

androidToggle.addEventListener('click', () => {
    androidMode = !androidMode;
    if (androidMode) {
        jumpBtn.classList.remove('hidden');
        joystick.classList.remove('hidden');
    } else {
        jumpBtn.classList.add('hidden');
        joystick.classList.add('hidden');
    }
});

jumpBtn.addEventListener('pointerdown', () => {
    if (player.onGround) {
        player.velocity.y = 5;
        player.onGround = false;
    }
});

joystick.addEventListener('pointerdown', (e) => {
    joystickActive = true;
    joyStart.x = e.clientX;
    joyStart.y = e.clientY;
});
joystick.addEventListener('pointermove', (e) => {
    if (!joystickActive) return;
    joyDir.x = e.clientX - joyStart.x;
    joyDir.y = e.clientY - joyStart.y;
});
joystick.addEventListener('pointerup', () => {
    joystickActive = false;
    joyDir.x = 0;
    joyDir.y = 0;
});

let prevTime = performance.now();
function animate() {
    requestAnimationFrame(animate);
    let time = performance.now();
    let delta = (time - prevTime) / 1000;
    prevTime = time;

    // movement
    const speed = 5;
    let dir = new THREE.Vector3();
    if (keys['z']) dir.z -= 1;
    if (keys['s']) dir.z += 1;
    if (keys['q']) dir.x -= 1;
    if (keys['d']) dir.x += 1;

    if (androidMode && joystickActive) {
        dir.x += joyDir.x / 50;
        dir.z += joyDir.y / 50;
    }

    dir.normalize();

    if (controls.isLocked) {
        let forward = new THREE.Vector3();
        controls.getDirection(forward);
        forward.y = 0;
        forward.normalize();
        let right = new THREE.Vector3();
        right.crossVectors(forward, new THREE.Vector3(0, 1, 0));

        player.velocity.x += (right.x * dir.x + forward.x * dir.z) * speed * delta;
        player.velocity.z += (right.z * dir.x + forward.z * dir.z) * speed * delta;
    }

    // apply gravity
    player.velocity.y -= 9.8 * delta;

    // move player
    player.mesh.position.addScaledVector(player.velocity, delta);
    controls.getObject().position.copy(player.mesh.position);

    // collision check
    player.onGround = false;
    const playerBox = new THREE.Box3().setFromObject(player.mesh);
    for (let cube of cubes.values()) {
        const cubeBox = new THREE.Box3().setFromObject(cube);
        if (playerBox.intersectsBox(cubeBox)) {
            // simple resolution: set on top of cube
            if (player.mesh.position.y > cube.position.y) {
                player.mesh.position.y = cube.position.y + cubeSize;
                player.velocity.y = 0;
                player.onGround = true;
            } else if (player.mesh.position.y < cube.position.y) {
                player.mesh.position.y = cube.position.y - cubeSize;
                player.velocity.y = 0;
            }
        }
    }

    // friction
    if (player.onGround) {
        player.velocity.x *= 0.8;
        player.velocity.z *= 0.8;
    }

    // generate terrain around player
    generateChunk(player.mesh.position.x, player.mesh.position.z);

    // camera position
    if (thirdPerson) {
        camera.position.set(player.mesh.position.x, player.mesh.position.y + 2, player.mesh.position.z + 5);
        camera.lookAt(player.mesh.position);
    } else {
        controls.getObject().position.copy(player.mesh.position);
        camera.position.copy(controls.getObject().position);
    }

    renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
