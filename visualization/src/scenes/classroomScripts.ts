/**
 * 课堂教学脚本系统 (Classroom Scripts)
 *
 * 面向教师课堂教学的结构化脚本设计：
 * 目标 (Goal) → 启发演示 (Demo) → 变量对比 (Compare) → 预测提问与错因诊断 (Quiz & Misconceptions) → 结论总结 (Conclusion)
 */

export interface ClassroomQuiz {
    /** 针对核心概念或误区的提问 */
    question: string;
    /** 备选项 */
    options: string[];
    /** 正确选项索引 (0-based) */
    answer: number;
    /** 针对选项与思维盲区的深度解析 */
    misconception: string;
}

export interface ClassroomScript {
    sceneId: string;
    title: string;
    subtitle: string;
    /** 1. 核心教学目标与概念难点 */
    goal: string;
    /** 2. 预设演示黄金参数 */
    demoParams: Record<string, number>;
    demoNote: string;
    /** 3. 引导一键参数对比配置 */
    compareFocus: {
        paramName: string;
        range: [number, number];
        count: number;
        description: string;
    };
    /** 4. 预测提问与学生易错诊断 */
    quizzes: ClassroomQuiz[];
    /** 5. 课堂知识点与核心公式总结 */
    conclusion: {
        takeaways: string[];
        formulas: string[];
    };
}

