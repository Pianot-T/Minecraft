// Basic Minecraft-like demo
let scene, camera, renderer;
let player, cameraHolder;
let isThirdPerson = false;
let velocity = {x:0,y:0,z:0};
let onGround = false;
const gravity = 9.81;
const speed = 5;
const blockSize = 1;
const chunkSize = 16;
let renderDistance = 2;
const chunks = {};
const blocks = {}; // map "x,y,z" -> mesh
const keys = {};
let mobileMode=false;
const joystick={active:false,x:0,y:0,id:null};

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

  const mobileToggle=document.getElementById('mobileToggle');
  const jumpBtn=document.getElementById('jumpBtn');
  const joystickEl=document.getElementById('joystick');
  const stick=document.querySelector('#joystick .stick');

  mobileToggle.addEventListener('click',()=>{
    mobileMode=!mobileMode;
    jumpBtn.classList.toggle('hidden',!mobileMode);
    joystickEl.classList.toggle('hidden',!mobileMode);
  });

  jumpBtn.addEventListener('pointerdown',()=>{keys[' ']=true;});
  jumpBtn.addEventListener('pointerup',()=>{keys[' ']=false;});
  jumpBtn.addEventListener('pointercancel',()=>{keys[' ']=false;});

  function updateJoy(e){
    const rect=joystickEl.getBoundingClientRect();
    const cx=rect.width/2,cy=rect.height/2;
    const dx=e.clientX-rect.left-cx;
    const dy=e.clientY-rect.top-cy;
    const max=rect.width/2;
    joystick.x=Math.max(-1,Math.min(1,dx/max));
    joystick.y=Math.max(-1,Math.min(1,dy/max));
    const len=Math.hypot(joystick.x,joystick.y);
    if(len>1){joystick.x/=len;joystick.y/=len;}
    stick.style.left=(joystick.x*max*0.5+cx-20)+"px";
    stick.style.top=(joystick.y*max*0.5+cy-20)+"px";
  }
  function endJoy(){
    joystick.active=false;joystick.x=0;joystick.y=0;
    stick.style.left='30px';stick.style.top='30px';
  }
  joystickEl.addEventListener('pointerdown',e=>{joystick.active=true;joystick.id=e.pointerId;joystickEl.setPointerCapture(e.pointerId);updateJoy(e);});
  joystickEl.addEventListener('pointermove',e=>{if(joystick.active&&e.pointerId===joystick.id)updateJoy(e);});
  joystickEl.addEventListener('pointerup',e=>{if(e.pointerId===joystick.id){joystickEl.releasePointerCapture(e.pointerId);endJoy();}});
  joystickEl.addEventListener('pointercancel',endJoy);
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
        const key=`${wx},${y},${wz}`;
        block.position.set(wx*blockSize,y*blockSize,wz*blockSize);
        block.userData.key=key;
        group.add(block);
        blocks[key]=block;
      }
    }
  }
  scene.add(group);
  chunks[`${cx},${cz}`]=group;
}

function removeChunk(cx,cz){
  const key=`${cx},${cz}`;
  const group=chunks[key];
  if(!group) return;
  group.children.forEach(b=>{delete blocks[b.userData.key];});
  scene.remove(group);
  delete chunks[key];
}

function generateWorld(){
  updateChunks();
  const light = new THREE.DirectionalLight(0xffffff,1);
  light.position.set(10,20,10);
  scene.add(light);
  const amb = new THREE.AmbientLight(0xcccccc);
  scene.add(amb);
}

function updateChunks(){
  const pcx=Math.floor(player.position.x/(blockSize*chunkSize));
  const pcz=Math.floor(player.position.z/(blockSize*chunkSize));
  for(let cx=pcx-renderDistance;cx<=pcx+renderDistance;cx++){
    for(let cz=pcz-renderDistance;cz<=pcz+renderDistance;cz++){
      generateChunk(cx,cz);
    }
  }
  for(let key in chunks){
    const [cx,cz]=key.split(',').map(Number);
    if(Math.abs(cx-pcx)>renderDistance||Math.abs(cz-pcz)>renderDistance){
      removeChunk(cx,cz);
    }
  }
}

function updatePlayer(dt){
  let forward=0,right=0;
  if(keys['z']) forward+=1;
  if(keys['s']) forward-=1;
  if(keys['d']) right+=1;
  if(keys['q']) right-=1;
  if(joystick.active){forward+=joystick.y;right+=joystick.x;}
  velocity.x += (-Math.sin(yaw)*forward + Math.cos(yaw)*right)*speed*dt;
  velocity.z += (-Math.cos(yaw)*forward - Math.sin(yaw)*right)*speed*dt;
  velocity.y -= gravity*dt;
  onGround=false;

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
         onGround=true;
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
  if(player.position.y<0){player.position.y=0;velocity.y=0;onGround=true;}

  if(keys[' '] && onGround){
    velocity.y=5;
  }
}

function animate(){
  requestAnimationFrame(animate);
  const dt = 0.016; // simplified fixed step
  updatePlayer(dt);
  updateChunks();
  updateCamera();
  renderer.render(scene,camera);
}

function toggleView(){
  isThirdPerson=!isThirdPerson;
  updateCamera();
}

document.addEventListener('keydown',e=>{if(e.key.toLowerCase()==='a')toggleView();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')showMenu(true);});

document.getElementById('saveBtn').addEventListener('click',()=>{
  renderDistance=parseInt(document.getElementById('renderRange').value,10);
  updateChunks();
  showMenu(false);
});
function showMenu(show){
  const menu=document.getElementById('menu');
  menu.classList.toggle('hidden',!show);
  document.getElementById('crosshair').style.display=show?'none':'block';
  if(show){
     document.getElementById('renderRange').value=renderDistance;
     document.exitPointerLock();
  }else{
     renderer.domElement.requestPointerLock();
  }
}

init();
animate();
