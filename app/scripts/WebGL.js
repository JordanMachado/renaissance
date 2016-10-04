import THREE from 'three';
window.THREE = THREE;
const OrbitControls = require('three-orbit-controls')(THREE);
import WAGNER from '@superguigui/wagner';

const createPlayer = require('web-audio-player');
const createAnalyser = require('web-audio-analyser');



// Passes
const FXAAPass = require('@superguigui/wagner/src/passes/fxaa/FXAAPASS');
const VignettePass = require('@superguigui/wagner/src/passes/vignette/VignettePass');
const NoisePass = require('@superguigui/wagner/src/passes/noise/noise');
const BloomPass = require('@superguigui/wagner/src/passes/bloom/MultiPassBloomPass');
const DisplacementPass = require('./postprocessing/displacement-pass/Displacement');
const InvertPass = require('@superguigui/wagner/src/passes/invert/InvertPass');
const SymPass = require('@superguigui/wagner/src/passes/symetric/symetric');


// Objects
import Cursor from './objects/Cursor';

export default class WebGL {
  constructor(params) {
    this.params = {
      name: params.name || 'WebGL',
      device: params.device || 'desktop',
      postProcessing: params.postProcessing || false,
      keyboard: params.keyboard || false,
      mouse: params.mouse || false,
      touch: params.touch || false,
      controls: params.controls || false,
    };

    this.mouse = new THREE.Vector2();
    this.originalMouse = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(50, params.size.width / params.size.height, 1, 1000);
    this.camera.position.z = 100;

    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setSize(params.size.width, params.size.height);
    this.renderer.setClearColor(0x000000);


    this.composer = null;
    this.initPostprocessing();
    this.initLights();
    this.initObjects();
    this.createAudioTexture();
    if (this.params.controls) {
      this.controls = new OrbitControls(this.camera);
    }

    if (window.DEBUG || window.DEVMODE) this.initGUI();

    window.webGL = this;

  }
  initPostprocessing() {
    this.composer = new WAGNER.Composer(this.renderer);
    this.composer.setSize(window.innerWidth, window.innerHeight);
    window.composer = this.composer;

    // Add pass and automatic gui
    this.passes = [];
    this.fxaaPass = new FXAAPass();
    this.passes.push(this.fxaaPass);
    this.noisePass = new NoisePass();
    this.noisePass.params.amount = 0.05;
    this.noisePass.params.speed = 0.4;
    this.passes.push(this.noisePass);
    this.vignettePass = new VignettePass({});
    this.passes.push(this.vignettePass);
    this.bloomPass = new BloomPass({});
    this.bloomPass.params.amount = 2;
    this.bloomPass.params.blendMode = 5;
    this.passes.push(this.bloomPass);

    this.invertPass = new InvertPass({});
    // this.passes.push(this.invertPass);
    this.sym = new SymPass({});
    this.passes.push(this.sym);

    this.displacementPass = new DisplacementPass();
    // this.displacementPass.params.amount = 0.0099;
    this.displacementPass.params.amount = 0.05;
    this.passes.push(this.displacementPass);
    const loader = new THREE.TextureLoader();

    loader.load('assets/displace.jpg', (texture) => {
      const textureDisplacement = texture;
      textureDisplacement.minFilter = textureDisplacement.magFilter = THREE.RepeatWrapping;
      textureDisplacement.wrapS = textureDisplacement.wrapT = THREE.RepeatWrapping;
      textureDisplacement.repeat.set(100, 100);
      this.displacementPass.params.uDisplacement = textureDisplacement;
    });

    for (let i = 0; i < this.passes.length; i++) {
      const pass = this.passes[i];
      pass.enabled = true;
    }


  }
  createAudioTexture() {
    const size = 12;
    this.data = new Float32Array(size * size * 3);
    this.volume = 1;

    for (let i = 0, l = this.data.length; i < l; i += 3) {
      this.data[i] = 0.0;
      this.data[i + 1] = 0.0;
      this.data[i + 2] = 0.0;
    }

    this.audio = createPlayer('assets/sound.mp3', {
      buffer: this.params.device !== 'desktop',
    });
    this.analyser = createAnalyser(this.audio.node, this.audio.context, {
      stereo: false,
    });

    this.textureData = new THREE.DataTexture(
      this.data,
      size,
      size,
      THREE.RGBFormat,
      THREE.FloatType
    );
    this.textureData.minFilter = this.textureData.magFilter = THREE.NearestFilter;
  }
  initLights() {

  }
  initObjects() {


    this.planeRay = new THREE.Mesh(
      new THREE.PlaneBufferGeometry(1000, 1000),
      new THREE.MeshNormalMaterial({ side: THREE.DoubleSide }));
    this.planeRay.material.visible = false;
    this.scene.add(this.planeRay);

    this.cursor = new Cursor({
      renderer: this.renderer,
      camera: this.camera,
      size: this.params.desktop === 'desktop' ? 72 : 48
      ,
    });
    this.cursor.position.set(0, 0, 0);
    this.scene.add(this.cursor);
  }
  initGUI() {
    this.folder = window.gui.addFolder(this.params.name);
    this.folder.add(this.params, 'postProcessing');
    this.folder.add(this.params, 'keyboard');
    this.folder.add(this.params, 'mouse');
    this.folder.add(this.params, 'touch');
    this.folder.add(this.params, 'controls');


    // init postprocessing GUI
    this.postProcessingFolder = this.folder.addFolder('PostProcessing');
    for (let i = 0; i < this.passes.length; i++) {
      const pass = this.passes[i];
      pass.enabled = true;
      let params = false;
      for (const key of Object.keys(pass.params)) {
        if (typeof pass.params[key] === 'number' || typeof pass.params[key] === 'boolean') {
          params = true;
        }
      }
      const folder = this.postProcessingFolder.addFolder(pass.constructor.name);
      folder.add(pass, 'enabled');
      if (params) {
        for (const key of Object.keys(pass.params)) {
          if (typeof pass.params[key] === 'number' || typeof pass.params[key] === 'boolean') {
            folder.add(pass.params, key);
          }
        }
      }
      folder.open();
    }
    this.postProcessingFolder.open();

    // init scene.child GUI
    for (let i = 0; i < this.scene.children.length; i++) {
      const child = this.scene.children[i];
      if (typeof child.addGUI === 'function') {
        child.addGUI(this.folder);
      }
    }
    this.folder.open();
  }
  render() {
    if (this.params.postProcessing) {
      this.composer.reset();
      this.composer.render(this.scene, this.camera);
      // Passes
      for (let i = 0; i < this.passes.length; i++) {
        if (this.passes[i].enabled) {
          this.composer.pass(this.passes[i]);
        }
      }

      this.composer.toScreen();

    } else {
      this.renderer.render(this.scene, this.camera);
    }

    const freq = this.analyser.frequencies();
    // console.log(freq);
    let _acuteAverage = 0;
    let _volume = 0;
    for (let i = 0; i < freq.length; i++) {
      this.data[i] = freq[i] / 256.0;
      _volume += freq[i] / 256.0;
      if (i > 174 - 5) {
        _acuteAverage += freq[i] / 256.0;
      }
    }

    this.volume = _volume / freq.length;
    this.cursor.update(this.volume);

    this.textureData.needsUpdate = true;

    this.camera.position.z = 100 + (this.volume * 20);

    // this.plane.update();
    // this.planeAudio.update(this.rtTexture, this.textureData, this.volume);
  }
  rayCast() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.planeRay, true);
    if (intersects[0].object.id === this.planeRay.id) {
      this.cursor.move(intersects[0].point.x, intersects[0].point.y);
    }
  }
  // Events
  resize(width, height) {
    if (this.composer) {
      this.composer.setSize(width, height);
    }

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  }
  keyPress() {
    if (!this.params.keyboard) return;
    console.log('keyPress');
  }
  keyDown() {
    if (!this.params.keyboard) return;
    console.log('keyDown');
  }
  keyUp() {
    if (!this.params.keyboard) return;
    console.log('keyUp');
  }
  click(x, y, time) {
    if (!this.params.mouse) return;
    this.originalMouse.x = x;
    this.originalMouse.y = y;
    this.mouse.x = (x / window.innerWidth - 0.5) * 2;
    this.mouse.y = (y / window.innerHeight - 0.5) * 2;
  }
  mouseMove(x, y, ime) {
    if (!this.params.mouse) return;
    this.originalMouse.x = x;
    this.originalMouse.y = y;
    this.mouse.x = (x / window.innerWidth - 0.5) * 2;
    this.mouse.y = - (y / window.innerHeight - 0.5) * 2;
    this.rayCast();
  }
  touchStart(touches) {
    if (!this.params.touch) return;
    this.mouse.x = (touches[0].clientX / window.innerWidth - 0.5) * 2;
    this.mouse.y = - (touches[0].clientY / window.innerHeight - 0.5) * 2;
    this.rayCast();
  }
  touchEnd() {
    if (!this.params.touch) return;
  }
  touchMove(touches) {
    if (!this.params.touch) return;
    this.mouse.x = (touches[0].clientX / window.innerWidth - 0.5) * 2;
    this.mouse.y = - (touches[0].clientY / window.innerHeight - 0.5) * 2;
    this.rayCast();

  }

}
