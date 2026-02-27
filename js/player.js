// player.js — First-person player controller with pointer lock

export class Player {
    constructor(camera, scene, timeSystem) {
        this.camera = camera;
        this.scene = scene;
        this.timeSystem = timeSystem;

        // Position & movement
        this.position = new THREE.Vector3(0, 1.6, 8);
        this.velocity = new THREE.Vector3();
        this.moveSpeed = 5.0;
        this.height = 1.6;

        // Mouse look
        this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
        this.sensitivity = 0.002;
        this.pitchLimit = Math.PI / 2 - 0.1;

        // Input state
        this.keys = { w: false, a: false, s: false, d: false };
        this.isMoving = false;
        this.isLocked = false;

        // Ammo
        this.maxSpheres = 8;
        this.spheres = this.maxSpheres;

        // Level bounds
        this.bounds = {
            minX: -14, maxX: 14,
            minZ: -14, maxZ: 14
        };

        // Collision boxes for level obstacles (set externally)
        this.obstacles = [];

        this.camera.position.copy(this.position);

        this._setupControls();
    }

    _setupControls() {
        document.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            if (this.keys.hasOwnProperty(key)) this.keys[key] = true;
        });

        document.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            if (this.keys.hasOwnProperty(key)) this.keys[key] = false;
        });

        document.addEventListener('mousemove', (e) => {
            if (!this.isLocked) return;
            const dx = e.movementX || 0;
            const dy = e.movementY || 0;

            this.euler.setFromQuaternion(this.camera.quaternion);
            this.euler.y -= dx * this.sensitivity;
            this.euler.x -= dy * this.sensitivity;
            this.euler.x = Math.max(-this.pitchLimit, Math.min(this.pitchLimit, this.euler.x));
            this.camera.quaternion.setFromEuler(this.euler);

            this.timeSystem.registerMouseMovement(dx, dy);
        });

        document.addEventListener('pointerlockchange', () => {
            this.isLocked = document.pointerLockElement !== null;
        });
    }

    lockPointer() {
        document.body.requestPointerLock();
    }

    unlockPointer() {
        document.exitPointerLock();
    }

    addAmmo(amount) {
        this.spheres = Math.min(this.spheres + amount, this.maxSpheres);
    }

    useAmmo() {
        if (this.spheres <= 0) return false;
        this.spheres--;
        return true;
    }

    update(rawDelta) {
        const scaledDelta = this.timeSystem.getScaledDelta(rawDelta);

        // Determine movement direction
        const forward = new THREE.Vector3();
        this.camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();

        const right = new THREE.Vector3();
        right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

        const moveDir = new THREE.Vector3();
        if (this.keys.w) moveDir.add(forward);
        if (this.keys.s) moveDir.sub(forward);
        if (this.keys.d) moveDir.add(right);
        if (this.keys.a) moveDir.sub(right);

        this.isMoving = moveDir.length() > 0.01;
        this.timeSystem.registerKeyboard(this.isMoving);

        if (this.isMoving) {
            moveDir.normalize();
            const newPos = this.position.clone().add(
                moveDir.multiplyScalar(this.moveSpeed * scaledDelta)
            );

            // Boundary check
            newPos.x = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, newPos.x));
            newPos.z = Math.max(this.bounds.minZ, Math.min(this.bounds.maxZ, newPos.z));

            // Simple obstacle collision (AABB)
            const playerRadius = 0.4;
            let blocked = false;
            for (const obs of this.obstacles) {
                if (
                    newPos.x + playerRadius > obs.min.x && newPos.x - playerRadius < obs.max.x &&
                    newPos.z + playerRadius > obs.min.z && newPos.z - playerRadius < obs.max.z
                ) {
                    blocked = true;
                    break;
                }
            }

            if (!blocked) {
                this.position.copy(newPos);
            }
        }

        this.position.y = this.height;
        this.camera.position.copy(this.position);
    }

    getForwardDirection() {
        const dir = new THREE.Vector3();
        this.camera.getWorldDirection(dir);
        return dir.normalize();
    }
}
