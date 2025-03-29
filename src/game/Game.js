import * as THREE from 'three';
import { Scene } from '../scenes/Scene';
import { Castle } from '../components/Castle';
import { Crosshair } from '../ui/Crosshair';
import { HumanDummy } from '../npc/humanoid/HumanDummy';
import { Player } from '../player/Player';
import { PlayerSettings } from '../systems/settings/PlayerSettings';
import { GameMenu } from '../ui/GameMenu';

export class Game {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.player = null;
        this.npcs = [];
        this.items = [];
        this.controls = null;
        this.clock = new THREE.Clock();
        this.lastTime = 0;
        this.deltaTime = 0;
        this.castle = null;
        this.crosshair = null;
        this.trainingDummy = null;
        this.settings = null;
        this.gameMenu = null;
        this.isInitialized = false;
        this.isPaused = false;
    }

    init() {
        console.log('=== Game: Starting Initialization ===');
        // Initialize settings
        this.settings = new PlayerSettings();
        
        // Initialize Three.js scene
        console.log('Game: Creating scene');
        this.scene = new Scene();
        this.scene.init();

        // Initialize camera
        console.log('Game: Creating camera');
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            2000
        );

        // Initialize renderer
        console.log('Game: Creating renderer');
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.setClearColor(0x87CEEB, 1); // Set clear color to sky blue
        this.renderer.sortObjects = true; // Ensure proper sorting for transparent objects
        document.getElementById('game-container').appendChild(this.renderer.domElement);

        // Initialize game components
        console.log('Game: Creating castle');
        this.castle = new Castle();
        this.castle.init();
        this.scene.add(this.castle.getMesh());

        // Initialize player
        console.log('Game: Creating player');
        this.player = new Player();
        console.log('Game: Player created:', this.player);
        this.player.mesh.castShadow = true;
        this.player.mesh.receiveShadow = true;
        this.scene.add(this.player.mesh);
        console.log('Game: Player added to scene');

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
        // Position the dummy in the middle of the scene
        this.trainingDummy.setPosition(0, 0, 0);
        
        // Add the dummy to the scene
        if (this.trainingDummy.mesh) {
            this.trainingDummy.mesh.castShadow = true;
            this.trainingDummy.mesh.receiveShadow = true;
            this.scene.add(this.trainingDummy.mesh);
        }

        // Initialize game menu
        this.gameMenu = new GameMenu(this);
        this.gameMenu.init(this.settings);

        // Add event listeners
        window.addEventListener('resize', this.onWindowResize.bind(this));
        
        // Add escape key listener for pause menu
        window.addEventListener('keydown', this.onKeyDown.bind(this));

        this.isInitialized = true;
        console.log('=== Game: Initialization Complete ===');
    }
    
    onKeyDown(event) {
        if (event.code === 'Escape') {
            if (this.gameMenu.isVisible) {
                // If we're in a submenu, go back to main menu
                if (this.gameMenu.currentMenuSection !== 'main') {
                    this.gameMenu.loadMainMenu();
                } else {
                    // If we're in main menu, close it completely
                    this.resumeGame();
                }
            } else {
                this.pauseGame();
            }
        }
    }
    
    pauseGame() {
        this.isPaused = true;
        this.gameMenu.show();
        
        // Release pointer lock when paused
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
    }
    
    resumeGame() {
        this.isPaused = false;
        this.gameMenu.hide();
        
        // Acquire pointer lock when resumed
        if (!document.pointerLockElement) {
            document.body.requestPointerLock();
        }
    }

    update() {
        if (!this.isInitialized || this.isPaused) return;

        const deltaTime = 0.016; // ~60fps

        // Update game state
     
        this.castle.update();
        this.player.update(deltaTime);
        
        // Update training dummy
        if (this.trainingDummy) {
            this.trainingDummy.update(deltaTime);
        }
        
    }

    render() {
        if (!this.isInitialized) return;
        
    
        // Render the scene
        this.renderer.render(this.scene.getScene(), this.player.getCamera());
        
        // Update menu if needed
        if (this.gameMenu) {
            this.gameMenu.update();
        }
       
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
} 