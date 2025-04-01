export class CastleHealthBar {
    constructor(castle) {
        this.castle = castle;
        this.element = null;
        this.createUI();
    }

    createUI() {
        // Create container
        this.element = document.createElement('div');
        this.element.style.position = 'fixed';
        this.element.style.top = '20px';
        this.element.style.left = '20px';
        this.element.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        this.element.style.padding = '10px';
        this.element.style.borderRadius = '5px';
        this.element.style.color = 'white';
        this.element.style.fontFamily = 'Arial, sans-serif';

        // Create title
        const title = document.createElement('div');
        title.textContent = 'Castle Health';
        title.style.fontSize = '16px';
        title.style.marginBottom = '5px';
        this.element.appendChild(title);

        // Create health bar container
        const healthBarContainer = document.createElement('div');
        healthBarContainer.style.width = '200px';
        healthBarContainer.style.height = '20px';
        healthBarContainer.style.backgroundColor = '#333';
        healthBarContainer.style.borderRadius = '10px';
        healthBarContainer.style.overflow = 'hidden';

        // Create health bar
        this.healthBar = document.createElement('div');
        this.healthBar.style.width = '100%';
        this.healthBar.style.height = '100%';
        this.healthBar.style.backgroundColor = '#4CAF50';
        this.healthBar.style.transition = 'width 0.3s ease-in-out';
        healthBarContainer.appendChild(this.healthBar);

        // Create health text
        this.healthText = document.createElement('div');
        this.healthText.style.textAlign = 'center';
        this.healthText.style.marginTop = '5px';
        this.healthText.style.fontSize = '14px';

        this.element.appendChild(healthBarContainer);
        this.element.appendChild(this.healthText);

        // Add to document
        document.body.appendChild(this.element);

        // Initial update
        this.update();
    }

    update() {
        const health = this.castle.getHealth();
        const maxHealth = this.castle.getMaxHealth();
        const percentage = (health / maxHealth) * 100;

        // Update health bar
        this.healthBar.style.width = `${percentage}%`;

        // Update color based on health percentage
        if (percentage > 60) {
            this.healthBar.style.backgroundColor = '#4CAF50'; // Green
        } else if (percentage > 30) {
            this.healthBar.style.backgroundColor = '#FFA500'; // Orange
        } else {
            this.healthBar.style.backgroundColor = '#FF0000'; // Red
        }

        // Update text
        this.healthText.textContent = `${Math.round(health)} / ${maxHealth}`;
    }

    remove() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
} 