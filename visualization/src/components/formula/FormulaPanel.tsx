import { useSimulationStore } from '../../store/simulationStore';

interface FormulaDef {
  title: string;
  formulas: Array<{ name: string; formula: string; variables: string; condition?: string }>;
  tips: string[];
}

const FORMULA_MAP: Record<string, FormulaDef> = {
  'projectile': {
    title: '平抛 / 斜抛运动',
    formulas: [
      { name: '水平位移', formula: 'x = v₀x · t', variables: 'v₀x: 水平初速度, t: 时间' },
      { name: '竖直位移', formula: 'y = y₀ + v₀y · t − ½gt²', variables: 'y₀: 初始高度, v₀y: 竖直初速度, g: 重力加速度' },
      { name: '水平速度', formula: 'vx = v₀x', variables: '水平方向匀速' },
      { name: '竖直速度', formula: 'vy = v₀y − gt', variables: '竖直方向匀变速' },
      { name: '飞行时间', formula: 'T = 2v₀y / g', variables: 'v₀y: 竖直初速度, g: 重力加速度', condition: '落地时 y = 0' },
      { name: '最大高度', formula: 'H = v₀y² / (2g)', variables: 'v₀y: 竖直初速度, g: 重力加速度', condition: 'vy = 0 时' },
      { name: '水平射程', formula: 'R = v₀x · T', variables: 'v₀x: 水平初速度, T: 飞行时间', condition: '平地落地' },
    ],
    tips: [
      '水平方向不受力，做匀速直线运动',
      '竖直方向只受重力，做匀变速运动',
      '两个方向的运动独立，可分别分析',
      '轨迹为抛物线',
    ],
  },
  'uniform-accelerated': {
    title: '匀变速直线运动',
    formulas: [
      { name: '速度公式', formula: 'v = v₀ + at', variables: 'v₀: 初速度, a: 加速度, t: 时间' },
      { name: '位移公式', formula: 'x = x₀ + v₀t + ½at²', variables: 'x₀: 初始位置' },
      { name: '速度-位移', formula: 'v² = v₀² + 2a(x − x₀)', variables: '不含时间' },
    ],
    tips: [
      '加速度恒定',
      '适用于自由落体、刹车等场景',
    ],
  },
  'inclined-plane': {
    title: '斜面运动',
    formulas: [
      { name: '重力分量', formula: 'F∥ = mg sinθ', variables: 'θ: 斜面倾角', condition: '沿斜面方向' },
      { name: '支持力', formula: 'N = mg cosθ', variables: '垂直于斜面' },
      { name: '摩擦力', formula: 'f = μN = μmg cosθ', variables: 'μ: 摩擦系数' },
      { name: '加速度', formula: 'a = g(sinθ − μcosθ)', variables: '沿斜面方向', condition: '无初速度时' },
    ],
    tips: [
      '沿斜面方向分解重力',
      '摩擦力方向与运动方向相反',
    ],
  },
  'spring-oscillator': {
    title: '弹簧振子',
    formulas: [
      { name: '回复力', formula: 'F = −kx', variables: 'k: 劲度系数, x: 位移', condition: '胡克定律' },
      { name: '周期', formula: 'T = 2π√(m/k)', variables: 'm: 质量', condition: '简谐运动' },
      { name: '总能量', formula: 'E = ½kx² + ½mv²', variables: '势能 + 动能', condition: '机械能守恒' },
    ],
    tips: [
      '回复力与位移成正比、方向相反',
      '机械能守恒',
      '运动为简谐运动',
    ],
  },
  'collision-elastic': {
    title: '弹性碰撞',
    formulas: [
      { name: '动量守恒', formula: 'm₁v₁ + m₂v₂ = m₁v₁\' + m₂v₂\'', variables: '碰撞前后总动量不变', condition: '所有碰撞' },
      { name: '动能守恒', formula: '½m₁v₁² + ½m₂v₂² = ½m₁v₁\'² + ½m₂v₂\'²', variables: '弹性碰撞动能守恒', condition: '仅弹性碰撞' },
    ],
    tips: [
      '弹性碰撞：动量守恒 + 动能守恒',
      '非弹性碰撞：动量守恒，动能不守恒',
      '完全非弹性碰撞：碰撞后两物体合为一体',
    ],
  },
  'electric-field': {
    title: '匀强电场中的带电粒子',
    formulas: [
      { name: '电场力', formula: 'F = qE', variables: 'q: 电荷量(C), E: 电场强度(N/C)', condition: '匀强电场' },
      { name: '加速度', formula: 'a = qE/m', variables: 'm: 粒子质量(kg)' },
      { name: '水平位移', formula: 'x = v₀x · t', variables: 'v₀x: 水平初速度', condition: '水平方向不受力' },
      { name: '竖直位移', formula: 'y = v₀y · t + ½at²', variables: 'a = qE/m' },
      { name: '电势能', formula: 'Ep = -qEy', variables: '以 y=0 为零势能点' },
      { name: '动能定理', formula: 'ΔEk = qEΔy', variables: '电场力做功等于动能变化' },
    ],
    tips: [
      '正电荷受力方向与电场方向相同，负电荷相反',
      '电场力是恒力，轨迹为抛物线',
      '类似重力场中的斜抛运动',
      '电场力做功与路径无关，只与始末位置有关',
    ],
  },
  'magnetic-field': {
    title: '匀强磁场中的带电粒子',
    formulas: [
      { name: '洛伦兹力', formula: 'F = qv × B', variables: 'q: 电荷量, v: 速度, B: 磁感应强度', condition: 'v ⊥ B 时' },
      { name: '洛伦兹力大小', formula: 'F = |q|vB', variables: '力始终垂直于速度方向' },
      { name: '回旋半径', formula: 'R = mv/(|q|B)', variables: 'm: 质量, v: 速率' },
      { name: '回旋周期', formula: 'T = 2πm/(|q|B)', variables: '与速度无关！' },
      { name: '角频率', formula: 'ω = |q|B/m', variables: '回旋角频率' },
    ],
    tips: [
      '洛伦兹力始终垂直于速度方向，不做功',
      '动能守恒，速率不变',
      '匀速圆周运动（当 v ⊥ B 时）',
      '回旋周期与速度无关——回旋加速器的原理',
      '正电荷和负电荷旋转方向相反',
    ],
  },
  'collision': {
    title: '碰撞',
    formulas: [
      { name: '动量守恒', formula: 'm₁v₁ + m₂v₂ = m₁v₁\' + m₂v₂\'', variables: '碰撞前后总动量不变', condition: '所有碰撞' },
      { name: '动能守恒', formula: '½m₁v₁² + ½m₂v₂² = ½m₁v₁\'² + ½m₂v₂\'²', variables: '弹性碰撞动能守恒', condition: '仅弹性碰撞' },
      { name: '恢复系数', formula: 'e = (v₂\' − v₁\') / (v₁ − v₂)', variables: '0≤e≤1, e=1为弹性碰撞' },
    ],
    tips: [
      '弹性碰撞：动量守恒 + 动能守恒',
      '非弹性碰撞：动量守恒，动能不守恒',
      '完全非弹性碰撞：碰撞后两物体合为一体',
    ],
  },
  'spring': {
    title: '弹簧振子',
    formulas: [
      { name: '回复力', formula: 'F = −kx', variables: 'k: 劲度系数, x: 位移', condition: '胡克定律' },
      { name: '周期', formula: 'T = 2π√(m/k)', variables: 'm: 质量', condition: '简谐运动' },
      { name: '总能量', formula: 'E = ½kx² + ½mv²', variables: '势能 + 动能', condition: '机械能守恒' },
    ],
    tips: [
      '回复力与位移成正比、方向相反',
      '机械能守恒（无阻尼时）',
      '运动为简谐运动',
    ],
  },
  'em-combined': {
    title: '电磁复合场',
    formulas: [
      { name: '电场力', formula: 'FE = qE', variables: 'q: 电荷量, E: 电场强度' },
      { name: '洛伦兹力', formula: 'FB = qv × B', variables: 'q: 电荷量, v: 速度, B: 磁感应强度' },
      { name: '速度选择器', formula: 'v = E/B', variables: '当电场力与洛伦兹力平衡时', condition: '匀速直线运动' },
    ],
    tips: [
      '电场力方向恒定，洛伦兹力随速度方向变化',
      '速度选择器：v = E/B 时粒子直线通过',
      '运动轨迹一般为摆线（旋轮线）',
    ],
  },
  'air-track': {
    title: '气垫导轨测速度',
    formulas: [
      { name: '平均速度', formula: 'v̄ = Δx / Δt', variables: 'Δx: 挡光片宽度, Δt: 挡光时间' },
      { name: '瞬时速度（近似）', formula: 'v ≈ Δx / Δt', variables: '当 Δt 足够小时', condition: '极限思想' },
      { name: '挡光时间', formula: 'Δt = Δx / v', variables: '用于反推速度' },
      { name: '匀速判据', formula: 'v₁ ≈ v₂', variables: 'v₁,v₂ 为两光电门测得的速度', condition: '|v₁−v₂|/v̄ < 1%' },
    ],
    tips: [
      '挡光片越窄（Δt 越小），平均速度越接近瞬时速度',
      '气垫导轨通过气孔喷气形成气垫，几乎消除摩擦，滑块可视为匀速运动',
      '调平导轨的判据：滑块经过两光电门时速度相等',
      '数字毫秒计精度通常为 1 ms，挡光时间通常为毫秒量级',
    ],
  },
  // ========== 必修一 第三章 相互作用——力 ==========
  'hooke-law': {
    title: '胡克定律 (弹簧弹力与形变量)',
    formulas: [
      { name: '胡克定律', formula: 'F = kx', variables: 'k: 劲度系数(N/m), x: 弹簧伸长量(m)', condition: '弹性限度内' },
      { name: '平衡条件', formula: 'kx = mg', variables: 'm: 钩码质量, g: 重力加速度', condition: '竖直悬挂静止时' },
      { name: '伸长量', formula: 'x = mg / k', variables: '由平衡条件推导' },
      { name: '劲度系数', formula: 'k = F / x = mg / x', variables: '实验测量公式' },
    ],
    tips: [
      '弹力方向始终指向弹簧原长方向 (回复力)',
      '劲度系数 k 由弹簧材料、粗细、长度决定，与外力无关',
      'F-x 图像为过原点的直线，斜率即为 k',
      '超过弹性限度后，胡克定律不再适用',
    ],
  },

  // ========== 选必一 第 1 章 动量守恒 ==========
  'projectile-collision': {
    title: '平抛碰撞 (动量守恒定律)',
    formulas: [
      { name: '动量守恒 (系统合外力为零)', formula: 'm₁v₁ + m₂v₂ = m₁v₁\' + m₂v₂\'', variables: 'v₁, v₂: 碰前速度; v₁\', v₂\': 碰后速度', condition: '所有碰撞 (宏观/微观, 低速/高速)' },
      { name: '一维弹性碰撞速度', formula: 'v₁\' = (m₁−m₂)v₁/(m₁+m₂) + 2m₂v₂/(m₁+m₂)', variables: '正方向规定后可得 v₁\', v₂\'', condition: '一维弹性碰撞' },
      { name: '动量', formula: 'p = mv', variables: 'p: 动量 (kg·m/s), m: 质量, v: 速度' },
      { name: '冲量公式', formula: 'I = Δp = FΔt', variables: '力对时间的累积效应' },
      { name: '恢复系数', formula: 'e = (v₂\' − v₁\') / (v₁ − v₂)', variables: 'e=1 弹性; e=0 完全非弹性' },
    ],
    tips: [
      '动量守恒定律是自然界最普遍的守恒定律之一，适用于宏观和微观、低速和高速',
      '系统所受合外力为零时，总动量严格守恒',
      '爆炸、反冲、碰撞等过程内力远大于外力时，可近似用动量守恒处理',
      '动量是矢量，守恒需沿各方向分别列方程',
    ],
  },

  // ========== 选必一 第 2 章 简谐运动 / 共振 ==========
  'double-pendulum-sync': {
    title: '双摆 (单摆周期 + 混沌)',
    formulas: [
      { name: '单摆周期', formula: 'T = 2π√(L/g)', variables: 'L: 摆长, g: 重力加速度', condition: '小角度近似 (θ < 5°)' },
      { name: '单摆频率', formula: 'f = 1/(2π) · √(g/L)', variables: 'f: 频率 (Hz)' },
      { name: '单摆角频率', formula: 'ω = √(g/L)', variables: 'ω: 角频率 (rad/s)' },
      { name: '周期与摆球质量无关', formula: 'T 仅取决于 L 和 g', variables: '定性结论', condition: '同一地点 g 相同' },
      { name: '双摆 (混沌)', formula: '非线性耦合 → 对初值极度敏感', variables: '无简单解析解', condition: '不可预测，呈现混沌' },
    ],
    tips: [
      '单摆周期与摆球质量、振幅无关 (等时性)',
      '摆长是指悬点到摆球重心的距离',
      '双摆无解析解，呈现确定性混沌',
      '物理摆 (复摆) 周期 T = 2π√(I/mgh)',
    ],
  },
  'forced-vibration-freq': {
    title: '受迫振动',
    formulas: [
      { name: '受迫振动 (稳态) 位移', formula: 'x(t) = A·cos(ω_d·t + φ)', variables: 'A: 振幅, ω_d: 驱动力角频率, φ: 初相' },
      { name: '振幅-频率关系', formula: 'A = (F₀/m) / √((ω₀² − ω_d²)² + 4β²ω_d²)', variables: 'F₀: 驱动力幅值, ω₀: 固有角频率, β: 阻尼系数' },
      { name: '相位差', formula: 'tan φ = 2βω_d / (ω₀² − ω_d²)', variables: 'φ: 位移与驱动力的相位差' },
      { name: '固有角频率', formula: 'ω₀ = √(k/m)', variables: 'k: 劲度系数, m: 质量' },
      { name: '阻尼系数', formula: 'β = b/(2m)', variables: 'b: 阻尼常量' },
    ],
    tips: [
      '受迫振动稳定后的频率等于驱动频率，而非固有频率',
      '振幅 A 随 ω_d 变化：ω_d 接近 ω₀ 时发生共振',
      '阻尼 β 越小，共振峰越尖锐',
      '共振时 φ = π/2, 速度达到最大',
    ],
  },
  'resonance-curve': {
    title: '共振 (幅-频曲线)',
    formulas: [
      { name: '共振条件', formula: 'ω_d = ω₀', variables: '驱动力频率 = 固有频率', condition: '振幅达到最大' },
      { name: '品质因数', formula: 'Q = ω₀ / Δω', variables: 'Δω: 半功率带宽 (A_max/√2 处宽度)' },
      { name: '共振振幅', formula: 'A_max = F₀ / (2mβω₀)', variables: 'β: 阻尼系数', condition: 'ω_d = ω₀' },
      { name: '共振时相位差', formula: 'φ = π/2', variables: '位移滞后驱动力 90°' },
      { name: '共振能量', formula: 'E = ½kA²', variables: '系统储存的机械能' },
    ],
    tips: [
      '共振时系统从外界吸收能量最多',
      'Q 值越大，共振峰越尖锐，系统选频能力越强',
      '乐器的共鸣箱利用共振增强声音',
      '桥梁、机器需避免共振 (设计时使固有频率远离常见驱动频率)',
    ],
  },

  // ========== 选必一 第 3 章 机械波 ==========
  'sound-waveform': {
    title: '声波 (波形 + 强度)',
    formulas: [
      { name: '波速公式', formula: 'v = fλ', variables: 'v: 波速 (m/s), f: 频率 (Hz), λ: 波长 (m)' },
      { name: '简谐波表达式', formula: 'y = A·sin(2πx/λ − 2πft)', variables: 'A: 振幅, x: 位置, t: 时间' },
      { name: '波数', formula: 'k = 2π/λ', variables: 'k: 角波数 (rad/m)' },
      { name: '角频率', formula: 'ω = 2πf', variables: 'ω: 角频率 (rad/s)' },
      { name: '声强', formula: 'I = P/(4πr²) = ½ρvω²A²', variables: 'ρ: 介质密度, P: 声功率', condition: '球面波' },
      { name: '声强级', formula: 'L = 10·log₁₀(I/I₀) (dB)', variables: 'I₀ = 10⁻¹² W/m² (听阈)' },
    ],
    tips: [
      '声波是纵波，需要介质传播，真空中不能传声',
      '声速与介质种类和温度有关，空气中约 340 m/s (15°C)',
      '频率决定音调，振幅决定响度，波形决定音色',
      '超声波 (>20 kHz) 和次声波 (<20 Hz) 人耳听不到',
    ],
  },
  'water-diffraction': {
    title: '水波衍射',
    formulas: [
      { name: '衍射条件 (明显衍射)', formula: '障碍物/缝宽 a ≈ λ 或 a < λ', variables: 'a: 障碍物尺寸, λ: 波长' },
      { name: '衍射现象', formula: '波绕过障碍物继续传播', variables: '水波遇障碍物后形成环形波' },
      { name: '惠更斯原理', formula: '波前每点都是子波源', variables: '子波包络形成新波前' },
      { name: '波长与波速', formula: 'λ = v/f', variables: 'v: 水波波速, f: 波源频率' },
      { name: '衍射条纹 (单缝)', formula: '中央明纹最宽最亮', variables: '两侧明纹亮度递减' },
    ],
    tips: [
      '一切波都能发生衍射，衍射是波的特有现象',
      '缝宽越小 (接近波长)，衍射越明显',
      '水波衍射实验可直观看到波绕过障碍物',
      '声波衍射使人能隔墙听到声音',
    ],
  },
  'sound-interference': {
    title: '声波干涉 (双波源)',
    formulas: [
      { name: '相长干涉条件', formula: 'Δr = nλ (n = 0, ±1, ±2 ...)', variables: 'Δr: 两波源到该点的路程差', condition: '振动加强' },
      { name: '相消干涉条件', formula: 'Δr = (n + ½)λ (n = 0, ±1, ±2 ...)', variables: 'Δr: 路程差', condition: '振动减弱' },
      { name: '路程差', formula: 'Δr = |r₁ − r₂|', variables: 'r₁, r₂: 到两波源的距离' },
      { name: '相位差', formula: 'Δφ = 2π·Δr/λ', variables: 'Δφ: 两波在该点的相位差' },
      { name: '相干条件', formula: '频率相同、相位差恒定、振动方向相同', variables: '三条件缺一不可' },
    ],
    tips: [
      '干涉和衍射都是波特有的现象',
      '双缝干涉条纹等间距，明暗交替',
      '声干涉可形成"静音区" (主动降噪原理)',
      '驻波是干涉的特例 (两列反向传播的相干波)',
    ],
  },
  'doppler-effect': {
    title: '多普勒效应',
    formulas: [
      { name: '多普勒频移 (通用)', formula: 'f\' = f·(v ± v_o)/(v ∓ v_s)', variables: 'v: 波速, v_o: 观察者速度, v_s: 波源速度', condition: '分子分母符号约定: 靠近取 +, 远离取 −' },
      { name: '波源静止, 观察者靠近', formula: 'f\' = f·(v + v_o)/v', variables: 'f\' > f (频率升高)' },
      { name: '波源静止, 观察者远离', formula: 'f\' = f·(v − v_o)/v', variables: 'f\' < f (频率降低)' },
      { name: '观察者静止, 波源靠近', formula: 'f\' = f·v/(v − v_s)', variables: 'f\' > f (频率升高)' },
      { name: '观察者静止, 波源远离', formula: 'f\' = f·v/(v + v_s)', variables: 'f\' < f (频率降低)' },
      { name: '波源与观察者均运动', formula: 'f\' = f·(v ± v_o)/(v ∓ v_s)', variables: '靠近时分子加、分母减' },
    ],
    tips: [
      '多普勒效应是波源与观察者相对运动时观测到的频率变化',
      '火车汽笛音调变化、雷达测速、彩超都利用多普勒效应',
      '光波也有多普勒效应 (红移/蓝移)，用于测量天体运动速度',
      '冲击波 (音爆) 发生在波源速度超过波速时',
    ],
  },

  // ========== 选必一 第 4 章 光的干涉 / 衍射 / 偏振 ==========
  'thin-film': {
    title: '薄膜干涉 (等厚干涉)',
    formulas: [
      { name: '相长干涉 (反射光加强)', formula: '2nd = kλ (k = 1, 2, 3 ...)', variables: 'n: 薄膜折射率, d: 膜厚, λ: 光在真空中波长', condition: '考虑半波损失后' },
      { name: '相消干涉 (反射光减弱)', formula: '2nd = (k + ½)λ (k = 0, 1, 2 ...)', variables: '附加 λ/2 来自半波损失' },
      { name: '附加光程差', formula: 'Δ = λ/2', variables: '光从光疏到光密介质反射时', condition: '半波损失' },
      { name: '等厚干涉条纹', formula: '同一厚度对应同一级条纹', variables: '薄膜厚度不均匀时出现明暗条纹' },
      { name: '增透膜', formula: '2nd = λ/2', variables: '使反射光相消，透射光增强' },
    ],
    tips: [
      '薄膜干涉是光在薄膜上下表面反射后叠加形成的',
      '肥皂泡、油膜上的彩色条纹是薄膜干涉现象',
      '增透膜使反射光相消，镜头呈蓝紫色',
      '等厚干涉可检测光学表面平整度 (平晶检验)',
    ],
  },
  'hologram': {
    title: '全息照相 (干涉记录 + 衍射再现)',
    formulas: [
      { name: '记录 (干涉)', formula: 'I = |R + O|² = |R|² + |O|² + R*O + RO*', variables: 'R: 参考光, O: 物光', condition: '两束相干光叠加' },
      { name: '干涉条纹间距', formula: 'd = λ/(2 sin(θ/2))', variables: 'θ: 参考光与物光夹角' },
      { name: '再现 (衍射)', formula: '用参考光照射全息图 → 衍射光重建物光波前', variables: '±1 级衍射光形成虚像和共轭实像' },
      { name: '全息图分辨率', formula: '空间频率 ~ 1000-5000 线/mm', variables: '需高分辨率记录介质' },
      { name: '与普通照片区别', formula: '记录振幅+相位 (全部信息)', variables: '普通照片只记录光强' },
    ],
    tips: [
      '全息照相分为记录和再现两步',
      '全息图任一小块都能再现完整图像 (可分割性)',
      '全息图具有三维立体感',
      '全息技术用于防伪、数据存储、干涉计量',
    ],
  },
  'single-slit': {
    title: '单缝衍射 (光强分布)',
    formulas: [
      { name: '暗纹条件', formula: 'a·sinθ = kλ (k = ±1, ±2 ...)', variables: 'a: 缝宽, θ: 衍射角, λ: 波长', condition: '暗纹位置' },
      { name: '明纹条件 (近似)', formula: 'a·sinθ = (2k+1)·λ/2 (k = ±1, ±2 ...)', variables: '明纹 (次极大) 位置' },
      { name: '中央明纹角宽度', formula: 'Δθ₀ = 2λ/a', variables: '中央明纹最宽最亮' },
      { name: '光强分布', formula: 'I = I₀·(sinβ/β)², β = πa·sinθ/λ', variables: 'β: 相位差参数' },
      { name: '中央明纹线宽度', formula: 'Δx = 2f·λ/a', variables: 'f: 透镜焦距', condition: '屏幕上观察' },
    ],
    tips: [
      '单缝衍射条纹: 中央明纹最宽最亮，两侧明纹亮度迅速递减',
      '缝宽 a 越小，衍射越明显，条纹越宽',
      '白光照射时，中央明纹为白色，两侧呈彩色',
      '圆孔衍射的爱里斑: θ = 1.22λ/D (光学仪器分辨率极限)',
    ],
  },
  'diffraction-grating': {
    title: '光栅衍射 (光栅方程)',
    formulas: [
      { name: '光栅方程 (主极大)', formula: 'd·sinθ = kλ (k = 0, ±1, ±2 ...)', variables: 'd: 光栅常数 (相邻缝间距), k: 级数' },
      { name: '光栅常数', formula: 'd = a + b', variables: 'a: 缝宽, b: 不透光部分宽度' },
      { name: '缺级条件', formula: 'k = (d/a)·k\' (k\' = ±1, ±2 ...)', variables: '主极大与单缝暗纹重合时缺级' },
      { name: '分辨本领', formula: 'R = λ/Δλ = kN', variables: 'N: 光栅总缝数, k: 衍射级次' },
      { name: '光栅线数', formula: 'N\' = 1/d (线/mm)', variables: '常见 300-1200 线/mm' },
    ],
    tips: [
      '光栅衍射是多缝干涉受单缝衍射调制的结果',
      '光栅常数 d 越小，衍射角越大，条纹分得越开',
      '光栅光谱仪利用光栅方程测定光的波长',
      '白光通过光栅产生连续光谱 (按波长分开)',
    ],
  },
  'polarization-malus': {
    title: '偏振光 (马吕斯定律)',
    formulas: [
      { name: '马吕斯定律', formula: 'I = I₀·cos²θ', variables: 'I₀: 入射偏振光强, θ: 两偏振片透振方向夹角' },
      { name: '自然光通过偏振片', formula: 'I = I₀/2', variables: '自然光各方向振动均匀' },
      { name: '布儒斯特定律', formula: 'tanθ_B = n₂/n₁', variables: 'θ_B: 布儒斯特角, 反射光为完全偏振光' },
      { name: '偏振度', formula: 'P = (I_max − I_min)/(I_max + I_min)', variables: 'P=0 自然光, P=1 完全偏振光' },
      { name: '反射与折射偏振', formula: '反射光部分偏振, 折射光部分偏振', variables: '布儒斯特角时反射光完全偏振' },
    ],
    tips: [
      '偏振是横波特有的现象，纵波无偏振',
      '自然光经反射、折射、散射后可获得部分偏振光',
      '3D 电影、液晶显示、太阳镜都利用偏振原理',
      '蜜蜂、蚂蚁利用天空偏振光导航',
    ],
  },

  'sliding-friction': {
    title: '滑动摩擦力 (f=μN)',
    formulas: [
      { name: '滑动摩擦力', formula: 'f = μN', variables: 'μ: 动摩擦因数, N: 正压力(N)', condition: '滑动摩擦' },
      { name: '正压力 (水平面)', formula: 'N = mg', variables: 'm: 物体质量, g: 重力加速度', condition: '水平面无竖直加速度' },
      { name: '动摩擦因数', formula: 'μ = f / N', variables: '由接触面材料和粗糙程度决定' },
      { name: '匀速条件', formula: 'F_pull = f = μmg', variables: '外力等于摩擦力时匀速', condition: '水平面匀速运动' },
      { name: '加速条件', formula: 'a = (F_pull − f) / m', variables: '外力大于摩擦力时加速' },
    ],
    tips: [
      '滑动摩擦力方向始终与相对运动方向相反',
      '动摩擦因数 μ 只与接触面性质有关，与正压力、速度无关',
      'f-N 图像为过原点的直线，斜率即为 μ',
      'μ 通常小于 1，但橡胶与地面等特殊组合可大于 1',
    ],
  },
  'force-composition': {
    title: '力的合成 (平行四边形定则)',
    formulas: [
      { name: '合力大小 (余弦定理)', formula: 'F = √(F₁² + F₂² + 2·F₁·F₂·cosθ)', variables: 'F₁,F₂: 分力, θ: 夹角' },
      { name: '合力方向', formula: 'tanφ = F₂·sinθ / (F₁ + F₂·cosθ)', variables: 'φ: 合力与 F₁ 的夹角' },
      { name: '同向合成 (θ=0°)', formula: 'F = F₁ + F₂', variables: '最大合力' },
      { name: '反向合成 (θ=180°)', formula: 'F = |F₁ − F₂|', variables: '最小合力' },
      { name: '垂直合成 (θ=90°)', formula: 'F = √(F₁² + F₂²)', variables: '勾股定理' },
    ],
    tips: [
      '平行四边形定则适用于所有矢量合成，不限于力',
      '合力大小范围：|F₁−F₂| ≤ F ≤ F₁+F₂',
      'θ=0° 时合力最大，θ=180° 时合力最小',
      '多个力合成可两两依次合成，结果与顺序无关',
    ],
  },
  'newton-third-law': {
    title: '牛顿第三定律 (作用力与反作用力)',
    formulas: [
      { name: '牛顿第三定律', formula: 'F_AB = −F_BA', variables: 'F_AB: A对B的力, F_BA: B对A的力' },
      { name: '大小关系', formula: '|F_AB| = |F_BA|', variables: '大小相等' },
      { name: '方向关系', formula: 'F_AB 与 F_BA 方向相反', variables: '沿同一直线' },
      { name: '系统性', formula: '作用在两个不同物体上', variables: '不能抵消，不同于平衡力' },
      { name: '同时性', formula: '同时产生、同时变化、同时消失', variables: '不可独立存在' },
    ],
    tips: [
      '作用力与反作用力作用在不同物体上，不能抵消',
      '平衡力作用在同一物体上，可以抵消',
      '作用力与反作用力总是同种性质的力',
      '与运动状态无关：静止、匀速、加速时都成立',
    ],
  },
};

const DEFAULT_FORMULA: FormulaDef = {
  title: '物理公式',
  formulas: [],
  tips: ['选择一个实验场景查看公式说明'],
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
      {summary && currentScene !== 'air-track' && (
        <div className="formula-summary">{summary}</div>
      )}

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
                  <span key={k} className="formula-var">{k} = {v.value} {v.unit}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 内置公式回退 */}
      {(engineFormulas.length === 0 && engineSteps.length === 0 || currentScene === 'air-track') && (
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
                <div key={i} className="tip-item">• {tip}</div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
