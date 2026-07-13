import { PhysicsModelBase } from './base.js';
import type { PhysicsProblem } from '../types/problem.js';
import type {
    SimulationResult,
    TrajectoryPoint,
    Keyframe,
    ChartSeries,
    ExplanationStep,
    FormulaUsage
} from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';

/** 门窗状态: 'open' = 打开, 'closed' = 关闭 */
export type DoorState = 'open' | 'closed';
/** 干簧管状态: 'closed' = 闭合 = 正常, 'open' = 断开 = 警报 */
export type ReedState = 'closed' | 'open';

/**
 * 门窗防盗报警约束 — 选必二 传感器 (干簧管/磁控开关)
 *
 * 物理原理:
 *   干簧管 (Reed Switch): 封装在玻璃管中的两个铁磁簧片
 *   - 磁铁接近 → 簧片被磁化 → 触点吸合 → 导通
 *   - 磁铁远离 → 簧片弹开 → 断开
 *
 * 门窗防盗报警器:
 *   - 门框装磁铁 → 门板装干簧管
 *   - 门关闭 + 磁铁靠近 → 干簧管闭合 → 回路导通 → 不报警
 *   - 门被打开 → 磁铁远离 → 干簧管弹开 → 回路断开 → 警报器发出声光报警
 *
 * 相关参数:
 *   - magnetDistance: 磁体与干簧管的距离 (mm)
 *   - triggerDistance: 干簧管动作距离阈值 (mm), 超过则断开
 */
/**
 * 门窗防盗报警器模型 — 选必二 传感器 (干簧管 / 磁控开关)
 *
 * 电路逻辑:
 *   正常状态: 门关闭 → 磁铁靠近 → 干簧管闭合 → 回路导通 → 三极管截止
 *   报警状态: 门开   → 磁铁远离 → 干簧管断开 → 回路断开 → 三极管导通 → 继电器吸合 → 警笛鸣响
 *
 * 注: 高电平触发 → 干簧管串联在 220 V 火线上, 断开后触发
 */
