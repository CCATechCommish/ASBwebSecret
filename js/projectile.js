// projectile.js — Sphere throwing mechanics

export class Projectile {
    constructor(scene, position, direction, speed) {
        this.scene = scene;
        this.alive = true;
        this.speed = speed || 25;
        this.maxLifetime = 3.0;
        this.lifetime = 0;

        this.velocity = direction.clone().normalize().multiplyScalar(this.speed);
        this.gravity = -9.8;

        const geo = new THREE.SphereGeometry(0.15, 16, 16);
        const mat = new THREE.MeshStandardMaterial({
            color: 0x222222,
            roughness: 0.2,
            metalness: 0.7,
            emissive: 0x111111,
            emissiveIntensity: 0.3
        });

        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.position.copy(position);
        this.mesh.castShadow = true;

        // Trail
        this.trail = [];
        this.maxTrailLength = 15;

        this.scene.add(this.mesh);
    }

    update(scaledDelta) {
        if (!this.alive) return;

        this.lifetime += scaledDelta;
        if (this.lifetime > this.maxLifetime) {
            this.kill();
            return;
        }

        // Apply gravity (slight arc)
        this.velocity.y += this.gravity * scaledDelta * 0.3;

        // Move
        const movement = this.velocity.clone().multiplyScalar(scaledDelta);
        this.mesh.position.add(movement);

        // Floor collision
        if (this.mesh.position.y < 0.15) {
            this.kill();
            return;
        }

        // Wall bounds
        const p = this.mesh.position;
        if (Math.abs(p.x) > 14.5 || Math.abs(p.z) > 14.5) {
            this.kill();
            return;
        }

        // Spin the sphere
        this.mesh.rotation.x += scaledDelta * 10;
        this.mesh.rotation.z += scaledDelta * 8;
    }

    getPosition() {
        return this.mesh.position;
    }

    kill() {
        this.alive = false;
        this.mesh.visible = false;
    }

    dispose() {
        this.scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
    }
}


export class ProjectileManager {
    constructor(scene) {
        this.scene = scene;
        this.projectiles = [];
    }

    throw(position, direction) {
        // Offset slightly forward from camera
        const startPos = position.clone().add(direction.clone().multiplyScalar(0.5));
        startPos.y -= 0.15; // slightly below center
        const proj = new Projectile(this.scene, startPos, direction, 22);
        this.projectiles.push(proj);
        return proj;
    }

    update(scaledDelta, enemyManager) {
        for (const proj of this.projectiles) {
            if (!proj.alive) continue;
            proj.update(scaledDelta);

            if (proj.alive) {
                // Check enemy collision
                const hit = enemyManager.checkProjectileHit(proj.getPosition());
                if (hit) {
                    proj.kill();
                }
            }
        }
    }

    clearAll() {
        for (const proj of this.projectiles) {
            proj.dispose();
        }
        this.projectiles = [];
    }
}
