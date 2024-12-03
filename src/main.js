import '/src/styles/style.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { GUI } from 'dat.gui';

// Canvas
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
const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);
directionalLight.intensity = 1.5;

// GLTF Loader - Building Model
let building;
const loader = new GLTFLoader();
const loaderBar = document.querySelector('.loader-logo-bar'); // Assuming the bar is inside the loader-logo-bar element
const loaderColumns = document.querySelectorAll('.loader-column');
const loaderLogo = document.querySelector('.loader-logo');
const loaderWrap = document.querySelector('.loader');
let loaderProgress = 0; // Store the loading progress percentage

renderer.toneMappingExposure = 0.7; 

// Define the staggered delay times for each column (in seconds)
const staggerTimes = [0.4, 0.2, 0.6, 0.8, 0.5, 0.3, 0.6, 0.4, 0.7]; 

loader.load(
  'http://localhost:3000/assets/building.glb',
  (gltf) => {
    building = gltf.scene;
    building.scale.set(1, 1, 1);
    scene.add(building);
    building.rotation.y = -Math.PI / 1.25;
     
    setTimeout(() => {
      loaderLogo.classList.add('hide-logo');
    }, 400);

    loaderColumns.forEach((column, index) => {
      const delay = staggerTimes[index] * 1000; 
      setTimeout(() => {
        column.style.height = '0';
      }, delay);
    });

    setTimeout(() => {
      swoopCameraToBuilding();
    }, 1000);

    setTimeout(() => {
      loaderWrap.style.height = '0px'
    }, 2000);

    // New functionality: Reveal heading letters with delay
    setTimeout(() => {
      const headingLetters = document.querySelectorAll('.heading-letter');
      headingLetters.forEach((letter, index) => {
        setTimeout(() => {
          letter.classList.add('reveal');
        }, index * 100); // 125ms delay between each letter
      });

      // After all letters are revealed, reveal the subtitle wrap
      setTimeout(() => {
        const headingSubtitleWrap = document.querySelector('.heading-subtitle-wrap');
        headingSubtitleWrap.classList.add('reveal');
      }, headingLetters.length * 50); // Delay for all letters to reveal first
    }, 3500); // 2.3 seconds delay after the model loads
  },
  (xhr) => {
    loaderProgress = (xhr.loaded / xhr.total) * 100;  
    loaderBar.style.width = loaderProgress + '%';
    console.log(loaderProgress + '% loaded');
  },
  (error) => {
    console.error('An error occurred while loading the model:', error);
  }
);




// Water
const waterGeometry = new THREE.PlaneGeometry(4000, 4000);
const textureLoader = new THREE.TextureLoader();
const waterNormals = textureLoader.load('https://threejs.org/examples/textures/waternormals.jpg', (texture) => {
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
});

const water = new Water(waterGeometry, {
  textureWidth: 256,
  textureHeight: 256,
  waterNormals: waterNormals,
  sunDirection: new THREE.Vector3(),
  sunColor: 0xffffff,
  waterColor: 0x001e0f,
  distortionScale: 1.7,
  size: 30
});

water.rotation.x = -Math.PI / 2;
water.position.y = -1;
water.material.uniforms['size'].value = 60.0;

scene.add(water);

// Skybox
const sky = new Sky();
sky.scale.setScalar(1000);
scene.add(sky);

const skyUniforms = sky.material.uniforms;

skyUniforms['turbidity'].value = 2;  // Moderate turbidity
skyUniforms['rayleigh'].value = 1.5;  // Slightly reduced Rayleigh scattering (less intense blue)
skyUniforms['mieCoefficient'].value = 0.005;  // Reduce to allow more clarity
skyUniforms['mieDirectionalG'].value = 0.7;  // Less hazy sun

water.material.uniforms['sunColor'].value = new THREE.Color(0xffffff);  // Maintain white sunlight
water.material.uniforms['waterColor'].value = new THREE.Color(0x001e0f);  // Dark water color, but not too black


const parameters = {
  elevation: 4.5,
  azimuth: 100,
};

const sun = new THREE.Vector3();

function updateSun() {
  const phi = THREE.MathUtils.degToRad(90 - parameters.elevation);
  const theta = THREE.MathUtils.degToRad(parameters.azimuth);
  sun.setFromSphericalCoords(1, phi, theta);
  sky.material.uniforms['sunPosition'].value.copy(sun);
  water.material.uniforms['sunDirection'].value.copy(sun).normalize();
  water.material.uniforms['sunColor'].value = new THREE.Color(0xffffff);  // White sun color
  water.material.uniforms['sunDirection'].value.copy(sun).normalize(); // Ensure it's pointing to the sun

}

updateSun();


// Orbit Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enableZoom = true;
controls.maxPolarAngle = Math.PI / 2;

// Camera Swoop Animation
let swoopCompleted = false;
function swoopCameraToBuilding() {
  if (building) {
    const targetPosition = new THREE.Vector3(-4, 2, 12);
    const startPosition = camera.position.clone();
    const animationDuration = 1.5;
    const startTime = performance.now();

    function animateSwoop() {
      const elapsedTime = (performance.now() - startTime) / 2250;
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
const startCameraPosition = { x: -4, y: 2, z: 12 };
const endCameraPosition = { x: -6, y: 1, z: 6 };
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
    scrollCameraPosition.x = startCameraPosition.x + (endCameraPosition.x - startCameraPosition.x) * (scrollPercentage.toFixed(0) / 100);
    scrollCameraPosition.y = startCameraPosition.y + (endCameraPosition.y - startCameraPosition.y) * (scrollPercentage.toFixed(0) / 100);
    scrollCameraPosition.z = startCameraPosition.z + (endCameraPosition.z - startCameraPosition.z) * (scrollPercentage.toFixed(0) / 100);

    // Update camera position during scroll
    camera.position.set(scrollCameraPosition.x, scrollCameraPosition.y, scrollCameraPosition.z);

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
  const elapsedTime = performance.now() * 0.0004;
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
