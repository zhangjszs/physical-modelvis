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
