// Simulator - Physics simulation engine (wraps PhysSim.SimulationManager)
const Simulator = {
    simId: null,
    particles: [],
    time: 0,
    electronCount: 0,
    hitCount: 0,
    currentAngle: 0,
    currentSpec: null,
    currentConfig: null,
    isRunning: false,

    reset() {
        if (this.simId) {
            PhysVis.SimulationManager.destroy(this.simId);
            this.simId = null;
        }
        this.particles = [];
        this.time = 0;
        this.electronCount = 0;
        this.hitCount = 0;
        this.currentAngle = 0;
        this.isRunning = false;
    },

    setContext(spec, config) {
        this.currentSpec = spec;
        this.currentConfig = config;
    },

    emitSingle(angle, speedMul) {
        const config = this.currentConfig;
        const spec = this.currentSpec;
        if (!config || !spec) return;

        if (!this.simId) {
            this.simId = PhysVis.SimulationManager.createSimulation(spec, { trailLength: 2000 });

            PhysVis.SimulationManager.onRenderUpdate(this.simId, (states, _stepCount) => {
                for (let i = 0; i < states.length; i++) {
                    states[i].age = this.time;
                }
                this.particles = states;
            });
        }

        const given = config.given || {};
        const speed = (given.initialVelocity || 1.0) * (speedMul || 1.0);

        // 归一化电荷/质量: 使数值积分在 dt≈0.016 时稳定
        // 由 R = m*v/(|q|*B) 导出 m = R*B/v，令 |q|=1
        const Bmag = (spec.fields || []).reduce((sum, f) => {
            if (f.type === 'magnetic') return sum + Math.sqrt((f.x||0)**2 + (f.y||0)**2 + (f.z||0)**2);
            return sum;
        }, 0) || 1;
        const R = given.radius || 2.0;
        const qSign = (given.electronCharge || -1) > 0 ? 1 : -1;
        const normMass = (R * Bmag) / speed;

        const simData = PhysVis.SimulationManager._simulations.get(this.simId);
        if (simData) {
            simData.simulation.addParticle(
                new PhysSim.Vec3(0, 0, 0),
                new PhysSim.Vec3(speed * Math.cos(angle), speed * Math.sin(angle), 0),
                qSign,
                normMass
            );
        }

        this.electronCount++;
        this.currentAngle = angle;
    },

    emitMultiple(count) {
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            setTimeout(() => this.emitSingle(angle), i * 30);
        }
    },

    step(dt) {
        if (!this.simId) return;

        const hasAlive = PhysVis.SimulationManager.step(this.simId, dt);
        this.time += dt;

        if (!hasAlive) {
            this.isRunning = false;
        }
    },

    start() {
        this.isRunning = true;
    },

    stop() {
        this.isRunning = false;
    }
};
