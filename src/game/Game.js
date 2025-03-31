import * as THREE from 'three';
import { Scene } from '../scenes/Scene';
import { Castle } from '../components/Castle';
import { Crosshair } from '../ui/Crosshair';
import { Goblin } from '../npc/humanoid/Goblin';
import { Player } from '../player/Player';
import { PlayerSettings } from '../systems/settings/PlayerSettings';
import { GameMenu } from '../ui/GameMenu';
import { AudioSystem } from '../systems/audio/AudioSystem';
import { TreeManager } from '../entities/environment/TreeManager';

export class Game {
    constructor() {
        // Initialize all properties first
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
        this.goblin = null;
        this.settings = null;
        this.gameMenu = null;
        this.isInitialized = false;
        this.isPaused = false;
        this.treeManager = null;
        
        // Initialize audio system
        this.audioSystem = new AudioSystem();
        
        // Bind methods to preserve 'this' context
        this.onKeyDown = this.onKeyDown.bind(this);
        this.pauseGame = this.pauseGame.bind(this);
        this.resumeGame = this.resumeGame.bind(this);
        this.onWindowResize = this.onWindowResize.bind(this);
        this.update = this.update.bind(this);
        this.render = this.render.bind(this);
        this.onUserInteraction = this.onUserInteraction.bind(this);

        // Add user interaction listener
        window.addEventListener('click', this.onUserInteraction);
        window.addEventListener('keydown', this.onUserInteraction);
        window.addEventListener('touchstart', this.onUserInteraction);
    }

    onUserInteraction() {
        // Remove event listeners after first interaction
        window.removeEventListener('click', this.onUserInteraction);
        window.removeEventListener('keydown', this.onUserInteraction);
        window.removeEventListener('touchstart', this.onUserInteraction);
        
        // Notify audio system
        this.audioSystem.onUserInteraction();
    }

    async init() {
        try {
            console.log('=== Game: Starting Initialization ===');
            
            // Set game instance on window object
            window.game = this;
            console.log('Game: Set game instance on window object');
            
            // Initialize settings first
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
            this.renderer.setClearColor(0x87CEEB, 1);
            this.renderer.sortObjects = true;
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
            this.player.setGame(this); // Set game instance on player
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

            // Initialize goblin
            console.log('Game: Creating goblin');
            this.goblin = new Goblin({
                position: new THREE.Vector3(5, 0, 5), // Position the goblin 5 units away from center
                rotation: new THREE.Euler(0, Math.PI, 0, 'YXZ') // Face the center with explicit rotation order
            });
            
            // Wait for goblin to be fully initialized
            console.log('Game: Initializing goblin...');
            const goblinMesh = await this.goblin.init(this.scene.getScene());
            if (goblinMesh) {
                console.log('Game: Goblin mesh added to scene successfully');
                // Add goblin to npcs array
                this.npcs.push(this.goblin);
                console.log('Game: Goblin added to npcs array');
                
                // Ensure the goblin is visible
                goblinMesh.visible = true;
                goblinMesh.position.set(5, 0, 5);
                goblinMesh.rotation.set(0, Math.PI, 0);
                goblinMesh.scale.set(0.5, 0.5, 0.5);
                
                // Add a spotlight to illuminate the goblin
                const goblinLight = new THREE.SpotLight(0xffffff, 1);
                goblinLight.position.set(5, 10, 5);
                goblinLight.angle = Math.PI / 4;
                goblinLight.penumbra = 0.1;
                goblinLight.decay = 2;
                goblinLight.distance = 20;
                this.scene.getScene().add(goblinLight);
            } else {
                console.error('Game: Failed to initialize goblin mesh');
            }

            // Initialize tree manager
            console.log('Game: Creating tree manager');
            this.treeManager = new TreeManager(this.scene.getScene(), {
                minDistanceFromCenter: 40,
                maxDistanceFromCenter: 100,
                minTrees: 20,
                maxTrees: 40,
                minDistanceBetweenTrees: 5
            });
            await this.treeManager.init();
            
            // Initialize game menu
            this.gameMenu = new GameMenu(this);
            this.gameMenu.init(this.settings);

            // Add event listeners
            window.addEventListener('resize', this.onWindowResize);
            window.addEventListener('keydown', this.onKeyDown);

            // Start background music
            this.audioSystem.playMusic('/music/main_theme.mp3', 0.5, true);

            // Mark as initialized
            this.isInitialized = true;
            
            console.log('=== Game: Initialization Complete ===');
        } catch (error) {
            console.error('Error during game initialization:', error);
            throw error;
        }
    }

    update(currentTime) {
        if (!this.isInitialized || this.isPaused) return;

        // Calculate delta time
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        // Update game state
        this.castle.update();
        this.player.update(deltaTime);
        
        // Update goblin
        if (this.goblin) {
            this.goblin.update(deltaTime);
        }

        // Update trees
        if (this.treeManager) {
            this.treeManager.update(deltaTime);
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
        this.audioSystem.stopMusic();
        
        // Release pointer lock when paused
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
    }
    
    resumeGame() {
        this.isPaused = false;
        this.gameMenu.hide();
        this.audioSystem.playMusic('/music/main_theme.mp3', 0.5, true);
        
        // Acquire pointer lock when resumed
        if (!document.pointerLockElement) {
            document.body.requestPointerLock();
        }
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
} 