// Renderer3D - Three.js rendering layer
const Renderer3D = {
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    groups: {},
    _sharedGeoms: {},
    _sharedMats: {},

    init(container) {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0e27);

        this.camera = new THREE.PerspectiveCamera(
            50, window.innerWidth / window.innerHeight, 0.1, 1000
        );
        this.camera.position.set(0, 0, 12);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(this.renderer.domElement);

        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

        this.scene.add(new THREE.AmbientLight(0x404060, 0.6));
        const dir = new THREE.DirectionalLight(0xffffff, 0.8);
        dir.position.set(5, 10, 10);
        this.scene.add(dir);

        ['plates', 'fields', 'particles', 'trails', 'hitPoints', 'annotations'].forEach(n => {
            this.groups[n] = new THREE.Group();
            this.groups[n].name = n;
            this.scene.add(this.groups[n]);
        });

        window.addEventListener('resize', () => this.onResize());
    },

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    },

    clearGroup(name) {
        const g = this.groups[name];
        if (!g) return;
        while (g.children.length > 0) {
            const c = g.children[0];
            g.remove(c);
            if (c.geometry) c.geometry.dispose();
            if (c.material) {
                if (c.material.map) c.material.map.dispose();
                c.material.dispose();
            }
        }
    },

    clearAll() {
        Object.keys(this.groups).forEach(n => this.clearGroup(n));
    },

    applyViewport(vp) {
        if (!vp) return;
        const cx = (vp.xRange[0] + vp.xRange[1]) / 2;
        const cy = (vp.yRange[0] + vp.yRange[1]) / 2;
        const sz = Math.max(vp.xRange[1] - vp.xRange[0], vp.yRange[1] - vp.yRange[0]);
        this.camera.position.set(cx, cy, sz * 1.5);
        this.controls.target.set(cx, cy, 0);
        this.controls.update();
    },

    buildSceneFromSpec(spec) {
        this.clearAll();
        spec.objects.forEach(o => this.addObject(o));
        if (spec.render.showFieldLines) {
            spec.fields.forEach(f => this.addField(f, spec));
        }
        this.applyViewport(spec.viewport);
    },

    addObject(o) {
        switch (o.type) {
            case PhysVis.ObjectTypes.PLATE: this.addPlate(o); break;
            case PhysVis.ObjectTypes.EMITTER: this.addEmitter(o); break;
            case PhysVis.ObjectTypes.POINT_CHARGE: this.addPointCharge(o); break;
        }
    },

    addPlate(o) {
        const isVert = o.vertical;
        const geom = isVert
            ? new THREE.BoxGeometry(o.width || 0.15, o.thickness || 12, 0.1)
            : new THREE.BoxGeometry(o.width || 10, o.thickness || 0.15, 0.1);
        const mat = new THREE.MeshPhongMaterial({
            color: o.color || (o.polarity === '+' ? 0xff4444 : 0x4488ff),
            emissive: o.polarity === '+' ? 0x441111 : 0x111144,
            shininess: 80
        });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.set(o.x || 0, o.y || 0, o.z || 0);
        this.groups.plates.add(mesh);
    },

    addEmitter(o) {
        const geom = new THREE.SphereGeometry(o.radius || 0.15, 32, 32);
        const mat = new THREE.MeshPhongMaterial({ color: 0xffff00, emissive: 0x888800, shininess: 100 });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.set(o.x || 0, o.y || 0, o.z || 0);
        this.groups.plates.add(mesh);

        const ring = new THREE.Mesh(
            new THREE.RingGeometry(0.25, 0.35, 32),
            new THREE.MeshBasicMaterial({ color: 0xffff00, side: THREE.DoubleSide })
        );
        ring.position.set(o.x || 0, o.y || 0, 0.06);
        this.groups.plates.add(ring);
    },

    addPointCharge(o) {
        const geom = new THREE.SphereGeometry(o.radius || 0.3, 32, 32);
        const mat = new THREE.MeshPhongMaterial({
            color: o.polarity === '+' ? 0xff4444 : 0x4488ff,
            emissive: o.polarity === '+' ? 0xff2222 : 0x2222ff,
            shininess: 100
        });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.set(o.x || 0, o.y || 0, o.z || 0);
        this.groups.plates.add(mesh);
    },

    addField(field, spec) {
        if (field.type === 'magnetic') this.addMagneticSymbols(field, spec);
        if (field.type === 'electric') this.addElectricArrows(field, spec);
    },

    addMagneticSymbols(field, spec) {
        const spacing = 1.2;
        const vp = spec.viewport;
        const region = field.region;
        const mat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 });
        for (let x = Math.ceil(vp.xRange[0]); x <= Math.floor(vp.xRange[1]); x += spacing) {
            for (let y = Math.ceil(vp.yRange[0]); y <= Math.floor(vp.yRange[1]); y += spacing) {
                if (region && (x < region.x1 || x > region.x2 || y < region.y1 || y > region.y2)) continue;
                const sz = 0.12;
                this.groups.fields.add(new THREE.Line(
                    new THREE.BufferGeometry().setFromPoints([
                        new THREE.Vector3(x - sz, y - sz, 0.05),
                        new THREE.Vector3(x + sz, y + sz, 0.05)
                    ]), mat
                ));
                this.groups.fields.add(new THREE.Line(
                    new THREE.BufferGeometry().setFromPoints([
                        new THREE.Vector3(x - sz, y + sz, 0.05),
                        new THREE.Vector3(x + sz, y - sz, 0.05)
                    ]), mat
                ));
            }
        }
    },

    addElectricArrows(field, spec) {
        const dir = new THREE.Vector3(field.x || 0, field.y || 0, field.z || 0).normalize();
        const vp = spec.viewport;
        const spacing = 1.0;
        const region = field.region;
        for (let x = vp.xRange[0] + 0.5; x < vp.xRange[1]; x += spacing) {
            for (let y = vp.yRange[0] + 0.5; y < vp.yRange[1]; y += spacing) {
                if (region && (x < region.x1 || x > region.x2 || y < region.y1 || y > region.y2)) continue;
                const arrow = new THREE.ArrowHelper(dir, new THREE.Vector3(x, y, 0), 0.8, 0xff8800, 0.15, 0.08);
                this.groups.fields.add(arrow);
            }
        }
    },

    updateParticles(particles) {
        this.clearGroup('particles');
        this.clearGroup('hitPoints');

        if (!this._sharedGeoms.particle) {
            this._sharedGeoms.particle = new THREE.SphereGeometry(0.08, 12, 12);
            this._sharedMats.particle = new THREE.MeshPhongMaterial({ color: 0x00ffff, emissive: 0x006666 });
            this._sharedGeoms.hitPoint = new THREE.SphereGeometry(0.06, 10, 10);
            this._sharedMats.hitPoint = new THREE.MeshPhongMaterial({ color: 0xff0080, emissive: 0x880044 });
        }

        particles.forEach(p => {
            if (p.alive) {
                const mesh = new THREE.Mesh(this._sharedGeoms.particle, this._sharedMats.particle);
                mesh.position.set(p.x, p.y, p.z || 0);
                this.groups.particles.add(mesh);
            }
            if (p.hitPoint) {
                const mesh = new THREE.Mesh(this._sharedGeoms.hitPoint, this._sharedMats.hitPoint);
                mesh.position.set(p.hitPoint.x, p.hitPoint.y, p.hitPoint.z || 0);
                this.groups.hitPoints.add(mesh);
            }
        });
    },

    updateTrails(particles) {
        while (this.groups.trails.children.length > particles.length) {
            const c = this.groups.trails.children[particles.length];
            this.groups.trails.remove(c);
            if (c.geometry) c.geometry.dispose();
            if (c.material) c.material.dispose();
        }

        particles.forEach((p, i) => {
            if (p.trail.length < 2) return;
            const count = p.trail.length * 3;
            let posArray;
            const existing = i < this.groups.trails.children.length ? this.groups.trails.children[i] : null;
            const existingAttr = existing?.geometry?.getAttribute('position');
            if (existingAttr && existingAttr.array.length === count) {
                posArray = existingAttr.array;
            } else {
                posArray = new Float32Array(count);
            }
            for (let j = 0; j < p.trail.length; j++) {
                const pt = p.trail[j];
                posArray[j * 3] = pt.x;
                posArray[j * 3 + 1] = pt.y;
                posArray[j * 3 + 2] = pt.z || 0;
            }

            if (existing) {
                const geom = new THREE.BufferGeometry();
                geom.setAttribute('position', new THREE.Float32BufferAttribute(posArray, 3));
                if (existing.geometry) existing.geometry.dispose();
                existing.geometry = geom;
            } else {
                const geom = new THREE.BufferGeometry();
                geom.setAttribute('position', new THREE.Float32BufferAttribute(posArray, 3));
                this.groups.trails.add(new THREE.Line(
                    geom,
                    new THREE.LineBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.7 })
                ));
            }
        });
    },

    addLabel(text, x, y, size, color) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;
        ctx.font = 'bold 28px Arial';
        ctx.fillStyle = '#' + new THREE.Color(color).getHexString();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = 'rgba(0,0,0,0.7)';
        ctx.lineWidth = 4;
        ctx.strokeText(text, 128, 32);
        ctx.fillText(text, 128, 32);
        const sprite = new THREE.Sprite(
            new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true })
        );
        sprite.position.set(x, y, 0.15);
        sprite.scale.set(size * 4, size, 1);
        this.groups.annotations.add(sprite);
    },

    render() {
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
};
