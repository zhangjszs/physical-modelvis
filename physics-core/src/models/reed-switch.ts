import type { PhysicsProblem , ReedSwitchConstraint} from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 干簧管约束 — 选必二 (传感器 / 电磁继电器)
 *
 * 干簧管: 由密封玻璃管中两片磁性簧片组成, 外加磁场使簧片磁化吸合而导通。
 * 常用于门磁、自行车码表、继电器等传感器应用。
 *
 * 磁驱动场景:
 *   mode='magnetic': 永磁体靠近, 距离 d 为变量, 触发为吸合 (close)
 *   mode='coil': 线圈电流产生磁场, I 为变量, 触发为吸合 (close)
 */
/**
 * 干簧管模型 — 选必二 (传感器 / 电磁继电器)
 *
 * 干簧管的工作特性 (磁驱动开关):
 *   - 当外加磁场强度 H >= H_pull_in 时簧片吸合 (ON)
 *   - 当外加磁场强度 H < H_release 时簧片释放 (OFF)
 *   - H_release < H_pull_in, 形成回差 (hysteresis), 避免在阈值附近抖动
 *
 * 磁铁产生的磁场 (点磁偶极近似):
 *   B(d) = (mu0 / 4*pi) * (2*m) / d^3  (轴线方向, 简化)
 *   取 B(d) = k_dipole / d^3 (k_dipole 为磁矩系数)
 *
 * 线圈产生的磁场 (长直螺线管):
 *   B = mu0 * n_turns * I (I 单位为 A)
 *
 * 工作原理:
 *   - 簧片为铁磁材料 (铁镍合金), 外加磁场使其磁化
 *   - 两簧片异极相吸, 克服簧片弹力时闭合
 *   - 释放时簧片弹力使其断开
 *
 * 教学要点:
 *   - 回差是干簧管的固有特性 (磁滞 + 弹力)
 *   - 减小两阈值可让开关更灵敏
 *   - 干簧管是磁传感器 (非电量 -> 电信号)
 */
