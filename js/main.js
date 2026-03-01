// main.js — Core game engine: scene setup, game loop, state management

import { TimeSystem } from './timeSystem.js';
import { Player } from './player.js';
import { Level } from './level.js';
import { EnemyManager } from './enemies.js';
import { ProjectileManager } from './projectile.js';
import { UI } from './ui.js';

// ——— Game States ———
const STATE = {
    MENU: 'MENU',
    PLAYING: 'PLAYING',
    WIN: 'WIN',
    LOSE: 'LOSE'
};

class Game {
    constructor() {
        this.state = STATE.MENU;
        this.clock = new THREE.Clock();

        this._initRenderer();
        this._initScene();
        this._initAudio();

        this.timeSystem = new TimeSystem();
        this.player = new Player(this.camera, this.scene, this.timeSystem);
        this.level = new Level(this.scene);
        this.player.obstacles = this.level.obstacles;
        this.enemyManager = new EnemyManager(this.scene, this.level.enemySpawnPoints);
        this.projectileManager = new ProjectileManager(this.scene);
        this.ui = new UI();

        this._setupEvents();
        this.ui.showTitle();

        // Post-processing: red vignette overlay for damage
        this.damageFlash = 0;

        this._animate();
    }

    _initRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;

        document.getElementById('game-container').appendChild(this.renderer.domElement);

        this.camera = new THREE.PerspectiveCamera(
            70,
            window.innerWidth / window.innerHeight,
            0.1,
            100
        );

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    _initScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf5f5f5);
        this.scene.fog = new THREE.Fog(0xf5f5f5, 20, 35);

        // Ambient light
        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambient);

        // Main directional light (sun-like)
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
        dirLight.position.set(5, 10, 5);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 50;
        dirLight.shadow.camera.left = -20;
        dirLight.shadow.camera.right = 20;
        dirLight.shadow.camera.top = 20;
        dirLight.shadow.camera.bottom = -20;
        this.scene.add(dirLight);

        // Subtle fill light
        const fillLight = new THREE.DirectionalLight(0xccddff, 0.3);
        fillLight.position.set(-3, 5, -5);
        this.scene.add(fillLight);
    }

    _initAudio() {
        this.audioCtx = null;
        this.soundsEnabled = false;

        // Lazy init on first user interaction
        this._initAudioOnce = () => {
            if (this.audioCtx) return;
            try {
                this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                this.soundsEnabled = true;
            } catch (e) {
                console.warn('Audio not available');
            }
        };
    }

    _playSound(type) {
        if (!this.soundsEnabled || !this.audioCtx) return;

        const ctx = this.audioCtx;
        const now = ctx.currentTime;

        if (type === 'throw') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            osc.start(now);
            osc.stop(now + 0.15);
        } else if (type === 'hit') {
            // Shatter sound
            const bufferSize = ctx.sampleRate * 0.3;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
            }
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            const gain = ctx.createGain();
            source.connect(gain);
            gain.connect(ctx.destination);
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            source.start(now);
        } else if (type === 'win') {
            for (let i = 0; i < 3; i++) {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'square';
                osc.frequency.setValueAtTime([440, 554, 659][i], now + i * 0.15);
                gain.gain.setValueAtTime(0.08, now + i * 0.15);
                gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.3);
                osc.start(now + i * 0.15);
                osc.stop(now + i * 0.15 + 0.3);
            }
        } else if (type === 'lose') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.exponentialRampToValueAtTime(60, now + 0.5);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
            osc.start(now);
            osc.stop(now + 0.5);
        }
    }

    _setupEvents() {
        // Click to start / throw / restart
        document.addEventListener('click', (e) => {
            this._initAudioOnce();

            if (this.state === STATE.MENU) {
                this._startGame();
            } else if (this.state === STATE.PLAYING) {
                if (this.player.isLocked) {
                    this._throwSphere();
                }
            } else if (this.state === STATE.WIN || this.state === STATE.LOSE) {
                this._startGame();
            }
        });

        // Prevent right-click context menu
        document.addEventListener('contextmenu', (e) => e.preventDefault());
    }


    _startGame() {
        this.state = STATE.PLAYING;

        // Reset everything
        this.player.spheres = this.player.maxSpheres;
        this.player.position.set(0, 1.6, 8);
        this.camera.position.copy(this.player.position);
        this.camera.rotation.set(0, 0, 0);
        this.player.euler.set(0, 0, 0);

        this.projectileManager.clearAll();
        this.enemyManager.spawnWave();
        this.level.reset();

        this.player.lockPointer();
        this.ui.showGame();
        this.ui.updateAmmo(this.player.spheres);
        this.ui.showInstructions();

        this.clock.start();
    }

    _throwSphere() {
        if (!this.player.useAmmo()) return;

        const pos = this.camera.position.clone();
        const dir = this.player.getForwardDirection();

        this.projectileManager.throw(pos, dir);
        this.timeSystem.registerThrow();
        this.ui.updateAmmo(this.player.spheres);
        this._playSound('throw');
    }

    _animate() {
        requestAnimationFrame(() => this._animate());

        if (this.state !== STATE.PLAYING) {
            this.renderer.render(this.scene, this.camera);
            return;
        }

        const rawDelta = Math.min(this.clock.getDelta(), 0.05); // cap to avoid spiral

        // Update time system
        const timeScale = this.timeSystem.update(rawDelta);
        const scaledDelta = this.timeSystem.getScaledDelta(rawDelta);

        // Update player
        this.player.update(rawDelta);

        // Update level (ammo bob animation)
        this.level.update(rawDelta, timeScale);
        this.level.checkAmmoPickup(this.player.position, this.player);

        // Track ammo changes from pickups
        this.ui.updateAmmo(this.player.spheres);

        // Update enemies (time-scaled)
        const prevAliveCount = this.enemyManager.enemies.filter(e => e.alive).length;
        this.enemyManager.update(this.player.position, scaledDelta);

        // Check projectile hits
        this.projectileManager.update(scaledDelta, this.enemyManager);

        // Check if enemy was just killed (for sound)
        const newAliveCount = this.enemyManager.enemies.filter(e => e.alive).length;
        if (newAliveCount < prevAliveCount) {
            this._playSound('hit');
        }

        // Update time bar
        this.ui.updateTimeBar(timeScale);

        // Win condition
        if (this.enemyManager.allDefeated()) {
            this.state = STATE.WIN;
            this.player.unlockPointer();
            this.ui.showWin();
            this._playSound('win');
            return;
        }

        // Lose condition
        if (this.enemyManager.checkPlayerHit(this.player.position)) {
            this.state = STATE.LOSE;
            this.player.unlockPointer();
            this.ui.showLose();
            this._playSound('lose');
            return;
        }

        this.renderer.render(this.scene, this.camera);
    }
}

// Boot
window.addEventListener('DOMContentLoaded', () => {
    new Game();
});
