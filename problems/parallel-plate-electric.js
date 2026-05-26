const ParallelPlateElectricProblem = {
    id: 'parallel-plate-electric',
    source: '经典物理题·平行板电场偏转（多选题）',
    type: 'electromagnetic',
    title: '平行板电场中的电子偏转',

    description: `
        如图所示，两<strong>水平平行金属板</strong>间有<strong>匀强电场</strong>，
        板间距为 <strong>d</strong>，板长为 <strong>L</strong>，
        电场强度为 <strong>E</strong>，方向竖直向下。<br><br>
        一电子以初速度 <strong>v₀</strong> 水平射入板间，
        已知电子质量为 <strong>m</strong>，电荷量为 <strong>e</strong>，
        不计重力。
    `,

    formulas: [
        '偏转距离: y = eEL²/(2mv₀²)',
        '偏转角度: tanθ = eEL/(mv₀²)',
        '加速度: a = eE/m'
    ],

    given: {
        plateSeparation: 4,
        d: 1.0,
        electricField: 1.0,
        magneticField: 0,
        initialVelocity: 1.0,
        radius: 0,
        electronCharge: -1.6e-19,
        electronMass: 9.1e-31
    },

    options: [
        {
            letter: 'A',
            text: '电子在板间做类平抛运动',
            latex: '类平抛',
            correct: true,
            verification: {
                type: 'concept_check',
                target: 'motion_type',
                demonstrateMode: 'single_right'
            }
        },
        {
            letter: 'B',
            text: '增大初速度 v₀，偏转距离 y 增大',
            latex: 'v₀↑ → y↑',
            correct: false,
            verification: {
                type: 'formula_check',
                target: 'deflection_distance',
                demonstrateMode: 'single_fast'
            }
        },
        {
            letter: 'C',
            text: '偏转距离 y 与电场强度 E 成正比',
            latex: 'y ∝ E',
            correct: true,
            verification: {
                type: 'formula_check',
                target: 'deflection_proportion',
                demonstrateMode: 'single_right'
            }
        },
        {
            letter: 'D',
            text: '电子飞出极板时的速度方向与初速度方向的夹角 θ 满足 tanθ = eEL/(2mv₀²)',
            latex: 'tanθ = eEL/(2mv₀²)',
            correct: false,
            verification: {
                type: 'formula_check',
                target: 'deflection_angle',
                demonstrateMode: 'single_right'
            }
        }
    ],

    answer: {
        correct: ['A', 'C'],
        explanation: `
            <strong>选项A ✓</strong>: 电子水平方向匀速，竖直方向匀加速，为类平抛运动<br>
            <strong>选项B ✗</strong>: y = eEL²/(2mv₀²)，v₀增大时y减小<br>
            <strong>选项C ✓</strong>: y = eEL²/(2mv₀²)，y与E成正比<br>
            <strong>选项D ✗</strong>: tanθ = vy/vx = eEL/(mv₀²)，不是2mv₀²
        `
    },

    sceneTemplate: 'parallel_plates_electric',

    reusableComponents: {
        plates: { type: 'horizontal_plates', separation: 4, width: 10 },
        electricField: { type: 'uniform_electric', direction: 'down' },
        emitter: { type: 'point_emitter', position: 'left_center', label: 'S' },
        electronBeam: { type: 'horizontal_beam', speed: 'v₀', direction: 'right' }
    }
};
