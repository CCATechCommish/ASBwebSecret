// enemies.js — Enemy system with SUPERHOT-style red crystalline enemies

export class Enemy {
    constructor(scene, position) {
        this.scene = scene;
        this.alive = true;
        this.speed = 2.5;
        this.reachDistance = 1.5;
        this.hitRadius = 0.6;

        this.group = new THREE.Group();
        this.group.position.copy(position);
        this.group.position.y = 0;

        this._buildMesh();
        this.scene.add(this.group);

        // Shatter fragments
        this.fragments = [];
        this.isShattered = false;
        this.shatterTime = 0;
    }

    _buildMesh() {
        const mat = new THREE.MeshStandardMaterial({
            color: 0xcc0000,
            roughness: 0.3,
            metalness: 0.2,
            transparent: true,
            opacity: 0.85
        });

        const crystalMat = new THREE.MeshStandardMaterial({
            color: 0xff1111,
            roughness: 0.15,
            metalness: 0.4,
            transparent: true,
            opacity: 0.9
        });

        // Torso
        const torso = new THREE.Mesh(
            new THREE.BoxGeometry(0.6, 0.9, 0.35),
            mat
        );
        torso.position.y = 1.15;
        torso.castShadow = true;
        this.group.add(torso);

        // Head — angular/crystalline
        const head = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.22, 0),
            crystalMat
        );
        head.position.y = 1.85;
        head.castShadow = true;
        this.group.add(head);

        // Arms
        for (let side of [-1, 1]) {
            const arm = new THREE.Mesh(
                new THREE.BoxGeometry(0.18, 0.7, 0.18),
                mat
            );
            arm.position.set(side * 0.45, 1.1, 0);
            arm.castShadow = true;
            this.group.add(arm);
        }

        // Legs
        for (let side of [-1, 1]) {
            const leg = new THREE.Mesh(
                new THREE.BoxGeometry(0.2, 0.7, 0.2),
                mat
            );
            leg.position.set(side * 0.17, 0.35, 0);
            leg.castShadow = true;
            this.group.add(leg);
        }
    }

    shatter() {
        if (this.isShattered) return;
        this.isShattered = true;
        this.alive = false;

        // Hide original mesh
        this.group.visible = false;

        // Create fragment particles
        const fragCount = 12 + Math.floor(Math.random() * 8);
        const fragMat = new THREE.MeshStandardMaterial({
            color: 0xff2222,
            roughness: 0.3,
            metalness: 0.3,
            transparent: true,
            opacity: 1.0
        });

        for (let i = 0; i < fragCount; i++) {
            const size = 0.05 + Math.random() * 0.15;
            const frag = new THREE.Mesh(
                new THREE.TetrahedronGeometry(size, 0),
                fragMat.clone()
            );

            frag.position.set(
                this.group.position.x + (Math.random() - 0.5) * 0.6,
                this.group.position.y + 0.8 + (Math.random() - 0.5) * 0.8,
                this.group.position.z + (Math.random() - 0.5) * 0.6
            );

            frag.userData.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 5,
                Math.random() * 4 + 2,
                (Math.random() - 0.5) * 5
            );

            frag.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );

            this.scene.add(frag);
            this.fragments.push(frag);
        }
    }

    update(playerPos, scaledDelta) {
        if (this.isShattered) {
            this.shatterTime += scaledDelta;
            for (const frag of this.fragments) {
                frag.userData.velocity.y -= 9.8 * scaledDelta;
                frag.position.add(frag.userData.velocity.clone().multiplyScalar(scaledDelta));
                frag.rotation.x += scaledDelta * 3;
                frag.rotation.z += scaledDelta * 2;

                // Fade out
                if (frag.material.opacity > 0) {
                    frag.material.opacity -= scaledDelta * 0.5;
                    if (frag.material.opacity <= 0) {
                        frag.visible = false;
                    }
                }

                // Stop at floor
                if (frag.position.y < 0.05) {
                    frag.position.y = 0.05;
                    frag.userData.velocity.multiplyScalar(0);
                }
            }
            return;
        }

        if (!this.alive) return;

        // Walk toward player
        const dir = new THREE.Vector3();
        dir.subVectors(playerPos, this.group.position);
        dir.y = 0;
        const dist = dir.length();
        dir.normalize();

        // Face player
        this.group.lookAt(
            new THREE.Vector3(playerPos.x, this.group.position.y, playerPos.z)
        );

        // Move
        if (dist > this.reachDistance) {
            this.group.position.add(dir.multiplyScalar(this.speed * scaledDelta));

            // Walking bob animation
            const bobTime = performance.now() * 0.003;
            this.group.position.y = Math.abs(Math.sin(bobTime * this.speed)) * 0.08;
        }
    }

    hasReachedPlayer(playerPos) {
        if (!this.alive) return false;
        const dist = this.group.position.distanceTo(playerPos);
        return dist < this.reachDistance;
    }

    getPosition() {
        return this.group.position;
    }

    dispose() {
        this.scene.remove(this.group);
        for (const frag of this.fragments) {
            this.scene.remove(frag);
            frag.geometry.dispose();
            frag.material.dispose();
        }
        for (const child of this.group.children) {
            child.geometry.dispose();
            child.material.dispose();
        }
    }
}


export class EnemyManager {
    constructor(scene, spawnPoints) {
        this.scene = scene;
        this.enemies = [];
        this.spawnPoints = spawnPoints;
        this.totalEnemies = 6;
    }

    spawnWave() {
        this.clearAll();

        const shuffled = [...this.spawnPoints].sort(() => Math.random() - 0.5);
        const count = Math.min(this.totalEnemies, shuffled.length);

        for (let i = 0; i < count; i++) {
            const enemy = new Enemy(this.scene, shuffled[i]);
            this.enemies.push(enemy);
        }
    }

    update(playerPos, scaledDelta) {
        for (const enemy of this.enemies) {
            enemy.update(playerPos, scaledDelta);
        }
    }

    checkPlayerHit(playerPos) {
        for (const enemy of this.enemies) {
            if (enemy.hasReachedPlayer(playerPos)) {
                return true;
            }
        }
        return false;
    }

    checkProjectileHit(projectilePos) {
        for (const enemy of this.enemies) {
            if (!enemy.alive) continue;
            const dist = enemy.getPosition().distanceTo(projectilePos);
            if (dist < enemy.hitRadius + 0.25) {
                enemy.shatter();
                return true;
            }
        }
        return false;
    }

    allDefeated() {
        return this.enemies.length > 0 && this.enemies.every(e => !e.alive);
    }

    clearAll() {
        for (const enemy of this.enemies) {
            enemy.dispose();
        }
        this.enemies = [];
    }
}
