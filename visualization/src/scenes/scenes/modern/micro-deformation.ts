import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const micro_deformationScene: SceneConfig = {
    id: 'micro-deformation',
    name: '光杠杆放大微小形变',
    model: 'micro-deformation',
    parameters: [
        {
            name: 'pressure',
            label: '桌面压力 F',
            unit: 'N',
            value: 100,
            min: 10,
            max: 500,
            step: 10,
            default: 100,
            description: '按压桌面的力 (模拟重物放在桌面上)'
        },
        {
            name: 'laserDist',
            label: '激光到镜面距离',
            unit: 'm',
            value: 1,
            min: 0.5,
            max: 3,
            step: 0.1,
            default: 1,
            description: '激光笔到平面镜的距离'
        },
        {
            name: 'mirrorDist',
            label: '镜面到投影屏距离 D',
            unit: 'm',
            value: 5,
            min: 1,
            max: 20,
            step: 0.5,
            default: 5,
            description: '反射光路越长, 放大效果越明显 (光杠杆放大)'
        },
        {
            name: 'youngModulus',
            label: '杨氏模量 E',
            unit: 'GPa',
            value: 10,
            min: 1,
            max: 200,
            step: 1,
            default: 10,
            description: '桌面材料的杨氏模量 (玻璃约 70GPa, 木材约 10GPa)'
        },
        {
            name: 'duration',
            label: '模拟时长',
            unit: 's',
            value: 1,
            min: 0.5,
            max: 3,
            step: 0.1,
            default: 1,
            description: '静态场景 (该参数仅用于仿真框架)'
        }
    ],
    buildProblem: params => {
        const pressure = params['pressure'] ?? 100;
        const laserDist = params['laserDist'] ?? 1;
        const mirrorDist = params['mirrorDist'] ?? 5;
        const youngModulusGPa = params['youngModulus'] ?? 10;
        const duration = params['duration'] ?? 1;
        return {
            id: `micro-def-${Date.now()}`,
            title: '光杠杆放大微小形变',
            model: 'micro-deformation',
            bodies: [
                { id: 'table', mass: { value: 10, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
            ],
            constraints: {
                microDeformation: {
                    laserDist,
                    mirrorDist,
                    pressure,
                    youngModulus: youngModulusGPa * 1e9,
                    thickness: 0.05,
                    tableLength: 1
                }
            },
            environment: {},
            timeConfig: makeTimeSeries(duration, 100)
        };
    }
};
