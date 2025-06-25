let scene, camera, renderer, controls;
let player, playerBox;
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
let objects = [];
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;
let useThirdPerson = false;
let joystick;

init();
animate();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // sky blue

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    renderer = new THREE.WebGLRenderer({antialias:true});
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // player
    const geometry = new THREE.BoxGeometry(0.5, 1.5, 0.5);
    const material = new THREE.MeshBasicMaterial({color:0x00ff00});
    player = new THREE.Mesh(geometry, material);
    player.position.y = 2;
    scene.add(player);

    // floor chunks
    generateTerrain();

    // add light edges to cubes
    const light = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(light);

    // Controls
    controls = new THREE.PointerLockControls(camera, renderer.domElement);
    document.addEventListener('click', () => {
        if(!document.pointerLockElement) controls.lock();
    });

    const onKeyDown = (event) => {
        switch(event.key.toLowerCase()) {
            case 'z': moveForward = true; break;
            case 'q': moveLeft = true; break;
            case 's': moveBackward = true; break;
            case 'd': moveRight = true; break;
            case ' ': if (canJump) velocity.y += 5; canJump = false; break;
            case 'a': useThirdPerson = !useThirdPerson; break;
        }
    };

    const onKeyUp = (event) => {
        switch(event.key.toLowerCase()) {
            case 'z': moveForward = false; break;
            case 'q': moveLeft = false; break;
            case 's': moveBackward = false; break;
            case 'd': moveRight = false; break;
        }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    // Android mode
    const modeBtn = document.getElementById('modeButton');
    const jumpBtn = document.getElementById('jumpButton');
    const joyZone = document.getElementById('joystickZone');
    modeBtn.addEventListener('click', () => {
        const show = jumpBtn.style.display === 'none';
        jumpBtn.style.display = show ? 'block' : 'none';
        joyZone.style.display = show ? 'block' : 'none';
        if(show && !joystick){
            joystick = new JoyStick('joystickZone', {}, (stickData) => {
                moveForward = stickData.y < -0.2;
                moveBackward = stickData.y > 0.2;
                moveLeft = stickData.x < -0.2;
                moveRight = stickData.x > 0.2;
            });
        }
    });
    jumpBtn.addEventListener('touchstart', () => {
        if (canJump) velocity.y += 5; canJump = false;
    });

    window.addEventListener('resize', onWindowResize);
}

function generateTerrain() {
    const size = 20;
    for(let x=-size;x<size;x++){
        for(let z=-size;z<size;z++){
            const height = Math.floor(Math.random()*3);
            for(let y=0;y<=height;y++){
                const cubeGeo = new THREE.BoxGeometry(1,1,1);
                const edges = new THREE.EdgesGeometry(cubeGeo);
                const cubeMat = new THREE.MeshBasicMaterial({color:0x808080});
                const cube = new THREE.Mesh(cubeGeo, cubeMat);
                const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({color:0xd3d3d3}));
                cube.position.set(x, y-0.5, z);
                line.position.copy(cube.position);
                scene.add(cube);
                scene.add(line);
                objects.push(cube);
            }
        }
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);

    const time = performance.now();
    const delta = 0.01;

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize();

    if (moveForward || moveBackward) velocity.z -= direction.z * 10.0 * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * 10.0 * delta;

    velocity.y -= 9.8 * delta; // gravity

    player.position.addScaledVector(velocity, delta);

    // simple collision detection
    const origin = player.position.clone();
    origin.y -= 1; // bottom of player
    const raycaster = new THREE.Raycaster(origin, new THREE.Vector3(0,-1,0), 0, 0.1);
    const intersects = raycaster.intersectObjects(objects);
    if(intersects.length > 0){
        velocity.y = Math.max(0, velocity.y);
        canJump = true;
        player.position.y = Math.ceil(player.position.y);
    }

    // apply friction
    velocity.x -= velocity.x * 5.0 * delta;
    velocity.z -= velocity.z * 5.0 * delta;

    if(useThirdPerson){
        camera.position.copy(player.position).add(new THREE.Vector3(0,2,5));
        camera.lookAt(player.position);
    }else{
        controls.getObject().position.copy(player.position);
    }

    renderer.render(scene, camera);
}