export class ReedSwitchModel extends PhysicsModelBase {
    readonly name = '干簧管';
    readonly version = '1.0.0';
    readonly description = '干簧管磁控开关: 回差特性、磁铁驱动与线圈驱动';
    readonly modelType = 'reed-switch' as const;
    readonly assumptions = [
        '簧片为理想铁磁材料, 磁化瞬时完成',
        '磁铁磁场用偶极近似 (远场)',
        '线圈磁场视为均匀长直螺线管',
        '簧片弹力为理想线性弹簧',
        '忽略玻璃管残余气体阻尼'
    ];
    readonly applicableRange = '磁铁距离: 0.1 ~ 100 mm; 线圈电流: 0 ~ 200 mA; 阈值: 10 ~ 100 mT';
    readonly errorSources = ['磁铁磁矩随温度变化', '簧片老化导致阈值漂移', '机械振动导致误触发', '相邻磁场干扰'];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'mode', description: '工作模式 (magnetic / coil)', unit: '', required: true }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const c = problem.constraints?.reedSwitch;
        if (!c) throw new Error('reed-switch 模型需要 reedSwitch 约束配置');

        if (c.mode !== 'magnetic' && c.mode !== 'coil') {
            throw new Error(`reed-switch 模式必须是 'magnetic' 或 'coil', 收到: ${c.mode}`);
        }

        const H_pull = c.pullInThreshold ?? 50; // mT (吸合阈值)
        const H_rel = c.releaseThreshold ?? 30; // mT (释放阈值)
        const mode = c.mode;

        // 磁偶极系数 (mT * mm^3), N35 小磁钢约 100 mT * mm^3 @ 1mm
        const K_DIPOLE = 100; // mT * mm^3
        // 线圈系数: mu0 * n_turns 折算为 mT / mA
        // 例如 N=1000 匝, mu0=4*pi*1e-7 T*m/A => B=0.4*pi*mT/A = 12.57 mT/A = 0.01257 mT/mA
        // 调整为 K_COIL=0.8 mT/mA 更贴近实际小功率继电器
        const K_COIL = 0.8; // mT / mA

        // ===== 状态 vs 距离/电流 曲线 =====
        const N = 200;
        const stateVsDrive: ChartSeries = {
            xLabel: mode === 'magnetic' ? '磁铁距离 d (mm)' : '线圈电流 I (mA)',
            yLabel: '磁场强度 (mT)',
            xUnit: mode === 'magnetic' ? 'mm' : 'mA',
            yUnit: 'mT',
            points: []
        };

        // 状态表: 距离/电流 -> 状态 (0=断开, 1=闭合)
        const switchStateCurve: ChartSeries = {
            xLabel: mode === 'magnetic' ? '磁铁距离 d (mm)' : '线圈电流 I (mA)',
            yLabel: '干簧管状态 (0=断, 1=通)',
            xUnit: mode === 'magnetic' ? 'mm' : 'mA',
            yUnit: '',
            points: []
        };

        let driveHi: number;
        let driveLo: number;

        if (mode === 'magnetic') {
            const dVal = c.magnetDistance ?? 10;
            driveHi = Math.max(dVal * 3, 50);
            driveLo = 0.1;
            // 对数采样 (距离)
            const logLo = Math.log10(driveLo);
            const logHi = Math.log10(driveHi);
            // 采用预设状态表示: 远处断开 (H < H_rel), 近处吸合 (H > H_pull)
            // 用回差模型: 状态由上/下边界共同决定 (这里简化为显示磁场曲线)
            for (let i = 0; i <= N; i++) {
                const logD = logLo + (logHi - logLo) * (i / N);
                const d = Math.pow(10, logD);
                const H = K_DIPOLE / (d * d * d); // mT
                stateVsDrive.points.push({
                    x: parseFloat(d.toFixed(3)),
                    y: parseFloat(H.toFixed(3))
                });
                // 状态: H >= H_pull: 1; H < H_rel: 0; else 保持 (这里用 H_pull/H_rel 中间线性渐变)
                let state: number;
                if (H >= H_pull) state = 1;
                else if (H < H_rel) state = 0;
                else state = (H - H_rel) / (H_pull - H_rel); // 过渡
                switchStateCurve.points.push({
                    x: parseFloat(d.toFixed(3)),
                    y: parseFloat(state.toFixed(3))
                });
            }
        } else {
            const iVal = c.coilCurrent ?? 60;
            driveHi = Math.max(iVal * 2, 150);
            driveLo = 0;
            for (let i = 0; i <= N; i++) {
                const i_mA = driveLo + (driveHi - driveLo) * (i / N);
                const H = K_COIL * i_mA;
                stateVsDrive.points.push({
                    x: parseFloat(i_mA.toFixed(2)),
                    y: parseFloat(H.toFixed(3))
                });
                let state: number;
                if (H >= H_pull) state = 1;
                else if (H < H_rel) state = 0;
                else state = (H - H_rel) / (H_pull - H_rel);
                switchStateCurve.points.push({
                    x: parseFloat(i_mA.toFixed(2)),
                    y: parseFloat(state.toFixed(3))
                });
            }
        }

        // ===== 回差曲线 (hysteresis) =====
        // 双向扫描: 上升分支 + 下降分支
        const hysteresisCurve: ChartSeries = {
            xLabel: '驱动量 (距离 mm 或 电流 mA)',
            yLabel: '干簧管状态 (0/1)',
            xUnit: mode === 'magnetic' ? 'mm' : 'mA',
            yUnit: '',
            points: []
        };
        const N_hyst = 100;
        // 上升分支 (d: 远 -> 近 或 I: 0 -> max)
        for (let i = 0; i <= N_hyst; i++) {
            const ratio = i / N_hyst;
            const drive_rise =
                mode === 'magnetic'
                    ? Math.pow(10, Math.log10(0.5) + (Math.log10(100) - Math.log10(0.5)) * ratio)
                    : ratio * 200;
            const H_rise = mode === 'magnetic' ? K_DIPOLE / Math.pow(drive_rise, 3) : K_COIL * drive_rise;
            const state = H_rise >= H_pull ? 1 : 0;
            hysteresisCurve.points.push({
                x: mode === 'magnetic' ? parseFloat(drive_rise.toFixed(3)) : parseFloat(drive_rise.toFixed(1)),
                y: state
            });
        }
        // 分隔点 (用 null 分隔, 在数据中插入断点用 NaN)
        hysteresisCurve.points.push({ x: NaN, y: NaN });
        // 下降分支 (d: 近 -> 远 或 I: max -> 0)
        for (let i = N_hyst; i >= 0; i--) {
            const ratio = i / N_hyst;
            const drive_fall =
                mode === 'magnetic'
                    ? Math.pow(10, Math.log10(0.5) + (Math.log10(100) - Math.log10(0.5)) * ratio)
                    : ratio * 200;
            const H_fall = mode === 'magnetic' ? K_DIPOLE / Math.pow(drive_fall, 3) : K_COIL * drive_fall;
            const state = H_fall >= H_rel ? 1 : 0;
            hysteresisCurve.points.push({
                x: mode === 'magnetic' ? parseFloat(drive_fall.toFixed(3)) : parseFloat(drive_fall.toFixed(1)),
                y: state
            });
        }

        // ===== 当前工况点 =====
        let currentDrive: number;
        let currentH: number;
        let currentState: number;
        if (mode === 'magnetic') {
            const d = c.magnetDistance ?? 10;
            currentDrive = d;
            currentH = K_DIPOLE / (d * d * d);
            currentState = currentH >= H_pull ? 1 : currentH < H_rel ? 0 : 0.5;
        } else {
            const i_mA = c.coilCurrent ?? 60;
            currentDrive = i_mA;
            currentH = K_COIL * i_mA;
            currentState = currentH >= H_pull ? 1 : currentH < H_rel ? 0 : 0.5;
        }

        // ===== 簧片运动轨迹 =====
        const reedTraj: TrajectoryPoint[] = [];
        const N_reed = 50;
        // x: 时间 (归一化); y: 簧片间距 (mm) -> 0 表示闭合
        for (let i = 0; i <= N_reed; i++) {
            const t = i / N_reed;
            // 从断开到闭合的瞬态过程
            const gap = currentState > 0.5 ? Math.max(0, (1 - t) * 0.5) : (1 - Math.min(1, t * 1)) * 0;
            reedTraj.push({
                t,
                position: { x: t, y: gap },
                velocity: { x: 1, y: 0 },
                kineticEnergy: 0,
                potentialEnergy: 0
            });
        }

        // ===== 关键帧 =====
        const keyframes: Keyframe[] = [
            {
                label: '初始态 (断开)',
                t: 0,
                position: { x: 0, y: 0.5 },
                velocity: { x: 0, y: 0 },
                description: '干簧管处于断开状态 (H < H_rel 或未驱动)'
            },
            {
                label: `吸合阈值: ${H_pull} mT`,
                t: 0.5,
                position: { x: mode === 'magnetic' ? Math.pow(K_DIPOLE / H_pull, 1 / 3) : H_pull / K_COIL, y: 0 },
                velocity: { x: 0, y: 0 },
                description: `H = H_pull = ${H_pull} mT 时簧片开始吸合`
            },
            {
                label: `释放阈值: ${H_rel} mT`,
                t: 1,
                position: { x: mode === 'magnetic' ? Math.pow(K_DIPOLE / H_rel, 1 / 3) : H_rel / K_COIL, y: 0.5 },
                velocity: { x: 0, y: 0 },
                description: `H = H_rel = ${H_rel} mT 时簧片释放, 回差 delta=${H_pull - H_rel} mT`
            }
        ];

        // ===== 当前状态关键帧 =====
        const currentKeyframe: Keyframe = {
            label: `当前: ${currentState > 0.5 ? '闭合 (ON)' : '断开 (OFF)'}`,
            t: 0,
            position: { x: currentDrive, y: currentState },
            velocity: { x: currentH, y: 0 },
            description: `当前: ${mode === 'magnetic' ? `距离=${currentDrive}mm` : `电流=${currentDrive}mA`}, H=${currentH.toFixed(2)}mT, 状态=${currentState > 0.5 ? 'ON' : 'OFF'}`
        };

        // ===== 警告 =====
        const warnings: string[] = [];
        if (H_pull - H_rel < 5) {
            warnings.push('吸合/释放阈值太接近, 可能导致开关抖动');
        }
        if (H_pull > 100) {
            warnings.push('吸合阈值较高, 需要更强磁铁或更大驱动电流');
        }
        if (mode === 'coil' && (c.coilCurrent ?? 0) > 150) {
            warnings.push('线圈电流过大, 注意线圈发热和功耗');
        }
        if (mode === 'magnetic' && (c.magnetDistance ?? 10) > 80) {
            warnings.push('距离较远, 是否能吸合取决于磁铁强度');
        }

        // ===== 解释步骤 =====
        const steps: ExplanationStep[] = [
            {
                order: 1,
                description: mode === 'magnetic' ? '磁铁产生轴向磁场' : '线圈产生轴向磁场',
                formula: mode === 'magnetic' ? 'B(d) = k_dipole / d^3' : 'B(I) = k_coil * I',
                calculation: mode === 'magnetic' ? `k_dipole=${K_DIPOLE} mT*mm^3` : `k_coil=${K_COIL} mT/mA`
            },
            {
                order: 2,
                description: '簧片磁化受安培力吸合',
                formula: 'H >= H_pull_in -> ON; H < H_release -> OFF',
                calculation: `H_pull=${H_pull} mT, H_release=${H_rel} mT, delta=${H_pull - H_rel} mT`
            },
            {
                order: 3,
                description: '回差使开关稳定 (磁滞)',
                formula: 'H_release < H_pull_in (避免抖动)',
                result: `回差 = ${H_pull - H_rel} mT, 驱动必须在两阈值之外才能翻转状态`
            },
            {
                order: 4,
                description: '当前状态',
                formula: mode === 'magnetic' ? `B = ${K_DIPOLE} / d^3` : `B = ${K_COIL} * I`,
                result: `当前 H=${currentH.toFixed(2)} mT => ${currentState > 0.5 ? '闭合 (ON)' : '断开 (OFF)'}`
            }
        ];

        return {
            meta: this.makeMeta('analytical'),
            trajectories: [reedTraj],
            keyframes: [...keyframes, currentKeyframe],
            charts: {
                x_t: stateVsDrive,
                y_t: switchStateCurve,
                v_t: hysteresisCurve
            },
            diagnostics: {
                conservedQuantities: [],
                maxValues: {
                    pullInThreshold_mT: H_pull,
                    releaseThreshold_mT: H_rel,
                    hysteresis_mT: H_pull - H_rel,
                    currentDriveValue: currentDrive,
                    currentField_mT: currentH,
                    currentState,
                    modeFlag: mode === 'magnetic' ? 1 : 2,
                    kDipole: K_DIPOLE,
                    kCoil: K_COIL
                },
                rangeCheck: { withinRange: warnings.length === 0, warnings }
            },
            explanation: {
                summary: `干簧管 (${mode}): 吸合阈值=${H_pull} mT, 释放阈值=${H_rel} mT, 回差=${H_pull - H_rel} mT, 当前 H=${currentH.toFixed(2)} mT => ${currentState > 0.5 ? 'ON' : 'OFF'}`,
                steps,
                formulas: [
                    {
                        name: '磁场',
                        formula: mode === 'magnetic' ? 'B = k_dipole / d^3' : 'B = k_coil * I',
                        variables: {
                            k: {
                                value: mode === 'magnetic' ? K_DIPOLE : K_COIL,
                                unit: mode === 'magnetic' ? 'mT*mm^3' : 'mT/mA'
                            },
                            drive: { value: currentDrive, unit: mode === 'magnetic' ? 'mm' : 'mA' },
                            B: { value: currentH, unit: 'mT' }
                        }
                    },
                    {
                        name: '回差',
                        formula: 'delta = H_pull - H_release',
                        variables: {
                            H_pull: { value: H_pull, unit: 'mT' },
                            H_release: { value: H_rel, unit: 'mT' },
                            delta: { value: H_pull - H_rel, unit: 'mT' }
                        }
                    }
                ]
            },
            errors: [],
            warnings
        };
    }
}
