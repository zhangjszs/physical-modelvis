import { useSimulationStore } from '../../store/simulationStore';

interface FormulaDef {
    title: string;
    formulas: Array<{ name: string; formula: string; variables: string; condition?: string }>;
    tips: string[];
}

const FORMULA_MAP: Record<string, FormulaDef> = {
    projectile: {
        title: '平抛 / 斜抛运动',
        formulas: [
            { name: '水平位移', formula: 'x = v₀x · t', variables: 'v₀x: 水平初速度, t: 时间' },
            {
                name: '竖直位移',
                formula: 'y = y₀ + v₀y · t − ½gt²',
                variables: 'y₀: 初始高度, v₀y: 竖直初速度, g: 重力加速度'
            },
            { name: '水平速度', formula: 'vx = v₀x', variables: '水平方向匀速' },
            { name: '竖直速度', formula: 'vy = v₀y − gt', variables: '竖直方向匀变速' },
            {
                name: '飞行时间',
                formula: 'T = 2v₀y / g',
                variables: 'v₀y: 竖直初速度, g: 重力加速度',
                condition: '落地时 y = 0'
            },
            {
                name: '最大高度',
                formula: 'H = v₀y² / (2g)',
                variables: 'v₀y: 竖直初速度, g: 重力加速度',
                condition: 'vy = 0 时'
            },
            {
                name: '水平射程',
                formula: 'R = v₀x · T',
                variables: 'v₀x: 水平初速度, T: 飞行时间',
                condition: '平地落地'
            }
        ],
        tips: [
            '水平方向不受力，做匀速直线运动',
            '竖直方向只受重力，做匀变速运动',
            '两个方向的运动独立，可分别分析',
            '轨迹为抛物线'
        ]
    },
    'uniform-accelerated': {
        title: '匀变速直线运动',
        formulas: [
            { name: '速度公式', formula: 'v = v₀ + at', variables: 'v₀: 初速度, a: 加速度, t: 时间' },
            { name: '位移公式', formula: 'x = x₀ + v₀t + ½at²', variables: 'x₀: 初始位置' },
            { name: '速度-位移', formula: 'v² = v₀² + 2a(x − x₀)', variables: '不含时间' }
        ],
        tips: ['加速度恒定', '适用于自由落体、刹车等场景']
    },
    'inclined-plane': {
        title: '斜面运动',
        formulas: [
            { name: '重力分量', formula: 'F∥ = mg sinθ', variables: 'θ: 斜面倾角', condition: '沿斜面方向' },
            { name: '支持力', formula: 'N = mg cosθ', variables: '垂直于斜面' },
            { name: '摩擦力', formula: 'f = μN = μmg cosθ', variables: 'μ: 摩擦系数' },
            { name: '加速度', formula: 'a = g(sinθ − μcosθ)', variables: '沿斜面方向', condition: '无初速度时' }
        ],
        tips: ['沿斜面方向分解重力', '摩擦力方向与运动方向相反']
    },
    'spring-oscillator': {
        title: '弹簧振子',
        formulas: [
            { name: '回复力', formula: 'F = −kx', variables: 'k: 劲度系数, x: 位移', condition: '胡克定律' },
            { name: '周期', formula: 'T = 2π√(m/k)', variables: 'm: 质量', condition: '简谐运动' },
            { name: '总能量', formula: 'E = ½kx² + ½mv²', variables: '势能 + 动能', condition: '机械能守恒' }
        ],
        tips: ['回复力与位移成正比、方向相反', '机械能守恒', '运动为简谐运动']
    },
    'collision-elastic': {
        title: '弹性碰撞',
        formulas: [
            {
                name: '动量守恒',
                formula: "m₁v₁ + m₂v₂ = m₁v₁' + m₂v₂'",
                variables: '碰撞前后总动量不变',
                condition: '所有碰撞'
            },
            {
                name: '动能守恒',
                formula: "½m₁v₁² + ½m₂v₂² = ½m₁v₁'² + ½m₂v₂'²",
                variables: '弹性碰撞动能守恒',
                condition: '仅弹性碰撞'
            },
            {
                name: '等质量弹性碰撞速度交换',
                formula: "v₁' = v₂,  v₂' = v₁",
                variables: 'm₁=m₂ 时',
                condition: '等质量弹性对心碰撞'
            }
        ],
        tips: [
            '弹性碰撞：动量守恒 + 动能守恒',
            '非弹性碰撞：动量守恒，动能不守恒',
            '完全非弹性碰撞：碰撞后两物体合为一体'
        ]
    },
    'electric-field': {
        title: '匀强电场中的带电粒子',
        formulas: [
            { name: '电场力', formula: 'F = qE', variables: 'q: 电荷量(C), E: 电场强度(N/C)', condition: '匀强电场' },
            { name: '加速度', formula: 'a = qE/m', variables: 'm: 粒子质量(kg)' },
            { name: '水平位移', formula: 'x = v₀x · t', variables: 'v₀x: 水平初速度', condition: '水平方向不受力' },
            { name: '竖直位移', formula: 'y = v₀y · t + ½at²', variables: 'a = qE/m' },
            { name: '电势能', formula: 'Ep = -qEy', variables: '以 y=0 为零势能点' },
            { name: '动能定理', formula: 'ΔEk = qEΔy', variables: '电场力做功等于动能变化' }
        ],
        tips: [
            '正电荷受力方向与电场方向相同，负电荷相反',
            '电场力是恒力，轨迹为抛物线',
            '类似重力场中的斜抛运动',
            '电场力做功与路径无关，只与始末位置有关'
        ]
    },
    'magnetic-field': {
        title: '匀强磁场中的带电粒子',
        formulas: [
            {
                name: '洛伦兹力',
                formula: 'F = qv × B',
                variables: 'q: 电荷量, v: 速度, B: 磁感应强度',
                condition: 'v ⊥ B 时'
            },
            { name: '洛伦兹力大小', formula: 'F = |q|vB', variables: '力始终垂直于速度方向' },
            { name: '回旋半径', formula: 'R = mv/(|q|B)', variables: 'm: 质量, v: 速率' },
            { name: '回旋周期', formula: 'T = 2πm/(|q|B)', variables: '与速度无关！' },
            { name: '角频率', formula: 'ω = |q|B/m', variables: '回旋角频率' }
        ],
        tips: [
            '洛伦兹力始终垂直于速度方向，不做功',
            '动能守恒，速率不变',
            '匀速圆周运动（当 v ⊥ B 时）',
            '回旋周期与速度无关——回旋加速器的原理',
            '正电荷和负电荷旋转方向相反'
        ]
    },
    collision: {
        title: '碰撞',
        formulas: [
            {
                name: '动量守恒',
                formula: "m₁v₁ + m₂v₂ = m₁v₁' + m₂v₂'",
                variables: '碰撞前后总动量不变',
                condition: '所有碰撞'
            },
            {
                name: '动能守恒',
                formula: "½m₁v₁² + ½m₂v₂² = ½m₁v₁'² + ½m₂v₂'²",
                variables: '弹性碰撞动能守恒',
                condition: '仅弹性碰撞'
            },
            { name: '恢复系数', formula: "e = (v₂' − v₁') / (v₁ − v₂)", variables: '0≤e≤1, e=1为弹性碰撞' }
        ],
        tips: [
            '弹性碰撞：动量守恒 + 动能守恒',
            '非弹性碰撞：动量守恒，动能不守恒',
            '完全非弹性碰撞：碰撞后两物体合为一体'
        ]
    },
    spring: {
        title: '弹簧振子',
        formulas: [
            { name: '回复力', formula: 'F = −kx', variables: 'k: 劲度系数, x: 位移', condition: '胡克定律' },
            { name: '周期', formula: 'T = 2π√(m/k)', variables: 'm: 质量', condition: '简谐运动' },
            { name: '总能量', formula: 'E = ½kx² + ½mv²', variables: '势能 + 动能', condition: '机械能守恒' }
        ],
        tips: ['回复力与位移成正比、方向相反', '机械能守恒（无阻尼时）', '运动为简谐运动']
    },
    'em-combined': {
        title: '电磁复合场',
        formulas: [
            { name: '电场力', formula: 'FE = qE', variables: 'q: 电荷量, E: 电场强度' },
            { name: '洛伦兹力', formula: 'FB = qv × B', variables: 'q: 电荷量, v: 速度, B: 磁感应强度' },
            { name: '速度选择器', formula: 'v = E/B', variables: '当电场力与洛伦兹力平衡时', condition: '匀速直线运动' }
        ],
        tips: [
            '电场力方向恒定，洛伦兹力随速度方向变化',
            '速度选择器：v = E/B 时粒子直线通过',
            '运动轨迹一般为摆线（旋轮线）'
        ]
    },
    'air-track': {
        title: '气垫导轨测速度',
        formulas: [
            { name: '平均速度', formula: 'v̄ = Δx / Δt', variables: 'Δx: 挡光片宽度, Δt: 挡光时间' },
            { name: '瞬时速度（近似）', formula: 'v ≈ Δx / Δt', variables: '当 Δt 足够小时', condition: '极限思想' },
            { name: '挡光时间', formula: 'Δt = Δx / v', variables: '用于反推速度' },
            {
                name: '匀速判据',
                formula: 'v₁ ≈ v₂',
                variables: 'v₁,v₂ 为两光电门测得的速度',
                condition: '|v₁−v₂|/v̄ < 1%'
            }
        ],
        tips: [
            '挡光片越窄（Δt 越小），平均速度越接近瞬时速度',
            '气垫导轨通过气孔喷气形成气垫，几乎消除摩擦，滑块可视为匀速运动',
            '调平导轨的判据：滑块经过两光电门时速度相等',
            '数字毫秒计精度通常为 1 ms，挡光时间通常为毫秒量级'
        ]
    },
    // ========== 必修一 第三章 相互作用——力 ==========
    'hooke-law': {
        title: '胡克定律 (弹簧弹力与形变量)',
        formulas: [
            {
                name: '胡克定律',
                formula: 'F = kx',
                variables: 'k: 劲度系数(N/m), x: 弹簧伸长量(m)',
                condition: '弹性限度内'
            },
            {
                name: '平衡条件',
                formula: 'kx = mg',
                variables: 'm: 钩码质量, g: 重力加速度',
                condition: '竖直悬挂静止时'
            },
            { name: '伸长量', formula: 'x = mg / k', variables: '由平衡条件推导' },
            { name: '劲度系数', formula: 'k = F / x = mg / x', variables: '实验测量公式' }
        ],
        tips: [
            '弹力方向始终指向弹簧原长方向 (回复力)',
            '劲度系数 k 由弹簧材料、粗细、长度决定，与外力无关',
            'F-x 图像为过原点的直线，斜率即为 k',
            '超过弹性限度后，胡克定律不再适用'
        ]
    },

    // ========== 选必一 第 1 章 动量守恒 ==========
    'projectile-collision': {
        title: '平抛碰撞 (动量守恒定律)',
        formulas: [
            {
                name: '动量守恒 (系统合外力为零)',
                formula: "m₁v₁ + m₂v₂ = m₁v₁' + m₂v₂'",
                variables: "v₁, v₂: 碰前速度; v₁', v₂': 碰后速度",
                condition: '所有碰撞 (宏观/微观, 低速/高速)'
            },
            {
                name: '一维弹性碰撞速度',
                formula: "v₁' = (m₁−m₂)v₁/(m₁+m₂) + 2m₂v₂/(m₁+m₂)",
                variables: "正方向规定后可得 v₁', v₂'",
                condition: '一维弹性碰撞'
            },
            { name: '动量', formula: 'p = mv', variables: 'p: 动量 (kg·m/s), m: 质量, v: 速度' },
            { name: '冲量公式', formula: 'I = Δp = FΔt', variables: '力对时间的累积效应' },
            { name: '恢复系数', formula: "e = (v₂' − v₁') / (v₁ − v₂)", variables: 'e=1 弹性; e=0 完全非弹性' }
        ],
        tips: [
            '动量守恒定律是自然界最普遍的守恒定律之一，适用于宏观和微观、低速和高速',
            '系统所受合外力为零时，总动量严格守恒',
            '爆炸、反冲、碰撞等过程内力远大于外力时，可近似用动量守恒处理',
            '动量是矢量，守恒需沿各方向分别列方程'
        ]
    },

    // ========== 选必一 第 2 章 简谐运动 / 共振 ==========
    'double-pendulum-sync': {
        title: '双摆 (单摆周期 + 混沌)',
        formulas: [
            {
                name: '单摆周期',
                formula: 'T = 2π√(L/g)',
                variables: 'L: 摆长, g: 重力加速度',
                condition: '小角度近似 (θ < 5°)'
            },
            { name: '单摆频率', formula: 'f = 1/(2π) · √(g/L)', variables: 'f: 频率 (Hz)' },
            { name: '单摆角频率', formula: 'ω = √(g/L)', variables: 'ω: 角频率 (rad/s)' },
            {
                name: '周期与摆球质量无关',
                formula: 'T 仅取决于 L 和 g',
                variables: '定性结论',
                condition: '同一地点 g 相同'
            },
            {
                name: '双摆 (混沌)',
                formula: '非线性耦合 → 对初值极度敏感',
                variables: '无简单解析解',
                condition: '不可预测，呈现混沌'
            }
        ],
        tips: [
            '单摆周期与摆球质量、振幅无关 (等时性)',
            '摆长是指悬点到摆球重心的距离',
            '双摆无解析解，呈现确定性混沌',
            '物理摆 (复摆) 周期 T = 2π√(I/mgh)'
        ]
    },
    'forced-vibration-freq': {
        title: '受迫振动',
        formulas: [
            {
                name: '受迫振动 (稳态) 位移',
                formula: 'x(t) = A·cos(ω_d·t + φ)',
                variables: 'A: 振幅, ω_d: 驱动力角频率, φ: 初相'
            },
            {
                name: '振幅-频率关系',
                formula: 'A = (F₀/m) / √((ω₀² − ω_d²)² + 4β²ω_d²)',
                variables: 'F₀: 驱动力幅值, ω₀: 固有角频率, β: 阻尼系数'
            },
            { name: '相位差', formula: 'tan φ = 2βω_d / (ω₀² − ω_d²)', variables: 'φ: 位移与驱动力的相位差' },
            { name: '固有角频率', formula: 'ω₀ = √(k/m)', variables: 'k: 劲度系数, m: 质量' },
            { name: '阻尼系数', formula: 'β = b/(2m)', variables: 'b: 阻尼常量' }
        ],
        tips: [
            '受迫振动稳定后的频率等于驱动频率，而非固有频率',
            '振幅 A 随 ω_d 变化：ω_d 接近 ω₀ 时发生共振',
            '阻尼 β 越小，共振峰越尖锐',
            '共振时 φ = π/2, 速度达到最大'
        ]
    },
    'resonance-curve': {
        title: '共振 (幅-频曲线)',
        formulas: [
            { name: '共振条件', formula: 'ω_d = ω₀', variables: '驱动力频率 = 固有频率', condition: '振幅达到最大' },
            { name: '品质因数', formula: 'Q = ω₀ / Δω', variables: 'Δω: 半功率带宽 (A_max/√2 处宽度)' },
            { name: '共振振幅', formula: 'A_max = F₀ / (2mβω₀)', variables: 'β: 阻尼系数', condition: 'ω_d = ω₀' },
            { name: '共振时相位差', formula: 'φ = π/2', variables: '位移滞后驱动力 90°' },
            { name: '共振能量', formula: 'E = ½kA²', variables: '系统储存的机械能' }
        ],
        tips: [
            '共振时系统从外界吸收能量最多',
            'Q 值越大，共振峰越尖锐，系统选频能力越强',
            '乐器的共鸣箱利用共振增强声音',
            '桥梁、机器需避免共振 (设计时使固有频率远离常见驱动频率)'
        ]
    },

    // ========== 选必一 第 3 章 机械波 ==========
    'sound-waveform': {
        title: '声波 (波形 + 强度)',
        formulas: [
            { name: '波速公式', formula: 'v = fλ', variables: 'v: 波速 (m/s), f: 频率 (Hz), λ: 波长 (m)' },
            { name: '简谐波表达式', formula: 'y = A·sin(2πx/λ − 2πft)', variables: 'A: 振幅, x: 位置, t: 时间' },
            { name: '波数', formula: 'k = 2π/λ', variables: 'k: 角波数 (rad/m)' },
            { name: '角频率', formula: 'ω = 2πf', variables: 'ω: 角频率 (rad/s)' },
            {
                name: '声强',
                formula: 'I = P/(4πr²) = ½ρvω²A²',
                variables: 'ρ: 介质密度, P: 声功率',
                condition: '球面波'
            },
            { name: '声强级', formula: 'L = 10·log₁₀(I/I₀) (dB)', variables: 'I₀ = 10⁻¹² W/m² (听阈)' }
        ],
        tips: [
            '声波是纵波，需要介质传播，真空中不能传声',
            '声速与介质种类和温度有关，空气中约 340 m/s (15°C)',
            '频率决定音调，振幅决定响度，波形决定音色',
            '超声波 (>20 kHz) 和次声波 (<20 Hz) 人耳听不到'
        ]
    },
    'water-diffraction': {
        title: '水波衍射',
        formulas: [
            { name: '衍射条件 (明显衍射)', formula: '障碍物/缝宽 a ≈ λ 或 a < λ', variables: 'a: 障碍物尺寸, λ: 波长' },
            { name: '衍射现象', formula: '波绕过障碍物继续传播', variables: '水波遇障碍物后形成环形波' },
            { name: '惠更斯原理', formula: '波前每点都是子波源', variables: '子波包络形成新波前' },
            { name: '波长与波速', formula: 'λ = v/f', variables: 'v: 水波波速, f: 波源频率' },
            { name: '衍射条纹 (单缝)', formula: '中央明纹最宽最亮', variables: '两侧明纹亮度递减' }
        ],
        tips: [
            '一切波都能发生衍射，衍射是波的特有现象',
            '缝宽越小 (接近波长)，衍射越明显',
            '水波衍射实验可直观看到波绕过障碍物',
            '声波衍射使人能隔墙听到声音'
        ]
    },
    'sound-interference': {
        title: '声波干涉 (双波源)',
        formulas: [
            {
                name: '相长干涉条件',
                formula: 'Δr = nλ (n = 0, ±1, ±2 ...)',
                variables: 'Δr: 两波源到该点的路程差',
                condition: '振动加强'
            },
            {
                name: '相消干涉条件',
                formula: 'Δr = (n + ½)λ (n = 0, ±1, ±2 ...)',
                variables: 'Δr: 路程差',
                condition: '振动减弱'
            },
            { name: '路程差', formula: 'Δr = |r₁ − r₂|', variables: 'r₁, r₂: 到两波源的距离' },
            { name: '相位差', formula: 'Δφ = 2π·Δr/λ', variables: 'Δφ: 两波在该点的相位差' },
            { name: '相干条件', formula: '频率相同、相位差恒定、振动方向相同', variables: '三条件缺一不可' }
        ],
        tips: [
            '干涉和衍射都是波特有的现象',
            '双缝干涉条纹等间距，明暗交替',
            '声干涉可形成"静音区" (主动降噪原理)',
            '驻波是干涉的特例 (两列反向传播的相干波)'
        ]
    },
    'doppler-effect': {
        title: '多普勒效应',
        formulas: [
            {
                name: '多普勒频移 (通用)',
                formula: "f' = f·(v ± v_o)/(v ∓ v_s)",
                variables: 'v: 波速, v_o: 观察者速度, v_s: 波源速度',
                condition: '分子分母符号约定: 靠近取 +, 远离取 −'
            },
            { name: '波源静止, 观察者靠近', formula: "f' = f·(v + v_o)/v", variables: "f' > f (频率升高)" },
            { name: '波源静止, 观察者远离', formula: "f' = f·(v − v_o)/v", variables: "f' < f (频率降低)" },
            { name: '观察者静止, 波源靠近', formula: "f' = f·v/(v − v_s)", variables: "f' > f (频率升高)" },
            { name: '观察者静止, 波源远离', formula: "f' = f·v/(v + v_s)", variables: "f' < f (频率降低)" },
            { name: '波源与观察者均运动', formula: "f' = f·(v ± v_o)/(v ∓ v_s)", variables: '靠近时分子加、分母减' }
        ],
        tips: [
            '多普勒效应是波源与观察者相对运动时观测到的频率变化',
            '火车汽笛音调变化、雷达测速、彩超都利用多普勒效应',
            '光波也有多普勒效应 (红移/蓝移)，用于测量天体运动速度',
            '冲击波 (音爆) 发生在波源速度超过波速时'
        ]
    },

    // ========== 选必一 第 4 章 光的干涉 / 衍射 / 偏振 ==========
    'thin-film': {
        title: '薄膜干涉 (等厚干涉)',
        formulas: [
            {
                name: '相长干涉 (反射光加强)',
                formula: '2nd = kλ (k = 1, 2, 3 ...)',
                variables: 'n: 薄膜折射率, d: 膜厚, λ: 光在真空中波长',
                condition: '考虑半波损失后'
            },
            {
                name: '相消干涉 (反射光减弱)',
                formula: '2nd = (k + ½)λ (k = 0, 1, 2 ...)',
                variables: '附加 λ/2 来自半波损失'
            },
            { name: '附加光程差', formula: 'Δ = λ/2', variables: '光从光疏到光密介质反射时', condition: '半波损失' },
            { name: '等厚干涉条纹', formula: '同一厚度对应同一级条纹', variables: '薄膜厚度不均匀时出现明暗条纹' },
            { name: '增透膜', formula: '2nd = λ/2', variables: '使反射光相消，透射光增强' }
        ],
        tips: [
            '薄膜干涉是光在薄膜上下表面反射后叠加形成的',
            '肥皂泡、油膜上的彩色条纹是薄膜干涉现象',
            '增透膜使反射光相消，镜头呈蓝紫色',
            '等厚干涉可检测光学表面平整度 (平晶检验)'
        ]
    },
    hologram: {
        title: '全息照相 (干涉记录 + 衍射再现)',
        formulas: [
            {
                name: '记录 (干涉)',
                formula: 'I = |R + O|² = |R|² + |O|² + R*O + RO*',
                variables: 'R: 参考光, O: 物光',
                condition: '两束相干光叠加'
            },
            { name: '干涉条纹间距', formula: 'd = λ/(2 sin(θ/2))', variables: 'θ: 参考光与物光夹角' },
            {
                name: '再现 (衍射)',
                formula: '用参考光照射全息图 → 衍射光重建物光波前',
                variables: '±1 级衍射光形成虚像和共轭实像'
            },
            { name: '全息图分辨率', formula: '空间频率 ~ 1000-5000 线/mm', variables: '需高分辨率记录介质' },
            { name: '与普通照片区别', formula: '记录振幅+相位 (全部信息)', variables: '普通照片只记录光强' }
        ],
        tips: [
            '全息照相分为记录和再现两步',
            '全息图任一小块都能再现完整图像 (可分割性)',
            '全息图具有三维立体感',
            '全息技术用于防伪、数据存储、干涉计量'
        ]
    },
    'single-slit': {
        title: '单缝衍射 (光强分布)',
        formulas: [
            {
                name: '暗纹条件',
                formula: 'a·sinθ = kλ (k = ±1, ±2 ...)',
                variables: 'a: 缝宽, θ: 衍射角, λ: 波长',
                condition: '暗纹位置'
            },
            {
                name: '明纹条件 (近似)',
                formula: 'a·sinθ = (2k+1)·λ/2 (k = ±1, ±2 ...)',
                variables: '明纹 (次极大) 位置'
            },
            { name: '中央明纹角宽度', formula: 'Δθ₀ = 2λ/a', variables: '中央明纹最宽最亮' },
            { name: '光强分布', formula: 'I = I₀·(sinβ/β)², β = πa·sinθ/λ', variables: 'β: 相位差参数' },
            { name: '中央明纹线宽度', formula: 'Δx = 2f·λ/a', variables: 'f: 透镜焦距', condition: '屏幕上观察' }
        ],
        tips: [
            '单缝衍射条纹: 中央明纹最宽最亮，两侧明纹亮度迅速递减',
            '缝宽 a 越小，衍射越明显，条纹越宽',
            '白光照射时，中央明纹为白色，两侧呈彩色',
            '圆孔衍射的爱里斑: θ = 1.22λ/D (光学仪器分辨率极限)'
        ]
    },
    'diffraction-grating': {
        title: '光栅衍射 (光栅方程)',
        formulas: [
            {
                name: '光栅方程 (主极大)',
                formula: 'd·sinθ = kλ (k = 0, ±1, ±2 ...)',
                variables: 'd: 光栅常数 (相邻缝间距), k: 级数'
            },
            { name: '光栅常数', formula: 'd = a + b', variables: 'a: 缝宽, b: 不透光部分宽度' },
            { name: '缺级条件', formula: "k = (d/a)·k' (k' = ±1, ±2 ...)", variables: '主极大与单缝暗纹重合时缺级' },
            { name: '分辨本领', formula: 'R = λ/Δλ = kN', variables: 'N: 光栅总缝数, k: 衍射级次' },
            { name: '光栅线数', formula: "N' = 1/d (线/mm)", variables: '常见 300-1200 线/mm' }
        ],
        tips: [
            '光栅衍射是多缝干涉受单缝衍射调制的结果',
            '光栅常数 d 越小，衍射角越大，条纹分得越开',
            '光栅光谱仪利用光栅方程测定光的波长',
            '白光通过光栅产生连续光谱 (按波长分开)'
        ]
    },
    'polarization-malus': {
        title: '偏振光 (马吕斯定律)',
        formulas: [
            { name: '马吕斯定律', formula: 'I = I₀·cos²θ', variables: 'I₀: 入射偏振光强, θ: 两偏振片透振方向夹角' },
            { name: '自然光通过偏振片', formula: 'I = I₀/2', variables: '自然光各方向振动均匀' },
            { name: '布儒斯特定律', formula: 'tanθ_B = n₂/n₁', variables: 'θ_B: 布儒斯特角, 反射光为完全偏振光' },
            { name: '偏振度', formula: 'P = (I_max − I_min)/(I_max + I_min)', variables: 'P=0 自然光, P=1 完全偏振光' },
            {
                name: '反射与折射偏振',
                formula: '反射光部分偏振, 折射光部分偏振',
                variables: '布儒斯特角时反射光完全偏振'
            }
        ],
        tips: [
            '偏振是横波特有的现象，纵波无偏振',
            '自然光经反射、折射、散射后可获得部分偏振光',
            '3D 电影、液晶显示、太阳镜都利用偏振原理',
            '蜜蜂、蚂蚁利用天空偏振光导航'
        ]
    },

    'sliding-friction': {
        title: '滑动摩擦力 (f=μN)',
        formulas: [
            { name: '滑动摩擦力', formula: 'f = μN', variables: 'μ: 动摩擦因数, N: 正压力(N)', condition: '滑动摩擦' },
            {
                name: '正压力 (水平面)',
                formula: 'N = mg',
                variables: 'm: 物体质量, g: 重力加速度',
                condition: '水平面无竖直加速度'
            },
            { name: '动摩擦因数', formula: 'μ = f / N', variables: '由接触面材料和粗糙程度决定' },
            {
                name: '匀速条件',
                formula: 'F_pull = f = μmg',
                variables: '外力等于摩擦力时匀速',
                condition: '水平面匀速运动'
            },
            { name: '加速条件', formula: 'a = (F_pull − f) / m', variables: '外力大于摩擦力时加速' }
        ],
        tips: [
            '滑动摩擦力方向始终与相对运动方向相反',
            '动摩擦因数 μ 只与接触面性质有关，与正压力、速度无关',
            'f-N 图像为过原点的直线，斜率即为 μ',
            'μ 通常小于 1，但橡胶与地面等特殊组合可大于 1'
        ]
    },
    'force-composition': {
        title: '力的合成 (平行四边形定则)',
        formulas: [
            {
                name: '合力大小 (余弦定理)',
                formula: 'F = √(F₁² + F₂² + 2·F₁·F₂·cosθ)',
                variables: 'F₁,F₂: 分力, θ: 夹角'
            },
            { name: '合力方向', formula: 'tanφ = F₂·sinθ / (F₁ + F₂·cosθ)', variables: 'φ: 合力与 F₁ 的夹角' },
            { name: '同向合成 (θ=0°)', formula: 'F = F₁ + F₂', variables: '最大合力' },
            { name: '反向合成 (θ=180°)', formula: 'F = |F₁ − F₂|', variables: '最小合力' },
            { name: '垂直合成 (θ=90°)', formula: 'F = √(F₁² + F₂²)', variables: '勾股定理' }
        ],
        tips: [
            '平行四边形定则适用于所有矢量合成，不限于力',
            '合力大小范围：|F₁−F₂| ≤ F ≤ F₁+F₂',
            'θ=0° 时合力最大，θ=180° 时合力最小',
            '多个力合成可两两依次合成，结果与顺序无关'
        ]
    },
    'newton-third-law': {
        title: '牛顿第三定律 (作用力与反作用力)',
        formulas: [
            { name: '牛顿第三定律', formula: 'F_AB = −F_BA', variables: 'F_AB: A对B的力, F_BA: B对A的力' },
            { name: '大小关系', formula: '|F_AB| = |F_BA|', variables: '大小相等' },
            { name: '方向关系', formula: 'F_AB 与 F_BA 方向相反', variables: '沿同一直线' },
            { name: '系统性', formula: '作用在两个不同物体上', variables: '不能抵消，不同于平衡力' },
            { name: '同时性', formula: '同时产生、同时变化、同时消失', variables: '不可独立存在' }
        ],
        tips: [
            '作用力与反作用力作用在不同物体上，不能抵消',
            '平衡力作用在同一物体上，可以抵消',
            '作用力与反作用力总是同种性质的力',
            '与运动状态无关：静止、匀速、加速时都成立'
        ]
    },

    // ========== 选必二 第 2 章 电磁感应 ==========
    'current-balance': {
        title: '电流天平 (安培力 F=BIL)',
        formulas: [
            {
                name: '安培力',
                formula: 'F = BIL',
                variables: 'B: 磁感应强度(T), I: 电流(A), L: 导体棒有效长度(m)',
                condition: 'B⊥L, 匀强磁场'
            },
            {
                name: '天平平衡',
                formula: 'F = mg',
                variables: 'm: 砝码质量(kg), g: 重力加速度',
                condition: '天平水平平衡时'
            },
            { name: '磁感应强度', formula: 'B = F / (IL)', variables: '由天平平衡求 B' },
            { name: '多匝线圈安培力', formula: 'F = NBIL', variables: 'N: 线圈匝数', condition: 'N 匝完全相同线圈' }
        ],
        tips: [
            '电流天平是测量磁场强度的精密仪器',
            '安培力方向由左手定则判断',
            '电流天平可通过已知 B 测 I, 或通过已知 I 测 B',
            '天平平衡时安培力与砝码重力相等'
        ]
    },
    'eddy-current': {
        title: '涡流 (电磁感应 + 热效应)',
        formulas: [
            { name: '法拉第电磁感应定律', formula: 'e = -dΦ/dt', variables: 'Φ: 磁通量(Wb), t: 时间(s)' },
            {
                name: '涡流功率密度',
                formula: 'P = π²B²d²f² / (6ρ)',
                variables: 'd: 材料厚度(m), f: 磁场变化频率(Hz), ρ: 电阻率(Ω·m)',
                condition: '交变磁场中导体圆盘'
            },
            {
                name: '涡流阻尼力',
                formula: 'F_eddy = -k · v',
                variables: 'k: 阻尼系数, v: 导体相对磁场运动速度',
                condition: '方向始终阻碍相对运动'
            },
            {
                name: '集肤深度',
                formula: 'δ = √(2ρ / (ωμ))',
                variables: 'ω: 角频率, μ: 磁导率',
                condition: '高频时电流集中在表面'
            }
        ],
        tips: [
            '涡流是电磁感应在整块导体中形成的闭合电流',
            '电磁炉、电磁阻尼、金属探测器都是涡流应用',
            '硅钢片叠压铁芯可减小涡流损耗',
            '集肤深度 δ 随频率升高而减小'
        ]
    },
    'em-damping': {
        title: '电磁阻尼 (涡流制动)',
        formulas: [
            {
                name: '阻尼力',
                formula: 'F_d = -k · v',
                variables: 'k: 阻尼系数(N·s/m), v: 速度(m/s)',
                condition: '方向始终与速度方向相反'
            },
            {
                name: '能量损耗',
                formula: 'E_diss = ½mv₀²',
                variables: 'm: 振子质量, v₀: 初始速度',
                condition: '振动停止时全部动能转化为热量'
            },
            { name: '阻尼时间常数', formula: 'τ = m / k', variables: '振幅衰减到 1/e 所需时间' },
            {
                name: '阻尼比',
                formula: 'ζ = k / (2√(mω₀²))',
                variables: 'ω₀: 固有角频率',
                condition: 'ζ > 0 即存在阻尼'
            }
        ],
        tips: [
            '电磁阻尼本质是涡流受到的安培力阻碍相对运动',
            '灵敏电流表铝框利用电磁阻尼使指针快速稳定',
            '电磁阻尼力与速度成正比, 速度越大阻尼越强',
            '阻尼比 ζ 决定振动衰减快慢'
        ]
    },
    'mutual-inductance': {
        title: '互感 (双线圈耦合)',
        formulas: [
            {
                name: '互感电动势',
                formula: 'E₂ = -M · dI₁/dt',
                variables: 'M: 互感系数(H), I₁: 初级线圈电流',
                condition: '初级线圈电流变化时次级线圈产生的电动势'
            },
            {
                name: '螺线管互感系数',
                formula: 'M = μ₀n₁n₂A / l',
                variables: 'n₁,n₂: 单位长度匝数, A: 截面积, l: 长度'
            },
            { name: '与耦合系数关系', formula: 'M = k√(L₁L₂)', variables: 'k: 耦合系数(0≤k≤1), L₁,L₂: 自感系数' },
            { name: '互感能量', formula: 'W = M·I₁·I₂', variables: '两线圈电流同时存在时储存的磁场能' }
        ],
        tips: [
            '互感现象是一个线圈电流变化在另一个线圈中产生感应电动势',
            '变压器利用互感原理实现电压变换',
            '理想耦合(k=1)的两线圈完全磁通交链',
            '互感系数与线圈截面积、匝数、相对位置有关'
        ]
    },
    'self-inductance': {
        title: '自感 (线圈自身电磁感应)',
        formulas: [
            {
                name: '自感电动势',
                formula: 'E = -L · dI/dt',
                variables: 'L: 自感系数(H), I: 线圈自身电流',
                condition: '电流变化时线圈自身产生的感应电动势'
            },
            { name: '螺线管自感系数', formula: 'L = μ₀n²A / l', variables: 'n: 单位长度匝数, A: 截面积, l: 长度' },
            { name: '线圈储能', formula: 'W = ½LI²', variables: '线圈中磁场储存的能量(J)' },
            {
                name: 'RL 电路时间常数',
                formula: 'τ = L / R',
                variables: 'R: 回路电阻',
                condition: '电流衰减到 1/e 所需时间'
            }
        ],
        tips: [
            '自感系数 L 描述线圈阻碍电流变化的能力',
            '镇流器利用自感产生瞬时高压点燃灯管',
            '自感线圈在直流稳态时相当于导线(dI/dt=0)',
            '断开含大自感线圈的开关时会产生电弧'
        ]
    },

    // ========== 选必二 第 3 章 交变电流与电磁波 ==========
    'em-wave-communication': {
        title: '电磁波发射 (开放电路 + LC 振荡)',
        formulas: [
            { name: '电磁波波速', formula: 'c = fλ', variables: 'c = 3×10⁸ m/s, f: 频率, λ: 波长' },
            { name: 'LC 振荡周期', formula: 'T = 2π√(LC)', variables: 'L: 电感(H), C: 电容(F)' },
            { name: '电磁振荡能量', formula: 'W = ½LI² + ½CV²', variables: '磁场能 + 电场能', condition: '总能量守恒' },
            {
                name: '开放电路辐射',
                formula: 'P ∝ f⁴',
                variables: '辐射功率与频率四次方成正比',
                condition: '频率越高辐射能力越强'
            }
        ],
        tips: [
            '电磁波由 LC 振荡电路产生, 频率 f = 1/(2π√(LC))',
            '开放电路(天线+地线)可提高电磁辐射效率',
            '调制(调幅/调频)后才能携带信息发射',
            '电磁波在真空中以光速传播, 速度约为 3×10⁸ m/s'
        ]
    },
    'em-spectrum': {
        title: '电磁波谱 (按频率排序)',
        formulas: [
            { name: '波速-波长-频率', formula: 'c = fλ', variables: 'c = 3×10⁸ m/s (真空中光速)' },
            { name: '光子能量', formula: 'E = hf = hc/λ', variables: 'h = 6.63×10⁻³⁴ J·s (普朗克常量)' },
            {
                name: '频率范围 (从低到高)',
                formula: 'f_radio < f_micro < f_IR < f_vis < f_UV < f_X < f_γ',
                variables: '无线电波→微波→红外→可见→紫外→X射线→γ射线'
            },
            { name: '可见光波长范围', formula: 'λ ≈ 400-700 nm', variables: '紫光到红光, 频率约 4.3-7.5×10¹⁴ Hz' }
        ],
        tips: [
            '电磁波谱按频率(或波长)从低到高排列',
            '无线电波用于通信和广播, 微波用于雷达和加热',
            '红外线和紫外线不可见, 可见光只占电磁波谱极小段',
            'γ射线能量最高, 穿透能力最强, 可用于肿瘤治疗'
        ]
    },

    // ========== 选必二 第 4 章 传感器 ==========
    'hall-effect': {
        title: '霍尔效应 (VH=IB/nqd)',
        formulas: [
            {
                name: '霍尔电压',
                formula: 'V_H = IB / (nqd)',
                variables: 'I: 电流(A), B: 磁感应强度(T), n: 载流子浓度, q: 载流子电量, d: 导体厚度(m)'
            },
            { name: '霍尔系数', formula: 'R_H = 1 / (nq)', variables: '仅由载流子性质决定' },
            { name: '电流微观表达式', formula: 'I = nqvdA', variables: 'v: 载流子漂移速度, A: 横截面积' },
            { name: '霍尔元件灵敏度', formula: 'K_H = 1 / (nqd)', variables: 'K_H 越大, 霍尔电压越高' }
        ],
        tips: [
            '霍尔效应: 载流导体在磁场中产生横向电势差',
            '霍尔电压正负可判断载流子类型 (空穴/电子)',
            '霍尔元件用于测磁场/电流/位置等',
            '半导体材料载流子浓度低, 霍尔效应更显著'
        ]
    },
    'reed-switch': {
        title: '干簧管 (磁场吸合原理)',
        formulas: [
            {
                name: '螺线管内部磁场',
                formula: 'B = μ₀nI',
                variables: 'μ₀: 真空磁导率, n: 单位长度匝数, I: 电流',
                condition: '长直螺线管内部'
            },
            {
                name: '吸合条件',
                formula: 'F_m > F_spring',
                variables: 'F_m: 磁力, F_spring: 簧片弹力',
                condition: '磁场使两簧片磁化吸合'
            },
            { name: '磁化强度', formula: 'M = χ·H', variables: 'χ: 磁化率, H: 磁场强度', condition: '铁磁材料磁化' },
            { name: '磁滞回线', formula: 'B-H 曲线', variables: '有剩磁和矫顽力', condition: '铁磁材料特有' }
        ],
        tips: [
            '干簧管是一种磁控开关, 玻璃管内封装两个铁磁簧片',
            '外加磁场时簧片磁化吸合, 电路接通',
            '撤去磁场, 簧片弹力使其断开',
            '干簧管广泛用于门磁传感器、液位计等'
        ]
    },
    photoresistor: {
        title: '光敏电阻 (R-L 特性曲线)',
        formulas: [
            {
                name: '照度-电阻特性',
                formula: 'R = R₀ · (E/E₀)^{−α}',
                variables: 'E: 照度(lx), α: 灵敏度指数(0.5-1), R₀: E₀ 时的电阻'
            },
            { name: '欧姆定律', formula: 'I = V / R', variables: 'R 随照度变化, 故 I 随照度变化' },
            { name: '电功率', formula: 'P = V² / R', variables: '外加电压恒定时功率与照度正相关' },
            { name: '相对变化率', formula: '(R₀ − R) / R₀ = 1 − (E/E₀)^{−α}', variables: '光照越强电阻变化越大' }
        ],
        tips: [
            '光敏电阻 (LDR) 阻值随光照增强而减小',
            '常用材料: 硫化镉(CdS)、硒化镉(CdSe)',
            'α 越大, 照度-电阻曲线越陡, 灵敏度越高',
            '光敏电阻响应速度较慢, 不适用于高频场合'
        ]
    },
    thermistor: {
        title: '热敏电阻 (NTC 指数特性)',
        formulas: [
            {
                name: 'NTC 电阻-温度特性',
                formula: 'R = R₀ · exp(B·(1/T − 1/T₀))',
                variables: 'B: 材料系数(K), T: 绝对温度(K), R₀: T₀ 时电阻'
            },
            { name: '温度系数', formula: 'α = −B / T²', variables: '负温度系数 (NTC) 电阻随温度升高而减小' },
            {
                name: '电阻变化率',
                formula: '(R − R₀)/R₀ = exp(B·(1/T − 1/T₀)) − 1',
                variables: '温度升高时阻值迅速下降'
            },
            { name: '线性化近似 (小ΔT)', formula: 'R ≈ R₀ · (1 + α · (T − T₀))', variables: 'ΔT 较小时可近似线性' }
        ],
        tips: [
            '负温度系数(NTC)热敏电阻: 温度升高 → 电阻减小',
            '正温度系数(PTC)热敏电阻: 温度升高 → 电阻增大',
            '热敏电阻广泛用于测温、温度补偿、过流保护',
            'B 值越大, 温度灵敏度越高'
        ]
    },
    'strain-gauge': {
        title: '应变片 (惠斯通电桥 + ΔR/R=Kε)',
        formulas: [
            { name: '应变效应', formula: 'ΔR/R = Kε', variables: 'K: 灵敏系数(~2), ε: 应变(ΔL/L)' },
            { name: '应变定义', formula: 'ε = ΔL/L', variables: 'ΔL: 长度变化, L: 原长' },
            { name: '单臂电桥输出', formula: 'V_out ≈ V_ex · Kε / 4', variables: 'V_ex: 激励电压, 单臂工作时' },
            { name: '全桥输出', formula: 'V_out = V_ex · Kε', variables: '四片应变片组成全桥, 灵敏度提高 4 倍' }
        ],
        tips: [
            '应变片将机械形变转化为电阻变化',
            '惠斯通电桥将微小电阻变化转为电压信号',
            '全桥接法灵敏度最高, 温度补偿效果最好',
            '应变片广泛用于称重传感器、压力传感器'
        ]
    },
    'security-alarm': {
        title: '报警电路 (与非门逻辑)',
        formulas: [
            {
                name: '与非门逻辑',
                formula: "Y = (A·B)' = A' + B'",
                variables: "A,B: 输入(0/1), Y: 输出, ' 表示取反",
                condition: '先与后非'
            },
            { name: '真值表', formula: '00→1, 01→1, 10→1, 11→0', variables: '仅当所有输入为 1 时输出为 0' },
            { name: '逻辑等价', formula: 'Y = NOT(A AND B)', variables: '可实现任何逻辑功能的通用门' },
            { name: '布尔代数', formula: "(XY)' = X' + Y' (德摩根定理)", variables: '与非门+非门 = 与门' }
        ],
        tips: [
            '报警电路核心是逻辑门判断各种传感器条件',
            '与非门: 所有输入高 → 输出低; 任一输入低 → 输出高',
            '布尔代数用于化简复杂逻辑表达式',
            '门磁/红外/烟感多传感器通过与非门组合触发报警'
        ]
    },
    'light-control-switch': {
        title: '光控开关 (LDR 分压 + 三极管驱动)',
        formulas: [
            {
                name: '分压电路输出电压',
                formula: 'V_out = V_cc · R_fixed / (R_LDR + R_fixed)',
                variables: 'V_cc: 电源电压, R_LDR: 光敏电阻, R_fixed: 固定电阻'
            },
            {
                name: '三极管基极电流',
                formula: 'I_b = (V_out − V_BE) / R_b',
                variables: 'V_BE ≈ 0.7V (硅管), R_b: 基极限流电阻'
            },
            {
                name: '驱动条件',
                formula: 'I_b > I_c / β',
                variables: 'β: 电流放大系数, I_c: 集电极所需电流(继电器/LED)'
            },
            {
                name: '照度阈值判断',
                formula: '当 V_out > V_BE + I_b·R_b 时三极管导通',
                variables: '调节 R_fixed 可改变光照阈值'
            }
        ],
        tips: [
            '光控开关利用光敏电阻阻值变化实现电路自动通断',
            '白天光照强 → R_LDR 小 → V_out 低 → 三极管截止 → 灯灭',
            '夜晚光照弱 → R_LDR 大 → V_out 高 → 三极管导通 → 灯亮',
            '调节分压电阻 R_fixed 可设定光照阈值'
        ]
    },

    // ========== 选必三 第 3 章 热学 (10 个场景) ==========
    diffusion: {
        title: '扩散现象 (菲克定律 + 爱因斯坦扩散)',
        formulas: [
            {
                name: '菲克第一定律 (扩散通量)',
                formula: 'J = −D · dC/dx',
                variables: 'J: 扩散通量(量·m⁻²·s⁻¹), D: 扩散系数(m²/s), C: 浓度(kg/m³ 或 mol/m³)',
                condition: '稳态扩散'
            },
            {
                name: '浓度梯度',
                formula: 'dC/dx = (C₂ − C₁) / Δx',
                variables: '浓度梯度, 方向: 浓度升高方向',
                condition: '一维线性近似'
            },
            {
                name: '爱因斯坦扩散公式',
                formula: '⟨r²⟩ = 6Dt (3D)',
                variables: '⟨r²⟩: 均方位移, D: 扩散系数, t: 扩散时间',
                condition: '各向同性介质布朗粒子'
            },
            { name: '1D 爱因斯坦扩散', formula: '⟨x²⟩ = 2Dt', variables: '⟨x²⟩: 一维均方位移', condition: '一维扩散' }
        ],
        tips: [
            '扩散是分子热运动的宏观表现, 温度越高扩散越快',
            '扩散系数 D 与温度 T 的关系: D ∝ T (气体) 或 D ~ T/η (斯托克斯-爱因斯坦)',
            '菲克第一定律是稳态扩散; 非稳态用菲克第二定律 ∂C/∂t = D·∂²C/∂x²',
            '扩散方向从高浓度向低浓度, 不可自发反向 (符合热力学第二定律)'
        ]
    },
    'brownian-motion': {
        title: '布朗运动 (爱因斯坦公式)',
        formulas: [
            {
                name: '位移统计 (一维)',
                formula: '⟨x²⟩ = 2Dt',
                variables: '⟨x²⟩: 均方位移(m²), D: 扩散系数(m²/s), t: 观测时间(s)',
                condition: '长时间的统计平均'
            },
            {
                name: '爱因斯坦扩散系数 (球形粒子)',
                formula: 'D = kT/(6πηr)',
                variables: 'k: 玻尔兹曼常量, T: 绝对温度, η: 液体粘度, r: 粒子半径',
                condition: '斯托克斯-爱因斯坦关系 (球形粒子)'
            },
            {
                name: '郎之万方程',
                formula: 'm · dv/dt = −γv + ξ(t)',
                variables: 'γ: 阻力系数(=6πηr), ξ(t): 随机分子碰撞力',
                condition: '微观瞬时方程'
            },
            { name: '均方位移 (3D)', formula: '⟨r²⟩ = 6Dt', variables: '三维空间中布朗粒子的均方位移' }
        ],
        tips: [
            '布朗运动间接证明了分子的无规则热运动',
            '爱因斯坦1905年用统计力学解释布朗运动, 是阿伏伽德罗常数测定方法之一',
            '布朗粒子越小, 液体温度越高, 布朗运动越剧烈',
            '布朗运动不是分子热运动本身, 而是分子碰撞的宏观结果'
        ]
    },
    'oil-film': {
        title: '油膜法测分子直径',
        formulas: [
            {
                name: '分子直径 (油膜法)',
                formula: 'd = V / S',
                variables: 'V: 油酸体积(m³), S: 油膜面积(m²), d: 油膜厚度 ≈ 分子直径(m)',
                condition: '单分子层, 油酸视为球形/立方紧密排列'
            },
            {
                name: '油酸溶液滴体积',
                formula: 'V_drop = V_solution / n_drops',
                variables: 'V_solution: 滴入溶液体积, n_drops: 总滴数',
                condition: '先测每滴体积'
            },
            {
                name: '纯油酸体积',
                formula: 'V = V_drop × η',
                variables: 'η: 油酸浓度 (体积分数)',
                condition: '1mL 油酸酒精溶液浓度约 1:200'
            },
            {
                name: '阿伏伽德罗常数 (球形模型)',
                formula: 'N_A = 6M / (ρπd³)',
                variables: 'M: 摩尔质量, ρ: 密度, d: 分子直径',
                condition: '球形模型, 忽略分子间隙'
            }
        ],
        tips: [
            '实验中油酸在水面自动铺展为单分子层, 厚度约 10⁻⁹ ~ 10⁻¹⁰ m',
            '痱子粉 (或石膏粉) 显示油膜轮廓, 轮廓稳定后再描图',
            '分子直径数量级 ~ 10⁻¹⁰ m (即 0.1 nm)',
            '此方法提供分子大小的数量级估计, 不精确给出分子形状'
        ]
    },
    'liquid-mixing': {
        title: '液体混合 (溶液的熵变)',
        formulas: [
            {
                name: '理想溶液混合熵',
                formula: 'ΔS_mix = −R(n₁lnx₁ + n₂lnx₂)',
                variables: 'R: 气体常量(8.314 J/mol·K), n₁,n₂: 两液体的物质的量, x₁,x₂: 摩尔分数',
                condition: '理想溶液等温等压混合'
            },
            { name: '摩尔分数', formula: 'xᵢ = nᵢ / Σnⱼ', variables: 'x₁ + x₂ = 1' },
            {
                name: '混合焓 (理想溶液)',
                formula: 'ΔH_mix = 0',
                variables: '理想溶液无热效应',
                condition: '理想溶液假设'
            },
            {
                name: '混合自由能',
                formula: 'ΔG_mix = ΔH_mix − TΔS_mix = RT(n₁lnx₁ + n₂lnx₂)',
                variables: 'ΔS_mix > 0 → ΔG_mix < 0 → 过程自发',
                condition: '等温等压'
            }
        ],
        tips: [
            '混合过程熵增加, 是自发的不可逆过程',
            '酒精与水混合后总体积小于混合前体积之和 (分子间作用)',
            '理想溶液假设: 任意比例互溶, ΔV_mix = 0, ΔH_mix = 0',
            '非理想溶液需引入活度系数修正'
        ]
    },
    'molecular-force': {
        title: '分子力曲线 (Lennard-Jones)',
        formulas: [
            {
                name: 'Lennard-Jones 势',
                formula: 'U(r) = 4ε[(σ/r)¹² − (σ/r)⁶]',
                variables: 'ε: 势阱深度, σ: 分子直径(r = 2^(1/6)σ 时势能零点)',
                condition: '对势, 适用中性分子'
            },
            {
                name: '分子力',
                formula: 'F = −dU/dr = 24ε[−2(σ/r)¹³ + (σ/r)⁷]',
                variables: 'F > 0 斥力, F < 0 引力',
                condition: '力是势的负梯度'
            },
            {
                name: '平衡位置',
                formula: 'r₀ = 2^(1/6)σ ≈ 1.122σ',
                variables: 'F(r₀) = 0, U(r₀) = −ε',
                condition: '稳定平衡'
            },
            {
                name: 'r⁻¹² 项 (排斥)',
                formula: 'A/r¹² (Born-Mayer 排斥项)',
                variables: '物理图像: 电子云重叠导致的泡利排斥',
                condition: '短程排斥 ~ 原子内部电子不可压缩'
            }
        ],
        tips: [
            '当 r < r₀ 时, 斥力主导, 随 r 减小急剧增大',
            '当 r > r₀ 时, 引力主导 (范德华力/色散力)',
            'Lennard-Jones 势是分子动力学模拟的标准模型',
            '平衡位置 r₀ 对应固体/液体的特征分子间距 (约 3~4 Å)'
        ]
    },
    'melting-curve': {
        title: '熔化曲线 (熔点 + 潜热)',
        formulas: [
            {
                name: '熔化吸收的热量 (熔化热)',
                formula: 'Q = mL',
                variables: 'm: 物体质量(kg), L: 熔化热(J/kg), 冰 L=3.34×10⁵ J/kg',
                condition: '温度不变'
            },
            { name: '内能增量', formula: 'ΔU = Q + W', variables: 'W: 外界对系统做功', condition: '热力学第一定律' },
            {
                name: '固态→液态 (W ≈ 0)',
                formula: 'ΔU ≈ Q',
                variables: '几乎不做功时',
                condition: '大部分固体熔化, 熔化热全部用于增加内能'
            },
            {
                name: '晶体 T-t 图像',
                formula: '水平段(平台) → 熔化/凝固过程',
                variables: '平台温度 = 熔点',
                condition: '晶体熔化时有确定的熔点'
            }
        ],
        tips: [
            '晶体有固定熔点, 非晶体没有 (玻璃软化, 无平台)',
            '熔化过程吸收热量但温度不变 → 内能增加 (分子势能增加)',
            '晶体的 T-t 曲线平台段斜率为 0 (温度不变)',
            '同一种物质的熔点和凝固点相同'
        ]
    },
    'surface-tension': {
        title: '表面张力 (系数 σ)',
        formulas: [
            {
                name: '表面张力公式',
                formula: 'F = σL',
                variables: 'F: 液面边界张力(N), σ: 表面张力系数(N/m), L: 液面边界长度(m)'
            },
            { name: '表面张力系数定义', formula: 'σ = F/L', variables: 'σ: 单位长度上的表面张力 (N/m)' },
            {
                name: '表面能与表面积',
                formula: 'E = σA',
                variables: 'E: 表面能(J), A: 液膜表面积(m²), σ: 比表面能(J/m²)'
            },
            {
                name: 'Wilson 公式 (σ-T 线性)',
                formula: 'σ(T) = σ₀ − a(T − T₀)',
                variables: 'a > 0: 温度升高, σ 线性减小',
                condition: '远离临界温度时近似线性'
            }
        ],
        tips: [
            '表面张力由表面层分子引力不平衡导致 (表面层分子稀疏, 引力占优)',
            '温度升高时 σ 减小, 到临界温度时 σ → 0',
            '水滴成球形是表面张力最小化面积的结果',
            '肥皂、洗涤剂是表面活性剂, 降低水的 σ'
        ]
    },
    capillary: {
        title: '毛细上升 (Jurin 公式)',
        formulas: [
            {
                name: 'Jurin 公式 (毛细上升高度)',
                formula: 'h = 2σcosθ / (ρgr)',
                variables: 'σ: 表面张力系数, θ: 接触角, ρ: 液体密度, g: 重力加速度, r: 毛细管半径',
                condition: '管内弯月面为球面'
            },
            {
                name: '下降情形',
                formula: 'h < 0 (θ > 90° 时水银)',
                variables: 'cosθ < 0 对应下降',
                condition: '水银在玻璃管中下降'
            },
            {
                name: '弯月面曲率半径',
                formula: 'R = r / cosθ',
                variables: 'R: 弯月面球冠半径, r: 毛细管半径',
                condition: '完全润湿 θ = 0° 时 R = r'
            },
            {
                name: '压强差 (拉普拉斯压强)',
                formula: 'Δp = 2σ/R = 2σcosθ/r',
                variables: 'Δp: 弯月面两侧的附加压强',
                condition: '单侧弯曲表面'
            }
        ],
        tips: [
            '管径越小, 上升高度越大 (细管中毛细现象更明显)',
            '完全润湿 (θ = 0°, cosθ = 1) 时上升高度最大',
            '不润湿 (θ > 90°, 如水银) 时液面下降',
            '植物根系吸水、砖块吸水、纸巾吸水都利用毛细现象'
        ]
    },
    wetting: {
        title: '润湿与不润湿 (Young 方程)',
        formulas: [
            {
                name: 'Young 方程',
                formula: 'σ_sv = σ_sl + σ_lv·cosθ',
                variables: 'σ_sv: 固-气界面能, σ_sl: 固-液界面能, σ_lv: 液体表面张力, θ: 平衡接触角',
                condition: '热力学平衡'
            },
            {
                name: '铺展系数',
                formula: 'S = σ_sv − σ_sl − σ_lv',
                variables: 'S > 0 自发铺展; S < 0 形成液滴',
                condition: 'S 越大铺展越强'
            },
            {
                name: '接触角判据',
                formula: 'θ < 90° → 润湿; θ > 90° → 不润湿',
                variables: '水-玻璃 θ≈0°; 水银-玻璃 θ≈139°',
                condition: '常用判据'
            },
            {
                name: 'Young-Dupré 方程',
                formula: 'σ(1 + cosθ) = W_ad',
                variables: 'W_ad: 粘附功 (J/m²)',
                condition: '热力学平衡, 理想光滑表面'
            }
        ],
        tips: [
            '接触角 θ 是固-液-气三相接触点的夹角, 决定润湿程度',
            '水在玻璃上几乎完全润湿 (θ ≈ 0°); 水银在玻璃上完全不润湿 (θ > 90°)',
            '防水面料 (荷叶效应) 通过微纳结构增大 θ (超疏水 > 150°)',
            '沙漠甲虫利用背部亲/疏水图案集水'
        ]
    },
    'liquid-crystal': {
        title: '液晶 (光学各向异性)',
        formulas: [
            {
                name: '寻常/异常折射率之差 (光学各向异性)',
                formula: 'Δn = n_o − n_e',
                variables: 'n_o: 寻常光折射率, n_e: 异常光折射率 (e光偏振平行光轴)',
                condition: '单轴液晶, Δn > 0 为正性液晶'
            },
            {
                name: '双折射光程差',
                formula: 'Δ = Δn · d',
                variables: 'Δ: 双折射光程差, d: 液晶盒厚度',
                condition: '常用 d ~ 5-10 μm'
            },
            {
                name: '介电各向异性',
                formula: 'Δε = ε_∥ − ε_⊥',
                variables: 'ε_∥: 平行分子长轴, ε_⊥: 垂直长轴, Δε > 0 正性液晶',
                condition: '决定液晶在电场中的取向'
            },
            {
                name: 'Fréedericksz 转变阈值',
                formula: 'V_th = π√(k/|Δε|ε₀)',
                variables: 'V_th: 阈值电压, k: 弹性常量',
                condition: '液晶盒外加电压时的取向转变'
            }
        ],
        tips: [
            '液晶是介于晶体与液体的中间相, 具有取向有序性',
            '棒状分子易形成向列相、胆甾相、近晶相等',
            'LCD 显示原理: 偏振片 + 液晶盒 (电控双折射)',
            '温度越高液晶分子排列越无序 → 超过清亮点温度变为各向同性液体'
        ]
    },

    // ========== 选必三 第 4 章 热力学定律 (7 个场景) ==========
    'joule-mechanical': {
        title: '焦耳实验 (机械搅拌生热)',
        formulas: [
            {
                name: '重力做功',
                formula: 'W = mgΔh',
                variables: 'm: 配重质量(kg), g: 重力加速度(m/s²), Δh: 下落高度(m)',
                condition: '叶片搅拌水的焦耳实验'
            },
            {
                name: '热质当量 (焦耳实验)',
                formula: 'W = Q = cmΔT',
                variables: 'W: 机械功(J), Q: 热量(J), c: 水的比热容, m: 水的质量, ΔT: 温升',
                condition: '热功当量'
            },
            {
                name: '热功当量 (焦耳测定)',
                formula: 'J ≈ 4.186 J/cal',
                variables: '1 cal (卡) = 4.186 J (焦耳)',
                condition: '焦耳扭秤实验 1840-1878'
            },
            {
                name: '多次做功',
                formula: 'Q_total = N · mgΔh',
                variables: 'N: 叶片搅拌次数',
                condition: '多次搅拌累积升温'
            }
        ],
        tips: [
            '焦耳热功当量实验将热学从"热质说"转向"能量守恒"',
            '机械功全部转化为水的内能: ΔU = W (绝热系统)',
            '现代国际单位制已统一用焦耳 (J), 卡路里只用于食品能量',
            '该实验否定了热质说, 确立热是分子无序运动的统计宏观表现'
        ]
    },
    'joule-electrical': {
        title: '焦耳定律 (电流热效应)',
        formulas: [
            {
                name: '焦耳定律',
                formula: 'Q = I²Rt',
                variables: 'I: 电流有效值(A), R: 电阻(Ω), t: 通电时间(s), Q: 产生热量(J)',
                condition: '所有电路均适用'
            },
            { name: '等价形式 (1)', formula: 'Q = U²t / R', variables: 'U: 加在电阻两端的电压(V)' },
            { name: '等价形式 (2)', formula: 'Q = Pt', variables: 'P: 电功率(W), P = UI = I²R' },
            { name: '电功率', formula: 'P = UI = I²R = U²/R', variables: '三种等价表达式' }
        ],
        tips: [
            '焦耳定律对所有电路 (纯电阻/非纯电阻) 都计算电流通过电阻产生的热量',
            '非纯电阻电路 (含电动机/电解槽等), W电 > Q热 (部分转化为其他能量)',
            '电热是分子碰撞导致的无序能量转移',
            '电热器、电磁炉、白炽灯都是焦耳热应用'
        ]
    },
    'adiabatic-compression': {
        title: '绝热过程 (无热交换)',
        formulas: [
            {
                name: '绝热方程 (压强-体积)',
                formula: 'PV^γ = 常量',
                variables: 'γ = C_p/C_v: 绝热指数 (空气 γ ≈ 1.4, 单原子 ~1.67, 双原子 ~1.4)',
                condition: '准静态绝热 (快速压缩/膨胀近似)'
            },
            { name: '绝热方程 (温度-体积)', formula: 'TV^(γ−1) = 常量', variables: 'T: 绝对温度(K), V: 体积' },
            { name: '绝热方程 (温度-压强)', formula: 'T^γ · P^(1−γ) = 常量', variables: '等价关系, 可由上述两式推出' },
            {
                name: '热力学第一定律 (绝热版)',
                formula: 'ΔU = W (Q = 0)',
                variables: 'Q = 0: 系统吸收热量为零, 内能变化等于外界做功',
                condition: '绝热壁或极端快速过程'
            }
        ],
        tips: [
            '绝热过程的特征: 系统与外界没有热量交换 (快速或隔绝)',
            '酒精灯点火、柴油压缩点火、气体快速膨胀降温都是绝热过程',
            '公式 PV^γ = 常量只适用于准静态绝热 (需做 PV 图验证)',
            '等温过程是 PV = 常数; 绝热线比等温线更陡'
        ]
    },
    'heat-transfer': {
        title: '热传导 (傅里叶定律)',
        formulas: [
            {
                name: '傅里叶定律',
                formula: 'dQ/dt = −kA · dT/dx',
                variables: 'k: 热导率(W/m·K), A: 截面积, dT/dx: 温度梯度, 负号: 热从高温到低温',
                condition: '一维稳态热传导'
            },
            { name: '热流密度', formula: 'q = Q/(At) = −k · dT/dx', variables: 'q: 单位面积热流(W/m²)' },
            {
                name: '串联导热',
                formula: 'q = (T_h − T_c) / (L₁/k₁A + L₂/k₂A)',
                variables: '通过多层平壁的总热流',
                condition: '稳态导热'
            },
            {
                name: '热阻',
                formula: 'R_th = ΔT/q = L/(kA)',
                variables: '热阻概念类比串并联电路',
                condition: '用于复杂导热网络'
            }
        ],
        tips: [
            '热传导靠分子碰撞传递内能 (金属还自由电子贡献)',
            'k 金属 >> k 气体 >> k 不良导体 (空气、水、木材)',
            '对流需要物质宏观流动, 辐射不需要介质 (真空中可传递)',
            '傅里叶定律类比菲克第一定律 (扩散) 和欧姆定律 (电导)'
        ]
    },
    'energy-transformation': {
        title: '热力学第一定律 (ΔU=Q+W)',
        formulas: [
            {
                name: '热力学第一定律',
                formula: 'ΔU = Q + W',
                variables: 'ΔU: 系统内能变化(J), Q: 系统吸热(正为吸), W: 外界对系统做功(正为外界做功)',
                condition: '热力学正方向约定'
            },
            {
                name: '正方向约定',
                formula: 'Q > 0: 吸热; Q < 0: 放热',
                variables: 'W > 0: 外界对系统做功; W < 0: 系统对外做功'
            },
            {
                name: '内能的微观构成',
                formula: 'U = ½N·(平动+转动+振动)动能 + 分子势能',
                variables: 'U 是状态量, 与过程无关',
                condition: '理想气体 U = U(T)'
            },
            {
                name: '等容过程',
                formula: 'W = 0 → ΔU = Q',
                variables: '纯吸热/放热时内能变化',
                condition: '等容不做体积功'
            }
        ],
        tips: [
            '热力学第一定律是能量守恒在热学中的具体表达',
            '内能是状态量 (对应态函数), 热和功是过程量',
            '第一定律否定了第一类永动机 (不需能量输入就能做功的机器)',
            '符号约定要统一: 工程上常用 ΔU = Q − W (系统对外功)'
        ]
    },
    'perpetuum-mobile': {
        title: '永动机 (热力学定律禁令)',
        formulas: [
            {
                name: '第一类永动机',
                formula: 'W > 0 且 Q = 0, ΔU = 0',
                variables: '没有能量输入就能持续违反能量守恒',
                condition: '违反热一律 ΔU = Q + W'
            },
            { name: '热一律表述 (永动机)', formula: '第一类永动机不可能制成', variables: '不可能无中生有地创造能量' },
            {
                name: '热二律表述 (第二类永动机)',
                formula: '不可能从单一热源取热完全转化为功而不产生其他影响',
                variables: '这是开尔文表述',
                condition: '违反热二律'
            },
            {
                name: '第二类永动机效率限制',
                formula: 'η = 1 − T_c/T_h < 1 (T_c > 0)',
                variables: '卡诺效率, 必 T_c > 0 所以 η < 1',
                condition: '卡诺定理第二定律推论'
            }
        ],
        tips: [
            '第一类永动机违反能量守恒 (热一律), 第二类违反热二律',
            '卡诺效率 η = 1 − T_c/T_h < 1 意味着任何热机效率低于 100%',
            '各种"永动机"尝试最终都归为摩擦损耗/热散失等第二定律原因',
            '能量是守恒的, 但能量品质在不断下降 (熵增)'
        ]
    },
    'heat-direction': {
        title: '热力学第二定律 (熵增原理)',
        formulas: [
            {
                name: '克劳修斯不等式',
                formula: 'ΔS ≥ 0 (孤立系统)',
                variables: 'S: 熵 (J/K), 孤立系统熵永不减少',
                condition: 'ΔS = 0 对应可逆, ΔS > 0 对应不可逆'
            },
            {
                name: '开尔文表述',
                formula: '不能从单一热源取热全部转化为功',
                variables: '不借助冷源, 100% 热转功不可能',
                condition: '等价于克劳修斯表述'
            },
            {
                name: '克劳修斯表述',
                formula: '热量不能自发地从低温传到高温',
                variables: '需外界做功才能完成',
                condition: '制冷机做功才能传热'
            },
            {
                name: '玻尔兹曼熵公式',
                formula: 'S = k lnΩ',
                variables: 'k: 玻尔兹曼常量(1.38×10⁻²³ J/K), Ω: 微观状态数',
                condition: '统计力学基础'
            }
        ],
        tips: [
            '热二律指出宏观过程的方向性: 自发过程都是不可逆的',
            '熵是世界"无序度"的度量, 孤立系统熵只增不减',
            '冰箱/空调需要外界做功才能逆方向传热',
            '热二律是现有物理定律中唯一有时间箭头的定律'
        ]
    },

    // ========== 选必三 第 5 章 原子核 (9 个场景) ==========
    'alpha-scattering': {
        title: 'α 粒子散射实验 (卢瑟福)',
        formulas: [
            {
                name: '瞄准距离',
                formula: 'd = kZe² / (2E_k)',
                variables: 'k: 静电力常量, Z: 靶核电荷数, e: 元电荷, E_k: α 粒子动能',
                condition: '库仑散射'
            },
            {
                name: '卢瑟福散射公式',
                formula: 'dσ/dΩ = (kZe² / (4E_k))² · 1 / sin⁴(θ/2)',
                variables: 'σ: 散射截面, Ω: 立体角, θ: 散射角',
                condition: '非相对论, 忽略电子屏蔽'
            },
            {
                name: '散射角与瞄准距离关系',
                formula: 'cot(θ/2) = 2d / b',
                variables: 'b: 碰撞参数(瞄准距离), θ: 散射角',
                condition: '平方反比有心力'
            },
            {
                name: '大角度散射概率',
                formula: 'P ∝ 1 / sin⁴(θ/2)',
                variables: '大角度散射概率极低 → 证实原子核式结构',
                condition: '卢瑟福实验结论'
            }
        ],
        tips: [
            '绝大多数 α 粒子几乎不偏转, 极少数大角度偏转 → 卢瑟福提出原子的核式结构模型',
            '大角度偏转说明原子中心存在体积小、质量大、带正电的原子核',
            '卢瑟福散射公式在小角度处与实验吻合, 大角度需考虑核力作用',
            '该实验否定了汤姆孙 "枣糕模型", 是原子物理的里程碑'
        ]
    },
    'black-body': {
        title: '黑体辐射 (普朗克量子假说)',
        formulas: [
            {
                name: '维恩位移定律',
                formula: 'λ_max · T = b',
                variables: 'b = 2.898×10⁻³ m·K (维恩常量), T: 绝对温度, λ_max: 峰值波长',
                condition: '黑体辐射'
            },
            {
                name: '斯忒藩-玻尔兹曼定律',
                formula: 'M = σT⁴',
                variables: 'M: 辐射出射度(W/m²), σ = 5.67×10⁻⁸ W/m²·K⁴ (斯忒藩-玻尔兹曼常量)',
                condition: '黑体辐射总功率'
            },
            {
                name: '普朗克辐射公式',
                formula: 'M_λ = 2πhc² / λ⁵ · 1/(e^(hc/λkT) − 1)',
                variables: '普朗克量子假说, 能量子 E = hν',
                condition: '精确描述黑体辐射谱'
            },
            {
                name: '维恩近似 (高频)',
                formula: 'M_λ ≈ 2πhc²/λ⁵ · e^(−hc/λkT)',
                variables: 'λT 较小时适用',
                condition: '经典维恩公式高频极限'
            }
        ],
        tips: [
            '黑体是完全吸收所有入射辐射的理想物体 (空腔辐射体)',
            '经典理论 "紫外灾难" 无法解释黑体辐射曲线, 普朗克量子假说成功解释',
            '温度升高, 峰值波长向短波方向移动 (维恩位移)',
            '温度越高, 总辐射功率增大 (T⁴), 例如太阳表面约 5800 K'
        ]
    },
    'electron-diffraction': {
        title: '电子衍射 (物质波验证)',
        formulas: [
            {
                name: '德布罗意波长',
                formula: 'λ_dB = h / p',
                variables: 'h: 普朗克常量, p: 粒子动量',
                condition: '所有物质波'
            },
            {
                name: '加速电压与波长',
                formula: 'λ = h / √(2meU)',
                variables: 'm: 电子质量, e: 元电荷, U: 加速电压',
                condition: '电压 U 加速的电子'
            },
            {
                name: '布拉格衍射条件',
                formula: '2d·sinθ = nλ',
                variables: 'd: 晶面间距, θ: 掠射角, n: 衍射级数 (整数)',
                condition: '晶体衍射'
            },
            {
                name: '电子波长 (典型值)',
                formula: 'λ ≈ 1.226 / √U (nm)',
                variables: 'U: 加速电压(V), 100V → λ ≈ 0.123 nm',
                condition: '非相对论近似'
            }
        ],
        tips: [
            '电子衍射实验 (戴维孙-革末, G.P. 汤姆孙) 证实了德布罗意物质波假说',
            '物质波是所有运动的粒子都具有的波动性 λ = h/p',
            '加速电压越高, 电子波长越短, 分辨率越高',
            '电子显微镜利用短波长电子波获得远优于光学显微镜的分辨率'
        ]
    },
    'radiation-deflection': {
        title: '带电粒子在磁场中的偏转',
        formulas: [
            {
                name: '洛伦兹力',
                formula: 'F = qvB',
                variables: 'q: 电荷量, v: 速度, B: 磁感应强度',
                condition: 'v ⊥ B'
            },
            {
                name: '回旋半径',
                formula: 'r = mv / (qB)',
                variables: 'm: 粒子质量, v: 速率',
                condition: '匀速圆周运动'
            },
            { name: '角频率 (回旋频率)', formula: 'ω = qB / m', variables: '与速率无关!', condition: '回旋加速器原理' },
            {
                name: '偏转半径 (云室)',
                formula: 'r ∝ p / (qB)',
                variables: 'p: 动量, 云室中粒子径迹曲率反映动量',
                condition: '密立克 / 云室实验'
            }
        ],
        tips: [
            '带电粒子垂直进入匀强磁场后做匀速圆周运动',
            '正负电荷偏转方向相反 (左手定则判断)',
            '回旋加速器利用电场多次加速 + 磁场约束回旋轨迹获得高能粒子',
            '气泡室和云室通过液滴/气泡径迹曲率分析粒子动量和符号'
        ]
    },
    'decay-statistics': {
        title: '放射性衰变 (统计规律)',
        formulas: [
            {
                name: '半衰期衰变公式',
                formula: 'N = N₀ · 2^(−t/T_1/2)',
                variables: 'N₀: 初始核数, T_1/2: 半衰期, t: 衰变时间',
                condition: '统计规律 (大量原子核)'
            },
            {
                name: '指数衰变公式',
                formula: 'N = N₀ · e^(−λt)',
                variables: 'λ: 衰变常量 (s⁻¹), 与半衰期关系: λ = ln2 / T_1/2',
                condition: '连续衰变'
            },
            { name: '半衰期与衰变常量', formula: 'T_1/2 = ln 2 / λ', variables: 'ln 2 ≈ 0.693', condition: '定义关系' },
            {
                name: '放射性活度',
                formula: 'A = λN = A₀ · e^(−λt)',
                variables: 'A: 活度(Bq, 衰变/秒), 1 Ci = 3.7×10¹⁰ Bq',
                condition: '单位时间的衰变数'
            }
        ],
        tips: [
            '半衰期是统计规律, 描述大量原子核的集体衰变行为, 不可预测单个原子的衰变时刻',
            '同种元素的半衰期恒定, 与外界温度、压强、化学状态无关',
            'α 衰变: 放出 ⁴He 核, 质量数 −4, 电荷数 −2; β 衰变: 核内中子→质子 + 电子',
            '地质年代测定利用长半核素 (如 ¹⁴C 断代, ²³⁸U 定年)'
        ]
    },
    'cosmic-ray': {
        title: '宇宙线 (大气簇射)',
        formulas: [
            {
                name: '簇射增殖 (简化)',
                formula: 'E = E₀ · n',
                variables: 'E₀: 初始能量, n: 增殖因子',
                condition: '级联簇射简化模型'
            },
            {
                name: '临界能量',
                formula: 'E_c ≈ 10⁸ eV (空气)',
                variables: '低于临界能量时, 簇射停止增殖',
                condition: '电子临界能量'
            },
            {
                name: '簇射粒子数 (N_max)',
                formula: 'N_max ∝ E₀ / E_c',
                variables: '簇射最大粒子数与初始能量成正比',
                condition: '小型簇射近似'
            },
            {
                name: '粒子能量损失 (电离)',
                formula: '−dE/dx = K · z² · (Z/A) · (1/β²) · [ln(...) − β²]',
                variables: '贝特公式, β = v/c',
                condition: '带电粒子在介质中的电离损失'
            }
        ],
        tips: [
            '宇宙线是来自外太空的高能粒子, 主要是质子 (90%) 和 α 粒子 (9%)',
            '高能初级宇宙线进入大气层后与原子核碰撞产生级联簇射 (空气簇射)',
            '簇射产物包括 π 介子、μ 子、电子、光子、中子等',
            '宇宙线和放射性衰变、恒星核聚变是粒子物理的主要来源之一'
        ]
    },
    'neutron-discovery': {
        title: '中子的发现 (查德威克实验)',
        formulas: [
            {
                name: '发现核反应方程',
                formula: '⁹Be + ⁴He → ¹²C + ¹n',
                variables: 'α 粒子轰击铍-9, 产生碳-12 和中子',
                condition: '查德威克 1932 实验'
            },
            {
                name: '中子质量',
                formula: 'm_n ≈ 1.0087 u ≈ m_H',
                variables: 'u: 原子质量单位, 中子质量 ≈ 质子质量',
                condition: '中性粒子, 磁矩极小'
            },
            {
                name: 'α 粒子质量',
                formula: 'm_α = 4.0026 u',
                variables: 'α 粒子 = ⁴He 核',
                condition: '核反应质量守恒'
            },
            {
                name: '质量亏损',
                formula: 'Δm = Σm_反应前 − Σm_反应后',
                variables: 'ΔE = Δm·c² > 0 对应释放能量',
                condition: '核反应能量释放'
            }
        ],
        tips: [
            '查德威克 1932 年通过 α 轰击铍实验发现中子, 证实原子核由质子和中子组成',
            '中子是不带电的强子, 由夸克 udd 组成, 静止平均寿命约 15 分钟 (自由态)',
            '中子发现解决了原子核中质子间库仑斥力问题 (核力维持核稳定)',
            '中子轰击是诱发核裂变和链式反应的关键 (中子不带电, 不受库仑排斥)'
        ]
    },
    'fission-chain': {
        title: '裂变链式反应 (铀-235)',
        formulas: [
            {
                name: '典型裂变反应',
                formula: '²³⁵U + ¹n → ¹⁴¹Ba + ⁹²Kr + 3¹n + E',
                variables: '铀-235 裂变生成钡和氪, 释放多个中子',
                condition: '慢中子诱发'
            },
            {
                name: '释放能量',
                formula: 'E = Δm·c² ≈ 200 MeV / 次裂变',
                variables: '质量亏损 Δm → 巨大能量释放',
                condition: '每次裂变释放约 200 MeV'
            },
            {
                name: '临界因子',
                formula: 'k_eff = 1 (临界状态)',
                variables: 'k_eff = 每次裂变平均引发下一次裂变的有效中子数',
                condition: 'k_eff = 1 自持链式反应'
            },
            {
                name: '增殖因子 (三状态)',
                formula: 'k_eff > 1: 超临界 (爆炸); k_eff < 1: 次临界 (熄灭)',
                variables: '反应堆控制: 镉/硼控制棒吸收中子调节 k_eff',
                condition: '反应堆稳态控制'
            }
        ],
        tips: [
            '铀-235 裂变释放约 200 MeV 能量, 其中约 80% 为碎片动能 (瞬时转化为热能)',
            '链式反应维持条件: 有效增殖因子 k_eff ≥ 1, 反应堆中通过控制棒调节',
            '临界体积/质量是维持链式反应的最小条件 (防止中子逃逸过多)',
            '核电站利用慢中子诱发铀-235 裂变, 原子弹用快中子链式反应实现瞬时能量释放'
        ]
    },
    'bohr-orbit': {
        title: '玻尔原子模型 (氢原子)',
        formulas: [
            {
                name: '轨道半径',
                formula: 'r_n = n² · a₀',
                variables: 'n: 主量子数, a₀ = 0.529 Å (玻尔半径)',
                condition: '类氢原子中电子轨道'
            },
            {
                name: '能级公式',
                formula: 'E_n = −13.6 / n² (eV)',
                variables: 'n = 1 为基态 (E₁ = −13.6 eV), n→∞ 电离态',
                condition: '类氢原子能量量子化'
            },
            {
                name: '跃迁公式',
                formula: 'hν = E_n − E_m',
                variables: 'n > m: 辐射光子, n < m: 吸收光子',
                condition: '光子能级跃迁'
            },
            {
                name: '里德伯公式',
                formula: '1/λ = R(1/m² − 1/n²)',
                variables: 'R = 1.097×10⁷ m⁻¹ (里德伯常量)',
                condition: '氢原子光谱线系'
            }
        ],
        tips: [
            '玻尔模型引入量子化条件: 角动量 L = n·h/(2π), 解释氢原子光谱',
            '巴尔末系 (可见光, m=2), 莱曼系 (紫外, m=1), 帕邢系 (红外, m=3)',
            '玻尔模型仅适用于类氢原子, 多电子原子需量子力学才能解释',
            '能级量子化是分立的, 原子只能处于特定能级, 跃迁时吸收/发射特定频率光子'
        ]
    },

    // ========== 必修三 (11 个场景) ==========
    'capacitor-charge': {
        title: '电容器的充电 (RC 暂态过程)',
        formulas: [
            {
                name: '电容器充电 (电压)',
                formula: 'u(t) = E(1 − e^(−t/RC))',
                variables: 'E: 电源电动势, R: 电阻, C: 电容',
                condition: 'RC 串联直流充电'
            },
            {
                name: '电容器充电 (电荷)',
                formula: 'q(t) = Q(1 − e^(−t/RC))',
                variables: 'Q = CE: 最大电荷量',
                condition: 'q(0) = 0'
            },
            {
                name: '充电电流',
                formula: 'i(t) = (E/R) · e^(−t/RC)',
                variables: '初始电流 I₀ = E/R, 按指数衰减',
                condition: '欧姆定律 + 电容特性'
            },
            {
                name: '时间常数',
                formula: 'τ = RC',
                variables: 'τ: RC 回路时间常数, τ 后电压达 63.2% E',
                condition: '充放电过程速率'
            }
        ],
        tips: [
            '电容器充电时电荷缓慢积累, 最终 q = CE, 电流趋于 0',
            '时间常数 τ = RC 决定充电快慢, 5τ 后基本充足',
            '电容器充电过程非匀速, 前段快后段慢 (指数规律)',
            'RC 积分/微分电路广泛用于信号处理、定时器等电子线路'
        ]
    },
    'parallel-plate-capacitor': {
        title: '平行板电容器',
        formulas: [
            {
                name: '平行板电容公式',
                formula: 'C = εS / (4πkd)',
                variables: 'ε: 介电常量, S: 极板面积, d: 板间距离, k: 静电力常量',
                condition: '边缘效应忽略'
            },
            {
                name: '电容定义式',
                formula: 'C = Q / U',
                variables: 'Q: 极板电荷量, U: 板间电压',
                condition: '通用定义'
            },
            {
                name: '电场强度',
                formula: 'E = U / d = 4πkQ / (εS)',
                variables: '匀强电场 (忽略边缘效应)',
                condition: '平行板间'
            },
            {
                name: '电容器储能',
                formula: 'W = ½CU² = ½QU = Q²/(2C)',
                variables: '电场能储存在极板间的电场中',
                condition: '三种等价形式'
            }
        ],
        tips: [
            '增大正对面积 S 或减小板间距离 d 可增大电容',
            '插入电介质 (ε 增大) 也能增大电容',
            '不同条件下讨论 C, Q, E 的变化: 始终与电源相连 U 不变; 充电后断开 Q 不变',
            '静电计测量电容器板间电压 (验电器不能直接测量, 静电计可)'
        ]
    },
    'load-voltage': {
        title: '闭合电路欧姆定律 (负载电压)',
        formulas: [
            {
                name: '负载电压 (输出电压)',
                formula: 'U = E − Ir',
                variables: 'E: 电动势, I: 电流, r: 内阻',
                condition: '闭合电路欧姆定律'
            },
            {
                name: '输出功率',
                formula: 'P = EI − I²r = UI',
                variables: 'EI: 电源总功率, I²r: 内耗功率',
                condition: '能量守恒'
            },
            {
                name: '最大输出功率',
                formula: 'P_max = E²/(4r)',
                variables: '当 R = r (外阻 = 内阻) 时取得',
                condition: '阻抗匹配条件'
            },
            {
                name: '效率',
                formula: 'η = U/E = R/(R+r)',
                variables: 'R 越大效率越高, R→∞ 时效率 → 100%',
                condition: '能量转换效率'
            }
        ],
        tips: [
            '负载变化时路端电压随电流增大而减小 (U = E − Ir)',
            '外电阻 R = 内阻 r 时输出功率最大, 但效率仅 50%',
            '负载短路 (R → 0) 时电流最大 I_short = E/r, 路端电压接近 0',
            '负载开路 (R → ∞) 时电流为 0, 路端电压 U = E'
        ]
    },
    'resistance-law': {
        title: '电阻定律 (导体电阻的决定因素)',
        formulas: [
            {
                name: '电阻定律',
                formula: 'R = ρL / S',
                variables: 'ρ: 电阻率(Ω·m), L: 导体长度, S: 横截面积',
                condition: '均匀导体温度恒定'
            },
            {
                name: '电导与电导率',
                formula: 'G = 1/R, γ = 1/ρ',
                variables: 'G: 电导(S), γ: 电导率(S/m)',
                condition: '电导率是电阻率倒数'
            },
            {
                name: '电阻串联',
                formula: 'R_total = R₁ + R₂ + ... + R_n',
                variables: '电流相同, 电压分配',
                condition: '串联电阻'
            },
            {
                name: '电阻并联',
                formula: '1/R_total = 1/R₁ + 1/R₂ + ... + 1/R_n',
                variables: '电压相同, 电流分配',
                condition: '并联电阻'
            }
        ],
        tips: [
            '电阻率 ρ 是材料的本征性质, 反映材料对电流的阻碍能力',
            '金属电阻率随温度升高而增大; 半导体、绝缘体电阻率随温度降低',
            '长度增大电阻增大, 横截面积增大电阻减小',
            '伏安法测电阻: R = U/I (内接法测大电阻, 外接法测小电阻)'
        ]
    },
    'coulomb-force-explore': {
        title: '探究库仑力 (库仑定律)',
        formulas: [
            {
                name: '库仑定律',
                formula: 'F = k·q₁·q₂ / r²',
                variables: 'k = 1/(4πε₀) ≈ 9×10⁹ N·m²/C²',
                condition: '真空中的点电荷'
            },
            {
                name: '常量 k 与 ε₀ 关系',
                formula: 'k = 1/(4πε₀)',
                variables: 'ε₀ = 8.85×10⁻¹² C²/(N·m²) 真空介电常量',
                condition: '定义关系'
            },
            {
                name: '静电力叠加原理',
                formula: 'F_total = ΣFᵢ (矢量求和)',
                variables: '多个点电荷时, 合力为各力矢量和',
                condition: '线性叠加'
            },
            {
                name: '静电力与重力对比',
                formula: 'F_库 / F_万 ≈ 10³⁹ (氢原子内)',
                variables: '静电力远强于万有引力',
                condition: '微观尺度'
            }
        ],
        tips: [
            '库仑定律是静电学的基础, 与万有引力定律数学形式相似 (平方反比)',
            '同号电荷相斥, 异号电荷相吸; 力沿电荷连线方向',
            '库仑定律适用于真空中的点电荷 (或均匀带电球体)',
            '静电感应使导体靠近电荷端感应异号电荷, 远端感应同号电荷'
        ]
    },
    electroscope: {
        title: '验电器 (检测静电)',
        formulas: [
            {
                name: '箔片张角原理',
                formula: '箔片带同种电荷 → 排斥张开',
                variables: '张角大小反映箔片带电量',
                condition: '同种电荷互斥'
            },
            {
                name: '互斥力公式 (定性)',
                formula: 'tan(θ/2) ∝ 电荷量 / (mg·L)',
                variables: 'θ: 张角, m: 箔片质量, L: 箔片长度',
                condition: '小角度近似'
            },
            {
                name: '接地电势',
                formula: 'V_地 = 0 (约定)',
                variables: '接地导体与大地等势',
                condition: '静电接地原理'
            },
            {
                name: '电量与电势关系',
                formula: 'Q = CV',
                variables: '验电器本体是一个电容 C, V 高 → Q 大',
                condition: '验电器等效为电容器'
            }
        ],
        tips: [
            '验电器是检测物体是否粗略带电的仪器, 箔片张开角度反映大致电压 (非定量)',
            '验电器不能直接判断电荷种类, 需使用已知电荷的带电体进行比对',
            '静电计 (更精密) 可定量测量电压, 原理类似验电器但刻度校准',
            '防尘罩内装干燥剂可降低漏电, 保持验电器灵敏度'
        ]
    },
    'electrostatic-induction': {
        title: '静电感应 (导体中电荷重新分布)',
        formulas: [
            {
                name: '自由电子移动 (定性)',
                formula: '自由电子逆电场方向移动 → 近端感应负电荷, 远端感应正电荷',
                variables: 'E: 外电场, 感应电荷产生反向电场',
                condition: '导体处于外电场中'
            },
            {
                name: '静电平衡条件',
                formula: '导体内部 E = 0',
                variables: '导体内部电场为零, 电荷分布在外表面',
                condition: '稳态静电感应'
            },
            {
                name: '感应电荷量',
                formula: '|q_感| < |q_外|',
                variables: '感应电荷量小于施感电荷量 (部分被抵消)',
                condition: '导体感应'
            },
            {
                name: '接地时的感应',
                formula: '远端电荷流入大地 → 导体带净电荷',
                variables: '导体接地后不再呈电中性',
                condition: '接地静电感应'
            }
        ],
        tips: [
            '静电感应是导体中的自由电子在外电场作用下定向移动的结果',
            '达到静电平衡后导体内部电场为零, 表面电场垂直于表面',
            '接地时远端电荷流入大地, 导体最终带与施感电荷异号的净电荷',
            '静电感应是工业静电喷涂、复印的电子成像的基础原理之一'
        ]
    },
    'electrostatic-shielding': {
        title: '静电屏蔽 (法拉第笼效应)',
        formulas: [
            {
                name: '屏蔽条件',
                formula: '屏蔽腔内部 E = 0',
                variables: '空腔导体在外部电场中, 内部电场为零',
                condition: '静电平衡'
            },
            {
                name: '高斯定律',
                formula: '∮E·dA = Q_内/ε₀',
                variables: '闭合曲面的电通量与曲面内净电荷成正比',
                condition: '静电场基本定律'
            },
            {
                name: '场强叠加',
                formula: 'E_total = E_外 + E_感应 = 0 (内部)',
                variables: '外部电场与感应电荷电场在导体内部完全抵消',
                condition: '静电屏蔽原理'
            },
            {
                name: '法拉第笼',
                formula: '金属壳/网使内部不受外部电场影响',
                variables: '常用于屏蔽高压电、保护灵敏电子设备',
                condition: '封闭导体壳'
            }
        ],
        tips: [
            '封闭的导体壳 (法拉第笼) 完全屏蔽外部电场, 内部电场为零',
            '接地导体壳还能屏蔽内部电场对外部的影响 (双向屏蔽)',
            '静电屏蔽是电子设备金属外壳、同轴电缆外导体的工作原理',
            '带电作业的工人穿戴金属网衣 (均压服) 利用静电屏蔽保障安全'
        ]
    },
    'faraday-cup': {
        title: '法拉第筒 (测量电荷)',
        formulas: [
            {
                name: '电荷收集',
                formula: 'Q = C · V',
                variables: 'C: 法拉第筒自身电容, V: 测量端电压',
                condition: '全部电荷被收集在内壁'
            },
            {
                name: '内壁电荷分布',
                formula: '电荷只分布在外表面, 内壁无净电场',
                variables: '导体空腔内部电场为零',
                condition: '静电屏蔽原理'
            },
            {
                name: '电流测量',
                formula: 'I = dQ/dt',
                variables: '通过测量总电荷随时间变化获得电流',
                condition: '电流定义'
            },
            {
                name: '输入阻抗要求',
                formula: '测量仪表并联高阻抗, 防止电荷泄漏',
                variables: '高输入阻抗电压表保证测量准确',
                condition: '测量条件'
            }
        ],
        tips: [
            '法拉第筒是测量粒子束总电荷的精密仪器, 全部进入的粒子电荷被金属内壁收集',
            '外电场完全不影响内壁电荷分布, 测量不受外部干扰',
            '应用: 测量电子/离子束流强度, 加速器束流诊断, 空间物理探测',
            '与静电计或灵敏电流表配合使用, 可实时监测束流变化'
        ]
    },
    'ampere-force': {
        title: '安培力 (磁场对载流导线的作用)',
        formulas: [
            {
                name: '安培力大小',
                formula: 'F = BIL·sinθ',
                variables: 'B: 磁感应强度, I: 电流, L: 有效长度, θ: B 与导线夹角',
                condition: '匀强磁场中直导线'
            },
            {
                name: '左手定则',
                formula: 'F 方向: 四指电流, 磁感线穿掌心, 拇指安培力方向',
                variables: '用左手判定安培力方向 (注意与右手定则区分)',
                condition: '左手定则'
            },
            {
                name: '条件极值',
                formula: 'θ = 90° 时 F = BIL (最大); θ = 0° 时 F = 0',
                variables: '导线与磁场垂直时安培力最大, 平行时零',
                condition: '夹角变化影响安培力'
            },
            {
                name: '力矩',
                formula: 'M = BIS·cosφ',
                variables: 'S: 线圈面积, φ: 线圈法线与磁场夹角',
                condition: '矩形载流线圈在磁场中'
            }
        ],
        tips: [
            '安培力是洛伦兹力的宏观表现 (载流导线中的自由电子受洛伦兹力传递给导线)',
            '安培力方向由左手定则判断 (F ⊥ B, F ⊥ I, F 垂直于 B 和 I 所在平面)',
            '直流电动机、电流表、磁电式仪表都利用安培力',
            '同向电流平行导线相互吸引, 反向电流相互排斥'
        ]
    },
    'em-wave-hertz': {
        title: '赫兹实验 (电磁振荡与电磁波)',
        formulas: [
            {
                name: 'LC 振荡角频率',
                formula: 'ω = 1/√(LC)',
                variables: 'L: 电感(H), C: 电容(F)',
                condition: '理想 LC 振荡电路'
            },
            {
                name: '电磁波速度',
                formula: 'c = f·λ',
                variables: 'c = 3×10⁸ m/s (真空光速), 赫兹实验证实电磁波以光速传播',
                condition: '电磁波 = 光速'
            },
            {
                name: '能量转化',
                formula: 'W = ½LI² + ½CV²',
                variables: '磁场能 ↔ 电场能 周期转换',
                condition: '电磁振荡中能量形式交替'
            },
            {
                name: '辐射条件',
                formula: '开放电路 + 高频振荡 → 有效辐射',
                variables: '辐射功率 ∝ f⁴, 频率越高辐射能力越强',
                condition: '赫兹振子实验'
            }
        ],
        tips: [
            '赫兹 1886-1888 实验首次证实麦克斯韦预言的电磁波真实存在',
            '赫兹通过火花隙振荡器产生电磁波, 共振环接收, 证实了电磁波的反射、折射、偏振等特性',
            '物理意义: 同一实验同时证实电磁波存在 + 电磁波速度 = 光速',
            '赫兹实验为无线电通信奠定了基础 (马可尼/波波夫进一步发展)'
        ]
    },

    // ========== 接手补缺: sceneRegistry 已注册但原 FORMULA_MAP 缺失的场景 ==========
    'ac-current': {
        title: '交变电流',
        formulas: [
            { name: '瞬时电动势', formula: 'e = E_m sin(ωt + φ)', variables: 'E_m: 最大值, ω: 角频率, φ: 初相' },
            { name: '有效值关系', formula: 'U = U_m/√2, I = I_m/√2', variables: '正弦交流电的热效应等效直流值' },
            { name: '周期频率', formula: 'T = 2π/ω, f = 1/T', variables: 'T: 周期, f: 频率' },
            { name: '平均功率', formula: 'P = UI cosφ', variables: 'cosφ: 功率因数', condition: '正弦稳态交流电路' }
        ],
        tips: [
            '交流电的方向和大小随时间周期性变化',
            '有效值由相同时间内产生的热量定义',
            '我国民用交流电频率为 50 Hz, 周期为 0.02 s'
        ]
    },
    bohr: {
        title: '玻尔原子模型',
        formulas: [
            { name: '轨道半径', formula: 'r_n = n²a₀', variables: 'n: 主量子数, a₀: 玻尔半径' },
            { name: '能级公式', formula: 'E_n = −13.6/n² eV', variables: '氢原子第 n 能级能量' },
            { name: '跃迁光子', formula: 'hν = |E_i − E_f|', variables: 'ν: 发射或吸收光子的频率' },
            { name: '里德伯公式', formula: '1/λ = R(1/m² − 1/n²)', variables: 'n > m, R: 里德伯常量' }
        ],
        tips: [
            '原子能级是分立的, 跃迁只能吸收或放出特定频率光子',
            '玻尔模型能解释氢原子光谱, 但不适合复杂多电子原子',
            'n 越大, 能级越接近电离极限'
        ]
    },
    cavendish: {
        title: '卡文迪许扭秤实验',
        formulas: [
            { name: '万有引力定律', formula: 'F = Gm₁m₂/r²', variables: 'G: 引力常量, r: 质心距离' },
            { name: '扭转回复力矩', formula: 'M = κθ', variables: 'κ: 扭转常量, θ: 扭转角' },
            { name: '力矩平衡', formula: 'F·L = κθ', variables: 'L: 力臂', condition: '静态平衡法' },
            { name: '地球质量', formula: 'M_E = gr_E²/G', variables: 'g: 地表重力加速度, r_E: 地球半径' }
        ],
        tips: ['扭秤把极小引力转化为可测的扭转角', '测得 G 后可进一步估算地球质量', '实验要隔离气流、振动和静电干扰']
    },
    'center-of-gravity': {
        title: '重心与稳定性',
        formulas: [
            { name: '质心坐标', formula: 'x_c = Σmᵢxᵢ / Σmᵢ', variables: '离散质点系的重心水平坐标' },
            { name: '力矩平衡', formula: 'ΣM = 0', variables: '绕任意转轴合力矩为零', condition: '静力平衡' },
            { name: '重力力矩', formula: 'M = mgd', variables: 'd: 重力作用线到支点距离' },
            { name: '稳定条件', formula: '重力作用线落在支撑面内', variables: '用于判断物体是否翻倒' }
        ],
        tips: [
            '重心位置可通过悬挂法或支撑法测定',
            '重心越低、支撑面越大, 物体越稳定',
            '不规则物体的重心不一定在物体内部'
        ]
    },
    centrifugal: {
        title: '离心现象',
        formulas: [
            { name: '向心加速度', formula: 'a_n = v²/r = ω²r', variables: 'r: 半径, v: 线速度, ω: 角速度' },
            { name: '向心力', formula: 'F_n = mv²/r = mω²r', variables: '维持圆周运动所需合力' },
            { name: '离心条件', formula: 'F_实际 < F_所需', variables: '实际向心力不足时发生离心' },
            { name: '临界速度', formula: 'v_c = √(F_max r/m)', variables: 'F_max: 最大可提供向心力' }
        ],
        tips: [
            '离心不是新的真实受力, 而是惯性导致偏离圆周轨道',
            '转速越大或半径越大, 所需向心力越大',
            '离心机、甩干机和车辆转弯都涉及离心现象'
        ]
    },
    circuit: {
        title: '直流电路',
        formulas: [
            { name: '欧姆定律', formula: 'I = U/R', variables: 'U: 电压, R: 电阻' },
            { name: '串联电阻', formula: 'R = R₁ + R₂ + ...', variables: '串联电路电流相同' },
            { name: '并联电阻', formula: '1/R = 1/R₁ + 1/R₂ + ...', variables: '并联电路电压相同' },
            { name: '电功率', formula: 'P = UI = I²R = U²/R', variables: '电能转化速率' }
        ],
        tips: [
            '串联分压、并联分流是电路分析的基本规律',
            '理想电流表内阻近似为零, 理想电压表内阻近似无穷大',
            '分析复杂电路时先识别等效串并联结构'
        ]
    },
    'circular-motion': {
        title: '匀速圆周运动',
        formulas: [
            { name: '线速度角速度', formula: 'v = ωr', variables: 'r: 半径, ω: 角速度' },
            { name: '向心加速度', formula: 'a_n = v²/r = ω²r', variables: '方向始终指向圆心' },
            { name: '向心力', formula: 'F_n = ma_n = mv²/r', variables: '由合外力提供' },
            { name: '周期关系', formula: 'ω = 2π/T', variables: 'T: 转动周期' }
        ],
        tips: [
            '匀速圆周运动速率不变, 速度方向不断改变',
            '向心力不是额外力, 是指向圆心的合力效果',
            '圆锥摆中重力和拉力的合力提供向心力'
        ]
    },
    'curve-condition': {
        title: '曲线运动条件',
        formulas: [
            { name: '曲线运动判据', formula: 'F 与 v 不共线', variables: '合力方向与速度方向不在同一直线' },
            { name: '加速度分解', formula: 'a = a_t + a_n', variables: 'a_t 改变速率, a_n 改变方向' },
            { name: '法向加速度', formula: 'a_n = v²/R', variables: 'R: 曲率半径' },
            { name: '切向加速度', formula: 'a_t = dv/dt', variables: '沿速度切线方向' }
        ],
        tips: [
            '物体是否做曲线运动取决于合力与速度方向关系',
            '合力有法向分量时速度方向会改变',
            '曲线运动一定是变速运动, 因为速度方向变化'
        ]
    },
    'curve-velocity-direction': {
        title: '曲线运动速度方向',
        formulas: [
            { name: '瞬时速度方向', formula: 'v 方向沿轨迹切线', variables: '任一点速度沿该点切线方向' },
            { name: '速度分解', formula: 'v = v_x i + v_y j', variables: '用分量描述曲线运动' },
            { name: '速度大小', formula: '|v| = √(v_x² + v_y²)', variables: '二维速度矢量大小' },
            { name: '方向角', formula: 'tanθ = v_y/v_x', variables: 'θ: 速度与 x 轴夹角' }
        ],
        tips: [
            '曲线轨迹上某点的切线方向就是瞬时速度方向',
            '平均速度方向指向位移方向, 不等同于瞬时速度方向',
            '抛体运动中速度方向随竖直分量变化而改变'
        ]
    },
    'em-induction': {
        title: '电磁感应',
        formulas: [
            { name: '磁通量', formula: 'Φ = BS cosθ', variables: 'B: 磁感应强度, S: 面积, θ: B 与法线夹角' },
            { name: '法拉第定律', formula: 'E = −N·ΔΦ/Δt', variables: 'N: 线圈匝数, 负号表示楞次定律' },
            { name: '动生电动势', formula: 'E = BLv', variables: '导体棒垂直切割磁感线' },
            { name: '感应电流', formula: 'I = E/R', variables: 'R: 回路总电阻' }
        ],
        tips: [
            '穿过闭合回路的磁通量变化会产生感应电流',
            '楞次定律说明感应电流总是阻碍磁通量变化',
            '发电机和变压器都基于电磁感应'
        ]
    },
    'energy-conservation': {
        title: '机械能守恒',
        formulas: [
            { name: '机械能', formula: 'E = E_k + E_p', variables: '动能与势能之和' },
            { name: '动能', formula: 'E_k = ½mv²', variables: 'm: 质量, v: 速率' },
            { name: '重力势能', formula: 'E_p = mgh', variables: 'h: 相对零势能面的高度' },
            { name: '守恒条件', formula: 'E₁ = E₂', variables: '只有重力或弹力做功时' }
        ],
        tips: [
            '机械能守恒要求非保守力做功为零或可忽略',
            '能量法常比牛顿运动方程更简洁',
            '选择合适的零势能面不会影响能量变化'
        ]
    },
    'free-fall': {
        title: '自由落体运动',
        formulas: [
            { name: '速度公式', formula: 'v = gt', variables: '从静止释放, 向下为正' },
            { name: '位移公式', formula: 'h = ½gt²', variables: 'h: 下落高度' },
            { name: '速度位移关系', formula: 'v² = 2gh', variables: '不含时间的关系式' },
            { name: '落地时间', formula: 't = √(2h/g)', variables: '由高度 h 反推下落时间' }
        ],
        tips: [
            '自由落体是初速度为零、只受重力的匀加速直线运动',
            '忽略空气阻力时不同质量物体加速度相同',
            '位移与时间平方成正比'
        ]
    },
    'galileo-incline': {
        title: '伽利略斜面实验',
        formulas: [
            { name: '沿斜面加速度', formula: 'a = g sinθ', variables: 'θ: 斜面倾角', condition: '光滑斜面' },
            { name: '位移时间关系', formula: 's = ½at²', variables: '从静止开始下滑' },
            { name: '速度时间关系', formula: 'v = at', variables: '匀加速直线运动' },
            { name: '速度位移关系', formula: 'v² = 2as', variables: '用于实验外推' }
        ],
        tips: [
            '斜面减小加速度, 便于在低精度计时条件下观测规律',
            '伽利略用斜面实验外推自由落体规律',
            '实验揭示位移与时间平方成正比'
        ]
    },
    'gas-law': {
        title: '气体实验定律',
        formulas: [
            { name: '玻意耳定律', formula: 'pV = C', variables: '温度不变时压强与体积成反比' },
            { name: '查理定律', formula: 'V/T = C', variables: '压强不变时体积与热力学温度成正比' },
            { name: '盖吕萨克定律', formula: 'p/T = C', variables: '体积不变时压强与热力学温度成正比' },
            { name: '理想气体方程', formula: 'pV = nRT', variables: 'n: 物质的量, R: 气体常量' }
        ],
        tips: [
            '温度必须使用热力学温度 K',
            '三个实验定律都是理想气体方程的特殊情形',
            '实际气体在低压高温时更接近理想气体'
        ]
    },
    inertia: {
        title: '惯性与牛顿第一定律',
        formulas: [
            { name: '惯性定律', formula: 'ΣF = 0 → v 保持不变', variables: '物体保持静止或匀速直线运动' },
            { name: '动量表达', formula: 'p = mv', variables: '质量越大, 改变运动状态越困难' },
            { name: '冲量关系', formula: 'FΔt = Δp', variables: '改变运动状态需要冲量' },
            { name: '加速度关系', formula: 'a = F/m', variables: '同一力作用下质量越大加速度越小' }
        ],
        tips: ['惯性是物体保持原有运动状态的性质', '质量是惯性大小的量度', '牛顿第一定律定义了惯性参考系']
    },
    interference: {
        title: '波的干涉',
        formulas: [
            { name: '相长干涉', formula: 'Δr = kλ', variables: 'k = 0, ±1, ±2 ...', condition: '振动加强' },
            { name: '相消干涉', formula: 'Δr = (k + ½)λ', variables: 'k = 0, ±1, ±2 ...', condition: '振动减弱' },
            { name: '相位差', formula: 'Δφ = 2πΔr/λ', variables: 'Δr: 路程差' },
            { name: '条纹间距', formula: 'Δx = Lλ/d', variables: '双缝间距 d, 屏距 L' }
        ],
        tips: ['稳定干涉需要频率相同、相位差恒定的相干波源', '干涉是波动性的典型证据', '亮暗条纹由光程差决定']
    },
    'lc-oscillator': {
        title: 'LC 电磁振荡',
        formulas: [
            { name: '固有角频率', formula: 'ω₀ = 1/√(LC)', variables: 'L: 电感, C: 电容' },
            { name: '振荡周期', formula: 'T = 2π√(LC)', variables: 'LC 回路的固有周期' },
            { name: '电场能', formula: 'W_E = q²/(2C) = ½CU²', variables: '电容器储存的能量' },
            { name: '磁场能', formula: 'W_B = ½LI²', variables: '电感线圈储存的能量' }
        ],
        tips: [
            '理想 LC 回路中电场能和磁场能周期性相互转化',
            '电荷最大时电流为零, 电流最大时电荷为零',
            '电磁振荡是无线电发射与接收的基础'
        ]
    },
    'magnetic-force': {
        title: '洛伦兹力',
        formulas: [
            { name: '洛伦兹力大小', formula: 'F = |q|vB sinθ', variables: 'θ: v 与 B 的夹角' },
            { name: '垂直入射半径', formula: 'r = mv/(|q|B)', variables: 'v ⊥ B 时做匀速圆周运动' },
            { name: '回旋周期', formula: 'T = 2πm/(|q|B)', variables: '与速率无关' },
            { name: '磁场不做功', formula: 'W_B = 0', variables: '力始终垂直于速度' }
        ],
        tips: [
            '洛伦兹力方向由左手定则判断',
            '磁场只能改变速度方向, 不改变速率',
            '质谱仪和回旋加速器利用带电粒子在磁场中的偏转'
        ]
    },
    'mechanical-wave': {
        title: '机械波',
        formulas: [
            { name: '波速公式', formula: 'v = λf = λ/T', variables: 'λ: 波长, f: 频率, T: 周期' },
            { name: '简谐波函数', formula: 'y = A sin(ωt − kx + φ)', variables: 'A: 振幅, k: 波数' },
            { name: '角频率', formula: 'ω = 2πf', variables: 'f: 频率' },
            { name: '波数', formula: 'k = 2π/λ', variables: 'λ: 波长' }
        ],
        tips: [
            '机械波传播需要介质, 传播的是振动形式和能量',
            '介质质点只在平衡位置附近振动, 不随波远距离迁移',
            '波速由介质性质决定, 频率由波源决定'
        ]
    },
    'micro-deformation': {
        title: '微小形变放大',
        formulas: [
            { name: '胡克定律', formula: 'F = kx', variables: 'x: 微小形变量' },
            { name: '应变定义', formula: 'ε = ΔL/L', variables: '相对形变量' },
            { name: '杨氏模量', formula: 'E = σ/ε = (F/S)/(ΔL/L)', variables: '材料抵抗拉伸形变的能力' },
            { name: '光杠杆放大', formula: 'Δs ≈ 2Lθ', variables: 'L: 标尺距离, θ: 镜面转角' }
        ],
        tips: [
            '微小形变可通过指针、光杠杆或传感器放大显示',
            '弹性限度内形变量与外力近似成正比',
            '应变是无量纲量, 便于比较不同长度物体的形变'
        ]
    },
    'micrometer-tool': {
        title: '螺旋测微器读数',
        formulas: [
            { name: '总读数', formula: 'L = 主尺读数 + 可动刻度读数', variables: '单位通常为 mm' },
            { name: '可动刻度', formula: 'b = n × 0.01 mm', variables: 'n: 对齐刻度格数' },
            { name: '零误差修正', formula: 'L_true = L_read − e₀', variables: 'e₀: 零误差' },
            { name: '螺距关系', formula: 'ΔL = p·ΔN', variables: 'p: 螺距, ΔN: 转过圈数' }
        ],
        tips: ['读数时先看固定套筒主尺, 再读微分筒刻度', '常见螺旋测微器精度为 0.01 mm', '测量前要检查并修正零误差']
    },
    momentum: {
        title: '动量与冲量',
        formulas: [
            { name: '动量定义', formula: 'p = mv', variables: 'p: 动量, m: 质量, v: 速度' },
            { name: '冲量定义', formula: 'I = FΔt', variables: '恒力冲量' },
            { name: '动量定理', formula: 'I = Δp', variables: '合外力冲量等于动量变化' },
            { name: '动量守恒', formula: 'Σp_before = Σp_after', variables: '系统合外力为零' }
        ],
        tips: [
            '动量是矢量, 列式前必须规定正方向',
            '碰撞、爆炸、反冲常优先使用动量守恒',
            '缓冲装置通过延长作用时间减小平均冲力'
        ]
    },
    'moon-earth-test': {
        title: '月地检验',
        formulas: [
            { name: '万有引力', formula: 'F = GMm/r²', variables: 'M: 地球质量, m: 月球质量' },
            { name: '向心加速度', formula: 'a = 4π²r/T²', variables: 'r: 月地距离, T: 月球公转周期' },
            { name: '平方反比检验', formula: 'a_m/g ≈ (R_E/r)²', variables: 'R_E: 地球半径, r: 月地距离' },
            { name: '圆周运动平衡', formula: 'GMm/r² = m4π²r/T²', variables: '引力提供向心力' }
        ],
        tips: [
            '月地检验证明天上运动和地上落体遵循同一种引力规律',
            '月球绕地球运动的向心加速度远小于地表重力加速度',
            '平方反比关系是万有引力定律的关键证据'
        ]
    },
    'motion-composition': {
        title: '运动的合成与分解',
        formulas: [
            { name: '位移合成', formula: 'r = r₁ + r₂', variables: '位移矢量按平行四边形法则合成' },
            { name: '速度合成', formula: 'v = v₁ + v₂', variables: '合速度为分速度矢量和' },
            { name: '分量表达', formula: 'v_x = v cosθ, v_y = v sinθ', variables: 'θ: 与 x 轴夹角' },
            { name: '合速度大小', formula: 'v = √(v_x² + v_y²)', variables: '垂直分量合成' }
        ],
        tips: [
            '合运动和分运动具有等时性、独立性和等效性',
            '小船渡河、抛体运动都可用运动分解分析',
            '矢量合成要同时考虑大小和方向'
        ]
    },
    'multimeter-tool': {
        title: '多用电表',
        formulas: [
            { name: '电压测量', formula: 'U = IR', variables: '电压档内部等效为高内阻电压表' },
            { name: '电流测量', formula: 'I = U/R_shunt', variables: '电流档利用分流电阻扩大量程' },
            { name: '欧姆档读数', formula: 'R_x = U/I − R_内', variables: '由内部电源和表头电流换算' },
            { name: '量程比例', formula: '读数 = 指针比例 × 量程', variables: '电压/电流线性刻度近似成立' }
        ],
        tips: ['测电压并联, 测电流串联, 档位不能接错', '欧姆档每次换挡后需调零', '读数时应根据所选量程换算刻度值']
    },
    'newton-first-law': {
        title: '牛顿第一定律',
        formulas: [
            { name: '惯性定律', formula: 'ΣF = 0 → v = 常量', variables: '静止或匀速直线运动' },
            { name: '力与运动状态', formula: 'ΣF ≠ 0 → a ≠ 0', variables: '合力改变运动状态' },
            { name: '动量保持', formula: 'p = mv = 常量', variables: '质量不变且速度恒定' },
            { name: '摩擦减速', formula: 'a = −μg', variables: '粗糙水平面上滑动摩擦导致减速' }
        ],
        tips: [
            '力不是维持运动的原因, 而是改变运动状态的原因',
            '理想无摩擦条件下物体会保持匀速直线运动',
            '牛顿第一定律建立了惯性参考系概念'
        ]
    },
    'newton-second-law': {
        title: '牛顿第二定律',
        formulas: [
            { name: '基本公式', formula: 'F = ma', variables: 'F: 合外力, m: 质量, a: 加速度' },
            { name: '分量形式', formula: 'F_x = ma_x, F_y = ma_y', variables: '各方向独立列方程' },
            { name: '加速度关系', formula: 'a = F/m', variables: '同一物体合力越大加速度越大' },
            { name: '单位定义', formula: '1 N = 1 kg·m/s²', variables: '牛顿单位由第二定律定义' }
        ],
        tips: ['F 必须是物体所受合外力', '加速度方向与合外力方向相同', '应用时先受力分析, 再建立坐标系列分量方程']
    },
    orbital: {
        title: '卫星轨道运动',
        formulas: [
            { name: '引力提供向心力', formula: 'GMm/r² = mv²/r', variables: 'r: 轨道半径' },
            { name: '轨道速度', formula: 'v = √(GM/r)', variables: '圆轨道速度' },
            { name: '轨道周期', formula: 'T = 2π√(r³/GM)', variables: '开普勒第三定律形式' },
            { name: '第一宇宙速度', formula: 'v₁ = √(GM/R_E) ≈ 7.9 km/s', variables: '近地圆轨道速度' }
        ],
        tips: [
            '轨道半径越大, 卫星线速度越小、周期越长',
            '同步卫星周期等于地球自转周期',
            '万有引力在圆轨道中完全提供向心力'
        ]
    },
    overweight: {
        title: '超重与失重',
        formulas: [
            { name: '视重', formula: 'N = m(g + a)', variables: '向上加速时超重' },
            { name: '失重视重', formula: 'N = m(g − a)', variables: '向下加速时失重' },
            { name: '完全失重', formula: 'a = g → N = 0', variables: '自由下落时支持力为零' },
            { name: '牛顿第二定律', formula: 'N − mg = ma', variables: '取向上为正时' }
        ],
        tips: [
            '超重和失重描述的是视重变化, 物体重力 mg 本身不变',
            '电梯加速上升或减速下降时会出现超重',
            '自由落体和绕地飞行中的物体处于失重状态'
        ]
    },
    photoelectric: {
        title: '光电效应',
        formulas: [
            { name: '爱因斯坦方程', formula: 'hν = W₀ + E_kmax', variables: 'W₀: 逸出功, E_kmax: 最大初动能' },
            { name: '截止频率', formula: 'ν₀ = W₀/h', variables: '低于截止频率无光电子逸出' },
            { name: '遏止电压', formula: 'eU_c = E_kmax', variables: 'U_c: 遏止电压' },
            { name: '光子能量', formula: 'E = hν = hc/λ', variables: 'ν: 频率, λ: 波长' }
        ],
        tips: [
            '光电效应证明光具有粒子性',
            '是否产生光电子取决于频率, 光强影响光电子数目',
            '最大初动能随入射光频率线性增大'
        ]
    },
    radioactive: {
        title: '放射性衰变',
        formulas: [
            { name: '指数衰变', formula: 'N = N₀e^(−λt)', variables: 'λ: 衰变常量' },
            { name: '半衰期关系', formula: 'T₁/₂ = ln2/λ', variables: '半数原子核衰变所需时间' },
            { name: '活度', formula: 'A = λN', variables: '单位时间衰变数' },
            { name: '剩余比例', formula: 'N/N₀ = (1/2)^(t/T₁/₂)', variables: '按半衰期估算剩余量' }
        ],
        tips: [
            '半衰期由原子核本身决定, 不受普通物理化学条件影响',
            '大量原子核衰变遵循统计规律',
            '活度随未衰变原子核数减少而降低'
        ]
    },
    'reaction-time': {
        title: '反应时间测量',
        formulas: [
            { name: '自由落体位移', formula: 'h = ½gt²', variables: '尺子从静止开始下落' },
            { name: '反应时间', formula: 't = √(2h/g)', variables: '由下落距离 h 反推' },
            { name: '末速度', formula: 'v = gt', variables: '抓住瞬间尺子的速度' },
            { name: '误差传播', formula: 'Δt/t ≈ ½·Δh/h', variables: '高度读数误差对时间的影响' }
        ],
        tips: ['尺子下落距离越大, 反应时间越长', '多次测量取平均可减小偶然误差', '实验默认忽略空气阻力和抓取过程位移']
    },
    refraction: {
        title: '光的折射',
        formulas: [
            { name: '折射定律', formula: 'n₁sinθ₁ = n₂sinθ₂', variables: 'θ₁: 入射角, θ₂: 折射角' },
            { name: '折射率', formula: 'n = c/v', variables: 'c: 真空光速, v: 介质中光速' },
            { name: '临界角', formula: 'sinC = n₂/n₁', variables: '从光密介质射向光疏介质', condition: 'n₁ > n₂' },
            { name: '全反射条件', formula: 'θ₁ ≥ C', variables: '入射角大于等于临界角' }
        ],
        tips: [
            '光从光疏介质进入光密介质时向法线偏折',
            '全反射要求从光密介质射向光疏介质',
            '光纤通信利用全反射传输光信号'
        ]
    },
    'simple-pendulum': {
        title: '单摆',
        formulas: [
            { name: '周期公式', formula: 'T = 2π√(L/g)', variables: 'L: 摆长, g: 重力加速度', condition: '小角度近似' },
            { name: '角频率', formula: 'ω = √(g/L)', variables: '单摆简谐运动角频率' },
            { name: '回复力近似', formula: 'F_t ≈ −mgθ', variables: 'θ 较小时 sinθ ≈ θ' },
            { name: '测重力加速度', formula: 'g = 4π²L/T²', variables: '由摆长和周期反推 g' }
        ],
        tips: ['单摆周期与摆球质量无关', '周期公式只适用于小角度摆动', '摆长是悬点到摆球重心的距离']
    },
    'ticker-timer': {
        title: '打点计时器',
        formulas: [
            { name: '打点周期', formula: 'T = 1/f', variables: 'f: 电源频率, 50 Hz 时 T=0.02 s' },
            { name: '平均速度', formula: 'v̄ = Δx/Δt', variables: '相邻若干点间位移除以时间' },
            { name: '匀变速加速度', formula: 'a = Δx/(T²)', variables: '连续相等时间位移差 Δx' },
            { name: '中间时刻速度', formula: 'v_mid = x/t', variables: '一段位移的平均速度等于中间时刻瞬时速度' }
        ],
        tips: [
            '打点计时器用固定时间间隔记录纸带位置',
            '点迹间距逐渐增大说明物体在加速',
            '选取较长时间间隔可减小读数相对误差'
        ]
    },
    'transmission-belt': {
        title: '传送带运动',
        formulas: [
            { name: '滑动摩擦力', formula: 'f = μmg', variables: '水平传送带上正压力 N=mg' },
            { name: '加速度', formula: 'a = μg', variables: '相对滑动阶段由摩擦提供加速度' },
            { name: '达到共速时间', formula: 't = |v_b − v₀|/(μg)', variables: 'v_b: 传送带速度' },
            { name: '相对位移', formula: 's_rel = ½|v_b − v₀|t', variables: '滑动阶段物体相对传送带位移' }
        ],
        tips: [
            '摩擦力方向取决于物体相对传送带的运动趋势',
            '达到共速后可能随传送带匀速运动',
            '传送带问题常需分滑动阶段和共速阶段讨论'
        ]
    },
    'vernier-caliper-tool': {
        title: '游标卡尺读数',
        formulas: [
            { name: '总读数', formula: 'L = 主尺读数 + 游标读数', variables: '单位通常为 mm' },
            { name: '游标读数', formula: 'b = k × 精度', variables: 'k: 对齐刻线序号' },
            { name: '精度关系', formula: '精度 = 1 mm / N', variables: 'N: 游标分度数' },
            { name: '零误差修正', formula: 'L_true = L_read − e₀', variables: 'e₀: 零误差' }
        ],
        tips: [
            '读数由主尺整毫米数和游标对齐刻度组成',
            '10、20、50 分度常对应 0.1、0.05、0.02 mm 精度',
            '测量前应检查零刻线是否对齐'
        ]
    },
    'vertical-circle': {
        title: '竖直平面圆周运动',
        formulas: [
            { name: '最高点临界条件', formula: 'v_top ≥ √(gR)', variables: '轻绳模型中最高点不松弛' },
            { name: '最高点受力', formula: 'mg + T = mv²/R', variables: 'T: 绳拉力, 指向圆心' },
            { name: '最低点受力', formula: 'T − mg = mv²/R', variables: '最低点向心方向向上' },
            { name: '机械能守恒', formula: '½mv_bottom² = ½mv_top² + 2mgR', variables: '忽略阻力' }
        ],
        tips: ['竖直圆周运动速率通常随高度变化', '最高点临界速度取决于约束模型, 轻绳和轻杆不同', '最低点绳张力通常最大']
    }
};

