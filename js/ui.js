// ui.js — UI overlays: title screen, HUD, win/lose screens

export class UI {
    constructor() {
        this.titleScreen = document.getElementById('title-screen');
        this.hud = document.getElementById('hud');
        this.ammoDisplay = document.getElementById('ammo-count');
        this.winScreen = document.getElementById('win-screen');
        this.loseScreen = document.getElementById('lose-screen');
        this.crosshair = document.getElementById('crosshair');
        this.timeBar = document.getElementById('time-bar');
        this.instructions = document.getElementById('instructions');
    }

    showTitle() {
        this.titleScreen.classList.remove('hidden');
        this.hud.classList.add('hidden');
        this.winScreen.classList.add('hidden');
        this.loseScreen.classList.add('hidden');
    }

    showGame() {
        this.titleScreen.classList.add('hidden');
        this.hud.classList.remove('hidden');
        this.winScreen.classList.add('hidden');
        this.loseScreen.classList.add('hidden');
    }

    showWin() {
        this.titleScreen.classList.add('hidden');
        this.hud.classList.add('hidden');
        this.winScreen.classList.remove('hidden');
        this.loseScreen.classList.add('hidden');

        // Start SUPER HOT repeating animation
        this._startSuperHotLoop();
    }

    showLose() {
        this.titleScreen.classList.add('hidden');
        this.hud.classList.add('hidden');
        this.winScreen.classList.add('hidden');
        this.loseScreen.classList.remove('hidden');
    }

    updateAmmo(count) {
        if (this.ammoDisplay) {
            // Show spheres as visual dots + number
            let dots = '';
            for (let i = 0; i < count; i++) {
                dots += '● ';
            }
            this.ammoDisplay.innerHTML = dots.trim() + `<span class="ammo-number">${count}</span>`;
        }
    }

    updateTimeBar(timeScale) {
        if (this.timeBar) {
            const pct = Math.round(timeScale * 100);
            this.timeBar.style.width = pct + '%';

            // Color from blue (slow) to red (fast)
            if (timeScale < 0.3) {
                this.timeBar.style.background = 'rgba(80, 160, 255, 0.7)';
            } else if (timeScale < 0.7) {
                this.timeBar.style.background = 'rgba(255, 180, 50, 0.7)';
            } else {
                this.timeBar.style.background = 'rgba(255, 40, 40, 0.8)';
            }
        }
    }

    showInstructions() {
        if (this.instructions) {
            this.instructions.classList.remove('hidden');
            setTimeout(() => {
                this.instructions.classList.add('fade-out');
                setTimeout(() => {
                    this.instructions.classList.add('hidden');
                    this.instructions.classList.remove('fade-out');
                }, 2000);
            }, 5000);
        }
    }

    _startSuperHotLoop() {
        const container = document.getElementById('super-hot-text');
        if (!container) return;
        container.innerHTML = '';

        const lines = 20;
        for (let i = 0; i < lines; i++) {
            const div = document.createElement('div');
            div.textContent = 'SUPER HOT';
            div.className = 'super-hot-line';
            div.style.animationDelay = (i * 0.1) + 's';
            container.appendChild(div);
        }
    }
}
