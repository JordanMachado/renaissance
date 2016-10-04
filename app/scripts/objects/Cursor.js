import THREE from 'three';
import hexRgb from 'hex-rgb';
const glslify = require('glslify');
require('../utils/FBOUtils')(THREE);

const simulationVertex = glslify('../shaders/cursor/simulation.vert');
const simulationFragment = glslify('../shaders/cursor/simulation.frag');

const particleVertex = glslify('../shaders/cursor/particle.vert');
const particleFragment = glslify('../shaders/cursor/particle.frag');


export default class Cursor extends THREE.Object3D {
  constructor({ renderer, camera , size }) {
    super();
    this.camera = camera;
    this.group = new THREE.Group();
    this.tick = 0;
    this.volumeScale = 40;
    this.wordPos = new THREE.Vector3();
    this.lifeDiviser = 0.001;
    const loader = new THREE.TextureLoader();
    loader.load('assets/particle.png', (texture) => {
      this.uniforms.texture.value = texture;
    });
    this.renderer = renderer;
    const width = size;
    const height = size;
    this.data = new Float32Array(width * height * 4);
    this.infos = new Float32Array(width * height * 4);

    this.geom = new THREE.BufferGeometry();
    const vertices = new Float32Array(width * height * 3);
    const uvs = new Float32Array(width * height * 2);
    const pointSize = new Float32Array(width * height);
    const colors = new Float32Array(width * height * 3);

    let count = 0;
    const max = 500;
    const min = -500;


    this.colors = [
      '07f46b',
      '0042ff',
      'ff0012',
      'fff600',
    ];

    for (let i = 0; i < this.data.length * 4; i += 4) {
      // x speedX
      // y speedY
      // z angle
      // a life
      this.infos[i] = 0.05 * Math.random();
      this.infos[i + 1] = 0.05 * Math.random();
      this.infos[i + 2] = Math.random() * Math.PI * 2;
      this.infos[i + 3] = Math.random();


      this.data[i] = 0;
      this.data[i + 1] = 0;
      this.data[i + 2] = 0;
      this.data[i + 3] = Math.random();

      pointSize[count] = 10 * Math.random();

      uvs[count * 2 + 0] = (count % width) / width;
      uvs[count * 2 + 1] = Math.floor(count / width) / height;

      const color = hexRgb(this.colors[Math.floor(this.colors.length * Math.random())]);
      colors[count * 3 + 0] = color[0] / 255;
      colors[count * 3 + 1] = color[1] / 255;
      colors[count * 3 + 2] = color[2] / 255;
      // console.log(color);

      vertices[count * 3 + 0] = 0;
      vertices[count * 3 + 1] = 0;
      // vertices[count * 3 + 2] = 0;
      vertices[count * 3 + 2] = 0;

      count ++;
    }


    this.geom.addAttribute('position', new THREE.BufferAttribute(vertices, 3));
    this.geom.addAttribute('pointSize', new THREE.BufferAttribute(pointSize, 1));
    this.geom.addAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    this.geom.addAttribute('color', new THREE.BufferAttribute(colors, 3));

    const textureData = new THREE.DataTexture(
      this.data,
      width,
      height,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    textureData.minFilter = THREE.NearestFilter;
    textureData.magFilter = THREE.NearestFilter;
    textureData.needsUpdate = true;
    const infosData = new THREE.DataTexture(
      this.infos,
      width,
      height,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    infosData.minFilter = THREE.NearestFilter;
    infosData.magFilter = THREE.NearestFilter;
    infosData.needsUpdate = true;

    this.rtTextureIn = new THREE.WebGLRenderTarget(width, height, {
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      stencilBuffer: false,
      flipY: true,
    });
    this.rtTextureOut = this.rtTextureIn.clone();

    this.simulationShader = new THREE.ShaderMaterial({
      uniforms: {
        tInfos: {
          type: 't',
          value: infosData,
        },
        lifeDiviser: {
          type: 'f',
          value: this.lifeDiviser,
        },
        tick: {
          type: 'f',
          value: this.tick,
        },
        tPositions: {
          type: 't',
          value: textureData,
        },
        mouse: {
          type: 'v3',
          value: new THREE.Vector3(),
        },
        volume: {
          type: 'f',
          value: 1,
        },
      },
      vertexShader: simulationVertex,
      fragmentShader: simulationFragment,
    });
    this.fboParticles = new THREE.FBOUtils(width, this.renderer, this.simulationShader);
    this.fboParticles.renderToTexture(this.rtTextureIn, this.rtTextureOut);
    this.fboParticles.in = this.rtTextureIn;
    this.fboParticles.out = this.rtTextureOut;

    this.uniforms = {
      tMap: {
        type: 't',
        value: this.rtTextureIn,
      },
      texture: {
        type: 't',
        value: new THREE.Texture(),
      },
      ratio: {
        type: 'f',
        value: this.ratio,
      },
      opacity: {
        type: 'f',
        value: 1,
      },
      volume: {
        type: 'f',
        value: 1,
      },
      volumeScale: {
        type: 'f',
        value: this.volumeScale,
      },
    };

    this.mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: particleVertex,
      fragmentShader: particleFragment,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
      transparent: true,
    });

    this.system = new THREE.Points(this.geom, this.mat);
    this.system.renderOrder = 99999;
    // this.system.rotation.y = Math.PI / 180 * -90;
    this.group = new THREE.Group();
    // this.system.position.z = this.camera.position.z - 300;


    this.add(this.system);

  }

  addGUI(folder) {
    this.folder = folder.addFolder('Cursor - fbo');

    const confFolder = this.folder.addFolder('conf');
    confFolder.add(this, 'lifeDiviser').min(0.0001).max(0.002).onChange(() => {
      this.simulationShader.uniforms.lifeDiviser.value = this.lifeDiviser;
    });
    confFolder.add(this, 'volumeScale').min(1).max(20).onChange(() => {
      this.uniforms.volumeScale.value = this.volumeScale;
    });

    confFolder.open();

    const positionFolder = this.folder.addFolder('position');
    positionFolder.add(this.group.position, 'x').min(-50).max(50);
    positionFolder.add(this.group.position, 'y').min(-50).max(50);
    positionFolder.add(this.group.position, 'z').min(-50).max(50);
    positionFolder.open();

    this.folder.open();


  }
  move(x, y) {
    TweenMax.to(this.wordPos, 0.3, {
      x,
      y,
    });
    // this.wordPos.x = x - this.camera.position.x;
    // this.wordPos.y = y - this.camera.position.y;
    // this.wordPos.x = x;
    // this.wordPos.y = y;
    this.simulationShader.uniforms.mouse.value = this.wordPos;
  }
  update(volume) {
    this.uniforms.volume.value = volume;
    this.simulationShader.uniforms.volume.value = volume;
    this.tick += 0.1;

    // this.wordPos.x = 10 + Math.cos(this.tick);
    // this.wordPos.y = 10 + Math.sin(this.tick);
    // this.wordPos.x = x;
    // this.wordPos.y = y;
    this.simulationShader.uniforms.mouse.value = this.wordPos;
    this.simulationShader.uniforms.tick.value = this.tick * 0.001;
    // this.system.position.y = this.camera.position.y;
    // this.system.position.x = this.camera.position.x;
    // pingpong
    const tmp = this.fboParticles.in;
    this.fboParticles.in = this.fboParticles.out;
    this.fboParticles.out = tmp;

    this.simulationShader.uniforms.tPositions.value = this.fboParticles.in;

    this.fboParticles.simulate(this.fboParticles.out);
    this.uniforms.tMap.value = this.fboParticles.out;

  }
}