const DEFAULT_FORMULA: FormulaDef = {
    title: '物理公式',
    formulas: [],
    tips: ['选择一个实验场景查看公式说明']
};

export function FormulaPanel() {
    const { simulationResult, currentScene } = useSimulationStore();

    // 优先使用 physics-core 返回的公式
    const engineFormulas = simulationResult?.explanation.formulas ?? [];
    const engineSteps = simulationResult?.explanation.steps ?? [];
    const summary = simulationResult?.explanation.summary ?? '';

    // 回退到内置公式定义
    const fallback = FORMULA_MAP[currentScene] ?? DEFAULT_FORMULA;

    return (
        <div className="panel-section formula-panel">
            <div className="panel-title">公式说明</div>

            {/* physics-core 解释（air-track 场景隐藏，避免与实验专用公式重复） */}
            {summary && currentScene !== 'air-track' && <div className="formula-summary">{summary}</div>}

            {/* physics-core 推导步骤（air-track 场景隐藏，使用实验专用公式替代） */}
            {engineSteps.length > 0 && currentScene !== 'air-track' && (
                <div className="formula-steps">
                    <div className="formula-subtitle">推导过程</div>
                    {engineSteps
                        .sort((a, b) => a.order - b.order)
                        .map((step, i) => (
                            <div key={i} className="formula-step">
                                <span className="step-num">{step.order}</span>
                                <div>
                                    <div className="step-desc">{step.description}</div>
                                    {step.formula && <div className="step-formula">{step.formula}</div>}
                                    {step.calculation && <div className="step-calc">{step.calculation}</div>}
                                    {step.result && <div className="step-result">{step.result}</div>}
                                </div>
                            </div>
                        ))}
                </div>
            )}

            {/* physics-core 公式（air-track 场景隐藏，使用实验专用公式替代） */}
            {engineFormulas.length > 0 && currentScene !== 'air-track' && (
                <div className="formula-list">
                    <div className="formula-subtitle">核心公式</div>
                    {engineFormulas.map((f, i) => (
                        <div key={i} className="formula-item">
                            <div className="formula-name">{f.name}</div>
                            <div className="formula-expr">{f.formula}</div>
                            <div className="formula-vars">
                                {Object.entries(f.variables).map(([k, v]) => (
                                    <span key={k} className="formula-var">
                                        {k} = {v.value} {v.unit}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* 内置公式回退 */}
            {((engineFormulas.length === 0 && engineSteps.length === 0) || currentScene === 'air-track') && (
                <>
                    <div className="formula-list">
                        <div className="formula-subtitle">{fallback.title}</div>
                        {fallback.formulas.map((f, i) => (
                            <div key={i} className="formula-item">
                                <div className="formula-name">{f.name}</div>
                                <div className="formula-expr">{f.formula}</div>
                                <div className="formula-vars">{f.variables}</div>
                                {f.condition && <div className="formula-condition">条件: {f.condition}</div>}
                            </div>
                        ))}
                    </div>
                    {fallback.tips.length > 0 && (
                        <div className="formula-tips">
                            <div className="formula-subtitle">学习要点</div>
                            {fallback.tips.map((tip, i) => (
                                <div key={i} className="tip-item">
                                    • {tip}
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
