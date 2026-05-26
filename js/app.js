// App - Main application controller
const App = {
    currentProblemId: null,
    isPlaying: false,
    speedMul: 1.0,
    animId: null,
    continuousTimer: 0,

    init() {
        try {
            Renderer3D.init(document.getElementById('canvas-container'));
            Simulator.reset();

            SceneTemplates.registerAll();
            PhysVis.ProblemRegistry.register(BaiyinSanmoProblem);
            PhysVis.ProblemRegistry.register(VelocitySelectorProblem);
            PhysVis.ProblemRegistry.register(ParallelPlateElectricProblem);

            UIManager.buildTabs(PhysVis.ProblemRegistry.list());
            UIManager.buildControlPanel();
            UIManager.buildInfoPanel();
            this.bindEvents();

            const first = PhysVis.ProblemRegistry.list()[0];
            if (first) this.loadProblem(first.id);

            this.startLoop();

            setTimeout(() => {
                document.getElementById('loading').classList.add('hidden');
            }, 400);

        } catch (err) {
            console.error('Init failed:', err);
            document.getElementById('loading').innerHTML =
                '<div class="error-msg"><h2>初始化失败</h2><p>' + err.message + '</p></div>';
        }
    },

    loadProblem(id) {
        this.currentProblemId = id;
        this.resetSim();

        const config = PhysVis.ProblemRegistry.get(id);
        if (!config) return;

        document.querySelectorAll('.tab').forEach(t =>
            t.classList.toggle('active', t.dataset.id === id)
        );

        const spec = PhysVis.SceneBuilder.build(config);
        Simulator.setContext(spec, config);
        Renderer3D.buildSceneFromSpec(spec);
        UIManager.buildProblemPanel(config);
        UIManager.buildDerivPanel(config.id);
    },

    resetSim() {
        Simulator.reset();
        this.isPlaying = false;
        this.continuousTimer = 0;
        // Hide pooled particle meshes instead of destroying
        if (Renderer3D._particlePool) {
            Renderer3D._particlePool.forEach(m => { m.visible = false; });
        }
        Renderer3D.clearGroup('trails');
        Renderer3D.clearGroup('hitPoints');
        Renderer3D.clearGroup('annotations');
        const btn = document.getElementById('btn-play');
        if (btn) { btn.textContent = '播放'; btn.classList.remove('active'); }
    },

    startLoop() {
        if (this.animId) cancelAnimationFrame(this.animId);
        const loop = () => {
            this.animId = requestAnimationFrame(loop);
            if (this.isPlaying && Simulator.isRunning) {
                const dt = 0.016 * this.speedMul;
                Simulator.step(dt);
                this.continuousTimer += dt;

                const activeMode = document.querySelector('.mode-btn.active');
                if (activeMode && activeMode.dataset.mode === 'continuous' && this.continuousTimer > 0.08) {
                    this.continuousTimer = 0;
                    Simulator.emitSingle(Math.random() * Math.PI * 2);
                }

                Renderer3D.updateParticles(Simulator.particles);
                Renderer3D.updateTrails(Simulator.particles);
                UIManager.updateInfoPanel();
            }
            Renderer3D.render();
        };
        loop();
    },

    demonstrateOption(letter) {
        this.resetSim();
        const config = PhysVis.ProblemRegistry.get(this.currentProblemId);
        if (!config) return;
        const opt = config.options.find(o => o.letter === letter);
        if (!opt || !opt.verification) return;

        const mode = opt.verification.demonstrateMode;
        if (mode === 'single_right') Simulator.emitSingle(0);
        else if (mode === 'single_up') Simulator.emitSingle(Math.PI / 2);
        else if (mode === 'single_fast') Simulator.emitSingle(0, 1.5);
        else if (mode === 'multi_72' || mode === 'multi_100') Simulator.emitMultiple(72);
        else Simulator.emitSingle(0);

        this.isPlaying = true;
        const btn = document.getElementById('btn-play');
        btn.textContent = '暂停';
        btn.classList.add('active');
    },

    showDeriv(step) {
        document.querySelectorAll('.deriv-tab').forEach(t =>
            t.classList.toggle('active', t.dataset.d === step)
        );
        document.querySelectorAll('.deriv-step').forEach(s => {
            s.style.display = (step === 'all' || s.dataset.s === step) ? 'block' : 'none';
        });
        this.addAnnotation(step);
    },

    showDerivStep(letter) {
        this.showDeriv(letter);
    },

    addAnnotation(step) {
        Renderer3D.clearGroup('annotations');
        const R = 2.0;
        if (step === 'A' || step === 'all') {
            const pts = [new THREE.Vector3(0, 0, 0.1), new THREE.Vector3(R, 0, 0.1)];
            const mat = new THREE.LineDashedMaterial({
                color: 0xffff00, dashSize: 0.15, gapSize: 0.08,
                transparent: true, opacity: 0.8
            });
            const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat);
            line.computeLineDistances();
            Renderer3D.groups.annotations.add(line);
            Renderer3D.addLabel('R=2d', R / 2, 0.3, 0.15, 0xffff00);
        }
        if (step === 'C' || step === 'all') {
            const sqrt3d = Math.sqrt(3);
            const topY = 2 * sqrt3d, botY = -2;
            const hlR = new THREE.Mesh(
                new THREE.PlaneGeometry(0.3, topY - botY),
                new THREE.MeshBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.25, side: THREE.DoubleSide })
            );
            hlR.position.set(2.2, (topY + botY) / 2, 0.05);
            Renderer3D.groups.annotations.add(hlR);

            const hlL = new THREE.Mesh(
                new THREE.PlaneGeometry(0.3, topY - botY),
                new THREE.MeshBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.25, side: THREE.DoubleSide })
            );
            hlL.position.set(-2.2, (topY + botY) / 2, 0.05);
            Renderer3D.groups.annotations.add(hlL);

            Renderer3D.addLabel('2√3d', 2.6, topY - 0.3, 0.12, 0xff4444);
            Renderer3D.addLabel('-2d', 2.6, botY + 0.3, 0.12, 0xff4444);
            Renderer3D.addLabel('L=4(√3+1)d', 0, -4.5, 0.15, 0x00ff88);
        }
        if (step === 'D' || step === 'all') {
            for (let i = 0; i < 12; i++) {
                const a = (i / 12) * Math.PI * 2;
                Renderer3D.groups.annotations.add(new THREE.ArrowHelper(
                    new THREE.Vector3(Math.cos(a), Math.sin(a), 0),
                    new THREE.Vector3(0, 0, 0.1), 1.5, 0x00ff88, 0.12, 0.06
                ));
            }
            Renderer3D.addLabel('100%击中', 0, -3.5, 0.18, 0x00ff88);
        }
    },

    bindEvents() {
        document.getElementById('btn-play').addEventListener('click', () => {
            this.isPlaying = !this.isPlaying;
            const btn = document.getElementById('btn-play');
            btn.textContent = this.isPlaying ? '暂停' : '播放';
            btn.classList.toggle('active', this.isPlaying);
            if (this.isPlaying && Simulator.particles.length === 0) {
                Simulator.emitSingle(0);
                Simulator.start();
            } else if (this.isPlaying) {
                Simulator.start();
            } else {
                Simulator.stop();
            }
        });

        document.getElementById('btn-reset').addEventListener('click', () => this.resetSim());

        document.getElementById('speed-slider').addEventListener('input', (e) => {
            this.speedMul = parseFloat(e.target.value);
            document.getElementById('speed-display').textContent = this.speedMul.toFixed(1) + 'x';
        });

        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.resetSim();
                const mode = btn.dataset.mode;
                if (mode === 'single') { Simulator.emitSingle(0); }
                else if (mode === 'multi') { Simulator.emitMultiple(36); }
                this.isPlaying = true;
                Simulator.start();
                document.getElementById('btn-play').textContent = '暂停';
                document.getElementById('btn-play').classList.add('active');
            });
        });

        document.getElementById('chk-trails').addEventListener('change', (e) => {
            Renderer3D.groups.trails.visible = e.target.checked;
        });
        document.getElementById('chk-hits').addEventListener('change', (e) => {
            Renderer3D.groups.hitPoints.visible = e.target.checked;
        });
        document.getElementById('chk-field').addEventListener('change', (e) => {
            Renderer3D.groups.fields.visible = e.target.checked;
        });

        document.getElementById('btn-reveal').addEventListener('click', () => {
            const box = document.getElementById('answer-box');
            if (box) box.classList.toggle('visible');
            const config = PhysVis.ProblemRegistry.get(this.currentProblemId);
            if (config) {
                document.querySelectorAll('.option-item').forEach(item => {
                    const letter = item.dataset.option;
                    item.classList.toggle('correct', config.answer.correct.includes(letter));
                    item.classList.toggle('wrong', !config.answer.correct.includes(letter));
                });
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            switch (e.key) {
                case ' ':
                    e.preventDefault();
                    document.getElementById('btn-play').click();
                    break;
                case 'r':
                case 'R':
                    this.resetSim();
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.speedMul = Math.min(3, this.speedMul + 0.1);
                    document.getElementById('speed-slider').value = this.speedMul;
                    document.getElementById('speed-display').textContent = this.speedMul.toFixed(1) + 'x';
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.speedMul = Math.max(0.1, this.speedMul - 0.1);
                    document.getElementById('speed-slider').value = this.speedMul;
                    document.getElementById('speed-display').textContent = this.speedMul.toFixed(1) + 'x';
                    break;
            }
        });
    }
};

window.App = App;
