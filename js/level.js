// level.js — Level geometry and layout

export class Level {
    constructor(scene) {
        this.scene = scene;
        this.obstacles = []; // AABB collision boxes { min: Vector3, max: Vector3 }
        this.ammoPickups = [];
        this.enemySpawnPoints = [];

        this._build();
    }

    _build() {
        this._createRoom();
        this._createPillars();
        this._createCover();
        this._defineSpawnPoints();
        this._createAmmoPickups();
    }

    _createRoom() {
        const roomMat = new THREE.MeshStandardMaterial({
            color: 0xf0f0f0,
            roughness: 0.9,
            metalness: 0.0
        });

        const darkMat = new THREE.MeshStandardMaterial({
            color: 0xe0e0e0,
            roughness: 0.95,
            metalness: 0.0
        });

        // Floor
        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(30, 30),
            roomMat
        );
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // Ceiling
        const ceiling = new THREE.Mesh(
            new THREE.PlaneGeometry(30, 30),
            darkMat
        );
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.y = 5;
        this.scene.add(ceiling);

        // Walls
        const wallGeo = new THREE.PlaneGeometry(30, 5);

        const wallBack = new THREE.Mesh(wallGeo, roomMat);
        wallBack.position.set(0, 2.5, -15);
        wallBack.receiveShadow = true;
        this.scene.add(wallBack);

        const wallFront = new THREE.Mesh(wallGeo, roomMat);
        wallFront.position.set(0, 2.5, 15);
        wallFront.rotation.y = Math.PI;
        this.scene.add(wallFront);

        const wallGeoSide = new THREE.PlaneGeometry(30, 5);

        const wallLeft = new THREE.Mesh(wallGeoSide, roomMat);
        wallLeft.position.set(-15, 2.5, 0);
        wallLeft.rotation.y = Math.PI / 2;
        this.scene.add(wallLeft);

        const wallRight = new THREE.Mesh(wallGeoSide, roomMat);
        wallRight.position.set(15, 2.5, 0);
        wallRight.rotation.y = -Math.PI / 2;
        this.scene.add(wallRight);
    }

    _createPillar(x, z, w, d, h) {
        const mat = new THREE.MeshStandardMaterial({
            color: 0xd8d8d8,
            roughness: 0.7,
            metalness: 0.1
        });

        const pillar = new THREE.Mesh(
            new THREE.BoxGeometry(w, h, d),
            mat
        );
        pillar.position.set(x, h / 2, z);
        pillar.castShadow = true;
        pillar.receiveShadow = true;
        this.scene.add(pillar);

        this.obstacles.push({
            min: new THREE.Vector3(x - w / 2, 0, z - d / 2),
            max: new THREE.Vector3(x + w / 2, h, z + d / 2)
        });
    }

    _createPillars() {
        // Tall pillars
        this._createPillar(-6, -4, 1.2, 1.2, 5);
        this._createPillar(6, -4, 1.2, 1.2, 5);
        this._createPillar(-6, 4, 1.2, 1.2, 5);
        this._createPillar(6, 4, 1.2, 1.2, 5);
    }

    _createCover() {
        const coverMat = new THREE.MeshStandardMaterial({
            color: 0xd0d0d0,
            roughness: 0.8,
            metalness: 0.05
        });

        // Low walls for cover
        const coverData = [
            { x: -3, z: 0, w: 3, h: 1.2, d: 0.5 },
            { x: 3, z: 0, w: 3, h: 1.2, d: 0.5 },
            { x: 0, z: -6, w: 4, h: 1.0, d: 0.5 },
            { x: -8, z: -8, w: 2, h: 1.5, d: 2 },
            { x: 8, z: -8, w: 2, h: 1.5, d: 2 },
            // Crates near player start
            { x: -2, z: 6, w: 1.2, h: 1.0, d: 1.2 },
            { x: 2, z: 6, w: 1.2, h: 1.0, d: 1.2 },
        ];

        for (const c of coverData) {
            const mesh = new THREE.Mesh(
                new THREE.BoxGeometry(c.w, c.h, c.d),
                coverMat
            );
            mesh.position.set(c.x, c.h / 2, c.z);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.scene.add(mesh);

            this.obstacles.push({
                min: new THREE.Vector3(c.x - c.w / 2, 0, c.z - c.d / 2),
                max: new THREE.Vector3(c.x + c.w / 2, c.h, c.z + c.d / 2)
            });
        }
    }

    _defineSpawnPoints() {
        this.enemySpawnPoints = [
            new THREE.Vector3(-10, 0, -10),
            new THREE.Vector3(10, 0, -10),
            new THREE.Vector3(-10, 0, -5),
            new THREE.Vector3(10, 0, -5),
            new THREE.Vector3(0, 0, -12),
            new THREE.Vector3(-5, 0, -10),
            new THREE.Vector3(5, 0, -10),
            new THREE.Vector3(0, 0, -8),
        ];
    }

    _createAmmoPickups() {
        const pickupGeo = new THREE.SphereGeometry(0.2, 16, 16);
        const pickupMat = new THREE.MeshStandardMaterial({
            color: 0x00aaff,
            emissive: 0x0066aa,
            emissiveIntensity: 0.5,
            roughness: 0.2,
            metalness: 0.8
        });

        const positions = [
            new THREE.Vector3(-6, 0.4, 0),
            new THREE.Vector3(6, 0.4, 0),
            new THREE.Vector3(0, 0.4, -3),
            new THREE.Vector3(-3, 0.4, 5),
            new THREE.Vector3(3, 0.4, 5),
        ];

        for (const pos of positions) {
            const pickup = new THREE.Mesh(pickupGeo, pickupMat);
            pickup.position.copy(pos);
            pickup.userData.isAmmoPickup = true;
            pickup.userData.active = true;
            pickup.userData.ammoAmount = 2;
            this.scene.add(pickup);
            this.ammoPickups.push(pickup);
        }
    }

    update(rawDelta, timeScale) {
        // Animate ammo pickups (floating bob)
        const time = performance.now() * 0.001;
        for (const pickup of this.ammoPickups) {
            if (pickup.userData.active) {
                pickup.position.y = 0.4 + Math.sin(time * 2 + pickup.position.x) * 0.1;
                pickup.rotation.y += rawDelta * 2;
            }
        }
    }

    checkAmmoPickup(playerPos, player) {
        const pickupRadius = 2.0;
        for (const pickup of this.ammoPickups) {
            if (!pickup.userData.active) continue;
            const dist = playerPos.distanceTo(pickup.position);
            if (dist < pickupRadius) {
                // Only consume pickup if player isn't already at max ammo
                if (player.spheres >= player.maxSpheres) continue;
                player.addAmmo(pickup.userData.ammoAmount);
                pickup.userData.active = false;
                pickup.visible = false;
            }
        }
    }

    reset() {
        for (const pickup of this.ammoPickups) {
            pickup.userData.active = true;
            pickup.visible = true;
        }
    }
}