export const CLASSROOM_SCRIPTS: Record<string, ClassroomScript> = {
    projectile: {
        sceneId: 'projectile',
        title: '平抛运动的分解规律',
        subtitle: '必修第二册 · 曲线运动与运动的合成与分解',
        goal: '理解平抛运动可以分解为水平方向的匀速直线运动和竖直方向的自由落体运动；掌握运动独立性与等时性原理。',
        demoParams: { v0: 20, angle: 0, h0: 20, g: 9.8 },
        demoNote: '初速度 v₀=20 m/s，高度 h₀=20 m。观察水平匀速前进与竖直加速下落的复合轨迹。',
        compareFocus: {
            paramName: 'v0',
            range: [10, 40],
            count: 4,
            description: '改变初速度 v₀（10~40 m/s），对比轨迹：射程与 v₀ 成正比，但落地时间完全相同！'
        },
        quizzes: [
            {
                question:
                    '在同一高度水平抛出两个质量不同的小球（m₁ = 2·m₂），初速度相同，忽略空气阻力，哪一个小球先落地？',
                options: ['质量大的 m₁ 先落地', '质量小的 m₂ 先落地', '两球同时落地', '取决于小球体积'],
                answer: 2,
                misconception:
                    '【常见误区】：认为质量大重力大就下落得快。事实上平抛运动的竖直分运动为自由落体，竖直加速度恒为 g，落地时间 t = √(2h/g) 仅由高度决定，与质量无关。'
            },
            {
                question: '若平抛运动的初速度 v₀ 增大为原来的 2 倍，其他条件不变，小球在空中的飞行时间将：',
                options: ['变为原来的 2 倍', '变为原来的 4 倍', '保持不变', '变为原来的 1/2'],
                answer: 2,
                misconception:
                    '【常见误区】：误将初速度与飞行时间关联。根据运动的独立性，水平方向的初速度不影响竖直方向的加速度与位移，飞行时间仍为 t = √(2h/g)。'
            }
        ],
        conclusion: {
            takeaways: [
                '水平方向：不受外力，做初速度为 v₀ 的匀速直线运动（x = v₀·t）。',
                '竖直方向：只受重力，做初速度为 0、加速度为 g 的自由落体运动（y = ½gt²）。',
                '飞行时间仅由下落高度 h 决定；水平射程由高度 h 和初速度 v₀ 共同决定。'
            ],
            formulas: [
                '水平位移: x = v₀ · t',
                '竖直位移: y = \\frac{1}{2} g t^2',
                '飞行时间: t = \\sqrt{\\frac{2h}{g}}',
                '水平射程: x = v₀ \\sqrt{\\frac{2h}{g}}'
            ]
        }
    },

    'free-fall': {
        sceneId: 'free-fall',
        title: '自由落体运动与重力加速度',
        subtitle: '必修第一册 · 匀变速直线运动的研究',
        goal: '探究自由落体运动的本质，验证初速度为零、加速度为重力加速度 g 的匀加速直线运动规律。',
        demoParams: { height: 20, g: 9.8 },
        demoNote: '由静止释放小球，高度 20 m。观察速度随时间线性增加、位移随时间二次方增加。',
        compareFocus: {
            paramName: 'height',
            range: [5, 45],
            count: 5,
            description: '改变下落高度 h（5~45 m），验证落地时间与高度平方根成正比：t ∝ √h。'
        },
        quizzes: [
            {
                question: '伽利略著名的斜面与落体思想实验推翻了亚里士多德的什么经典观点？',
                options: [
                    '力是维持物体运动的原因',
                    '重的物体比轻的物体下落得快',
                    '物体具有惯性',
                    '加速度等于速度的变化率'
                ],
                answer: 1,
                misconception:
                    '【常见误区】：直觉上羽毛比铁球落得慢。伽利略通过归谬法和真空落体思想证明：若排除空气阻力，所有物体在同一地点自由下落的加速度完全相同。'
            }
        ],
        conclusion: {
            takeaways: [
                '自由落体是初速度为零、加速度恒为 g 的理想化匀加速直线运动。',
                '连续相等时间间隔 T 内的位移差为恒量：Δs = g·T²。'
            ],
            formulas: ['瞬时速度: v = g t', '下落高度: h = \\frac{1}{2} g t^2', '速度与位移: v^2 = 2 g h']
        }
    },

    'uniform-accelerated': {
        sceneId: 'uniform-accelerated',
        title: '匀变速直线运动的规律',
        subtitle: '必修第一册 · 匀变速直线运动的研究',
        goal: '掌握匀变速直线运动的速度-时间关系与位移-时间关系，理解 v-t 图像斜率代表加速度、面积代表位移。',
        demoParams: { v0y: 20, g: 9.8 },
        demoNote: '初速度竖直向上 20 m/s，加速度竖直向下 9.8 m/s²。观察对称的上升与下落过程。',
        compareFocus: {
            paramName: 'v0y',
            range: [10, 30],
            count: 3,
            description: '改变初速度 v₀y（10~30 m/s），对比最大上升高度 H ∝ v₀² 与上升时间 t ∝ v₀。'
        },
        quizzes: [
            {
                question: '竖直上抛运动的物体到达最高点瞬间，其速度和加速度分别是多少？',
                options: [
                    '速度为零，加速度为零',
                    '速度为零，加速度为 g 方向向下',
                    '速度向上，加速度为零',
                    '速度向下，加速度为 g'
                ],
                answer: 1,
                misconception:
                    '【常见误区】：认为速度为零时受力或加速度必定为零。最高点速度瞬时为零，但受力仍为重力 mg，故加速度恒为 g 方向向下。'
            }
        ],
        conclusion: {
            takeaways: [
                'v-t 图像的斜率表示加速度 a；图像与时间轴围成的面积表示位移 x。',
                '竖直上抛运动具有时间对称性（t_上 = t_下）与速率对称性（v_上 = v_下）。'
            ],
            formulas: [
                '速度公式: v = v_0 + a t',
                '位移公式: x = v_0 t + \\frac{1}{2} a t^2',
                '导出公式: v^2 - v_0^2 = 2 a x',
                '平均速度: \\bar{v} = \\frac{v_0 + v}{2}'
            ]
        }
    },

    'inclined-plane': {
        sceneId: 'inclined-plane',
        title: '斜面滑块动力学模型',
        subtitle: '必修第一册 · 牛顿运动定律',
        goal: '掌握沿斜面方向与垂直斜面方向的正交分解法，理解滑动摩擦力与倾角对滑块加速度的影响。',
        demoParams: { theta: 30, mu: 0.2, m: 1 },
        demoNote: '倾角 30°，摩擦因数 μ=0.2。滑块在沿斜面重力分力与摩擦力的合力下加速下滑。',
        compareFocus: {
            paramName: 'mu',
            range: [0, 0.5],
            count: 4,
            description: '改变动摩擦因数 μ（0~0.5），观察滑块加速度从光滑下滑（g·sinθ）到临界减速的转变。'
        },
        quizzes: [
            {
                question: '当斜面倾角 θ 满足什么条件时，放于粗糙斜面上的滑块恰好能沿斜面匀速下滑？',
                options: ['μ = sinθ', 'μ = cosθ', 'μ = tanθ', 'μ = 1/tanθ'],
                answer: 2,
                misconception:
                    '【常见误区】：混淆正切与正弦。沿斜面平衡时 mg·sinθ = μ·mg·cosθ，两边消去 mg·cosθ 得到 μ = tanθ。'
            }
        ],
        conclusion: {
            takeaways: [
                '沿斜面正交分解：重力分力为 mg·sinθ（沿斜面向下）和 mg·cosθ（垂直斜面向下）。',
                '滑块下滑加速度 a = g·(sinθ - μ·cosθ)，与滑块质量 m 无关。'
            ],
            formulas: [
                '支持力: N = m g \\cos\\theta',
                '摩擦力: f = \\mu m g \\cos\\theta',
                '加速度: a = g (\\sin\\theta - \\mu \\cos\\theta)'
            ]
        }
    },

    collision: {
        sceneId: 'collision',
        title: '动量守恒与弹性/非弹性碰撞',
        subtitle: '选择性必修第一册 · 动量守恒定律',
        goal: '掌握一维对心碰撞中的动量守恒定律，深入理解完全弹性碰撞与完全非弹性碰撞的机械能损失差异。',
        demoParams: { m1: 1, m2: 1, v1: 5, v2: 0, e: 1 },
        demoNote: '质量相等（1kg）的对心完全弹性碰撞（e=1）。观察两球碰撞后完全交换速度。',
        compareFocus: {
            paramName: 'e',
            range: [0, 1],
            count: 5,
            description: '改变恢复系数 e（0~1），对比完全非弹性碰撞（粘合）到弹性碰撞中动能损失的连续变化。'
        },
        quizzes: [
            {
                question: '质量为 m 的小球以速度 v 与同质量静止小球发生完全非弹性碰撞，碰撞系统的机械能损失比例为：',
                options: ['0%', '25%', '50%', '100%'],
                answer: 2,
                misconception:
                    "【常见误区】：以为完全非弹性碰撞动能全部损失。由动量守恒 mv = (m+m)v' 得碰后共同速度 v' = v/2，碰后总动能为 ½(2m)(v/2)² = ¼mv²，损失了 50% 动能。"
            }
        ],
        conclusion: {
            takeaways: [
                "在系统不受外力或外力合力为零时，碰撞全过程总动量守恒：m₁v₁ + m₂v₂ = m₁v₁' + m₂v₂'。",
                '完全弹性碰撞（e=1）动能完全守恒；等质量弹性碰撞两球速度完全互换。',
                '完全非弹性碰撞（e=0）碰后速度相同，系统机械能损失最大。'
            ],
            formulas: [
                "动量守恒: m_1 v_1 + m_2 v_2 = m_1 v_1' + m_2 v_2'",
                "弹性碰后速度: v_1' = \\frac{m_1 - m_2}{m_1 + m_2} v_1 + \\frac{2m_2}{m_1 + m_2} v_2",
                "恢复系数: e = \\frac{v_2' - v_1'}{v_1 - v_2}"
            ]
        }
    },

    spring: {
        sceneId: 'spring',
        title: '弹簧振子的简谐运动与能量守恒',
        subtitle: '选择性必修第一册 · 机械振动与能量',
        goal: '探究简谐运动的位移、速度与加速度变化特征，验证振子周期与振幅无关的等时性及机械能守恒。',
        demoParams: { m: 1, k: 25, A: 0.2 },
        demoNote: '质量 1kg，劲度系数 25 N/m，初始振幅 0.2 m。观察位移与回复力方向始终相反。',
        compareFocus: {
            paramName: 'm',
            range: [0.5, 4.5],
            count: 5,
            description: '改变振子质量 m（0.5~4.5 kg），观察周期随质量平方根增加：T ∝ √m。'
        },
        quizzes: [
            {
                question: '当弹簧振子经过平衡位置时，下列哪组物理量达到最大值？',
                options: ['位移与加速度', '速度与动能', '回复力与势能', '加速度与动能'],
                answer: 1,
                misconception:
                    '【常见误区】：混淆平衡位置与最大位移处。平衡位置位移 x=0，回复力 F=-kx=0，加速度 a=0；但势能全部转化为动能，速度达到最大值。'
            }
        ],
        conclusion: {
            takeaways: [
                '回复力特征：F = -kx，方向始终指向平衡位置。',
                '加速度特征：a = - (k/m)·x，位移最大时加速度最大，平衡位置加速度为零。',
                '周期公式 T = 2π√(m/k)，周期仅由振子质量与弹簧劲度系数决定，与振幅无关（简谐运动等时性）。'
            ],
            formulas: [
                '回复力: F = -k x',
                '振动周期: T = 2\\pi \\sqrt{\\frac{m}{k}}',
                '机械能守恒: E = \\frac{1}{2} k A^2 = \\frac{1}{2} m v^2 + \\frac{1}{2} k x^2'
            ]
        }
    },

    'electric-field': {
        sceneId: 'electric-field',
        title: '带电粒子在匀强电场中的偏转',
        subtitle: '选择性必修第一册 / 第三册 · 静电场及其应用',
        goal: '掌握带电粒子在电场中的类平抛运动规律，理解电场力做功与电势能转化的物理过程。',
        demoParams: { v0x: 10, Ey: 200, charge: 1.6, mass: 1.67 },
        demoNote: '质子以 10 m/s 垂直电场线射入匀强电场（200 N/C），做匀变速曲线运动。',
        compareFocus: {
            paramName: 'Ey',
            range: [50, 400],
            count: 4,
            description: '调节场强 Ey（50~400 N/C），对比粒子射出电场时的侧移量 y ∝ Ey。'
        },
        quizzes: [
            {
                question:
                    '两个初动能相同的带电粒子（质子 ¹H 和 α 粒子 ⁴He）垂直射入同一匀强偏转电场，出射时的侧移距离之比为：',
                options: ['1 : 1', '1 : 2', '2 : 1', '1 : 4'],
                answer: 1,
                misconception:
                    '【常见误区】：误代入速度公式。根据侧移公式 y = qEL² / (2m v₀²) = qEL² / (4 E_k)，在初动能 E_k 相同且板长 L 相同情况下，侧移量仅与电荷量 q 成正比。质子 q=e，α粒子 q=2e，故侧移比为 1:2。'
            }
        ],
        conclusion: {
            takeaways: [
                '运动分解：垂直电场方向做匀速直线运动（t = L / v₀），平行电场方向做初速度为零的匀加速运动（a = qE/m）。',
                '偏转角与侧移量与粒子比荷 q/m 及初速度密切相关。'
            ],
            formulas: [
                '侧向加速度: a = \\frac{q E}{m}',
                '偏转距离: y = \\frac{1}{2} \\frac{q E}{m} \\left(\\frac{L}{v_0}\\right)^2',
                '出射偏转角正切: \\tan\\theta = \\frac{q E L}{m v_0^2}'
            ]
        }
    },

    'magnetic-field': {
        sceneId: 'magnetic-field',
        title: '带电粒子在匀强磁场中的圆周运动',
        subtitle: '选择性必修第二册 · 磁场与洛伦兹力',
        goal: '掌握左手定则判断洛伦兹力方向，掌握粒子在磁场中做匀速圆周运动的轨道半径与周期公式。',
        demoParams: { v0x: 1000, Bz: 0.01, charge: 1.6, mass: 1.67 },
        demoNote: '质子以 1000 m/s 垂直射入 0.01 T 匀强磁场，洛伦兹力提供向心力，做完整圆周运动。',
        compareFocus: {
            paramName: 'Bz',
            range: [0.005, 0.05],
            count: 4,
            description: '改变磁感应强度 Bz（0.005~0.05 T），验证轨道半径 r ∝ 1/B。'
        },
        quizzes: [
            {
                question: '带电粒子在匀强磁场中做匀速圆周运动，当粒子速率加倍时，其运动周期将：',
                options: ['加倍', '减半', '保持不变', '变为原来的 4 倍'],
                answer: 2,
                misconception:
                    '【常见误区】：认为跑得快周期就短。由 T = 2πr/v = 2πm / (qB) 可知，周期与速度和半径无关，速率加倍时半径同倍增大，转一圈耗时保持不变（回旋加速器工作原理基础）。'
            }
        ],
        conclusion: {
            takeaways: [
                '洛伦兹力方向始终与速度方向垂直，洛伦兹力只改变速度方向，永不做功，粒子速率不变。',
                '洛伦兹力提供向心力：qvB = mv²/r。',
                '周期 T = 2πm / (qB) 具有与速度无关的特征。'
            ],
            formulas: [
                '向心力方程: q v B = m \\frac{v^2}{r}',
                '轨道半径: r = \\frac{m v}{q B}',
                '运动周期: T = \\frac{2\\pi m}{q B}',
                '动量与半径: p = q B r'
            ]
        }
    },

    'em-combined': {
        sceneId: 'em-combined',
        title: '速度选择器与电磁复合场',
        subtitle: '选择性必修第二册 · 复合场中的粒子运动',
        goal: '理解电场力与磁场力的矢量合成，掌握速度选择器原理与正交复合场中的平衡条件。',
        demoParams: { v0x: 1000, v0y: 0, Ex: 100, Bz: 0.1, charge: 1.6, mass: 1.67 },
        demoNote:
            '场强 Ex=100 N/C，磁感应强度 Bz=0.1 T。当初速度 v₀=1000 m/s 时，电场力与洛伦兹力恰好平衡，沿直线匀速穿过。',
        compareFocus: {
            paramName: 'v0x',
            range: [500, 2000],
            count: 4,
            description: '改变入射速度 v₀x（500~2000 m/s），观察偏离直线轨迹（v > E/B 或 v < E/B 发生偏转）。'
        },
        quizzes: [
            {
                question:
                    '在正交的速度选择器中（电场强度 E，磁感应强度 B），若粒子从右侧反向射入，能否实现沿直线穿过？',
                options: [
                    '依然能直线穿过',
                    '不能，两力方向相同发生偏转',
                    '能否穿过与电荷正负有关',
                    '能否穿过与粒子质量有关'
                ],
                answer: 1,
                misconception:
                    '【常见误区】：认为速度选择器具有双向对称性。反向射入时，电场力方向不变，但洛伦兹力方向根据左手定则反向，导致电场力与洛伦兹力同向叠加，粒子必定偏转，无法直线穿过。'
            }
        ],
        conclusion: {
            takeaways: [
                '速度选择器条件：qE = qvB 即 v = E / B，仅选择速度大小与方向，与电荷量、正负及质量无关。',
                '复合场分类分析：若 qE = qvB 做匀速直线运动；若只受磁场力做匀速圆周运动；受非平衡场力做复杂摆线运动。'
            ],
            formulas: ['选择速度: v = \\frac{E}{B}', '合力方程: \\vec{F} = q(\\vec{E} + \\vec{v} \\times \\vec{B})']
        }
    },

    'simple-pendulum': {
        sceneId: 'simple-pendulum',
        title: '单摆与重力加速度的测定',
        subtitle: '选择性必修第一册 · 机械振动 / 实验',
        goal: '理解单摆在小偏角（θ < 5°）下的简谐运动近似，掌握利用单摆测定重力加速度 g 的方法与原理。',
        demoParams: { length: 1, angle: 5, g: 9.8 },
        demoNote: '摆长 1.0 m，小摆角 5°。观察单摆周期的稳定性与回复力变化。',
        compareFocus: {
            paramName: 'length',
            range: [0.25, 2.25],
            count: 5,
            description: '改变摆长 L（0.25~2.25 m），观察周期随摆长平方根成正比：T ∝ √L。'
        },
        quizzes: [
            {
                question: '在做“用单摆测定重力加速度”实验时，下列哪项操作有助于减小实验误差？',
                options: [
                    '在摆角极大（θ > 30°）时开始计时',
                    '在摆球通过最高点时开始计时',
                    '在摆球通过最低平衡位置时开始计时，并测量 30~50 次全振动总时间',
                    '用较粗且弹性明显的橡胶绳做摆线'
                ],
                answer: 2,
                misconception:
                    '【常见误区】：在最高点计时容易误判停表起止。平衡位置摆球速度最大，位置辨识度最高，计时误差最小；且单摆要求摆线轻且无弹性、摆角小于 5° 满足简谐运动近似。'
            }
        ],
        conclusion: {
            takeaways: [
                '单摆小角度近似：sinθ ≈ θ = x/L，回复力 F = -mg·sinθ ≈ -(mg/L)·x，满足简谐运动条件。',
                '单摆周期公式：T = 2π√(L/g)，周期与摆球质量和振幅无关。',
                '利用 T²-L 图像的斜率 k = 4π²/g 可精确求得当地重力加速度 g。'
            ],
            formulas: [
                '单摆周期: T = 2\\pi \\sqrt{\\frac{L}{g}}',
                '重力加速度测定: g = \\frac{4\\pi^2 L}{T^2}',
                '图像斜率关系: k = \\frac{\\Delta (T^2)}{\\Delta L} = \\frac{4\\pi^2}{g}'
            ]
        }
    },

    'mechanical-wave': {
        sceneId: 'mechanical-wave',
        title: '机械波的形成与质点振动',
        subtitle: '选择性必修第一册 · 机械波',
        goal: '深刻理解“波是能量与振动状态的传播，介质质点并不随波迁移”，掌握波长、频率、波速三者关系。',
        demoParams: { waveMode: 0, amplitude: 0.15, frequency: 2, wavelength: 2 },
        demoNote: '横波模式，频率 2 Hz，波长 2 m。观察各质点仅在各自平衡位置附近上下振动。',
        compareFocus: {
            paramName: 'frequency',
            range: [1, 5],
            count: 5,
            description: '改变振源频率 f（1~5 Hz），波速恒定时波长相应缩短（λ = v/f）。'
        },
        quizzes: [
            {
                question: '一列简谐横波沿水平绳向右传播，关于绳上某一质点的运动，下列说法正确的是：',
                options: [
                    '该质点跟随波形向右匀速移动',
                    '该质点仅在竖直方向上下振动，不随波迁移',
                    '该质点的振动速度等于机械波的波速',
                    '该质点的振幅随传播距离增加而不断增加'
                ],
                answer: 1,
                misconception:
                    '【常见误区】：误以为介质质点被波浪“冲”向远方。机械波传递的是振动形式和能量，介质质点只在各自平衡位置附近往复振动，质点速度与波的传播速度是完全不同的两个概念。'
            }
        ],
        conclusion: {
            takeaways: [
                '机械波的传播特点：前质点带动后质点振动，后质点振动滞后于前质点。',
                '波速 v 仅由介质性质决定；频率 f 仅由振源决定；波长 λ 共同决定。'
            ],
            formulas: [
                '波速与波长频率: v = \\lambda f = \\frac{\\lambda}{T}',
                '波动方程: y(x, t) = A \\cos\\left(2\\pi \\left(f t - \\frac{x}{\\lambda}\\right)\\right)'
            ]
        }
    },

    'lc-oscillator': {
        sceneId: 'lc-oscillator',
        title: 'LC 振荡电路与电磁振荡',
        subtitle: '选择性必修第二册 · 电磁振荡与电磁波',
        goal: '探究电容电场能与电感磁场能的相互转化，掌握 LC 固有振荡周期的决定因素与振荡波形相位关系。',
        demoParams: { C: 100, Lind: 10, Q0: 1 },
        demoNote: '电容 100 pF，电感 10 μH，初始电荷量 1 μC。观察电荷量 q 与回路电流 i 互差 90° 相位。',
        compareFocus: {
            paramName: 'C',
            range: [50, 400],
            count: 4,
            description: '增大电容 C（50~400 pF），电磁振荡周期变长（T = 2π√LC）。'
        },
        quizzes: [
            {
                question: '在 LC 电磁振荡回路中，当电容器放电完毕瞬间（电荷量 q = 0），下列物理量最大的是：',
                options: ['电容器两极板间电压', '电容器中的电场能', '回路中的电流与磁场能', '回路总能量损失'],
                answer: 2,
                misconception:
                    '【常见误区】：认为电荷为零能量就没了。电容电量为零时，电场能完全转化为电感线圈中的磁场能，回路电流瞬时达到峰值。'
            }
        ],
        conclusion: {
            takeaways: [
                '电场能与磁场能周期性互换：q 最大时 i=0（电场能最大），q=0 时 i 最大（磁场能最大）。',
                'LC 固有周期公式 T = 2π√(LC)，固有频率 f = 1 / (2π√LC)。'
            ],
            formulas: [
                '振荡周期: T = 2\\pi \\sqrt{L C}',
                '振荡频率: f = \\frac{1}{2\\pi \\sqrt{L C}}',
                '总能量守恒: W = \\frac{q^2}{2C} + \\frac{1}{2} L i^2 = \\text{const}'
            ]
        }
    },

    'circular-motion': {
        sceneId: 'circular-motion',
        title: '匀速圆周运动与向心加速度',
        subtitle: '必修第二册 · 圆周运动',
        goal: '掌握线速度、角速度、周期与转速的关系，理解向心力的物理意义及方向始终指向圆心的本质。',
        demoParams: { mass: 0.2, radius: 1, omega: 3 },
        demoNote: '小球质量 0.2 kg，半径 1 m，角速度 3 rad/s。观察向心力与速度时刻垂直。',
        compareFocus: {
            paramName: 'omega',
            range: [1, 6],
            count: 5,
            description: '改变角速度 ω（1~6 rad/s），验证向心力与角速度平方成正比：F_n ∝ ω²。'
        },
        quizzes: [
            {
                question: '关于做匀速圆周运动的物体，下列物理量中保持恒定不变的是：',
                options: ['线速度', '向心加速度', '角速度与周期', '合外力'],
                answer: 2,
                misconception:
                    '【常见误区】：混淆线速度的矢量性。匀速圆周运动中的“匀速”指速率不变；线速度、向心加速度、合外力的大小虽不变，但方向时刻在变化，只有角速度、周期、动能是恒定标量。'
            }
        ],
        conclusion: {
            takeaways: [
                '匀速圆周运动是线速度方向时刻改变的变加速曲线运动。',
                '向心力是效果力，由合外力或某分力提供，方向始终指向圆心。'
            ],
            formulas: [
                '线速度与角速度: v = \\omega r',
                '向心加速度: a_n = \\frac{v^2}{r} = \\omega^2 r = \\left(\\frac{2\\pi}{T}\\right)^2 r',
                '向心力: F_n = m \\frac{v^2}{r} = m \\omega^2 r'
            ]
        }
    },

    orbital: {
        sceneId: 'orbital',
        title: '万有引力定律与航天卫星轨道',
        subtitle: '必修第二册 · 万有引力与宇宙航行',
        goal: '掌握万有引力提供向心力的核心方程，理解第一宇宙速度推导及卫星轨道高度与线速度、周期的关系。',
        demoParams: { altitude: 400, velocityFactor: 1.0, duration: 120 },
        demoNote: '高度 400 km（空间站轨道），速度因子 1.0（圆轨道）。观察卫星环绕地球公转。',
        compareFocus: {
            paramName: 'velocityFactor',
            range: [0.8, 1.2],
            count: 5,
            description: '调节初速度比例（0.8~1.2），观察从椭圆轨道（远地点）到圆轨道再到椭圆轨道（近地点）的变轨效果。'
        },
        quizzes: [
            {
                question: '人造地球卫星从低轨道转移到高轨道后，其运行速度和周期的变化是：',
                options: ['速度增大，周期变长', '速度减小，周期变长', '速度减小，周期变短', '速度增大，周期变短'],
                answer: 1,
                misconception:
                    '【常见误区】：直觉以为高处跑得快。由 GMm/r² = mv²/r = mr(2π/T)² 得 v = √(GM/r)，T = 2π√(r³/GM)，“高轨低速大周期”。'
            }
        ],
        conclusion: {
            takeaways: [
                '万有引力提供向心力：G·(Mm/r²) = m·(v²/r) = m·ω²r = m·r(2π/T)²。',
                '第一宇宙速度 v₁ = √(gR) ≈ 7.9 km/s 是卫星环绕地球表面运行的最大环绕速度，也是最小发射速度。'
            ],
            formulas: [
                '环绕速度: v = \\sqrt{\\frac{GM}{r}}',
                '公转周期: T = 2\\pi \\sqrt{\\frac{r^3}{GM}}',
                '第一宇宙速度: v_1 = \\sqrt{\\frac{GM}{R}} \\approx 7.9 \\text{ km/s}',
                '开普勒第三定律: \\frac{r^3}{T^2} = \\frac{GM}{4\\pi^2} = \\text{const}'
            ]
        }
    },

    photoelectric: {
        sceneId: 'photoelectric',
        title: '光电效应与爱因斯坦光电方程',
        subtitle: '选择性必修第三册 · 量子论初步与光电效应',
        goal: '探究光电效应实验规律，理解极限频率、截止电压与光电子最大初动能，掌握爱因斯坦光电效应方程。',
        demoParams: { W0: 2.3, nuMin: 300, nuMax: 1500 },
        demoNote: '逸出功 2.3 eV（金属钾），光频范围 300~1500 THz。观察光电子最大初动能随频率线性上升。',
        compareFocus: {
            paramName: 'W0',
            range: [1.5, 4.5],
            count: 4,
            description: '改变金属逸出功 W₀（1.5~4.5 eV），观察遏止频率 ν₀ 的右移（ν₀ = W₀/h）。'
        },
        quizzes: [
            {
                question: '用同一束单色光照射某种金属能发生光电效应，若增大入射光的强度，下列物理量中增大的是：',
                options: [
                    '逸出光电子的最大初动能',
                    '单位时间内逸出的光电子数（饱和光电流）',
                    '遏止电压',
                    '金属的逸出功'
                ],
                answer: 1,
                misconception:
                    '【常见误区】：认为光强越大光电子能量越高。经典波动说认为光强决定能量；而爱因斯坦光子说指出单光子能量 E=hν 仅由频率决定。光强增大只代表单位时间内光子数增多，因而光电子数目与饱和电流增大，最大初动能不变。'
            }
        ],
        conclusion: {
            takeaways: [
                '光电效应瞬时发生（延迟不超过 10⁻⁹ s），证明光具有粒子性。',
                '光电子最大初动能与入射光频率成线性关系，与光强无关。',
                '遏止电压 U_c 满足 e·U_c = E_km = hν - W₀。'
            ],
            formulas: [
                '爱因斯坦方程: E_{km} = h \\nu - W_0',
                '极限频率: \\nu_0 = \\frac{W_0}{h}',
                '遏止电压: e U_c = E_{km} = h \\nu - W_0'
            ]
        }
    },

    'air-track': {
        sceneId: 'air-track',
        title: '气垫导轨与瞬时速度测量',
        subtitle: '必修第一册 · 速度的测量与极限思想',
        goal: '理解利用挡光片通过光电门的平均速度逼近瞬时速度的极限思想，掌握气垫导轨阻力极小的实验优势。',
        demoParams: { mass: 0.2, v0: 0.8, flagWidth: 0.02, x1: 0.3, x2: 0.8 },
        demoNote: '滑块初速 0.8 m/s，挡光片宽 0.02 m。通过两个光电门精确记录挡光时间并求出速度。',
        compareFocus: {
            paramName: 'flagWidth',
            range: [0.01, 0.05],
            count: 5,
            description: '改变挡光片宽度 Δx（0.01~0.05 m），对比平均速度对瞬时速度的逼近精度。'
        },
        quizzes: [
            {
                question: '在光电门测速实验中，为什么通常选用较窄的挡光片？',
                options: [
                    '挡光片越窄，受到的空气阻力越小',
                    '挡光片越窄，挡光时间越短，平均速度越接近滑块通过光电门中心的瞬时速度',
                    '挡光片越窄，光电门的计时误差越小',
                    '挡光片越窄，滑块质量越轻'
                ],
                answer: 1,
                misconception:
                    '【常见误区】：认为越窄计时精度越高。实验本质是极限思想：v_瞬 = lim(Δt→0) Δx/Δt。在 Δt 极短时，平均速度 Δx/Δt 近似等于瞬时速度。'
            }
        ],
        conclusion: {
            takeaways: [
                '光电门测速原理：v = Δx / Δt（挡光片宽度除以遮光时间）。',
                '极限思想是物理学测量瞬时变化率（速度、加速度）的核心思维方法。'
            ],
            formulas: [
                '瞬时速度近似: v \\approx \\frac{\\Delta x}{\\Delta t}',
                '加速度计算: a = \\frac{v_2^2 - v_1^2}{2(x_2 - x_1)} = \\frac{v_2 - v_1}{\\Delta t_{12}}'
            ]
        }
    },

    'hooke-law': {
        sceneId: 'hooke-law',
        title: '胡克定律与弹簧劲度系数',
        subtitle: '必修第一册 · 相互作用 — 力',
        goal: '探究弹簧弹力与弹簧伸长量之间的定量正比关系，掌握利用 F-x 图像求劲度系数 k 的方法。',
        demoParams: { k: 20, massPerWeight: 50, weightCount: 4 },
        demoNote: '劲度系数 20 N/m，每个钩码 50g。挂载 4 个钩码（总重 1.96 N），弹簧伸长约 0.098 m。',
        compareFocus: {
            paramName: 'k',
            range: [10, 50],
            count: 5,
            description: '改变弹簧劲度系数 k（10~50 N/m），相同载荷下 k 越大弹簧越硬、伸长量越小（x ∝ 1/k）。'
        },
        quizzes: [
            {
                question: '在“探究弹簧弹力与形变量关系”的实验中，用 F-x 图像处理数据时，图像的斜率代表：',
                options: ['弹簧的原长', '弹簧的伸长量', '弹簧的劲度系数 k', '重力加速度 g'],
                answer: 2,
                misconception:
                    '【常见误区】：混淆弹簧原长与伸长量。胡克定律 F = k·Δx，F 对 Δx 的一阶导数（斜率）即为劲度系数 k。'
            }
        ],
        conclusion: {
            takeaways: [
                '在弹性限度内，弹簧弹力 F 的大小与弹簧的伸长量（或缩短量）x 成正比。',
                'F-x 图像是一条过原点的倾斜直线，斜率等于劲度系数 k。'
            ],
            formulas: ['胡克定律: F = k x = k (L - L_0)', '斜率与劲度系数: k = \\frac{\\Delta F}{\\Delta x}']
        }
    },

    'newton-second-law': {
        sceneId: 'newton-second-law',
        title: '牛顿第二定律实验验证',
        subtitle: '必修第一册 · 牛顿运动定律',
        goal: '运用控制变量法探究加速度 a 与合外力 F、物体质量 m 的定量关系，验证 a = F/m。',
        demoParams: { force: 10, mass: 2, v0: 0 },
        demoNote: '合外力 10 N，小车质量 2 kg。产生恒定加速度 a = 5 m/s²，做匀加速直线运动。',
        compareFocus: {
            paramName: 'force',
            range: [2, 20],
            count: 5,
            description: '保持质量 m=2kg 不变，改变外力 F（2~20 N），验证 a ∝ F 严格成正比。'
        },
        quizzes: [
            {
                question: '在用小车探究 a 与 F、m 关系的实验中，若平衡摩擦力时木板倾角过大，画出的 a-F 图像将会：',
                options: ['过原点', '在横轴（F轴）上有正截距', '在纵轴（a轴）上有正截距', '变成一条曲线'],
                answer: 2,
                misconception:
                    '【常见误区】：混淆横纵坐标截距含义。倾角过大意味着不加拉力（F=0）时小车重力分力已大于摩擦力，小车已有加速度，故 a 轴（纵轴）有正截距。'
            }
        ],
        conclusion: {
            takeaways: [
                '在质量 m 一定时，物体的加速度 a 与所受合外力 F 成正比（a ∝ F）。',
                '在合外力 F 一定时，物体的加速度 a 与物体的质量 m 成反比（a ∝ 1/m）。'
            ],
            formulas: ['牛顿第二定律: F_{合} = m a', '加速度关系: a = \\frac{F_{合}}{m}']
        }
    },

    'force-composition': {
        sceneId: 'force-composition',
        title: '力的合成与平行四边形定则',
        subtitle: '必修第一册 · 相互作用 — 力',
        goal: '体会等效替代的物理思想，掌握共点力合成的平行四边形定则与合力范围计算。',
        demoParams: { f1: 3, f2: 4, angleDeg: 90 },
        demoNote: '两分力大小分别为 3 N 和 4 N，夹角 90°。合力大小为 5 N，与分力构成经典勾股三角形。',
        compareFocus: {
            paramName: 'angleDeg',
            range: [0, 180],
            count: 5,
            description: '改变两分力夹角 θ（0°~180°），合力从最大值（F₁+F₂=7N）单调减小到最小值（|F₁-F₂|=1N）。'
        },
        quizzes: [
            {
                question: '大小分别为 3 N 和 4 N 的两个共点力，其合力大小不可能的是：',
                options: ['1 N', '5 N', '7 N', '8 N'],
                answer: 3,
                misconception:
                    '【常见误区】：以为合力就是代数相加。合力大小范围受夹角制约：|F₁ - F₂| ≤ F_合 ≤ F₁ + F₂，即 [1N, 7N]，不可能达到 8 N。'
            }
        ],
        conclusion: {
            takeaways: [
                '等效替代原则：合力的作用效果与两个分力共同作用的效果完全相同。',
                '矢量运算法则：互成角度的两个力的合成遵循平行四边形定则（或三角形定则）。'
            ],
            formulas: [
                '合力余弦定理: F = \\sqrt{F_1^2 + F_2^2 + 2 F_1 F_2 \\cos\\theta}',
                '合力取值范围: |F_1 - F_2| \\le F \\le F_1 + F_2'
            ]
        }
    },

    'energy-conservation': {
        sceneId: 'energy-conservation',
        title: '机械能守恒定律与动能势能转化',
        subtitle: '必修第二册 · 机械能守恒定律',
        goal: '掌握只有重力做功时动能与重力势能的相互转化规律，深刻理解系统总机械能守恒。',
        demoParams: { h0: 20, v0: 0, mass: 1, g: 9.8 },
        demoNote: '高度 20 m 自由释放 1kg 物体，势能逐渐转化为动能，任一时刻 E_k + E_p = 196 J。',
        compareFocus: {
            paramName: 'h0',
            range: [5, 45],
            count: 5,
            description: '改变释放高度 h（5~45 m），验证落地动能与高度成正比（E_k = mgh）。'
        },
        quizzes: [
            {
                question: '关于机械能是否守恒，下列说法正确的是：',
                options: [
                    '做匀速直线运动的物体，机械能必定守恒',
                    '只有重力对物体做功时，物体的机械能必定守恒',
                    '物体所受合外力为零时，机械能必定守恒',
                    '外力对物体做的总功为零，机械能必定守恒'
                ],
                answer: 1,
                misconception:
                    '【常见误区】：混淆合外力为零与机械能守恒条件。降落伞匀速下落时合力为零、动能不变，但重力势能减小，机械能不守恒。机械能守恒的充要条件是只有重力或弹力做功。'
            }
        ],
        conclusion: {
            takeaways: [
                '在只有重力或弹簧弹力做功的物体系统内，动能与势能相互转化，机械能的总量保持不变。',
                '表达式形式：E₁ = E₂ 或 ΔE_k = -ΔE_p。'
            ],
            formulas: [
                '机械能守恒方程: \\frac{1}{2} m v_1^2 + m g h_1 = \\frac{1}{2} m v_2^2 + m g h_2',
                '势能与动能转化: \\Delta E_k = -\\Delta E_p'
            ]
        }
    },

    'galileo-incline': {
        sceneId: 'galileo-incline',
        title: '伽利略理想斜面实验与惯性',
        subtitle: '必修第一册 · 牛顿第一定律',
        goal: '领悟“实验事实 + 逻辑外推”的科学研究方法，理解力是改变物体运动状态的原因而非维持运动的原因。',
        demoParams: { angleDeg: 30, inclineLength: 2, mode: 3 },
        demoNote: '小球从左侧斜面滚下，在右侧对接斜面上升至相同高度；当右侧倾角趋于 0° 时，小球将永远匀速运动。',
        compareFocus: {
            paramName: 'angleDeg',
            range: [10, 60],
            count: 4,
            description: '改变斜面倾角 θ（10°~60°），观察冲淡重力效果：倾角越小下滑时间越长、加速度越小。'
        },
        quizzes: [
            {
                question: '伽利略理想斜面实验的关键推理步骤是：',
                options: [
                    '直接用精密仪器测量了无限长光滑水平面上的运动',
                    '在真实对接斜面实验基础上，将右侧斜面倾角减小直至水平进行科学逻辑外推',
                    '完全通过数学公式推导得出惯性定律',
                    '利用现代真空光电门测速技术'
                ],
                answer: 1,
                misconception:
                    '【常见误区】：以为理想实验是纯凭空臆想。理想实验以可靠的实验事实为基础，抓住主要矛盾忽略次要因素，通过逻辑思维向极限状态进行科学外推。'
            }
        ],
        conclusion: {
            takeaways: [
                '亚里士多德观点的破除：运动不需要力来维持，力是改变物体运动状态（产生加速度）的原因。',
                '牛顿第一定律（惯性定律）：一切物体在没有受到外力作用时，总保持静止状态或匀速直线运动状态。'
            ],
            formulas: [
                '斜面加速度: a = g \\sin\\theta',
                '极限外推: \\lim_{\\theta \\to 0} a = 0 \\implies v = \\text{const}'
            ]
        }
    },

    'resistance-law': {
        sceneId: 'resistance-law',
        title: '电阻定律与电阻率探究',
        subtitle: '必修第三册 · 恒定电流',
        goal: '探究导体的电阻与其长度、横截面积及材料的定量关系，掌握滑动变阻器原理与伏安法测电阻率。',
        demoParams: { length: 1, diameter: 1, material: 0 },
        demoNote: '1米长、1毫米直径的铜导线。电阻极小（约 0.022 Ω），体现良导体特性。',
        compareFocus: {
            paramName: 'length',
            range: [1, 20],
            count: 5,
            description: '改变导线长度 L（1~20 m），验证导体电阻与长度成严格正比（R ∝ L）。'
        },
        quizzes: [
            {
                question: '一根均匀铜导线拉长为原来的 2 倍（体积保持不变），则它的电阻将变为原来的：',
                options: ['2 倍', '4 倍', '1/2', '1/4'],
                answer: 1,
                misconception:
                    '【常见误区】：只考虑长度翻倍。由于导线体积 V = L·S 恒定，长度变为 2L 时横截面积变为 S/2，由 R = ρ·(2L)/(S/2) = 4·(ρL/S)，电阻变为原来的 4 倍。'
            }
        ],
        conclusion: {
            takeaways: [
                '电阻定律：同种材料导体的电阻与它的长度成正比，与它的横截面积成反比。',
                '电阻率 ρ 仅由导体的材料和温度决定，反映材料导电性能的优劣。'
            ],
            formulas: [
                '电阻定律: R = \\rho \\frac{L}{S} = \\rho \\frac{4L}{\\pi d^2}',
                '电阻率测定: \\rho = \\frac{R S}{L}'
            ]
        }
    },

    refraction: {
        sceneId: 'refraction',
        title: '光的折射定律与斯涅尔定律',
        subtitle: '选择性必修第一册 · 光及其应用',
        goal: '理解光的折射现象，掌握折射率的定义式与计算式，理解光从光密介质射入光疏介质的全反射临界角。',
        demoParams: { n1: 1.0, n2: 1.5, angle: 30 },
        demoNote: '光从空气（n₁=1.00）射入玻璃（n₂=1.50），入射角 30°，折射角约为 19.5°。',
        compareFocus: {
            paramName: 'angle',
            range: [10, 80],
            count: 5,
            description: '改变入射角 θ₁（10°~80°），验证 sinθ₁ / sinθ₂ = n₂/n₁ 恒为常数。'
        },
        quizzes: [
            {
                question: '一束单色光从玻璃射入水中，关于其频率、波长和传播速度的变化，下列说法正确的是：',
                options: [
                    '频率变大，波长变长，波速变大',
                    '频率不变，波长变长，波速变大',
                    '频率不变，波长变短，波速变小',
                    '频率变小，波长不变，波速变大'
                ],
                answer: 1,
                misconception:
                    '【常见误区】：误以为光的频率会随介质改变。光从一种介质进入另一种介质，频率 f 仅由光源决定保持不变；水相对玻璃是光疏介质（n_水=1.33 < n_玻=1.5），光速 v = c/n 变大，波长 λ = v/f 变长。'
            }
        ],
        conclusion: {
            takeaways: [
                '斯涅尔折射定律：入射角的正弦与折射角的正弦之比等于两介质相对折射率（n₁·sinθ₁ = n₂·sinθ₂）。',
                '折射率物理本质：n = c / v，光在介质中的光速低于真空中光速。'
            ],
            formulas: [
                '折射定律: \\frac{\\sin\\theta_1}{\\sin\\theta_2} = \\frac{n_2}{n_1}',
                '折射率与光速: n = \\frac{c}{v}',
                '全反射临界角: \\sin C = \\frac{1}{n}'
            ]
        }
    },

    'gas-law': {
        sceneId: 'gas-law',
        title: '理想气体状态方程与玻意耳定律',
        subtitle: '选择性必修第三册 · 热力学定律与气体',
        goal: '掌握玻意耳定律、查理定律与盖-吕萨克定律，理解微观分子热运动碰撞器壁产生气体压强的本质。',
        demoParams: { n: 1, modeG: 0, p0: 101.3, V0: 22.4 },
        demoNote: '1 mol 理想气体等温过程。初始标况（101.3 kPa, 22.4 L），压缩体积时压强成反比升高（p·V = const）。',
        compareFocus: {
            paramName: 'p0',
            range: [50, 300],
            count: 5,
            description: '改变初始压强 p₀（50~300 kPa），观察 p-V 等温双曲线形态。'
        },
        quizzes: [
            {
                question: '一定质量的理想气体在等温压缩过程中，关于其内能和分子平均动能的变化，下列说法正确的是：',
                options: [
                    '内能增大，分子平均动能增大',
                    '内能不变，分子平均动能不变',
                    '内能减小，分子平均动能减小',
                    '内能增大，分子平均动能不变'
                ],
                answer: 1,
                misconception:
                    '【常见误区】：认为气体被压缩分子变密集内能就一定增大。理想气体内能仅由温度决定；等温过程中温度 T 不变，分子平均动能不变，理想气体内能保持不变（压缩做功放出的热量完全转移）。'
            }
        ],
        conclusion: {
            takeaways: [
                '玻意耳定律（等温）：p·V = C（温度不变时，压强与体积成反比）。',
                '理想气体状态方程：pV/T = nR，统一描述气体的三个基本宏观状态参量。'
            ],
            formulas: [
                '理想气体状态方程: p V = n R T',
                '玻意耳定律: p_1 V_1 = p_2 V_2',
                '查理定律: \\frac{p_1}{T_1} = \\frac{p_2}{T_2}',
                '盖-吕萨克定律: \\frac{V_1}{T_1} = \\frac{V_2}{T_2}'
            ]
        }
    }
};

/** 查询指定场景的课堂教学脚本 */
export function getClassroomScript(sceneId: string): ClassroomScript | undefined {
    return CLASSROOM_SCRIPTS[sceneId];
}

/** 获取全部精编课堂教学脚本 */
export function getAllClassroomScripts(): ClassroomScript[] {
    return Object.values(CLASSROOM_SCRIPTS);
}
