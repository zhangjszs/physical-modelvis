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

  // ========== 选必二 第 2 章 电磁感应 ==========
  'current-balance': {
    title: '电流天平 (安培力 F=BIL)',
    formulas: [
      { name: '安培力', formula: 'F = BIL', variables: 'B: 磁感应强度(T), I: 电流(A), L: 导体棒有效长度(m)', condition: 'B⊥L, 匀强磁场' },
      { name: '天平平衡', formula: 'F = mg', variables: 'm: 砝码质量(kg), g: 重力加速度', condition: '天平水平平衡时' },
      { name: '磁感应强度', formula: 'B = F / (IL)', variables: '由天平平衡求 B' },
      { name: '多匝线圈安培力', formula: 'F = NBIL', variables: 'N: 线圈匝数', condition: 'N 匝完全相同线圈' },
    ],
    tips: [
      '电流天平是测量磁场强度的精密仪器',
      '安培力方向由左手定则判断',
      '电流天平可通过已知 B 测 I, 或通过已知 I 测 B',
      '天平平衡时安培力与砝码重力相等',
    ],
  },
  'eddy-current': {
    title: '涡流 (电磁感应 + 热效应)',
    formulas: [
      { name: '法拉第电磁感应定律', formula: 'e = -dΦ/dt', variables: 'Φ: 磁通量(Wb), t: 时间(s)' },
      { name: '涡流功率密度', formula: 'P = π²B²d²f² / (6ρ)', variables: 'd: 材料厚度(m), f: 磁场变化频率(Hz), ρ: 电阻率(Ω·m)', condition: '交变磁场中导体圆盘' },
      { name: '涡流阻尼力', formula: 'F_eddy = -k · v', variables: 'k: 阻尼系数, v: 导体相对磁场运动速度', condition: '方向始终阻碍相对运动' },
      { name: '集肤深度', formula: 'δ = √(2ρ / (ωμ))', variables: 'ω: 角频率, μ: 磁导率', condition: '高频时电流集中在表面' },
    ],
    tips: [
      '涡流是电磁感应在整块导体中形成的闭合电流',
      '电磁炉、电磁阻尼、金属探测器都是涡流应用',
      '硅钢片叠压铁芯可减小涡流损耗',
      '集肤深度 δ 随频率升高而减小',
    ],
  },
  'em-damping': {
    title: '电磁阻尼 (涡流制动)',
    formulas: [
      { name: '阻尼力', formula: 'F_d = -k · v', variables: 'k: 阻尼系数(N·s/m), v: 速度(m/s)', condition: '方向始终与速度方向相反' },
      { name: '能量损耗', formula: 'E_diss = ½mv₀²', variables: 'm: 振子质量, v₀: 初始速度', condition: '振动停止时全部动能转化为热量' },
      { name: '阻尼时间常数', formula: 'τ = m / k', variables: '振幅衰减到 1/e 所需时间' },
      { name: '阻尼比', formula: 'ζ = k / (2√(mω₀²))', variables: 'ω₀: 固有角频率', condition: 'ζ > 0 即存在阻尼' },
    ],
    tips: [
      '电磁阻尼本质是涡流受到的安培力阻碍相对运动',
      '灵敏电流表铝框利用电磁阻尼使指针快速稳定',
      '电磁阻尼力与速度成正比, 速度越大阻尼越强',
      '阻尼比 ζ 决定振动衰减快慢',
    ],
  },
  'mutual-inductance': {
    title: '互感 (双线圈耦合)',
    formulas: [
      { name: '互感电动势', formula: 'E₂ = -M · dI₁/dt', variables: 'M: 互感系数(H), I₁: 初级线圈电流', condition: '初级线圈电流变化时次级线圈产生的电动势' },
      { name: '螺线管互感系数', formula: 'M = μ₀n₁n₂A / l', variables: 'n₁,n₂: 单位长度匝数, A: 截面积, l: 长度' },
      { name: '与耦合系数关系', formula: 'M = k√(L₁L₂)', variables: 'k: 耦合系数(0≤k≤1), L₁,L₂: 自感系数' },
      { name: '互感能量', formula: 'W = M·I₁·I₂', variables: '两线圈电流同时存在时储存的磁场能' },
    ],
    tips: [
      '互感现象是一个线圈电流变化在另一个线圈中产生感应电动势',
      '变压器利用互感原理实现电压变换',
      '理想耦合(k=1)的两线圈完全磁通交链',
      '互感系数与线圈截面积、匝数、相对位置有关',
    ],
  },
  'self-inductance': {
    title: '自感 (线圈自身电磁感应)',
    formulas: [
      { name: '自感电动势', formula: 'E = -L · dI/dt', variables: 'L: 自感系数(H), I: 线圈自身电流', condition: '电流变化时线圈自身产生的感应电动势' },
      { name: '螺线管自感系数', formula: 'L = μ₀n²A / l', variables: 'n: 单位长度匝数, A: 截面积, l: 长度' },
      { name: '线圈储能', formula: 'W = ½LI²', variables: '线圈中磁场储存的能量(J)' },
      { name: 'RL 电路时间常数', formula: 'τ = L / R', variables: 'R: 回路电阻', condition: '电流衰减到 1/e 所需时间' },
    ],
    tips: [
      '自感系数 L 描述线圈阻碍电流变化的能力',
      '镇流器利用自感产生瞬时高压点燃灯管',
      '自感线圈在直流稳态时相当于导线(dI/dt=0)',
      '断开含大自感线圈的开关时会产生电弧',
    ],
  },

  // ========== 选必二 第 3 章 交变电流与电磁波 ==========
  'em-wave-communication': {
    title: '电磁波发射 (开放电路 + LC 振荡)',
    formulas: [
      { name: '电磁波波速', formula: 'c = fλ', variables: 'c = 3×10⁸ m/s, f: 频率, λ: 波长' },
      { name: 'LC 振荡周期', formula: 'T = 2π√(LC)', variables: 'L: 电感(H), C: 电容(F)' },
      { name: '电磁振荡能量', formula: 'W = ½LI² + ½CV²', variables: '磁场能 + 电场能', condition: '总能量守恒' },
      { name: '开放电路辐射', formula: 'P ∝ f⁴', variables: '辐射功率与频率四次方成正比', condition: '频率越高辐射能力越强' },
    ],
    tips: [
      '电磁波由 LC 振荡电路产生, 频率 f = 1/(2π√(LC))',
      '开放电路(天线+地线)可提高电磁辐射效率',
      '调制(调幅/调频)后才能携带信息发射',
      '电磁波在真空中以光速传播, 速度约为 3×10⁸ m/s',
    ],
  },
  'em-spectrum': {
    title: '电磁波谱 (按频率排序)',
    formulas: [
      { name: '波速-波长-频率', formula: 'c = fλ', variables: 'c = 3×10⁸ m/s (真空中光速)' },
      { name: '光子能量', formula: 'E = hf = hc/λ', variables: 'h = 6.63×10⁻³⁴ J·s (普朗克常量)' },
      { name: '频率范围 (从低到高)', formula: 'f_radio < f_micro < f_IR < f_vis < f_UV < f_X < f_γ', variables: '无线电波→微波→红外→可见→紫外→X射线→γ射线' },
      { name: '可见光波长范围', formula: 'λ ≈ 400-700 nm', variables: '紫光到红光, 频率约 4.3-7.5×10¹⁴ Hz' },
    ],
    tips: [
      '电磁波谱按频率(或波长)从低到高排列',
      '无线电波用于通信和广播, 微波用于雷达和加热',
      '红外线和紫外线不可见, 可见光只占电磁波谱极小段',
      'γ射线能量最高, 穿透能力最强, 可用于肿瘤治疗',
    ],
  },

  // ========== 选必二 第 4 章 传感器 ==========
  'hall-effect': {
    title: '霍尔效应 (VH=IB/nqd)',
    formulas: [
      { name: '霍尔电压', formula: 'V_H = IB / (nqd)', variables: 'I: 电流(A), B: 磁感应强度(T), n: 载流子浓度, q: 载流子电量, d: 导体厚度(m)' },
      { name: '霍尔系数', formula: 'R_H = 1 / (nq)', variables: '仅由载流子性质决定' },
      { name: '电流微观表达式', formula: 'I = nqvdA', variables: 'v: 载流子漂移速度, A: 横截面积' },
      { name: '霍尔元件灵敏度', formula: 'K_H = 1 / (nqd)', variables: 'K_H 越大, 霍尔电压越高' },
    ],
    tips: [
      '霍尔效应: 载流导体在磁场中产生横向电势差',
      '霍尔电压正负可判断载流子类型 (空穴/电子)',      '霍尔元件用于测磁场/电流/位置等',      '半导体材料载流子浓度低, 霍尔效应更显著',    ],
  },
  'reed-switch': {
    title: '干簧管 (磁场吸合原理)',
    formulas: [
      { name: '螺线管内部磁场', formula: 'B = μ₀nI', variables: 'μ₀: 真空磁导率, n: 单位长度匝数, I: 电流', condition: '长直螺线管内部' },
      { name: '吸合条件', formula: 'F_m > F_spring', variables: 'F_m: 磁力, F_spring: 簧片弹力', condition: '磁场使两簧片磁化吸合' },
      { name: '磁化强度', formula: 'M = χ·H', variables: 'χ: 磁化率, H: 磁场强度', condition: '铁磁材料磁化' },
      { name: '磁滞回线', formula: 'B-H 曲线', variables: '有剩磁和矫顽力', condition: '铁磁材料特有' },
    ],
    tips: [
      '干簧管是一种磁控开关, 玻璃管内封装两个铁磁簧片',
      '外加磁场时簧片磁化吸合, 电路接通',
      '撤去磁场, 簧片弹力使其断开',
      '干簧管广泛用于门磁传感器、液位计等',
    ],
  },
  'photoresistor': {
    title: '光敏电阻 (R-L 特性曲线)',
    formulas: [
      { name: '照度-电阻特性', formula: 'R = R₀ · (E/E₀)^{−α}', variables: 'E: 照度(lx), α: 灵敏度指数(0.5-1), R₀: E₀ 时的电阻' },
      { name: '欧姆定律', formula: 'I = V / R', variables: 'R 随照度变化, 故 I 随照度变化' },
      { name: '电功率', formula: 'P = V² / R', variables: '外加电压恒定时功率与照度正相关' },
      { name: '相对变化率', formula: '(R₀ − R) / R₀ = 1 − (E/E₀)^{−α}', variables: '光照越强电阻变化越大' },
    ],
    tips: [
      '光敏电阻 (LDR) 阻值随光照增强而减小',
      '常用材料: 硫化镉(CdS)、硒化镉(CdSe)',
      'α 越大, 照度-电阻曲线越陡, 灵敏度越高',
      '光敏电阻响应速度较慢, 不适用于高频场合',
    ],
  },
  'thermistor': {
    title: '热敏电阻 (NTC 指数特性)',
    formulas: [
      { name: 'NTC 电阻-温度特性', formula: 'R = R₀ · exp(B·(1/T − 1/T₀))', variables: 'B: 材料系数(K), T: 绝对温度(K), R₀: T₀ 时电阻' },
      { name: '温度系数', formula: 'α = −B / T²', variables: '负温度系数 (NTC) 电阻随温度升高而减小' },
      { name: '电阻变化率', formula: '(R − R₀)/R₀ = exp(B·(1/T − 1/T₀)) − 1', variables: '温度升高时阻值迅速下降' },
      { name: '线性化近似 (小ΔT)', formula: 'R ≈ R₀ · (1 + α · (T − T₀))', variables: 'ΔT 较小时可近似线性' },
    ],
    tips: [
      '负温度系数(NTC)热敏电阻: 温度升高 → 电阻减小',
      '正温度系数(PTC)热敏电阻: 温度升高 → 电阻增大',
      '热敏电阻广泛用于测温、温度补偿、过流保护',
      'B 值越大, 温度灵敏度越高',
    ],
  },
  'strain-gauge': {
    title: '应变片 (惠斯通电桥 + ΔR/R=Kε)',
    formulas: [
      { name: '应变效应', formula: 'ΔR/R = Kε', variables: 'K: 灵敏系数(~2), ε: 应变(ΔL/L)' },
      { name: '应变定义', formula: 'ε = ΔL/L', variables: 'ΔL: 长度变化, L: 原长' },
      { name: '单臂电桥输出', formula: 'V_out ≈ V_ex · Kε / 4', variables: 'V_ex: 激励电压, 单臂工作时' },
      { name: '全桥输出', formula: 'V_out = V_ex · Kε', variables: '四片应变片组成全桥, 灵敏度提高 4 倍' },
    ],
    tips: [
      '应变片将机械形变转化为电阻变化',
      '惠斯通电桥将微小电阻变化转为电压信号',
      '全桥接法灵敏度最高, 温度补偿效果最好',
      '应变片广泛用于称重传感器、压力传感器',
    ],
  },
  'security-alarm': {
    title: '报警电路 (与非门逻辑)',
    formulas: [
      { name: '与非门逻辑', formula: 'Y = (A·B)\' = A\' + B\'', variables: 'A,B: 输入(0/1), Y: 输出, \' 表示取反', condition: '先与后非' },
      { name: '真值表', formula: '00→1, 01→1, 10→1, 11→0', variables: '仅当所有输入为 1 时输出为 0' },
      { name: '逻辑等价', formula: 'Y = NOT(A AND B)', variables: '可实现任何逻辑功能的通用门' },
      { name: '布尔代数', formula: '(XY)\' = X\' + Y\' (德摩根定理)', variables: '与非门+非门 = 与门' },
    ],
    tips: [
      '报警电路核心是逻辑门判断各种传感器条件',
      '与非门: 所有输入高 → 输出低; 任一输入低 → 输出高',
      '布尔代数用于化简复杂逻辑表达式',
      '门磁/红外/烟感多传感器通过与非门组合触发报警',
    ],
  },
  'light-control-switch': {
    title: '光控开关 (LDR 分压 + 三极管驱动)',
    formulas: [
      { name: '分压电路输出电压', formula: 'V_out = V_cc · R_fixed / (R_LDR + R_fixed)', variables: 'V_cc: 电源电压, R_LDR: 光敏电阻, R_fixed: 固定电阻' },
      { name: '三极管基极电流', formula: 'I_b = (V_out − V_BE) / R_b', variables: 'V_BE ≈ 0.7V (硅管), R_b: 基极限流电阻' },
      { name: '驱动条件', formula: 'I_b > I_c / β', variables: 'β: 电流放大系数, I_c: 集电极所需电流(继电器/LED)' },
      { name: '照度阈值判断', formula: '当 V_out > V_BE + I_b·R_b 时三极管导通', variables: '调节 R_fixed 可改变光照阈值' },
    ],
    tips: [
      '光控开关利用光敏电阻阻值变化实现电路自动通断',
      '白天光照强 → R_LDR 小 → V_out 低 → 三极管截止 → 灯灭',
      '夜晚光照弱 → R_LDR 大 → V_out 高 → 三极管导通 → 灯亮',
      '调节分压电阻 R_fixed 可设定光照阈值',
    ],
  },

  // ========== 选必三 第 3 章 热学 (10 个场景) ==========
  'diffusion': {
    title: '扩散现象 (菲克定律 + 爱因斯坦扩散)',
    formulas: [
      { name: '菲克第一定律 (扩散通量)', formula: 'J = −D · dC/dx', variables: 'J: 扩散通量(量·m⁻²·s⁻¹), D: 扩散系数(m²/s), C: 浓度(kg/m³ 或 mol/m³)', condition: '稳态扩散' },
      { name: '浓度梯度', formula: 'dC/dx = (C₂ − C₁) / Δx', variables: '浓度梯度, 方向: 浓度升高方向', condition: '一维线性近似' },
      { name: '爱因斯坦扩散公式', formula: '⟨r²⟩ = 6Dt (3D)', variables: '⟨r²⟩: 均方位移, D: 扩散系数, t: 扩散时间', condition: '各向同性介质布朗粒子' },
      { name: '1D 爱因斯坦扩散', formula: '⟨x²⟩ = 2Dt', variables: '⟨x²⟩: 一维均方位移', condition: '一维扩散' },
    ],
    tips: [
      '扩散是分子热运动的宏观表现, 温度越高扩散越快',
      '扩散系数 D 与温度 T 的关系: D ∝ T (气体) 或 D ~ T/η (斯托克斯-爱因斯坦)',
      '菲克第一定律是稳态扩散; 非稳态用菲克第二定律 ∂C/∂t = D·∂²C/∂x²',
      '扩散方向从高浓度向低浓度, 不可自发反向 (符合热力学第二定律)',
    ],
  },
  'brownian-motion': {
    title: '布朗运动 (爱因斯坦公式)',
    formulas: [
      { name: '位移统计 (一维)', formula: '⟨x²⟩ = 2Dt', variables: '⟨x²⟩: 均方位移(m²), D: 扩散系数(m²/s), t: 观测时间(s)', condition: '长时间的统计平均' },
      { name: '爱因斯坦扩散系数 (球形粒子)', formula: 'D = kT/(6πηr)', variables: 'k: 玻尔兹曼常量, T: 绝对温度, η: 液体粘度, r: 粒子半径', condition: '斯托克斯-爱因斯坦关系 (球形粒子)' },
      { name: '郎之万方程', formula: 'm · dv/dt = −γv + ξ(t)', variables: 'γ: 阻力系数(=6πηr), ξ(t): 随机分子碰撞力', condition: '微观瞬时方程' },
      { name: '均方位移 (3D)', formula: '⟨r²⟩ = 6Dt', variables: '三维空间中布朗粒子的均方位移' },
    ],
    tips: [
      '布朗运动间接证明了分子的无规则热运动',
      '爱因斯坦1905年用统计力学解释布朗运动, 是阿伏伽德罗常数测定方法之一',
      '布朗粒子越小, 液体温度越高, 布朗运动越剧烈',
      '布朗运动不是分子热运动本身, 而是分子碰撞的宏观结果',
    ],
  },
  'oil-film': {
    title: '油膜法测分子直径',
    formulas: [
      { name: '分子直径 (油膜法)', formula: 'd = V / S', variables: 'V: 油酸体积(m³), S: 油膜面积(m²), d: 油膜厚度 ≈ 分子直径(m)', condition: '单分子层, 油酸视为球形/立方紧密排列' },
      { name: '油酸溶液滴体积', formula: 'V_drop = V_solution / n_drops', variables: 'V_solution: 滴入溶液体积, n_drops: 总滴数', condition: '先测每滴体积' },
      { name: '纯油酸体积', formula: 'V = V_drop × η', variables: 'η: 油酸浓度 (体积分数)', condition: '1mL 油酸酒精溶液浓度约 1:200' },
      { name: '阿伏伽德罗常数 (球形模型)', formula: 'N_A = 6M / (ρπd³)', variables: 'M: 摩尔质量, ρ: 密度, d: 分子直径', condition: '球形模型, 忽略分子间隙' },
    ],
    tips: [
      '实验中油酸在水面自动铺展为单分子层, 厚度约 10⁻⁹ ~ 10⁻¹⁰ m',
      '痱子粉 (或石膏粉) 显示油膜轮廓, 轮廓稳定后再描图',
      '分子直径数量级 ~ 10⁻¹⁰ m (即 0.1 nm)',
      '此方法提供分子大小的数量级估计, 不精确给出分子形状',
    ],
  },
  'liquid-mixing': {
    title: '液体混合 (溶液的熵变)',
    formulas: [
      { name: '理想溶液混合熵', formula: 'ΔS_mix = −R(n₁lnx₁ + n₂lnx₂)', variables: 'R: 气体常量(8.314 J/mol·K), n₁,n₂: 两液体的物质的量, x₁,x₂: 摩尔分数', condition: '理想溶液等温等压混合' },
      { name: '摩尔分数', formula: 'xᵢ = nᵢ / Σnⱼ', variables: 'x₁ + x₂ = 1' },
      { name: '混合焓 (理想溶液)', formula: 'ΔH_mix = 0', variables: '理想溶液无热效应', condition: '理想溶液假设' },
      { name: '混合自由能', formula: 'ΔG_mix = ΔH_mix − TΔS_mix = RT(n₁lnx₁ + n₂lnx₂)', variables: 'ΔS_mix > 0 → ΔG_mix < 0 → 过程自发', condition: '等温等压' },
    ],
    tips: [
      '混合过程熵增加, 是自发的不可逆过程',
      '酒精与水混合后总体积小于混合前体积之和 (分子间作用)',
      '理想溶液假设: 任意比例互溶, ΔV_mix = 0, ΔH_mix = 0',
      '非理想溶液需引入活度系数修正',
    ],
  },
  'molecular-force': {
    title: '分子力曲线 (Lennard-Jones)',
    formulas: [
      { name: 'Lennard-Jones 势', formula: 'U(r) = 4ε[(σ/r)¹² − (σ/r)⁶]', variables: 'ε: 势阱深度, σ: 分子直径(r = 2^(1/6)σ 时势能零点)', condition: '对势, 适用中性分子' },
      { name: '分子力', formula: 'F = −dU/dr = 24ε[−2(σ/r)¹³ + (σ/r)⁷]', variables: 'F > 0 斥力, F < 0 引力', condition: '力是势的负梯度' },
      { name: '平衡位置', formula: 'r₀ = 2^(1/6)σ ≈ 1.122σ', variables: 'F(r₀) = 0, U(r₀) = −ε', condition: '稳定平衡' },
      { name: 'r⁻¹² 项 (排斥)', formula: 'A/r¹² (Born-Mayer 排斥项)', variables: '物理图像: 电子云重叠导致的泡利排斥', condition: '短程排斥 ~ 原子内部电子不可压缩' },
    ],
    tips: [
      '当 r < r₀ 时, 斥力主导, 随 r 减小急剧增大',
      '当 r > r₀ 时, 引力主导 (范德华力/色散力)',
      'Lennard-Jones 势是分子动力学模拟的标准模型',
      '平衡位置 r₀ 对应固体/液体的特征分子间距 (约 3~4 Å)',
    ],
  },
  'melting-curve': {
    title: '熔化曲线 (熔点 + 潜热)',
    formulas: [
      { name: '熔化吸收的热量 (熔化热)', formula: 'Q = mL', variables: 'm: 物体质量(kg), L: 熔化热(J/kg), 冰 L=3.34×10⁵ J/kg', condition: '温度不变' },
      { name: '内能增量', formula: 'ΔU = Q + W', variables: 'W: 外界对系统做功', condition: '热力学第一定律' },
      { name: '固态→液态 (W ≈ 0)', formula: 'ΔU ≈ Q', variables: '几乎不做功时', condition: '大部分固体熔化, 熔化热全部用于增加内能' },
      { name: '晶体 T-t 图像', formula: '水平段(平台) → 熔化/凝固过程', variables: '平台温度 = 熔点', condition: '晶体熔化时有确定的熔点' },
    ],
    tips: [
      '晶体有固定熔点, 非晶体没有 (玻璃软化, 无平台)',
      '熔化过程吸收热量但温度不变 → 内能增加 (分子势能增加)',
      '晶体的 T-t 曲线平台段斜率为 0 (温度不变)',
      '同一种物质的熔点和凝固点相同',
    ],
  },
  'surface-tension': {
    title: '表面张力 (系数 σ)',
    formulas: [
      { name: '表面张力公式', formula: 'F = σL', variables: 'F: 液面边界张力(N), σ: 表面张力系数(N/m), L: 液面边界长度(m)' },
      { name: '表面张力系数定义', formula: 'σ = F/L', variables: 'σ: 单位长度上的表面张力 (N/m)' },
      { name: '表面能与表面积', formula: 'E = σA', variables: 'E: 表面能(J), A: 液膜表面积(m²), σ: 比表面能(J/m²)' },
            { name: 'Wilson 公式 (σ-T 线性)', formula: 'σ(T) = σ₀ − a(T − T₀)', variables: 'a > 0: 温度升高, σ 线性减小', condition: '远离临界温度时近似线性' },
    ],
    tips: [
      '表面张力由表面层分子引力不平衡导致 (表面层分子稀疏, 引力占优)',
      '温度升高时 σ 减小, 到临界温度时 σ → 0',
      '水滴成球形是表面张力最小化面积的结果',
      '肥皂、洗涤剂是表面活性剂, 降低水的 σ',
    ],
  },
  'capillary': {
    title: '毛细上升 (Jurin 公式)',
    formulas: [
      { name: 'Jurin 公式 (毛细上升高度)', formula: 'h = 2σcosθ / (ρgr)', variables: 'σ: 表面张力系数, θ: 接触角, ρ: 液体密度, g: 重力加速度, r: 毛细管半径', condition: '管内弯月面为球面' },
      { name: '下降情形', formula: 'h < 0 (θ > 90° 时水银)', variables: 'cosθ < 0 对应下降', condition: '水银在玻璃管中下降' },
      { name: '弯月面曲率半径', formula: 'R = r / cosθ', variables: 'R: 弯月面球冠半径, r: 毛细管半径', condition: '完全润湿 θ = 0° 时 R = r' },
      { name: '压强差 (拉普拉斯压强)', formula: 'Δp = 2σ/R = 2σcosθ/r', variables: 'Δp: 弯月面两侧的附加压强', condition: '单侧弯曲表面' },
    ],
    tips: [
      '管径越小, 上升高度越大 (细管中毛细现象更明显)',
      '完全润湿 (θ = 0°, cosθ = 1) 时上升高度最大',
      '不润湿 (θ > 90°, 如水银) 时液面下降',
      '植物根系吸水、砖块吸水、纸巾吸水都利用毛细现象',
    ],
  },
  'wetting': {
    title: '润湿与不润湿 (Young 方程)',
    formulas: [
      { name: 'Young 方程', formula: 'σ_sv = σ_sl + σ_lv·cosθ', variables: 'σ_sv: 固-气界面能, σ_sl: 固-液界面能, σ_lv: 液体表面张力, θ: 平衡接触角', condition: '热力学平衡' },
            { name: '铺展系数', formula: 'S = σ_sv − σ_sl − σ_lv', variables: 'S > 0 自发铺展; S < 0 形成液滴', condition: 'S 越大铺展越强' },
      { name: '接触角判据', formula: 'θ < 90° → 润湿; θ > 90° → 不润湿', variables: '水-玻璃 θ≈0°; 水银-玻璃 θ≈139°', condition: '常用判据' },
      { name: 'Young-Dupré 方程', formula: 'σ(1 + cosθ) = W_ad', variables: 'W_ad: 粘附功 (J/m²)', condition: '热力学平衡, 理想光滑表面' },
    ],
    tips: [
      '接触角 θ 是固-液-气三相接触点的夹角, 决定润湿程度',
      '水在玻璃上几乎完全润湿 (θ ≈ 0°); 水银在玻璃上完全不润湿 (θ > 90°)',
      '防水面料 (荷叶效应) 通过微纳结构增大 θ (超疏水 > 150°)',
      '沙漠甲虫利用背部亲/疏水图案集水',
    ],
  },
  'liquid-crystal': {
    title: '液晶 (光学各向异性)',
    formulas: [
      { name: '寻常/异常折射率之差 (光学各向异性)', formula: 'Δn = n_o − n_e', variables: 'n_o: 寻常光折射率, n_e: 异常光折射率 (e光偏振平行光轴)', condition: '单轴液晶, Δn > 0 为正性液晶' },
      { name: '双折射光程差', formula: 'Δ = Δn · d', variables: 'Δ: 双折射光程差, d: 液晶盒厚度', condition: '常用 d ~ 5-10 μm' },
      { name: '介电各向异性', formula: 'Δε = ε_∥ − ε_⊥', variables: 'ε_∥: 平行分子长轴, ε_⊥: 垂直长轴, Δε > 0 正性液晶', condition: '决定液晶在电场中的取向' },
      { name: 'Fréedericksz 转变阈值', formula: 'V_th = π√(k/|Δε|ε₀)', variables: 'V_th: 阈值电压, k: 弹性常量', condition: '液晶盒外加电压时的取向转变' },
    ],
    tips: [
      '液晶是介于晶体与液体的中间相, 具有取向有序性',
      '棒状分子易形成向列相、胆甾相、近晶相等',
      'LCD 显示原理: 偏振片 + 液晶盒 (电控双折射)',
      '温度越高液晶分子排列越无序 → 超过清亮点温度变为各向同性液体',
    ],
  },

  // ========== 选必三 第 4 章 热力学定律 (7 个场景) ==========
  'joule-mechanical': {
    title: '焦耳实验 (机械搅拌生热)',
    formulas: [
      { name: '重力做功', formula: 'W = mgΔh', variables: 'm: 配重质量(kg), g: 重力加速度(m/s²), Δh: 下落高度(m)', condition: '叶片搅拌水的焦耳实验' },
      { name: '热质当量 (焦耳实验)', formula: 'W = Q = cmΔT', variables: 'W: 机械功(J), Q: 热量(J), c: 水的比热容, m: 水的质量, ΔT: 温升', condition: '热功当量' },
      { name: '热功当量 (焦耳测定)', formula: 'J ≈ 4.186 J/cal', variables: '1 cal (卡) = 4.186 J (焦耳)', condition: '焦耳扭秤实验 1840-1878' },
      { name: '多次做功', formula: 'Q_total = N · mgΔh', variables: 'N: 叶片搅拌次数', condition: '多次搅拌累积升温' },
    ],
    tips: [
      '焦耳热功当量实验将热学从"热质说"转向"能量守恒"',
      '机械功全部转化为水的内能: ΔU = W (绝热系统)',
      '现代国际单位制已统一用焦耳 (J), 卡路里只用于食品能量',
      '该实验否定了热质说, 确立热是分子无序运动的统计宏观表现',
    ],
  },
  'joule-electrical': {
    title: '焦耳定律 (电流热效应)',
    formulas: [
      { name: '焦耳定律', formula: 'Q = I²Rt', variables: 'I: 电流有效值(A), R: 电阻(Ω), t: 通电时间(s), Q: 产生热量(J)', condition: '所有电路均适用' },
      { name: '等价形式 (1)', formula: 'Q = U²t / R', variables: 'U: 加在电阻两端的电压(V)' },
      { name: '等价形式 (2)', formula: 'Q = Pt', variables: 'P: 电功率(W), P = UI = I²R' },
      { name: '电功率', formula: 'P = UI = I²R = U²/R', variables: '三种等价表达式' },
    ],
    tips: [
      '焦耳定律对所有电路 (纯电阻/非纯电阻) 都计算电流通过电阻产生的热量',
      '非纯电阻电路 (含电动机/电解槽等), W电 > Q热 (部分转化为其他能量)',
      '电热是分子碰撞导致的无序能量转移',
      '电热器、电磁炉、白炽灯都是焦耳热应用',
    ],
  },
  'adiabatic-compression': {
    title: '绝热过程 (无热交换)',
    formulas: [
      { name: '绝热方程 (压强-体积)', formula: 'PV^γ = 常量', variables: 'γ = C_p/C_v: 绝热指数 (空气 γ ≈ 1.4, 单原子 ~1.67, 双原子 ~1.4)', condition: '准静态绝热 (快速压缩/膨胀近似)' },
      { name: '绝热方程 (温度-体积)', formula: 'TV^(γ−1) = 常量', variables: 'T: 绝对温度(K), V: 体积' },
      { name: '绝热方程 (温度-压强)', formula: 'T^γ · P^(1−γ) = 常量', variables: '等价关系, 可由上述两式推出' },
      { name: '热力学第一定律 (绝热版)', formula: 'ΔU = W (Q = 0)', variables: 'Q = 0: 系统吸收热量为零, 内能变化等于外界做功', condition: '绝热壁或极端快速过程' },
    ],
    tips: [
      '绝热过程的特征: 系统与外界没有热量交换 (快速或隔绝)',
      '酒精灯点火、柴油压缩点火、气体快速膨胀降温都是绝热过程',
      '公式 PV^γ = 常量只适用于准静态绝热 (需做 PV 图验证)',
      '等温过程是 PV = 常数; 绝热线比等温线更陡',
    ],
  },
  'heat-transfer': {
    title: '热传导 (傅里叶定律)',
    formulas: [
      { name: '傅里叶定律', formula: 'dQ/dt = −kA · dT/dx', variables: 'k: 热导率(W/m·K), A: 截面积, dT/dx: 温度梯度, 负号: 热从高温到低温', condition: '一维稳态热传导' },
      { name: '热流密度', formula: 'q = Q/(At) = −k · dT/dx', variables: 'q: 单位面积热流(W/m²)' },
      { name: '串联导热', formula: 'q = (T_h − T_c) / (L₁/k₁A + L₂/k₂A)', variables: '通过多层平壁的总热流', condition: '稳态导热' },
      { name: '热阻', formula: 'R_th = ΔT/q = L/(kA)', variables: '热阻概念类比串并联电路', condition: '用于复杂导热网络' },
    ],
    tips: [
      '热传导靠分子碰撞传递内能 (金属还自由电子贡献)',
      'k 金属 >> k 气体 >> k 不良导体 (空气、水、木材)',
      '对流需要物质宏观流动, 辐射不需要介质 (真空中可传递)',
      '傅里叶定律类比菲克第一定律 (扩散) 和欧姆定律 (电导)',
    ],
  },
  'energy-transformation': {
    title: '热力学第一定律 (ΔU=Q+W)',
    formulas: [
      { name: '热力学第一定律', formula: 'ΔU = Q + W', variables: 'ΔU: 系统内能变化(J), Q: 系统吸热(正为吸), W: 外界对系统做功(正为外界做功)', condition: '热力学正方向约定' },
      { name: '正方向约定', formula: 'Q > 0: 吸热; Q < 0: 放热', variables: 'W > 0: 外界对系统做功; W < 0: 系统对外做功' },
      { name: '内能的微观构成', formula: 'U = ½N·(平动+转动+振动)动能 + 分子势能', variables: 'U 是状态量, 与过程无关', condition: '理想气体 U = U(T)' },
      { name: '等容过程', formula: 'W = 0 → ΔU = Q', variables: '纯吸热/放热时内能变化', condition: '等容不做体积功' },
    ],
    tips: [
      '热力学第一定律是能量守恒在热学中的具体表达',
      '内能是状态量 (对应态函数), 热和功是过程量',
      '第一定律否定了第一类永动机 (不需能量输入就能做功的机器)',
      '符号约定要统一: 工程上常用 ΔU = Q − W (系统对外功)',
    ],
  },
  'perpetuum-mobile': {
    title: '永动机 (热力学定律禁令)',
    formulas: [
      { name: '第一类永动机', formula: 'W > 0 且 Q = 0, ΔU = 0', variables: '没有能量输入就能持续违反能量守恒', condition: '违反热一律 ΔU = Q + W' },
      { name: '热一律表述 (永动机)', formula: '第一类永动机不可能制成', variables: '不可能无中生有地创造能量' },
      { name: '热二律表述 (第二类永动机)', formula: '不可能从单一热源取热完全转化为功而不产生其他影响', variables: '这是开尔文表述', condition: '违反热二律' },
      { name: '第二类永动机效率限制', formula: 'η = 1 − T_c/T_h < 1 (T_c > 0)', variables: '卡诺效率, 必 T_c > 0 所以 η < 1', condition: '卡诺定理第二定律推论' },
    ],
    tips: [
      '第一类永动机违反能量守恒 (热一律), 第二类违反热二律',
      '卡诺效率 η = 1 − T_c/T_h < 1 意味着任何热机效率低于 100%',
      '各种"永动机"尝试最终都归为摩擦损耗/热散失等第二定律原因',
      '能量是守恒的, 但能量品质在不断下降 (熵增)',
    ],
  },
  'heat-direction': {
    title: '热力学第二定律 (熵增原理)',
    formulas: [
      { name: '克劳修斯不等式', formula: 'ΔS ≥ 0 (孤立系统)', variables: 'S: 熵 (J/K), 孤立系统熵永不减少', condition: 'ΔS = 0 对应可逆, ΔS > 0 对应不可逆' },
      { name: '开尔文表述', formula: '不能从单一热源取热全部转化为功', variables: '不借助冷源, 100% 热转功不可能', condition: '等价于克劳修斯表述' },
      { name: '克劳修斯表述', formula: '热量不能自发地从低温传到高温', variables: '需外界做功才能完成', condition: '制冷机做功才能传热' },
      { name: '玻尔兹曼熵公式', formula: 'S = k lnΩ', variables: 'k: 玻尔兹曼常量(1.38×10⁻²³ J/K), Ω: 微观状态数', condition: '统计力学基础' },
    ],
    tips: [
      '热二律指出宏观过程的方向性: 自发过程都是不可逆的',
      '熵是世界"无序度"的度量, 孤立系统熵只增不减',
      '冰箱/空调需要外界做功才能逆方向传热',
      '热二律是现有物理定律中唯一有时间箭头的定律',
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
