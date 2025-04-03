export class AudioSystem {
    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.sounds = new Map();
        this.music = null;
        this.currentMusic = null;
        this.volume = 1.0;
        this.isMusicPlaying = false;
        this.pendingMusic = null;
        this.pendingVolume = 1.0;
        this.pendingLoop = false;
        this.hasUserInteracted = false;
        this.isMuted = false;
    }

    /**
     * Load and play background music
     * @param {string} musicPath - Path to the music file
     * @param {number} volume - Volume level (0 to 1)
     * @param {boolean} loop - Whether to loop the music
     */
    async playMusic(musicPath, volume = 1.0, loop = false) {
        try {
            // Store the music parameters for later use
            this.pendingMusic = musicPath;
            this.pendingVolume = volume;
            this.pendingLoop = loop;

            // If user hasn't interacted yet, don't play
            if (!this.hasUserInteracted) {
                console.log('AudioSystem: Waiting for user interaction before playing music');
                return;
            }

            // Stop any currently playing music
            if (this.music) {
                this.music.pause();
                this.music = null;
            }

            // Create and configure the audio element
            this.music = new Audio(musicPath);
            this.music.volume = volume;
            this.music.loop = loop;

            // Add event listeners
            this.music.addEventListener('error', (e) => {
                console.error('AudioSystem: Error playing music:', e);
                this.music = null;
            });

            this.music.addEventListener('ended', () => {
                if (!loop) {
                    this.music = null;
                    this.isMusicPlaying = false;
                }
            });

            // Play the music
            await this.music.play();
            this.isMusicPlaying = true;
            this.currentMusic = musicPath;
        } catch (error) {
            console.error('AudioSystem: Error playing music:', error);
            this.music = null;
            this.isMusicPlaying = false;
        }
    }

    /**
     * Stop the current background music
     */
    stopMusic() {
        if (this.music) {
            this.music.pause();
            this.music = null;
            this.isMusicPlaying = false;
            this.currentMusic = null;
        }
    }

    /**
     * Set the volume of the current music
     * @param {number} volume - Volume level (0 to 1)
     */
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        if (this.music) {
            this.music.volume = this.volume;
        }
    }

    /**
     * Toggle music mute state
     */
    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.music) {
            this.music.muted = this.isMuted;
        }
    }

    /**
     * Load a sound effect
     * @param {string} name - Name to identify the sound
     * @param {string} soundPath - Path to the sound file
     */
    loadSound(name, soundPath) {
        const audio = new Audio(soundPath);
        this.sounds.set(name, audio);
    }

    /**
     * Play a sound effect
     * @param {string} name - Name of the sound to play
     * @param {number} volume - Volume level (0 to 1)
     */
    playSound(name, volume = 0.5) {
        console.log('Attempting to play sound:', { name, volume });
        
        const sound = this.sounds.get(name);
        if (sound) {
            sound.volume = volume;
            sound.currentTime = 0;
            sound.play().then(() => {
                console.log('Sound played successfully:', name);
            }).catch(error => {
                console.error('Error playing sound:', error);
                // If the error is due to user interaction, try to resume the audio context
                if (error.name === 'NotAllowedError') {
                    this.audioContext.resume().then(() => {
                        console.log('AudioContext resumed, retrying sound play');
                        sound.play().catch(e => console.error('Still failed to play sound:', e));
                    });
                }
            });
        } else {
            console.error('Sound not found:', name);
            console.log('Available sounds:', Array.from(this.sounds.keys()));
        }
    }

    // Call this method when user interacts with the document
    onUserInteraction() {
        if (!this.hasUserInteracted) {
            console.log('AudioSystem: User interaction detected, starting pending music');
            this.hasUserInteracted = true;
            
            // If there's pending music, play it
            if (this.pendingMusic) {
                this.playMusic(this.pendingMusic, this.pendingVolume, this.pendingLoop);
                this.pendingMusic = null;
                this.pendingVolume = 1.0;
                this.pendingLoop = false;
            }
        }
    }
} 