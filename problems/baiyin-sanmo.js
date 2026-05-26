// ============================================================
// 题目配置: 2025甘肃白银三模 - 平行板磁场中的电子运动（多选）
// 来源: 微信图片_20260501105124_1325_47.jpg 识别结果
// ============================================================

const BaiyinSanmoProblem = {
    id: 'baiyin-sanmo-2025',
    source: '2025·甘肃白银三模（多选题）',
    type: 'electromagnetic',
    title: '平行板磁场中的电子运动',

    description: `
        如图所示，两<strong>足够长的平行金属板</strong>相距 <strong>4d</strong>，
        金属板间充满<strong>方向垂直纸面向里的匀强磁场</strong>，
        板间中心有一<strong>电子发射源 S</strong> 向纸面内
        <strong>各个方向均匀发射初速度大小为 v₀</strong> 的电子。<br><br>
        已知电子的质量为 <strong>m</strong>，电荷量为 <strong>e</strong>，
        匀强磁场的磁感应强度大小 <strong>B = mv₀/(2ed)</strong>，
        不计电子重力及电子间的相互作用。
    `,

    formulas: [
        'B = mv₀ / (2ed)',
        'R = mv₀ / (eB) = 2d',
        'T = 2πm / (eB) = 4πd / v₀'
    ],

    given: {
        plateSeparation: 4,    // 4d（归一化单位制）
        d: 1.0,                // 基本单位长度
        magneticField: 0.5,    // B = mv₀/(2ed)，归一化后为 0.5
        initialVelocity: 1.0,  // v₀（归一化）
        radius: 2.0,           // R = 2d
        electronCharge: -1.6e-19,
        electronMass: 9.1e-31
    },

    options: [
        {
            letter: 'A',
            text: '电子在磁场中运动的轨迹半径 <strong>R = 2d</strong>',
            latex: 'R = 2d',
            correct: true,
            verification: {
                type: 'formula_check',
                target: 'radius',
                value: 2.0,
                derivation: 'R = mv₀/(eB) = mv₀/(e·mv₀/(2ed)) = 2d',
                demonstrateMode: 'single_right'
            }
        },
        {
            letter: 'B',
            text: '电子在磁场中运动的周期 <strong>T = πd/v₀</strong>',
            latex: 'T = \\pi d / v_0',
            correct: false,
            verification: {
                type: 'formula_check',
                target: 'period',
                value: 4 * Math.PI,
                expectedWrong: Math.PI,
                derivation: 'T = 2πm/(eB) = 2πm/(e·mv₀/(2ed)) = 4πd/v₀ ≠ πd/v₀',
                demonstrateMode: 'single_up'
            }
        },
        {
            letter: 'C',
            text: '两金属板上有电子打到的区域总长度为 <strong>4(√3+1)d</strong>',
            latex: 'L = 4(\\sqrt{3}+1)d',
            correct: true,
            verification: {
                type: 'region_check',
                target: 'hit_region_length',
                value: 4 * (Math.sqrt(3) + 1),
                derivation: '右板击中区域 y∈[-2d, 2√3d]，长度 2(√3+1)d；左板对称，总长 4(√3+1)d',
                demonstrateMode: 'multi_72'
            }
        },
        {
            letter: 'D',
            text: '打在两金属板上的电子占发射电子总数的 <strong>50%</strong>',
            latex: '50\\%',
            correct: false,
            verification: {
                type: 'ratio_check',
                target: 'hit_ratio',
                value: 1.0,
                expectedWrong: 0.5,
                derivation: 'R=2d 恰好等于 S 到极板距离，所有电子无论向哪个方向发射都会打到极板。上半方向→右板，下半方向→左板，击中率=100%',
                demonstrateMode: 'multi_100'
            }
        }
    ],

    answer: {
        correct: ['A', 'C'],
        explanation: `
            <strong>选项A ✓</strong>: R = mv₀/(eB) = mv₀/(e·mv₀/(2ed)) = 2d<br>
            <strong>选项B ✗</strong>: T = 2πR/v₀ = 2π·2d/v₀ = 4πd/v₀，不是 πd/v₀<br>
            <strong>选项C ✓</strong>: 右板击中区域 y∈[-2d, 2√3d]，长度 2(√3+1)d；左板对称，总长 4(√3+1)d<br>
            <strong>选项D ✗</strong>: R=2d 恰好等于 S 到极板距离，所有电子都会打到极板，击中率=100%，不是 50%
        `
    },

    // 场景模板：使用现有的 parallel_plates_magnetic 模板
    sceneTemplate: 'parallel_plates_magnetic',

    // 可复用组件标识
    reusableComponents: {
        plates: { type: 'parallel_plates', separation: 4, width: 12 },
        magneticField: { type: 'uniform_magnetic', direction: 'into_page', symbol: '×' },
        emitter: { type: 'point_emitter', position: 'center', label: 'S' },
        electronBeam: { type: 'radial_emission', speed: 'v₀', directions: 'all' }
    }
};
