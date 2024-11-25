import '/src/styles/style.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { GUI } from 'dat.gui';


const canvas = document.querySelector('canvas.webgl');

// Scene
const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 10000);
camera.position.set(100, 88, 145);
scene.add(camera);

// Renderer
const renderer = new THREE.WebGLRenderer({ canvas: canvas });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.5;

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 1);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// GLTF Loader - Building Model
let building;
const loader = new GLTFLoader();
loader.load(
  'http://localhost:3000/assets/building.glb',
  (gltf) => {
    building = gltf.scene;
    building.scale.set(1, 1, 1);
    scene.add(building);
    building.rotation.y = -Math.PI / 1.25;

    swoopCameraToBuilding();
  },
  (xhr) => {
    console.log((xhr.loaded / xhr.total * 100) + '% loaded');
  },
  (error) => {
    console.error('An error occurred while loading the model:', error);
  }
);

// Water
const waterGeometry = new THREE.PlaneGeometry(10000, 10000);
const textureLoader = new THREE.TextureLoader();
const waterNormals = textureLoader.load('https://threejs.org/examples/textures/waternormals.jpg', (texture) => {
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
});

const water = new Water(waterGeometry, {
  textureWidth: 512,
  textureHeight: 512,
  waterNormals: waterNormals,
  sunDirection: new THREE.Vector3(),
  sunColor: 0xffffff,
  waterColor: 0x001e0f,
  distortionScale: 1.7,
  size: 12
});

water.rotation.x = -Math.PI / 2;
water.position.y = -1;
water.material.uniforms['size'].value = 12.0;
scene.add(water);

// Skybox
const sky = new Sky();
sky.scale.setScalar(10000);
scene.add(sky);

const skyUniforms = sky.material.uniforms;
skyUniforms['turbidity'].value = 10;
skyUniforms['rayleigh'].value = 2;
skyUniforms['mieCoefficient'].value = 0.005;
skyUniforms['mieDirectionalG'].value = 0.8;

const parameters = {
  elevation: 2,
  azimuth: 90,
};

const sun = new THREE.Vector3();

function updateSun() {
  const phi = THREE.MathUtils.degToRad(90 - parameters.elevation);
  const theta = THREE.MathUtils.degToRad(parameters.azimuth);

  sun.setFromSphericalCoords(1, phi, theta);

  sky.material.uniforms['sunPosition'].value.copy(sun);
  water.material.uniforms['sunDirection'].value.copy(sun).normalize();
}

updateSun();

// Orbit Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enableZoom = true;
controls.maxPolarAngle = Math.PI / 2;

// Disable Orbit Controls when scrolling
canvas.addEventListener('wheel', (event) => {
  controls.enabled = false;
  swoopCameraToBuilding();
});

// Camera Swoop Animation
let swoopCompleted = false;
function swoopCameraToBuilding() {
  if (building) {
    const targetPosition = new THREE.Vector3(-5, 2, 8);
    const startPosition = camera.position.clone();
    const animationDuration = 2.0;

    const startTime = performance.now();

    function animateSwoop() {
      const elapsedTime = (performance.now() - startTime) / 2000;
      const t = Math.min(elapsedTime / animationDuration, 1);
      const easeInOutQuad = (t) => {
        if (t < 0.5) {
          return 2 * t * t;
        } else {
          return 1 - Math.pow(1 - (t - 0.5) * 2, 3) * 0.5;
        }
      };

      camera.position.lerpVectors(startPosition, targetPosition, easeInOutQuad(t));
      camera.lookAt(building.position);

      folderCamera.__controllers.forEach((controller) => controller.updateDisplay());

      if (t < 1) {
        requestAnimationFrame(animateSwoop);
      } else {
        controls.enabled = false;
        swoopCompleted = true;
        scrollCameraPosition = { ...targetPosition }; // Update the scrollCameraPosition to the final swoop position
      }
    }

    animateSwoop();
  }
}

// Scroll Listener for Logging and Animation
let scrollStarted = false;
let scrollEndPosition = window.innerHeight * 2; // 100vh

// Camera target position during scroll animation
const startCameraPosition = { x: -5, y: 2, z: 8 };
const endCameraPosition = { x: -2.5, y: 1, z: 8 };
let scrollCameraPosition = { ...startCameraPosition };

window.addEventListener('scroll', () => {
  if (swoopCompleted && !scrollStarted) {
    scrollStarted = true;
  }

  if (scrollStarted) {
    const scrollPercentage = Math.min(
      (window.scrollY / scrollEndPosition) * 100,
      100
    );
    console.log(`Scroll progress: ${scrollPercentage.toFixed(2)}%`);

    // Linear interpolation for camera position based on scroll progress
    scrollCameraPosition.x = startCameraPosition.x + (endCameraPosition.x - startCameraPosition.x) * (scrollPercentage / 100);
    scrollCameraPosition.y = startCameraPosition.y + (endCameraPosition.y - startCameraPosition.y) * (scrollPercentage / 100);
    scrollCameraPosition.z = startCameraPosition.z + (endCameraPosition.z - startCameraPosition.z) * (scrollPercentage / 100);

    // Update camera position during scroll
    camera.position.set(scrollCameraPosition.x, scrollCameraPosition.y, scrollCameraPosition.z);
    camera.lookAt(building.position);

    // Update GUI values in real time
    folderCamera.__controllers.forEach((controller) => controller.updateDisplay());

    if (scrollPercentage >= 100) {
      scrollStarted = false; // Reset after reaching 100%
    }
  }
});

// GUI
const gui = new GUI();

const folderSky = gui.addFolder('Sky');
folderSky.add(parameters, 'elevation', 0, 90, 0.1).onChange(updateSun);
folderSky.add(parameters, 'azimuth', -180, 180, 0.1).onChange(updateSun);
folderSky.open();

const folderWater = gui.addFolder('Water');
folderWater.add(water.material.uniforms['distortionScale'], 'value', 0, 8, 0.1).name('distortionScale');
folderWater.add(water.material.uniforms['size'], 'value', 0.1, 10, 0.1).name('size');
folderWater.open();

const folderCamera = gui.addFolder('Camera');
folderCamera.add(camera.position, 'x', -100, 100, 0.1).name('Camera X');
folderCamera.add(camera.position, 'y', -100, 100, 0.1).name('Camera Y');
folderCamera.add(camera.position, 'z', -100, 100, 0.1).name('Camera Z');
folderCamera.open();

const folderLight = gui.addFolder('Light');

// Create a directional light
const directionalLight2 = new THREE.DirectionalLight(0xffffff, 1);
directionalLight2.position.set(5, 7, 5); // Set initial position of the light
scene.add(directionalLight2);

// Add light position controls
folderLight.add(directionalLight2.position, 'x', -50, 50, 0.1).name('Light X');
folderLight.add(directionalLight2.position, 'y', 0, 50, 0.1).name('Light Y'); // Adjust to keep the light above the ground
folderLight.add(directionalLight2.position, 'z', -50, 50, 0.1).name('Light Z');

// Add light intensity control
folderLight.add(directionalLight2, 'intensity', 0, 2, 0.1).name('Intensity');
folderLight.open();

// Animation Loop
function animate() {
  requestAnimationFrame(animate);

  // Update water time uniform to create wobble
  const elapsedTime = performance.now() * 0.001;
  water.material.uniforms['time'].value = elapsedTime;

  controls.update();
  renderer.render(scene, camera);
}

animate();

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
