import * as THREE from 'three';
import { Scene } from '../scenes/Scene';
import { WaveManager } from './WaveManager';
import { Castle } from '../components/Castle';
import { PlayerCamera } from '../systems/camera/PlayerCamera';
import { Crosshair } from '../ui/Crosshair';
import { HumanDummy } from '../npc/humanoid/HumanDummy';
import { WoodenSword } from '../items/weapons/WoodenSword';

export class Game {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.waveManager = null;
        this.castle = null;
        this.playerCamera = null;
        this.crosshair = null;
        this.trainingDummy = null;
        this.isInitialized = false;
    }

    init() {
        // Initialize Three.js scene
        this.scene = new Scene();
        this.scene.init();

        // Initialize camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );

        // Initialize renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        document.getElementById('game-container').appendChild(this.renderer.domElement);

        // Initialize game components
        this.castle = new Castle();
        this.castle.init();
        this.scene.add(this.castle.getMesh());

        // Initialize player camera
        this.playerCamera = new PlayerCamera();
        this.playerCamera.init(this.camera);

        // Initialize crosshair
        this.crosshair = new Crosshair({
            size: 20,
            thickness: 2,
            gap: 6,
            color: '#ffffff',
            borderColor: '#000000',
            borderThickness: 1,
            dot: {
                show: true,
                size: 2
            }
        });
        this.crosshair.init();

        // Add extra light for better visibility
        const spotLight = new THREE.SpotLight(0xffffff, 1);
        spotLight.position.set(10, 15, 10);
        spotLight.castShadow = true;
        this.scene.add(spotLight);

        // Initialize training dummy
        this.trainingDummy = new HumanDummy();
        this.trainingDummy.init();
        // Position the dummy 10 units away from the castle
        this.trainingDummy.setPosition(10, 0, 10);
        
        // Add the dummy to the scene
        if (this.trainingDummy.mesh) {
            this.trainingDummy.mesh.castShadow = true;
            this.trainingDummy.mesh.receiveShadow = true;
            this.scene.add(this.trainingDummy.mesh);
        }

        // Initialize wave manager
        this.waveManager = new WaveManager();
        this.waveManager.init();

        // Add event listeners
        window.addEventListener('resize', this.onWindowResize.bind(this));

        this.isInitialized = true;
    }

    update() {
        if (!this.isInitialized) return;

        const deltaTime = 0.016; // ~60fps

        // Update game state
        this.waveManager.update();
        this.castle.update();
        this.playerCamera.update();
        
        // Update training dummy
        if (this.trainingDummy) {
            this.trainingDummy.update(deltaTime);
        }
    }

    render() {
        if (!this.isInitialized) return;

        // Render the scene
        this.renderer.render(this.scene.getScene(), this.camera);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
} 