export class SecurityAlarmModel extends PhysicsModelBase {
    readonly name = '门窗防盗报警器';
    readonly version = '1.0.0';
    readonly description = '干簧管磁控开关 + 门窗防盗报警逻辑、门状态-簧片状态真值表';
    readonly modelType = 'security-alarm' as const;
    readonly assumptions = [
        '干簧管动作理想化: 超过释放距离 → 立即断开 (无抖动)',
        '磁铁磁场均匀, 无其他铁磁干扰',
        '门禁报警电路为理想开关逻辑'
    ];
    readonly applicableRange = 'magnetDistance: 0~200mm; operateDistance: 5~30mm; releaseDistance: 10~40mm';
    readonly errorSources = ['干簧管老化 → 接触电阻增大', '磁铁退磁 → 有效吸合距离减小', '机械振动导致触点抖动'];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'magnetDistance', description: '磁铁到干簧管距离 (mm)', unit: 'mm', required: false, min: 0, max: 300 }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const ic = problem.constraints?.securityAlarm;
        if (!ic) throw new Error('security-alarm 模型需要 securityAlarm 约束配置');

        const door = ic.doorState;
        const releaseDistance = ic.releaseDistance ?? 25;
        const operateDistance = ic.operateDistance ?? 15;
        const d = ic.magnetDistance ?? (door === 'closed' ? 5 : 100);
        const sampleCount = ic.sampleCount ?? 60;

        // — 判断干簧管状态 —
        const reedState: ReedState =
            d <= operateDistance ? 'closed' : d >= releaseDistance ? 'open' : door === 'closed' ? 'closed' : 'open';
        // — 三极管导通判定: 干簧管断开 → 基极高电平 → 三极管导通 → 继电器吸合 —
        const transistorOn = reedState === 'open';
        const relayEngaged = transistorOn;
        const alarmTrigged = relayEngaged;

        // — 状态 vs 距离图 (静态 x-d) —
        const stateVsDist: ChartSeries = {
            xLabel: '磁体距离 d (mm)',
            yLabel: '干簧管状态 (1=闭合, 0=断开)',
            xUnit: 'mm',
            yUnit: '',
            points: []
        };
        const distMax = 60;
        for (let i = 0; i <= sampleCount; i++) {
            const dist = (distMax * i) / sampleCount;
            const s = dist <= operateDistance ? 1 : dist >= releaseDistance ? 0 : 0.5;
            stateVsDist.points.push({
                x: parseFloat(dist.toFixed(2)),
                y: parseFloat(s.toFixed(2))
            });
        }

        // — 电路状态表 (文本格式展示, 6 行) —
        const circuitTable: ChartSeries = {
            xLabel: '节点序',
            yLabel: '电平 (V)',
            xUnit: '',
            yUnit: 'V',
            points: [
                // Row 1-2: 电源输入
                { x: 1, y: 12 }, // 电源 Vcc
                { x: 2, y: 12 }, // 电源输出
                // Row 3: 干簧管触点电平
                { x: 3, y: reedState === 'closed' ? 0 : 12 },
                // Row 4: 三极管基极
                { x: 4, y: transistorOn ? 0.7 : 0 },
                // Row 5: 三极管集电极
                { x: 5, y: transistorOn ? 0 : 12 },
                // Row 6: 继电器线圈 / 警笛
                { x: 6, y: relayEngaged ? 12 : 0 }
            ]
        };

        // — 关键点 —
        const keyframes: Keyframe[] = [
            {
                label: '当前状态',
                t: 0,
                position: { x: door === 'closed' ? 0 : 1, y: d },
                velocity: { x: 0, y: 0 },
                description: `门: ${door === 'closed' ? '关闭' : '打开'}, 磁体距离=${d}mm, 干簧管: ${reedState === 'closed' ? '闭合(触点ON)' : '断开(触点OFF)'}, 警报器: ${alarmTrigged ? '响(触发)' : '静(正常)'}`
            },
            {
                label: '正常监控状态',
                t: 0,
                position: { x: 0, y: operateDistance - 5 },
                velocity: { x: 0, y: 0 },
                description: `门关闭 → 磁铁靠近 < 吸合距离 ${operateDistance}mm → 干簧管闭合 → 回路导通 → 三极管截止 → 继电器释放 → 警报器静默`
            },
            {
                label: '报警状态',
                t: 0,
                position: { x: 1, y: releaseDistance + 30 },
                velocity: { x: 0, y: 0 },
                description: `门被打开 → 磁铁远离 > 释放距离 ${releaseDistance}mm → 干簧管断开 → 三极管基极高电位 → 三极管导通 → 继电器吸合 → 声光报警触发`
            }
        ];

        // — 轨迹 (静态) —
        const trajectory: TrajectoryPoint[] = [];
        for (let i = 0; i <= 24; i++) {
            const dist = (distMax * i) / 24;
            trajectory.push({
                t: 0,
                position: { x: dist, y: dist <= operateDistance ? 1 : dist >= releaseDistance ? 0 : 0.5 },
                velocity: { x: 0, y: 0 }
            });
        }

        const warnings: string[] = [];
        if (d < 0 || d > 300) warnings.push('磁体距离超出正常测量范围');
        if (operateDistance >= releaseDistance) warnings.push('吸合距离应小于释放距离, 否则滞回窗口消失');
        if (door === 'closed' && d >= releaseDistance) warnings.push('门已关但磁体距离异常大, 检查安装或传感器故障');

        const steps: ExplanationStep[] = [
            {
                order: 1,
                description: '干簧管磁控开关原理',
                formula: 'Reed Switch: 磁铁接近 → 簧片磁化吸合 → 触点 ON; 磁铁远离 → 簧片弹开 → 触点 OFF',
                result: `磁体距离 d=${d}mm, 吸合距离=${operateDistance}mm, 释放距离=${releaseDistance}mm`
            },
            {
                order: 2,
                description: '判断干簧管即时状态',
                formula: 'if d <= operateDistance → closed; if d >= releaseDistance → open;',
                calculation: `d=${d}mm ${reedState === 'closed' ? '≤' : '≥'} ${reedState === 'closed' ? operateDistance : releaseDistance}mm → 干簧管 ${reedState}`
            },
            {
                order: 3,
                description: '驱动三极管 + 继电器逻辑',
                formula: '干簧管断开 → BJT_ON → RELAY_COIL_ENERGIZED → ALARM_BUZZ',
                calculation: `干簧管=${reedState} → 晶体管=${transistorOn ? '导通' : '截止'} → 继电器=${relayEngaged ? '吸合' : '释放'} → 警笛=${alarmTrigged ? '响' : '静'}`
            },
            {
                order: 4,
                description: '教学要点',
                formula: '干簧管电路实现 "输入(磁信号) → 电信号 → 控制(继电器)" 的传感器链路',
                result: '干簧管 = 磁控开关, 是磁传感器的一种, 广泛用于门窗防盗、液位检测、接近开关'
            }
        ];

        const formulas: FormulaUsage[] = [
            {
                name: '干簧管状态判定',
                formula: 'reed = (d <= d_operate) ? closed : (d >= d_release) ? open : hold',
                variables: {
                    d: { value: d, unit: 'mm' },
                    d_operate: { value: operateDistance, unit: 'mm' },
                    d_release: { value: releaseDistance, unit: 'mm' },
                    reed: { value: reedState === 'closed' ? 1 : 0, unit: '1=闭合' }
                }
            },
            {
                name: '报警触发条件',
                formula: 'alarm = (reed == open) ? 1 : 0',
                variables: {
                    reed: { value: reedState === 'closed' ? 1 : 0, unit: '1=闭合' },
                    alarm: { value: alarmTrigged ? 1 : 0, unit: '1=报警' }
                }
            }
        ];

        return {
            meta: this.makeMeta('analytical'),
            trajectories: [trajectory],
            keyframes,
            charts: {
                x_t: stateVsDist,
                y_t: circuitTable
            },
            diagnostics: {
                conservedQuantities: [],
                maxValues: {
                    doorStateFlag: door === 'closed' ? 0 : 1,
                    magnetDistance: d,
                    reedStateFlag: reedState === 'closed' ? 1 : 0,
                    transistorOnFlag: transistorOn ? 1 : 0,
                    relayEngagedFlag: relayEngaged ? 1 : 0,
                    alarmFlag: alarmTrigged ? 1 : 0,
                    operateDistance,
                    releaseDistance
                },
                rangeCheck: { withinRange: warnings.length === 0, warnings }
            },
            explanation: {
                summary: `门窗防盗报警: 门=${door}, 磁体距离=${d}mm, 干簧管=${reedState}, 警报器=${alarmTrigged ? '触发' : '正常'}`,
                steps,
                formulas
            },
            errors: [],
            warnings
        };
    }

    protected requiresValidation(): boolean {
        return false;
    }
}
