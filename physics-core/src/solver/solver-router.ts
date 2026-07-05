import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult } from '../types/result.js';
import { getModel, registerModel } from '../models/base.js';
import { UniformLinearModel } from '../models/uniform-linear.js';
import { UniformAcceleratedModel } from '../models/uniform-accelerated.js';
import { UniformElectricModel } from '../models/uniform-electric-field.js';
import { UniformMagneticModel } from '../models/uniform-magnetic-field.js';
import { InclinedPlaneModel } from '../models/inclined-plane.js';
import { SpringOscillatorModel } from '../models/spring-oscillator.js';
import { EMCombinedFieldModel } from '../models/em-combined-field.js';
import { CollisionModel, InelasticCollisionModel } from '../models/collision.js';
import { UniformCircularMotionModel } from '../models/uniform-circular-motion.js';
import { ForceCompositionModel } from '../models/force-composition.js';
import { NewtonThirdLawModel } from '../models/newton-third-law.js';
import { SlidingFrictionModel } from '../models/sliding-friction.js';
import { NewtonSecondLawModel } from '../models/newton-second-law.js';
import { ProjectileModel } from '../models/projectile.js';
import { CurveVelocityDirectionModel } from '../models/curve-velocity-direction.js';
import { CurveConditionModel } from '../models/curve-condition.js';
import { MotionCompositionModel } from '../models/motion-composition.js';
import { TransmissionBeltModel } from '../models/transmission-belt.js';
import { VerticalCircleModel } from '../models/vertical-circle.js';
import { CentrifugalModel } from '../models/centrifugal.js';
import { OrbitalModel } from '../models/orbital.js';
import { CavendishModel } from '../models/cavendish.js';
import { MoonEarthTestModel } from '../models/moon-earth-test.js';
import { MomentumModel } from '../models/momentum.js';
import { SimplePendulumModel } from '../models/simple-pendulum.js';
import { MechanicalWaveModel } from '../models/mechanical-wave.js';
import { RefractionModel } from '../models/refraction.js';
import { InterferenceModel } from '../models/interference.js';
import { CircuitModel } from '../models/circuit.js';
import { GasLawModel } from '../models/gas-law.js';
import { PhotoelectricModel } from '../models/photoelectric.js';
import { BohrModel } from '../models/bohr.js';
import { RadioactiveDecayModel } from '../models/radioactive-decay.js';
import { MagneticForceModel } from '../models/magnetic-force.js';
import { EMInductionModel } from '../models/em-induction.js';
import { ACCurrentModel } from '../models/ac-current.js';
import { LCOscillatorModel } from '../models/lc-oscillator.js';
import { TickerTimerModel } from '../models/ticker-timer.js';
import { GalileoInclineModel } from '../models/galileo-incline.js';
import { InertiaModel } from '../models/inertia.js';
import { MicroDeformationModel } from '../models/micro-deformation.js';
import { ReactionTimeModel } from '../models/reaction-time.js';
import { OverweightModel } from '../models/overweight.js';
import { CenterOfGravityModel } from '../models/center-of-gravity.js';

registerModel(new UniformLinearModel());
registerModel(new UniformAcceleratedModel());
registerModel(new UniformElectricModel());
registerModel(new UniformMagneticModel());
registerModel(new InclinedPlaneModel());
registerModel(new SpringOscillatorModel());
registerModel(new EMCombinedFieldModel());
registerModel(new CollisionModel());
registerModel(new InelasticCollisionModel());
registerModel(new UniformCircularMotionModel());
// 必修一 第三章 相互作用——力
registerModel(new ForceCompositionModel());
registerModel(new NewtonThirdLawModel());
registerModel(new SlidingFrictionModel());
// 必修一 第四章 运动和力的关系
registerModel(new NewtonSecondLawModel());
// 必修二 第一章 抛体运动
registerModel(new ProjectileModel());
// 必修二 第一章 曲线运动 (速度方向 / 曲线条件 / 运动合成)
registerModel(new CurveVelocityDirectionModel());
registerModel(new CurveConditionModel());
registerModel(new MotionCompositionModel());
// 必修二 第二章 圆周运动
registerModel(new TransmissionBeltModel());
registerModel(new VerticalCircleModel());
registerModel(new CentrifugalModel());
// 必修二 第三章 万有引力与航天
registerModel(new OrbitalModel());
registerModel(new CavendishModel());
registerModel(new MoonEarthTestModel());
// 选必一 第一章 动量守恒定律
registerModel(new MomentumModel());
// 选必一 第二章 机械振动 (单摆)
registerModel(new SimplePendulumModel());
// 选必一 第三章 机械波
registerModel(new MechanicalWaveModel());
// 选必一 第四章 光
registerModel(new RefractionModel());
registerModel(new InterferenceModel());
// 必修三 第十一章 电路及其应用
registerModel(new CircuitModel());
// 选必三 气体/热学
registerModel(new GasLawModel());
// 选必三 §4 原子结构和波粒二象性
registerModel(new PhotoelectricModel());
registerModel(new BohrModel());
// 选必三 §5 原子核
registerModel(new RadioactiveDecayModel());
// 选必二 §1 安培力与洛伦兹力
registerModel(new MagneticForceModel());
// 选必二 §2 电磁感应
registerModel(new EMInductionModel());
// 选必二 §3+4 交变电流 + LC 振荡
registerModel(new ACCurrentModel());
registerModel(new LCOscillatorModel());
// 打点计时器实验 (必修一 第一章 实验)
registerModel(new TickerTimerModel());
// 必修一 第四章 牛顿第一定律 — 伽利略斜面理想实验
registerModel(new GalileoInclineModel());
// 必修一 第四章 牛顿第一定律 — 惯性实验组合
registerModel(new InertiaModel());
// 选必一 §5 实验: 光杠杆放大法演示桌面微小形变
registerModel(new MicroDeformationModel());
// 互动实验: 测反应时间 (自由落体法)
registerModel(new ReactionTimeModel());
// 必修一 第四章 运动和力的关系: 超重与失重
registerModel(new OverweightModel());
// 重心实验 (悬挂法)
registerModel(new CenterOfGravityModel());

export function solveProblem(problem: PhysicsProblem): SimulationResult {
  const model = getModel(problem.model);
  const t0 = Date.now();
  const result = model.solve(problem);
  const computationTime = Date.now() - t0;
  return { ...result, meta: { ...result.meta, computationTime } };
}
