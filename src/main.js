import * as THREE from 'three';
import { Game } from './game/Game';
import './styles/index.css';

class GameApp {
    constructor() {
        console.log('=== GameApp: Initializing ===');
        this.game = new Game();
        this.init();
    }

    async init() {
        console.log('=== GameApp: Starting initialization ===');
        try {
            // Initialize the game
            console.log('GameApp: Initializing game...');
            await this.game.init();
            console.log('GameApp: Game initialized successfully');
            
            // Start the game loop
            console.log('GameApp: Starting game loop');
            this.startGameLoop();
        } catch (error) {
            console.error('GameApp: Error during initialization:', error);
            console.error('Error stack:', error.stack);
        }
    }

    startGameLoop() {
        if (!this.game.isInitialized) {
            console.error('GameApp: Cannot start game loop - game not initialized');
            return;
        }

        try {
            // Update game state
            this.game.update(performance.now());
            
            // Render the game
            this.game.render();
            
            // Request next frame
            requestAnimationFrame(() => this.startGameLoop());
        } catch (error) {
            console.error('GameApp: Error in game loop:', error);
            console.error('Error stack:', error.stack);
        }
    }
}

// Start the game when the window loads
window.addEventListener('load', () => {
    console.log('=== Window Loaded: Starting Game ===');
    new GameApp();
}); 