// ============================================================
// 题目配置: 速度选择器 - 经典电磁场组合题
// 验证框架的复用性：同一框架，不同题目配置
// ============================================================

const VelocitySelectorProblem = {
    id: 'velocity-selector-classic',
    source: '经典物理题·速度选择器（多选题）',
    type: 'electromagnetic',
    title: '速度选择器中的粒子运动',

    description: `
        如图所示，两<strong>平行金属板</strong>之间有相互垂直的
        <strong>匀强电场</strong>和<strong>匀强磁场</strong>。
        电场强度为 <strong>E</strong>，方向竖直向下；
        磁感应强度为 <strong>B</strong>，方向垂直纸面向里。<br><br>
        一束带正电的粒子（电荷量为 <strong>q</strong>，质量为 <strong>m</strong>）
        从左侧以速度 <strong>v</strong> 水平射入板间。
    `,

    formulas: [
        'v = E / B （选速条件）',
        'F_电 = qE （电场力）',
        'F_磁 = qvB （洛伦兹力）'
    ],

    given: {
        plateSeparation: 4,
        d: 1.0,
        electricField: 1.0,
        magneticField: 1.0,
        initialVelocity: 1.0,
        radius: 1.0,
        particleCharge: 1.6e-19,
        particleMass: 1.67e-27
    },

    options: [
        {
            letter: 'A',
            text: '只有速度 v = E/B 的粒子能沿直线通过',
            latex: 'v = E/B',
            correct: true,
            verification: {
                type: 'formula_check',
                target: 'selection_velocity',
                value: 2.0,
                demonstrateMode: 'single_right'
            }
        },
        {
            letter: 'B',
            text: '速度 v > E/B 的粒子将向上偏转',
            latex: 'v > E/B → 向上偏',
            correct: true,
            verification: {
                type: 'direction_check',
                target: 'deflection_direction',
                demonstrateMode: 'single_fast'
            }
        },
        {
            letter: 'C',
            text: '速度选择器可以区分不同质量的粒子',
            latex: '可区分质量',
            correct: false,
            verification: {
                type: 'concept_check',
                target: 'mass_independence',
                demonstrateMode: 'multi_mass'
            }
        },
        {
            letter: 'D',
            text: '若粒子带负电，仍能以 v = E/B 直线通过',
            latex: '负电也能直线通过',
            correct: true,
            verification: {
                type: 'concept_check',
                target: 'charge_sign_independence',
                demonstrateMode: 'negative_charge'
            }
        }
    ],

    answer: {
        correct: ['A', 'B', 'D'],
        explanation: `
            <strong>选项A ✓</strong>: qE = qvB → v = E/B<br>
            <strong>选项B ✓</strong>: v > E/B时，qvB > qE，洛伦兹力大于电场力，正电荷向上偏<br>
            <strong>选项C ✗</strong>: 选速条件v=E/B与质量无关，不能区分质量<br>
            <strong>选项D ✓</strong>: 负电荷时电场力和洛伦兹力方向同时反转，平衡条件不变
        `
    },

    sceneTemplate: 'velocity_selector',

    reusableComponents: {
        plates: { type: 'parallel_plates', separation: 4, width: 12 },
        electricField: { type: 'uniform_electric', direction: 'down' },
        magneticField: { type: 'uniform_magnetic', direction: 'into_page', symbol: '×' },
        emitter: { type: 'point_emitter', position: 'left_center', label: 'S' },
        particleBeam: { type: 'horizontal_beam', speed: 'v', direction: 'right' }
    }
};
