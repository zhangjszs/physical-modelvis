// ============================================================
// PhysVis Framework - 桥接层（接入 PhysSim 引擎）
// 依赖: PhysSim (来自 physim/dist/physim.js)
// 提供: 场景构建、题目注册、积分器适配等高层 API
// ============================================================

const PhysVis = (function () {
    'use strict';

    // ==================== 1. SceneSpec 场景中间表示 ====================
    const SceneSpec = {
        version: '2.0',

        create(config) {
            return {
                version: this.version,
                id: config.id || Date.now().toString(),
                meta: config.meta || {},
                viewport: config.viewport || { xRange: [-5, 5], yRange: [-5, 5], zRange: [-1, 1] },
                dim: config.dim || '2d',
                objects: config.objects || [],
                fields: config.fields || [],
                particles: config.particles || [],
                boundaries: config.boundaries || [],
                solver: Object.assign({
                    integrator: 'analytic_circular',
                    dt: 0.016,
                    maxSteps: 10000
                }, config.solver || {}),
                render: Object.assign({
                    showFieldLines: true,
                    showVectors: true,
                    showTrajectory: true,
                    showHitPoints: true,
                    fieldSymbolType: 'cross'
                }, config.render || {})
            };
        },

        validate(spec) {
            const errors = [];
            if (!spec.id) errors.push('Missing id');
            if (!spec.objects || spec.objects.length === 0) errors.push('No objects defined');
            return { valid: errors.length === 0, errors };
        }
    };

    // ==================== 2. 对象类型常量 ====================
    const ObjectTypes = {
        PLATE: 'plate',
        POINT_CHARGE: 'point_charge',
        RING_CHARGE: 'ring_charge',
        UNIFORM_E: 'uniform_electric',
        UNIFORM_B: 'uniform_magnetic',
        EMITTER: 'emitter',
        DETECTOR: 'detector',
        BOUNDARY: 'boundary',
        REGION: 'region'
    };

    // ==================== 3. ProblemConfig 标准化 ====================
    const ProblemConfig = {
        create(raw) {
            return {
                id: raw.id || 'unknown',
                source: raw.source || '',
                type: raw.type || 'electromagnetic',
                title: raw.title || '',
                description: raw.description || '',
                formulas: raw.formulas || [],
                given: raw.given || {},
                options: (raw.options || []).map(opt => ({
                    letter: opt.letter,
                    text: opt.text,
                    latex: opt.latex || '',
                    correct: opt.correct || null,
                    verification: opt.verification || null
                })),
                answer: raw.answer || { correct: [], explanation: '' },
                sceneTemplate: raw.sceneTemplate || null,
                derivations: raw.derivations || null,
                reusableComponents: raw.reusableComponents || {}
            };
        },

        validate(config) {
            const errors = [];
            if (!config.id) errors.push('Missing problem id');
            if (!config.options || config.options.length === 0) errors.push('No options defined');
            return { valid: errors.length === 0, errors };
        }
    };

    // ==================== 4. SceneBuilder 场景构建引擎 ====================
    const SceneBuilder = {
        _templates: {},

        registerTemplate(name, builder) {
            this._templates[name] = builder;
        },

        build(problemConfig) {
            if (problemConfig.sceneSpec) {
                return problemConfig.sceneSpec;
            }

            const templateName = problemConfig.sceneTemplate || this._detectTemplate(problemConfig);
            if (templateName && this._templates[templateName]) {
                return this._templates[templateName](problemConfig);
            }

            return SceneSpec.create({
                id: problemConfig.id,
                meta: { source: problemConfig.source, title: problemConfig.title },
                objects: [],
                fields: [],
                particles: []
            });
        },

        _detectTemplate(config) {
            const desc = (config.description || '').toLowerCase();
            const given = config.given || {};

            if (desc.includes('平行板') && desc.includes('磁场')) return 'parallel_plates_magnetic';
            if (desc.includes('速度选择器')) return 'velocity_selector';
            if (desc.includes('质谱仪')) return 'mass_spectrometer';
            if (desc.includes('回旋')) return 'cyclotron';
            if (desc.includes('平行板') && desc.includes('电场')) return 'parallel_plates_electric';
            if (desc.includes('偶极子')) return 'dipole';

            if (given.plateSeparation && given.magneticField) return 'parallel_plates_magnetic';
            if (given.electricField && given.magneticField) return 'velocity_selector';

            return null;
        }
    };

    // ==================== 5. 字段构建工具 ====================
    const DEFAULT_REGION_MIN = -100;
    const DEFAULT_REGION_MAX = 100;

    function makePhysSimRegion(r) {
        if (!r) return null;
        return {
            min: new PhysSim.Vec3(r.x1 || DEFAULT_REGION_MIN, r.y1 || DEFAULT_REGION_MIN, r.z1 || DEFAULT_REGION_MIN),
            max: new PhysSim.Vec3(r.x2 || DEFAULT_REGION_MAX, r.y2 || DEFAULT_REGION_MAX, r.z2 || DEFAULT_REGION_MAX)
        };
    }

    // 将场景中的 fields 定义转换为 PhysSim FieldSource 对象
    function buildPhysSimFields(fields) {
        const sources = [];
        if (!fields) return sources;
        for (const f of fields) {
            if (f.type === 'magnetic') {
                const Bvec = new PhysSim.Vec3(f.x || 0, f.y || 0, f.z || 0);
                sources.push(new PhysSim.UniformMagneticField(Bvec, makePhysSimRegion(f.region)));
            } else if (f.type === 'electric') {
                const Evec = new PhysSim.Vec3(f.x || 0, f.y || 0, f.z || 0);
                sources.push(new PhysSim.UniformElectricField(Evec, makePhysSimRegion(f.region)));
            } else if (f.type === 'point_charge_electric') {
                sources.push(new PhysSim.PointChargeField(
                    f.charge || 1,
                    new PhysSim.Vec3(f.x || 0, f.y || 0, f.z || 0),
                    f.k || 8.99e9
                ));
            } else if (f.type === 'dipole') {
                sources.push(new PhysSim.DipoleField(
                    f.charge || 1,
                    f.separation || 1.0,
                    new PhysSim.Vec3(f.centerX || 0, f.centerY || 0, f.centerZ || 0),
                    f.k || 8.99e9
                ));
            }
        }
        return sources;
    }

    // 将场景中的 boundaries 定义转换为 PhysSim Boundary 对象
    function buildPhysSimBoundaries(boundaries) {
        const result = [];
        if (!boundaries) return result;
        for (const b of boundaries) {
            if (b.type === 'vertical_plates') {
                result.push(new PhysSim.VerticalPlatesBoundary(b.separation));
            } else if (b.type === 'plate' || b.type === 'horizontal_plates') {
                result.push(new PhysSim.HorizontalPlatesBoundary(b.separation));
            } else if (b.type === 'box') {
                result.push(new PhysSim.BoxBoundary(b.halfWidth, b.halfHeight, b.halfDepth || 100));
            } else if (b.type === 'cylinder') {
                result.push(new PhysSim.CylinderBoundary(b.radius, b.halfHeight || 100));
            }
        }
        return result;
    }

    // ==================== 6. Integrators 积分器（接入 PhysSim）====================

    // 缓存 PhysSim 场对象，避免每帧重复创建
    let _cachedFieldRef = null;
    let _cachedComposite = null;
    let _borisInstance = null;

    function getCachedComposite(fields) {
        const f = fields || [];
        if (f !== _cachedFieldRef || !_cachedComposite) {
            _cachedFieldRef = f;
            const sources = buildPhysSimFields(f);
            _cachedComposite = sources.length > 0
                ? new PhysSim.CompositeField(sources)
                : new PhysSim.CompositeField([]);
        }
        return _cachedComposite;
    }

    // 从 env.fields 中提取合磁场大小（用于归一化）
    function getTotalB(fields) {
        let bx = 0, by = 0, bz = 0;
        (fields || []).forEach(f => {
            if (f.type === 'magnetic') { bx += f.x || 0; by += f.y || 0; bz += f.z || 0; }
        });
        return Math.sqrt(bx * bx + by * by + bz * bz) || 1;
    }

    // 计算归一化电荷与质量，使数值积分在 dt≈0.016 时稳定
    // 由 R = m*v/(|q|*B) 导出 m/|q| = R*B/v，令 |q|=1 则 m = R*B/v
    function getNormalizedChargeMass(particle, Bmag) {
        const v = particle.speed || 1.0;
        const R = particle.radius || 2.0;
        const q_sign = (particle.charge || -1) > 0 ? 1 : -1;
        const mass = (R * Bmag) / v;
        return { charge: q_sign, mass };
    }

    const Integrators = {
        // 解析圆形轨道（匀强磁场中的精确解析解）
        // 适用于电子（负电荷）：圆心在发射点下方，顺时针旋转
        analytic_circular: {
            step(particle, dt) {
                const R = particle.radius || 2.0;
                const speed = particle.speed || 1.0;
                const omega = speed / R;
                const angle = particle.angle || 0;
                const age = (particle.age || 0) + dt;

                // 圆心位置：对于负电荷、B向里，圆心在初速度方向左侧90°、距离R处
                // 当 angle=0（向右），圆心在 (0, -R)
                const cx = (particle.startX || 0) + R * Math.sin(angle);
                const cy = (particle.startY || 0) - R * Math.cos(angle);

                const theta = omega * age;

                const x = cx - R * Math.sin(angle - theta);
                const y = cy + R * Math.cos(angle - theta);

                const vx = R * omega * Math.cos(angle - theta);
                const vy = R * omega * Math.sin(angle - theta);

                return {
                    position: { x, y, z: 0 },
                    velocity: { x: vx, y: vy, z: 0 }
                };
            }
        },

        // Boris 积分器 - 内部使用 PhysSim.BorisIntegrator（归一化单位制）
        boris: {
            step(particle, env, dt) {
                if (typeof PhysSim === 'undefined') {
                    console.warn('PhysSim not loaded, falling back to simplified boris');
                    return Integrators._fallbackBoris(particle, env, dt);
                }

                const Bmag = getTotalB(env.fields);
                const norm = getNormalizedChargeMass(particle, Bmag);

                const pos = new PhysSim.Vec3(particle.x, particle.y, particle.z || 0);
                const vel = new PhysSim.Vec3(particle.vx, particle.vy, particle.vz || 0);
                const composite = getCachedComposite(env.fields || []);

                const state = {
                    position: pos,
                    velocity: vel,
                    charge: norm.charge,
                    mass: norm.mass,
                    time: particle.age || 0,
                    alive: particle.alive !== false,
                    trail: [],
                    hitPoint: null,
                    hitTime: -1,
                    metadata: {}
                };

                if (!_borisInstance) {
                    _borisInstance = new PhysSim.BorisIntegrator();
                }
                const newState = _borisInstance.step(state, composite, dt);

                return {
                    position: newState.position,
                    velocity: newState.velocity
                };
            }
        },

        // 简化 Boris 备用（当 PhysSim 不可用时）
        _fallbackBoris(particle, env, dt) {
            const Bmag = getTotalB(env.fields);
            const norm = getNormalizedChargeMass(particle, Bmag);
            const q = norm.charge;
            const m = norm.mass;
            const qom = q / m;

            let Ex = 0, Ey = 0, Ez = 0;
            let Bx = 0, By = 0, Bz = 0;
            (env.fields || []).forEach(f => {
                if (f.type === 'electric') { Ex += f.x || 0; Ey += f.y || 0; Ez += f.z || 0; }
                if (f.type === 'magnetic') { Bx += f.x || 0; By += f.y || 0; Bz += f.z || 0; }
            });

            const vmx = particle.vx + Ex * qom * dt / 2;
            const vmy = particle.vy + Ey * qom * dt / 2;
            const vmz = particle.vz + Ez * qom * dt / 2;

            const tx = Bx * qom * dt / 2;
            const ty = By * qom * dt / 2;
            const tz = Bz * qom * dt / 2;
            const tMagSq = tx * tx + ty * ty + tz * tz;
            const sx = tx * 2 / (1 + tMagSq);
            const sy = ty * 2 / (1 + tMagSq);
            const sz = tz * 2 / (1 + tMagSq);

            const vpx = vmx + (vmy * tz - vmz * ty);
            const vpy = vmy + (vmz * tx - vmx * tz);
            const vpz = vmz + (vmx * ty - vmy * tx);

            const vnx = vmx + (vpy * sz - vpz * sy);
            const vny = vmy + (vpz * sx - vpx * sz);
            const vnz = vmz + (vpx * sy - vpy * sx);

            const v_new_x = vnx + Ex * qom * dt / 2;
            const v_new_y = vny + Ey * qom * dt / 2;
            const v_new_z = vnz + Ez * qom * dt / 2;

            return {
                position: {
                    x: particle.x + v_new_x * dt,
                    y: particle.y + v_new_y * dt,
                    z: particle.z + v_new_z * dt
                },
                velocity: { x: v_new_x, y: v_new_y, z: v_new_z }
            };
        },

        // 内部工具暴露
        _buildPhysSimFields: buildPhysSimFields,
        _buildPhysSimBoundaries: buildPhysSimBoundaries,
        _getTotalB: getTotalB,
        _getNormalizedChargeMass: getNormalizedChargeMass
    };

    // ==================== 7. SimulationManager 仿真管理器 ====================
    const SimulationManager = {
        _simulations: new Map(),
        _renderCallbacks: new Map(),

        createSimulation(sceneSpec, options = {}) {
            if (typeof PhysSim === 'undefined') {
                throw new Error('PhysSim engine not loaded');
            }

            const fields = buildPhysSimFields(sceneSpec.fields || []);
            const boundaries = buildPhysSimBoundaries(sceneSpec.boundaries || []);
            const compositeField = new PhysSim.CompositeField(fields);

            const simConfig = {
                integrator: sceneSpec.solver?.integrator === 'boris' ? 'boris' :
                           sceneSpec.solver?.integrator === 'velocity-verlet' ? 'velocity-verlet' : 'rk4',
                dt: sceneSpec.solver?.dt || 0.016,
                maxSteps: sceneSpec.solver?.maxSteps || 10000,
                trailLength: options.trailLength || 5000
            };

            const simulation = new PhysSim.Simulation(compositeField, boundaries, simConfig);

            // 添加粒子
            (sceneSpec.particles || []).forEach(p => {
                simulation.addParticle(
                    new PhysSim.Vec3(p.startX || 0, p.startY || 0, p.startZ || 0),
                    new PhysSim.Vec3(p.vx || 0, p.vy || 0, p.vz || 0),
                    p.charge !== undefined ? p.charge : -1,
                    p.mass !== undefined ? p.mass : 1
                );
            });

            const simId = sceneSpec.id || Date.now().toString();
            this._simulations.set(simId, {
                simulation,
                sceneSpec,
                state: 'stopped',
                stepCount: 0,
                particleStates: []
            });

            return simId;
        },

        step(simId, dt) {
            const simData = this._simulations.get(simId);
            if (!simData) return false;

            const { simulation } = simData;
            simulation.step(dt);
            simData.stepCount++;

            // 记录粒子状态用于渲染（直接引用，避免每帧 180k 对象分配）
            const states = [];
            for (let i = 0; i < simulation.particles.length; i++) {
                const p = simulation.getParticle(i);
                if (p) {
                    states.push({
                        x: p.position.x,
                        y: p.position.y,
                        z: p.position.z,
                        vx: p.velocity.x,
                        vy: p.velocity.y,
                        vz: p.velocity.z,
                        alive: p.alive,
                        trail: p.trail,
                        hitPoint: p.hitPoint
                    });
                }
            }
            simData.particleStates = states;

            // 调用渲染回调
            const callback = this._renderCallbacks.get(simId);
            if (callback) {
                callback(states, simData.stepCount);
            }

            return simulation.getAliveCount() > 0;
        },

        run(simId, onComplete) {
            const simData = this._simulations.get(simId);
            if (!simData) return;

            simData.state = 'running';
            const { simulation } = simData;
            const maxSteps = simData.sceneSpec.solver?.maxSteps || 10000;

            let step = 0;
            const runStep = () => {
                if (step >= maxSteps || simulation.getAliveCount() === 0) {
                    simData.state = 'completed';
                    if (onComplete) onComplete(simData);
                    return;
                }

                simulation.step();
                step++;
                simData.stepCount = step;

                // 异步执行以避免阻塞UI
                requestAnimationFrame(runStep);
            };

            runStep();
        },

        pause(simId) {
            const simData = this._simulations.get(simId);
            if (simData) {
                simData.state = 'paused';
            }
        },

        resume(simId) {
            const simData = this._simulations.get(simId);
            if (simData && simData.state === 'paused') {
                simData.state = 'running';
            }
        },

        reset(simId) {
            const simData = this._simulations.get(simId);
            if (simData) {
                simData.simulation.reset();
                simData.state = 'stopped';
                simData.stepCount = 0;
                simData.particleStates = [];
            }
        },

        getSimulationState(simId) {
            const simData = this._simulations.get(simId);
            if (!simData) return null;

            return {
                id: simId,
                state: simData.state,
                stepCount: simData.stepCount,
                aliveCount: simData.simulation.getAliveCount(),
                hitCount: simData.simulation.getHitCount(),
                hitRatio: simData.simulation.getHitRatio(),
                particles: simData.particleStates
            };
        },

        onRenderUpdate(simId, callback) {
            this._renderCallbacks.set(simId, callback);
        },

        destroy(simId) {
            this._simulations.delete(simId);
            this._renderCallbacks.delete(simId);
        }
    };

    // ==================== 8. ProblemRegistry 问题注册表 ====================
    const ProblemRegistry = {
        _problems: {},

        register(config) {
            const pc = ProblemConfig.create(config);
            const validation = ProblemConfig.validate(pc);
            if (!validation.valid) {
                console.warn('Problem validation warnings:', validation.errors);
            }
            this._problems[pc.id] = pc;
            return pc;
        },

        get(id) {
            return this._problems[id] || null;
        },

        list() {
            return Object.values(this._problems);
        },

        remove(id) {
            delete this._problems[id];
        }
    };

    // ==================== 公共API ====================
    return {
        SceneSpec,
        ObjectTypes,
        ProblemConfig,
        SceneBuilder,
        Integrators,
        SimulationManager,
        ProblemRegistry
    };

})();
