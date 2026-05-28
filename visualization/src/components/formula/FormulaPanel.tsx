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

      {/* physics-core 解释 */}
      {summary && (
        <div className="formula-summary">{summary}</div>
      )}

      {/* physics-core 推导步骤 */}
      {engineSteps.length > 0 && (
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

      {/* physics-core 公式 */}
      {engineFormulas.length > 0 && (
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
      {engineFormulas.length === 0 && engineSteps.length === 0 && (
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
