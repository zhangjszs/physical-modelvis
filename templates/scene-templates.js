// ============================================================
// 场景模板库 - 可复用的物理场景构建模板
// 每个模板接收 ProblemConfig，输出 SceneSpec
// ============================================================

const SceneTemplates = (function () {

    // ==================== 模板1: 平行板 + 磁场 ====================
    // 适用题目: 白银三模类 - 平行板间有磁场，中心有粒子源
    const parallelPlatesMagnetic = function (config) {
        const given = config.given || {};
        const d = given.d || 1.0;
        const plateSep = given.plateSeparation || (4 * d);
        const B = given.magneticField || 0.5;
        const v0 = given.initialVelocity || 1.0;
        const R = given.radius || (2 * d);
        const halfSep = plateSep / 2;

        return PhysVis.SceneSpec.create({
            id: config.id,
            meta: { source: config.source, title: config.title },
            viewport: { xRange: [-halfSep - 2, halfSep + 2], yRange: [-6, 6], zRange: [-1, 1] },
            dim: '2d',
            objects: [
                { type: PhysVis.ObjectTypes.PLATE, x: halfSep, y: 0, width: 0.15, thickness: 12, polarity: '+', color: 0xff4444, vertical: true },
                { type: PhysVis.ObjectTypes.PLATE, x: -halfSep, y: 0, width: 0.15, thickness: 12, polarity: '-', color: 0x4488ff, vertical: true },
                { type: PhysVis.ObjectTypes.EMITTER, x: 0, y: 0, radius: 0.15, label: 'S' }
            ],
            fields: [
                { type: 'magnetic', x: 0, y: 0, z: -B, region: { type: 'rect', x1: -halfSep, x2: halfSep, y1: -6, y2: 6 } }
            ],
            particles: [
                { id: 'electron', startX: 0, startY: 0, startZ: 0, vx: v0, vy: 0, vz: 0, charge: -1, mass: 1, speed: v0, radius: R, angle: 0 }
            ],
            boundaries: [
                { type: 'vertical_plates', separation: plateSep }
            ],
            solver: { integrator: 'analytic_circular', dt: 0.016, maxSteps: 10000 },
            render: { showFieldLines: true, showVectors: true, showTrajectory: true, showHitPoints: true, fieldSymbolType: 'cross' }
        });
    };

    // ==================== 模板2: 速度选择器 ====================
    const velocitySelector = function (config) {
        const given = config.given || {};
        const E = given.electricField || 1.0;
        const B = given.magneticField || 1.0;
        const v0 = given.initialVelocity || 1.0;
        const R = given.radius || 1.0;

        return PhysVis.SceneSpec.create({
            id: config.id,
            meta: { source: config.source, title: config.title },
            viewport: { xRange: [-8, 8], yRange: [-4, 4], zRange: [-1, 1] },
            dim: '2d',
            objects: [
                { type: PhysVis.ObjectTypes.PLATE, x: 0, y: 2, width: 10, thickness: 0.15, polarity: '+', color: 0xff4444 },
                { type: PhysVis.ObjectTypes.PLATE, x: 0, y: -2, width: 10, thickness: 0.15, polarity: '-', color: 0x4488ff },
                { type: PhysVis.ObjectTypes.EMITTER, x: -5, y: 0, radius: 0.15, label: 'S' }
            ],
            fields: [
                { type: 'electric', x: 0, y: -E, z: 0, region: { type: 'rect', x1: -5, x2: 5, y1: -2, y2: 2 } },
                { type: 'magnetic', x: 0, y: 0, z: -B, region: { type: 'rect', x1: -5, x2: 5, y1: -2, y2: 2 } }
            ],
            particles: [
                { id: 'electron', startX: -5, startY: 0, startZ: 0, vx: v0, vy: 0, vz: 0, charge: -1, mass: 1, speed: v0, radius: R }
            ],
            boundaries: [
                { type: 'plate', separation: 4 }
            ],
            solver: { integrator: 'boris', dt: 0.016, maxSteps: 10000 },
            render: { showFieldLines: true, showVectors: true, showTrajectory: true, showHitPoints: true, fieldSymbolType: 'cross' }
        });
    };

    // ==================== 模板3: 质谱仪 ====================
    const massSpectrometer = function (config) {
        const given = config.given || {};
        const B = given.magneticField || 0.5;
        const v0 = given.initialVelocity || 1.0;

        return PhysVis.SceneSpec.create({
            id: config.id,
            meta: { source: config.source, title: config.title },
            viewport: { xRange: [-8, 8], yRange: [-6, 6], zRange: [-1, 1] },
            dim: '2d',
            objects: [
                { type: PhysVis.ObjectTypes.EMITTER, x: -5, y: 0, radius: 0.15, label: 'S' }
            ],
            fields: [
                { type: 'magnetic', x: 0, y: 0, z: -B, region: null }
            ],
            particles: [
                { id: 'particle', startX: -5, startY: 0, startZ: 0, vx: v0, vy: 0, vz: 0, charge: 1, mass: 1, speed: v0, radius: 2 }
            ],
            boundaries: [],
            solver: { integrator: 'analytic_circular', dt: 0.016, maxSteps: 10000 },
            render: { showFieldLines: true, showVectors: true, showTrajectory: true, showHitPoints: true, fieldSymbolType: 'cross' }
        });
    };

    // ==================== 模板4: 回旋加速器 ====================
    const cyclotron = function (config) {
        const given = config.given || {};
        const B = given.magneticField || 0.5;
        const v0 = given.initialVelocity || 1.0;

        return PhysVis.SceneSpec.create({
            id: config.id,
            meta: { source: config.source, title: config.title },
            viewport: { xRange: [-6, 6], yRange: [-6, 6], zRange: [-1, 1] },
            dim: '2d',
            objects: [
                { type: PhysVis.ObjectTypes.EMITTER, x: 0, y: 0, radius: 0.15, label: 'S' }
            ],
            fields: [
                { type: 'magnetic', x: 0, y: 0, z: -B, region: null }
            ],
            particles: [
                { id: 'proton', startX: 0, startY: 0, startZ: 0, vx: v0, vy: 0, vz: 0, charge: 1, mass: 1, speed: v0, radius: 2 }
            ],
            boundaries: [],
            solver: { integrator: 'analytic_circular', dt: 0.016, maxSteps: 10000 },
            render: { showFieldLines: true, showVectors: true, showTrajectory: true, showHitPoints: true, fieldSymbolType: 'cross' }
        });
    };

    // ==================== 模板5: 平行板电场 ====================
    const parallelPlatesElectric = function (config) {
        const given = config.given || {};
        const d = given.d || 1.0;
        const plateSep = given.plateSeparation || (2 * d);
        const E = given.electricField || 1.0;
        const v0 = given.initialVelocity || 1.0;
        const R = given.radius || 1.0;

        return PhysVis.SceneSpec.create({
            id: config.id,
            meta: { source: config.source, title: config.title },
            viewport: { xRange: [-6, 6], yRange: [-plateSep / 2 - 1, plateSep / 2 + 1], zRange: [-1, 1] },
            dim: '2d',
            objects: [
                { type: PhysVis.ObjectTypes.PLATE, x: 0, y: plateSep / 2, width: 10, thickness: 0.15, polarity: '+', color: 0xff4444 },
                { type: PhysVis.ObjectTypes.PLATE, x: 0, y: -plateSep / 2, width: 10, thickness: 0.15, polarity: '-', color: 0x4488ff },
                { type: PhysVis.ObjectTypes.EMITTER, x: -4, y: 0, radius: 0.15, label: 'S' }
            ],
            fields: [
                { type: 'electric', x: 0, y: -E, z: 0, region: { type: 'rect', x1: -5, x2: 5, y1: -plateSep / 2, y2: plateSep / 2 } }
            ],
            particles: [
                { id: 'electron', startX: -4, startY: 0, startZ: 0, vx: v0, vy: 0, vz: 0, charge: -1, mass: 1, speed: v0, radius: R }
            ],
            boundaries: [
                { type: 'plate', separation: plateSep }
            ],
            solver: { integrator: 'boris', dt: 0.016, maxSteps: 10000 },
            render: { showFieldLines: true, showVectors: true, showTrajectory: true, showHitPoints: true, fieldSymbolType: 'arrow' }
        });
    };

    // ==================== 模板6: 电偶极子 ====================
    const dipoleField = function (config) {
        const given = config.given || {};
        const v0 = given.initialVelocity || 1.0;

        return PhysVis.SceneSpec.create({
            id: config.id,
            meta: { source: config.source, title: config.title },
            viewport: { xRange: [-6, 6], yRange: [-6, 6], zRange: [-1, 1] },
            dim: '2d',
            objects: [
                { type: PhysVis.ObjectTypes.POINT_CHARGE, x: -1.5, y: 0, z: 0, radius: 0.3, polarity: '+' },
                { type: PhysVis.ObjectTypes.POINT_CHARGE, x: 1.5, y: 0, z: 0, radius: 0.3, polarity: '-' },
                { type: PhysVis.ObjectTypes.EMITTER, x: -3, y: 2, z: 0, radius: 0.15, label: 'S' }
            ],
            fields: [],
            particles: [
                { id: 'electron', startX: -3, startY: 2, startZ: 0, vx: v0, vy: -0.5, vz: 0, charge: -1, mass: 1, speed: v0 }
            ],
            boundaries: [
                { type: 'box', halfWidth: 8, halfHeight: 8 }
            ],
            solver: { integrator: 'boris', dt: 0.016, maxSteps: 10000 },
            render: { showFieldLines: true, showVectors: true, showTrajectory: true, showHitPoints: true, fieldSymbolType: 'arrow' }
        });
    };

    // 注册所有模板
    function registerAll() {
        if (typeof PhysVis !== 'undefined' && PhysVis.SceneBuilder) {
            PhysVis.SceneBuilder.registerTemplate('parallel_plates_magnetic', parallelPlatesMagnetic);
            PhysVis.SceneBuilder.registerTemplate('velocity_selector', velocitySelector);
            PhysVis.SceneBuilder.registerTemplate('mass_spectrometer', massSpectrometer);
            PhysVis.SceneBuilder.registerTemplate('cyclotron', cyclotron);
            PhysVis.SceneBuilder.registerTemplate('parallel_plates_electric', parallelPlatesElectric);
            PhysVis.SceneBuilder.registerTemplate('dipole', dipoleField);
            console.log('Scene templates registered successfully');
        } else {
            console.warn('PhysVis not available, skipping template registration');
        }
    }

    // 如果 PhysVis 已加载，立即注册
    if (typeof PhysVis !== 'undefined') {
        registerAll();
    }

    return {
        parallelPlatesMagnetic,
        velocitySelector,
        massSpectrometer,
        cyclotron,
        parallelPlatesElectric,
        dipoleField,
        registerAll
    };

})();
