import type { FieldSource, CompositionParticle } from 'physics-core';
import { PHYSICS_CONSTANTS } from 'physics-core';
import { snapVector } from '../../utils/compositionCoords';

/**
 * 组合实验台预设实验模板 (#101)
 *
 * 为物理教学提供「一键布置高频电磁场景」的能力：
 * 1. 速度选择器：正交匀强 E/B 场，满足 v = E/B 的带电粒子沿直线匀速穿过
 * 2. 质谱仪：平行板加速电场 + 匀强磁场偏转，半圆弧轨迹分离不同荷质比粒子
 * 3. 平行板偏转：初速度垂直电场线射入，恒定电场力产生类平抛抛物线轨迹
 * 4. 磁聚焦：圆形通电线圈轴向非匀强磁场，近轴带电粒子向心螺旋会聚
 *
 * 约定：
 * - 模板内所有位置/尺寸参数严格落 0.25m 网格（台面可视网格，snapVector(v, 0.25) 对齐）
 * - 所有参数严格通过 validateComposition 校验
 */

export interface CompositionTemplate {
    readonly id: string;
    readonly name: string;
    readonly icon: string;
    readonly description: string;
    readonly teachingGoal: string;
    readonly sources: readonly FieldSource[];
    readonly particle: CompositionParticle;
    readonly duration: number;
    readonly sampleCount?: number;
    readonly showElectricFieldLines?: boolean;
    readonly showMagneticFieldLines?: boolean;
}

const eps0 = PHYSICS_CONSTANTS.epsilon0.value;

export const COMPOSITION_TEMPLATES: readonly CompositionTemplate[] = [
    {
        id: 'velocity-selector',
        name: '速度选择器',
        icon: '⚡',
        description: '正交匀强电场与磁场，只有特定速度的粒子沿直线匀速穿过。',
        teachingGoal: '电场力与洛伦兹力平衡 (qE = qvB)，特定速度的带电粒子沿直线穿过正交电磁场。',
        sources: [
            {
                kind: 'charged-plate',
                sigma: eps0 * 1.0 * 2e-3,
                center: snapVector({ x: 0, y: -0.5, z: 0.25 }, 0.25),
                normal: { x: 0, y: 1, z: 0 }
            },
            {
                kind: 'charged-plate',
                sigma: -eps0 * 1.0 * 2e-3,
                center: snapVector({ x: 0, y: 0.5, z: 0.25 }, 0.25),
                normal: { x: 0, y: 1, z: 0 }
            },
            {
                kind: 'uniform-field-zone',
                field: { x: 0, y: 0, z: 2e-3 },
                center: snapVector({ x: 0, y: 0, z: 0.25 }, 0.25),
                size: snapVector({ x: 1.0, y: 1.0, z: 0.5 }, 0.25)
            }
        ],
        particle: {
            charge: 5e-4,
            mass: 1e-6,
            position: snapVector({ x: -0.5, y: 0, z: 0.25 }, 0.25),
            velocity: { x: 1.0, y: 0, z: 0 }
        },
        duration: 1.0,
        sampleCount: 400,
        showElectricFieldLines: true,
        showMagneticFieldLines: true
    },
    {
        id: 'mass-spectrometer',
        name: '质谱仪',
        icon: '🔬',
        description: '平行板电场加速后进入匀强磁场偏转，半圆轨迹分离不同荷质比粒子。',
        teachingGoal: '电场加速获得动能，垂直进入匀强磁场偏转为半圆轨迹 (r = mv/qB)，用于分离不同荷质比粒子。',
        sources: [
            {
                kind: 'charged-plate',
                sigma: eps0 * 0.0025,
                center: snapVector({ x: -0.75, y: 0, z: 0.25 }, 0.25),
                normal: { x: 1, y: 0, z: 0 }
            },
            {
                kind: 'charged-plate',
                sigma: -eps0 * 0.0025,
                center: snapVector({ x: -0.25, y: 0, z: 0.25 }, 0.25),
                normal: { x: 1, y: 0, z: 0 }
            },
            {
                kind: 'uniform-field-zone',
                field: { x: 0, y: 0, z: 0.02 },
                center: snapVector({ x: 0.25, y: 0, z: 0.25 }, 0.25),
                size: snapVector({ x: 1.0, y: 1.0, z: 0.5 }, 0.25)
            }
        ],
        particle: {
            charge: 1e-4,
            mass: 1e-6,
            position: snapVector({ x: -0.75, y: 0, z: 0.25 }, 0.25),
            velocity: { x: 0.01, y: 0, z: 0 }
        },
        duration: 3.6,
        sampleCount: 500,
        showElectricFieldLines: true,
        showMagneticFieldLines: true
    },
    {
        id: 'electric-deflection',
        name: '平行板偏转',
        icon: '⇶',
        description: '带电粒子以初速度垂直射入匀强电场，受恒定电场力做类平抛曲线运动。',
        teachingGoal: '初速度垂直于电场线射入，在恒定电场力作用下产生类平抛抛物线偏转。',
        sources: [
            {
                kind: 'charged-plate',
                sigma: 2e-6,
                center: snapVector({ x: 0, y: 0.5, z: 0.25 }, 0.25),
                normal: { x: 0, y: 1, z: 0 }
            },
            {
                kind: 'charged-plate',
                sigma: -2e-6,
                center: snapVector({ x: 0, y: -0.5, z: 0.25 }, 0.25),
                normal: { x: 0, y: 1, z: 0 }
            }
        ],
        particle: {
            charge: 1e-9,
            mass: 1e-4,
            position: snapVector({ x: -0.75, y: 0.25, z: 0.25 }, 0.25),
            velocity: { x: 1.5, y: 0, z: 0 }
        },
        duration: 0.8,
        sampleCount: 400,
        showElectricFieldLines: true,
        showMagneticFieldLines: false
    },
    {
        id: 'magnetic-focusing',
        name: '磁聚焦',
        icon: '🧲',
        description: '圆形线圈轴向非匀强磁场产生径向分量，对偏离轴线的粒子产生螺旋向心会聚。',
        teachingGoal: '轴向非匀强磁场产生径向分量，对发散带电粒子束产生向轴心螺旋会聚效应。',
        sources: [
            {
                kind: 'circular-coil',
                current: 10,
                turns: 50,
                radius: 0.5,
                center: snapVector({ x: 0, y: 0, z: 0.25 }, 0.25),
                axis: { x: 1, y: 0, z: 0 }
            }
        ],
        particle: {
            charge: 2e-2,
            mass: 1e-6,
            position: snapVector({ x: -0.75, y: 0.25, z: 0.25 }, 0.25),
            velocity: { x: 1.0, y: 0, z: 0 }
        },
        duration: 1.5,
        sampleCount: 500,
        showElectricFieldLines: false,
        showMagneticFieldLines: true
    }
];

export function getCompositionTemplate(id: string): CompositionTemplate | undefined {
    return COMPOSITION_TEMPLATES.find(t => t.id === id);
}
