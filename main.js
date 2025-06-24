// Basic Minecraft-like demo
let scene, camera, renderer;
let player, cameraHolder;
let isThirdPerson = false;
let velocity = {x:0,y:0,z:0};
const gravity = 9.81;
const speed = 5;
const blockSize = 1;
const chunkSize = 16;
let renderDistance = 2;
const chunks = {};
const blocks = {}; // map "x,y,z" -> mesh
const keys = {};

function key(e){keys[e.key.toLowerCase()] = e.type==='keydown';}

function init(){
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb); // blue sky
  camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
  renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  cameraHolder = new THREE.Object3D();
  scene.add(cameraHolder);

  const geometry = new THREE.BoxGeometry(1,2,1);
  const material = new THREE.MeshBasicMaterial({color:0x00ff00});
  player = new THREE.Mesh(geometry, material);
  player.position.y = 3;
  scene.add(player);
  cameraHolder.add(camera);
  camera.position.set(0,1,0);
  updateCamera();

  noise.seed(Math.random());
  generateWorld();

  document.addEventListener('keydown', key);
  document.addEventListener('keyup', key);
  document.body.addEventListener('click', ()=>{
    if(!document.pointerLockElement){renderer.domElement.requestPointerLock();}
  });
  document.addEventListener('mousemove', onMouseMove);
  window.addEventListener('resize', onWindowResize);
}

let yaw=0,pitch=0;
function onMouseMove(e){
  if(!document.pointerLockElement) return;
  yaw -= e.movementX*0.002;
  pitch -= e.movementY*0.002;
  pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, pitch));
  updateCamera();
}

function updateCamera(){
  cameraHolder.position.copy(player.position);
  cameraHolder.rotation.set(0,yaw,0);
  if(isThirdPerson){
     camera.position.set(0,1,3);
     camera.lookAt(0,1,0);
  }else{
     camera.position.set(0,1,0);
     camera.rotation.set(pitch,0,0);
  }
}

function onWindowResize(){
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function createBlock(){
  const geom = new THREE.BoxGeometry(blockSize,blockSize,blockSize);
  const mat = new THREE.MeshLambertMaterial({color:0x888888});
  const mesh = new THREE.Mesh(geom, mat);
  const edges = new THREE.EdgesGeometry(geom);
  const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({color:0x444444}));
  mesh.add(line);
  return mesh;
}

function generateChunk(cx,cz){
  if(chunks[`${cx},${cz}`]) return; // already generated
  const group = new THREE.Group();
  for(let x=0;x<chunkSize;x++){
    for(let z=0;z<chunkSize;z++){
      const wx=cx*chunkSize+x;
      const wz=cz*chunkSize+z;
      const n = noise.perlin2(wx/10,wz/10);
      const h = Math.floor(n*3)+1; // at least 1 block high
      for(let y=0;y<h;y++){
        const block=createBlock();
        block.position.set(wx*blockSize,y*blockSize,wz*blockSize);
        group.add(block);
        blocks[`${wx},${y},${wz}`]=block;
      }
    }
  }
  scene.add(group);
  chunks[`${cx},${cz}`]=group;
}

function generateWorld(){
  for(let cx=-renderDistance;cx<=renderDistance;cx++){
    for(let cz=-renderDistance;cz<=renderDistance;cz++){
      generateChunk(cx,cz);
    }
  }
  const light = new THREE.DirectionalLight(0xffffff,1);
  light.position.set(10,20,10);
  scene.add(light);
  const amb = new THREE.AmbientLight(0xcccccc);
  scene.add(amb);
}

function updatePlayer(dt){
  if(keys['z']){velocity.x -= Math.sin(yaw)*speed*dt; velocity.z -= Math.cos(yaw)*speed*dt;}
  if(keys['s']){velocity.x += Math.sin(yaw)*speed*dt; velocity.z += Math.cos(yaw)*speed*dt;}
  if(keys['q']){velocity.x -= Math.cos(yaw)*speed*dt; velocity.z += Math.sin(yaw)*speed*dt;}
  if(keys['d']){velocity.x += Math.cos(yaw)*speed*dt; velocity.z -= Math.sin(yaw)*speed*dt;}
  velocity.y -= gravity*dt;

  // propose next position
  let next = player.position.clone();
  next.x += velocity.x;
  next.y += velocity.y;
  next.z += velocity.z;

  // simple collision detection with blocks
  const bbox = new THREE.Box3().setFromObject(player);
  bbox.translate(new THREE.Vector3(velocity.x, velocity.y, velocity.z));
  const pos = new THREE.Vector3();
  for(let key in blocks){
    const b = blocks[key];
    const bb = new THREE.Box3().setFromObject(b);
    if(bbox.intersectsBox(bb)){
      // stop vertical movement if hitting from above or below
      if(player.position.y >= bb.max.y-0.01 && velocity.y<=0){
         next.y = bb.max.y;
         velocity.y=0;
      }else if(player.position.y <= bb.min.y+1 && velocity.y>0){
         next.y = bb.min.y-2;
         velocity.y=0;
      }else{
         // horizontal collision
         velocity.x=0;velocity.z=0;
         next.x=player.position.x;
         next.z=player.position.z;
      }
    }
  }
  player.position.copy(next);
  velocity.x*=0.9;velocity.z*=0.9; // damping

  // if on ground stop vertical velocity
  if(player.position.y<0){player.position.y=0;velocity.y=0;}
}

function animate(){
  requestAnimationFrame(animate);
  const dt = 0.016; // simplified fixed step
  updatePlayer(dt);
  updateCamera();
  renderer.render(scene,camera);
}

function toggleView(){
  isThirdPerson=!isThirdPerson;
  updateCamera();
}

document.addEventListener('keydown',e=>{if(e.key.toLowerCase()==='a')toggleView();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')showMenu(true);});

document.getElementById('saveBtn').addEventListener('click',()=>{showMenu(false);});
function showMenu(show){
  const menu=document.getElementById('menu');
  menu.classList.toggle('hidden',!show);
  if(show){
     document.exitPointerLock();
  }else{
     renderer.domElement.requestPointerLock();
  }
}

init();
animate();
