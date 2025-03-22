import * as THREE from 'three';
import { Game } from './game/Game';
import { UIManager } from './ui/UIManager';

class GameApplication {
    constructor() {
        this.game = new Game();
        this.uiManager = new UIManager();
        this.init();
    }

    init() {
        // Initialize the game
        this.game.init();
        
        // Initialize UI
        this.uiManager.init();
        
        // Start the game loop
        this.animate();
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Update game state
        this.game.update();
        
        // Update UI
        this.uiManager.update();
        
        // Render the game
        this.game.render();
    }
}

// Start the game when the window loads
window.addEventListener('load', () => {
    new GameApplication();
}); 