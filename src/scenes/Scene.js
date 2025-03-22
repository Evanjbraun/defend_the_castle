import * as THREE from 'three';

export class Scene {
    constructor() {
        this.scene = null;
        this.ambientLight = null;
        this.directionalLight = null;
    }

    init() {
        // Create the scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Sky blue background

        // Add ambient light
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(this.ambientLight);

        // Add directional light (sunlight)
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        this.directionalLight.position.set(5, 5, 5);
        this.directionalLight.castShadow = true;
        this.scene.add(this.directionalLight);

        // Add ground plane
        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x3a7e3a,
            roughness: 0.8,
            metalness: 0.2
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Add fog for depth
        this.scene.fog = new THREE.Fog(0x87CEEB, 20, 100);
    }

    getScene() {
        return this.scene;
    }

    add(object) {
        this.scene.add(object);
    }

    remove(object) {
        this.scene.remove(object);
    }
} 