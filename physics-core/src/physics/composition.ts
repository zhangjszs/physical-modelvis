import type { Vector3D, ValidationResult } from '../types/common.js';
import type { FieldSource } from './fields3d.js';
import { totalElectricField, totalMagneticField } from './fields3d.js';
import type { FieldEvaluator, TrajectoryPoint3D } from './boris3d.js';
import { borisTrajectory3D } from './boris3d.js';
import { Vec3 } from '../math/vector3d.js';

/**
 * 组合实验层 (L3) — 把"拖拽放置的场源集合 + 一个带电粒子"描述成完整实验,
 * 校验后交给 3D Boris 积分器求解。可视化端的拖拽编辑器只需维护一个
 * CompositionExperiment 对象: 每次拖放/调参重建它, 调 simulateComposition 重算。
 *
 * 与模型层 (models/*) 的关系: 模型面向固定教学场景 (约束接口 + 解析解),
 * 本层面向自由组合场景 (数值积分, 无预设约束) — 是模型体系的平行扩展,
 * 不注册进 solver 注册表。
 */

/** 被释放的带电粒子 */
export interface CompositionParticle {
    /** 电荷量 (C), 可为负或零 */
    readonly charge: number;
    /** 质量 (kg), 必须为正 */
    readonly mass: number;
    /** 初始位置 (m) */
    readonly position: Vector3D;
    /** 初速度 (m/s) */
    readonly velocity: Vector3D;
}

/** 组合实验 — 拖拽实验台的最小完整描述 */
export interface CompositionExperiment {
    /** 场源布置 (拖入的器材集合, 顺序无关 — 叠加原理保证) */
    readonly sources: readonly FieldSource[];
    /** 被释放的带电粒子 */
    readonly particle: CompositionParticle;
    /** 仿真时长 (s) */
    readonly duration: number;
    /** 输出采样帧数 (含首尾), 默认 1000 */
    readonly sampleCount?: number;
    /** 单步最大回旋角 (rad), 透传给 boris3d, 默认 π/4 */
    readonly maxCyclotronStep?: number;
}

export interface CompositionSimResult {
    readonly trajectory: TrajectoryPoint3D[];
    /** 数值过程告警 (子步加密 / 发散截断) */
    readonly warnings: string[];
    /** 实际执行的内部子步总数 */
    readonly stepCount: number;
    /** 是否完整走完时长 (false = 数值发散提前终止) */
    readonly completed: boolean;
}

function isFiniteVector(v: Vector3D): boolean {
    return Number.isFinite(v.x + v.y + v.z);
}

/** 校验组合实验描述 — 供 UI 拖拽/调参时实时反馈, simulateComposition 内部也会先执行 */
export function validateComposition(experiment: CompositionExperiment): ValidationResult {
    const errors: Array<{ code: string; message: string; param?: string }> = [];
    const { particle, sources, duration, sampleCount } = experiment;

    if (!Number.isFinite(particle.charge)) {
        errors.push({ code: 'INVALID_PARAMETER', message: '粒子电荷量必须是有限数', param: 'particle.charge' });
    }
    if (!(particle.mass > 0) || !Number.isFinite(particle.mass)) {
        errors.push({ code: 'INVALID_PARAMETER', message: '粒子质量必须为正的有限数', param: 'particle.mass' });
    }
    if (!isFiniteVector(particle.position) || !isFiniteVector(particle.velocity)) {
        errors.push({ code: 'INVALID_PARAMETER', message: '粒子初始位置/速度必须为有限值', param: 'particle' });
    }
    if (!(duration > 0) || !Number.isFinite(duration)) {
        errors.push({ code: 'INVALID_PARAMETER', message: '仿真时长必须为正的有限数', param: 'duration' });
    }
    if (sampleCount !== undefined && (!Number.isInteger(sampleCount) || sampleCount <= 0)) {
        errors.push({ code: 'INVALID_PARAMETER', message: '采样帧数必须为正整数', param: 'sampleCount' });
    }

    for (let i = 0; i < sources.length; i++) {
        const s = sources[i];
        const param = `sources[${i}]`;
        try {
            if (s.kind === 'point-charge') {
                if (!Number.isFinite(s.charge)) {
                    errors.push({
                        code: 'INVALID_SOURCE',
                        message: '点电荷电量必须是有限数',
                        param: `${param}.charge`
                    });
                }
            } else if (s.kind === 'charged-plate') {
                if (!Number.isFinite(s.sigma)) {
                    errors.push({
                        code: 'INVALID_SOURCE',
                        message: '极板面电荷密度必须是有限数',
                        param: `${param}.sigma`
                    });
                }
                Vec3.normalize(s.normal); // 零法线在此抛错
            } else if (s.kind === 'straight-wire') {
                if (!Number.isFinite(s.current)) {
                    errors.push({ code: 'INVALID_SOURCE', message: '导线电流必须是有限数', param: `${param}.current` });
                }
                Vec3.normalize(s.direction);
            } else {
                if (!Number.isFinite(s.current) || !Number.isFinite(s.radius) || !Number.isFinite(s.turns)) {
                    errors.push({ code: 'INVALID_SOURCE', message: '线圈电流/半径/匝数必须是有限数', param });
                } else if (!(s.radius > 0)) {
                    errors.push({ code: 'INVALID_SOURCE', message: '线圈半径必须为正数', param: `${param}.radius` });
                } else if (!Number.isInteger(s.turns) || s.turns < 1) {
                    errors.push({
                        code: 'INVALID_SOURCE',
                        message: '线圈匝数必须是 ≥1 的整数',
                        param: `${param}.turns`
                    });
                }
                Vec3.normalize(s.axis);
                if (s.segments !== undefined && (!Number.isInteger(s.segments) || s.segments < 3)) {
                    errors.push({
                        code: 'INVALID_SOURCE',
                        message: '线圈分段数必须是 ≥3 的整数',
                        param: `${param}.segments`
                    });
                }
            }
        } catch {
            errors.push({
                code: 'INVALID_SOURCE',
                message: '场源的方向向量不能为零向量 (法线/导线方向/线圈轴)',
                param
            });
        }
    }

    return { valid: errors.length === 0, errors, warnings: [] };
}

/** 由场源集合构造场求值器 — 也可独立用于 3D 渲染层的场采样 */
export function compositionFieldAt(sources: readonly FieldSource[]): FieldEvaluator {
    return (position: Vector3D) => ({
        E: totalElectricField(sources, position),
        B: totalMagneticField(sources, position)
    });
}

/**
 * 求解组合实验: 校验 → 组合场 → 3D Boris 积分。
 * 描述非法时抛错 (消息含全部校验问题); 数值发散不抛错,
 * 由 completed = false 与 warnings 表达 — 与模型层"告警不抛"的约定一致。
 */
export function simulateComposition(experiment: CompositionExperiment): CompositionSimResult {
    const validation = validateComposition(experiment);
    if (!validation.valid) {
        const detail = validation.errors.map(e => e.message).join('; ');
        throw new Error(`组合实验描述非法: ${detail}`);
    }
    const { particle, sources, duration, sampleCount, maxCyclotronStep } = experiment;
    const result = borisTrajectory3D({
        charge: particle.charge,
        mass: particle.mass,
        x0: particle.position,
        v0: particle.velocity,
        fieldAt: compositionFieldAt(sources),
        duration,
        sampleCount,
        maxCyclotronStep
    });
    return {
        trajectory: result.points,
        warnings: result.warnings,
        stepCount: result.stepCount,
        completed: result.points.length === (sampleCount ?? 1000) + 1
    };
}
