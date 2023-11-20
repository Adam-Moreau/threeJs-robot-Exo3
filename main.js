import * as THREE from "three";

import Stats from "three/addons/libs/stats.module.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

let container, stats, clock, gui, mixer, actions, activeAction, previousAction;
let camera,
  scene,
  renderer,
  model = null,
  face;
let modelOrbit = null;
let isIdle = true;
let isWalking = false;
let isJumping = false;
let isShooting = false;
let velocity = 0;
let angularVelocity = 0;
let verticalVelocity = 0;

const states = ["Idle", "Walking", "Jump", "ThumbsUp"];

init();
animate();

function init() {
  container = document.createElement("div");
  document.body.appendChild(container);

  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.25,
    100
  );
  camera.position.set(-5, 3, 10);
  camera.lookAt(0, 2, 0);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe0e0e0);
  scene.fog = new THREE.Fog(0xe0e0e0, 20, 100);

  clock = new THREE.Clock();

  // lights

  const ambientLight = new THREE.AmbientLight(0xffffff);
  scene.add(ambientLight);
  const dirLight = new THREE.DirectionalLight(0xffffff, 3);
  dirLight.position.set(0, 20, 10);
  scene.add(dirLight);

  // ground

  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2000, 2000),
    new THREE.MeshPhongMaterial({ color: 0xcbcbcb, depthWrite: false })
  );
  mesh.rotation.x = -Math.PI / 2;
  scene.add(mesh);

  const grid = new THREE.GridHelper(200, 40, 0x000000, 0x000000);
  grid.material.opacity = 0.2;
  grid.material.transparent = true;
  scene.add(grid);

  // model
  modelOrbit = new THREE.Group();
  scene.add(modelOrbit);

  const loader = new GLTFLoader();
  loader.load(
    "./RobotExpressive.glb",
    function (gltf) {
      model = gltf.scene;
      modelOrbit.add(model);
      mixer = new THREE.AnimationMixer(model);
      actions = {};
      for (let i = 0; i < gltf.animations.length; i++) {
        const clip = gltf.animations[i];
        const action = mixer.clipAction(clip);
        if (states.indexOf(clip.name) != -1) {
          actions[clip.name] = action;
        }
        if (states.indexOf(clip.name) == 2) {
          action.clampWhenFinished = true;
          action.loop = THREE.LoopOnce;
        }
      }
      console.log(actions);
      activeAction = actions["Idle"];
      activeAction.play();
    },
    undefined,
    function (e) {
      console.error(e);
    }
  );

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  window.addEventListener("resize", onWindowResize);

  // stats
  stats = new Stats();
  container.appendChild(stats.dom);
}

function fadeToAction(name, duration) {
  previousAction = activeAction;
  activeAction = actions[name];
  if (previousAction !== activeAction) {
    previousAction.fadeOut(duration);
  }
  activeAction
    .reset()
    .setEffectiveTimeScale(1)
    .setEffectiveWeight(1)
    .fadeIn(duration)
    .play();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

//

function animate() {
  velocity *= 0.95;
  angularVelocity *= 0.95;
  verticalVelocity -= 0.1;

  //console.log(velocity);
  if (
    isIdle == false &&
    Math.abs(velocity) < 0.01 &&
    verticalVelocity < 0.01 &&
    Math.abs(angularVelocity) < 0.001
  ) {
    isWalking = false;
    isJumping = false;
    fadeToAction("Idle", 0.5);
    isIdle = true;
    velocity = 0;
  }

  const dt = clock.getDelta();

  if (model != null) {
    modelOrbit.position.y += verticalVelocity;
    if (modelOrbit.position.y < 0) {
      modelOrbit.position.y = 0;
      verticalVelocity = 0;
    }

    model.rotation.y += angularVelocity;
    let direction = new THREE.Vector3(0, 0, 1);
    direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), model.rotation.y);
    direction.multiplyScalar(velocity * dt);
    modelOrbit.position.add(direction);

    camera.position.set(modelOrbit.position.x, 8, modelOrbit.position.z);
    direction = new THREE.Vector3(0, 0, 1);
    direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), model.rotation.y);
    direction.multiplyScalar(-20);
    camera.position.add(direction);
    camera.lookAt(
      modelOrbit.position.x,
      modelOrbit.position.y + 3,
      modelOrbit.position.z
    );
    camera.updateProjectionMatrix();
  }

  if (mixer) mixer.update(dt);
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
  stats.update();
}

document.addEventListener("keydown", onDocumentKeyDown, false);
function onDocumentKeyDown(event) {
  console.log(event.key);
  if (event.key == "ArrowUp") {
    if (!isWalking) {
      isIdle = false;
      isJumping = false;
      fadeToAction("Walking", 0.1);
    }
    velocity += 1;
    isWalking = true;
  }
  if (event.key == "ArrowDown") {
    if (!isWalking) {
      isIdle = false;
      isJumping = false;
      fadeToAction("Walking", 0.1);
    }
    velocity -= 1;
    isWalking = true;
  }
  if (event.key == "ArrowLeft") {
    if (!isWalking) {
      isIdle = false;
      isJumping = false;
      fadeToAction("Walking", 0.5);
    }
    angularVelocity += 0.0051;
    isWalking = true;
  }
  if (event.key == "ArrowRight") {
    if (!isWalking) {
      isIdle = false;
      isJumping = false;
      fadeToAction("Walking", 0.5);
    }
    angularVelocity -= 0.0051;
    isWalking = true;
  }
  if (event.key == " ") {
    if (!isJumping) {
      isIdle = false;
      isWalking = false;
      isShooting = false;
      fadeToAction("Jump", 0.1);
    }
    verticalVelocity += 2;
    isJumping = true;
  }
  if (event.key == "s") {
    if (!isShooting) {
      isIdle = false;
      isWalking = false;
      fadeToAction("ThumbsUp");
    }
  }
}
