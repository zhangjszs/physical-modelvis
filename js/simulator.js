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
                this.particles = states.map(s => ({
                    x: s.position.x,
                    y: s.position.y,
                    z: s.position.z,
                    vx: s.velocity.x,
                    vy: s.velocity.y,
                    vz: s.velocity.z,
                    alive: s.alive,
                    trail: s.trail,
                    hitPoint: s.hitPoint,
                    age: this.time
                }));
            });
        }

        const given = config.given || {};
        const speed = (given.initialVelocity || 1.0) * (speedMul || 1.0);

        const simData = PhysVis.SimulationManager._simulations.get(this.simId);
        if (simData) {
            simData.simulation.addParticle(
                new PhysSim.Vec3(0, 0, 0),
                new PhysSim.Vec3(speed * Math.cos(angle), speed * Math.sin(angle), 0),
                given.electronCharge !== undefined ? given.electronCharge : -1,
                given.electronMass !== undefined ? given.electronMass : 1
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
