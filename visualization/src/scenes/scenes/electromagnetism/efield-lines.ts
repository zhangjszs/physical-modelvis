import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const efield_linesScene: SceneConfig = {
    id: 'efield-lines',
    name: '电场线分布',
    model: 'electric-field-lines',
    parameters: [
        {
            name: 'mode',
            label: '模式 (0点电荷 1偶极 2平行板)',
            unit: '',
            value: 0,
            min: 0,
            max: 2,
            step: 1,
            default: 0,
            description: '0=点电荷; 1=电偶极; 2=平行板电容器'
        },
        {
            name: 'q',
            label: '点电荷电量 q',
            unit: 'nC',
            value: 5,
            min: 1,
            max: 10,
            step: 0.5,
            default: 5,
            description: '点电荷模式下的正电荷量'
        },
        {
            name: 'dipoleCharge',
            label: '偶极电荷量',
            unit: 'nC',
            value: 5,
            min: 1,
            max: 10,
            step: 0.5,
            default: 5,
            description: '电偶极模式下的 ±q 大小'
        },
        {
            name: 'dipoleSeparation',
            label: '偶极间距 (场景)',
            unit: '',
            value: 1.0,
            min: 0.4,
            max: 2.0,
            step: 0.1,
            default: 1.0,
            description: '电偶极两电荷间距 (归一化场景单位)'
        },
        {
            name: 'plateVoltage',
            label: '平行板电压 U',
            unit: 'V',
            value: 12,
            min: 1,
            max: 50,
            step: 1,
            default: 12,
            description: '平行板模式下的极板电压'
        },
        {
            name: 'plateGap',
            label: '平行板间距 (场景)',
            unit: '',
            value: 1.2,
            min: 0.4,
            max: 2.0,
            step: 0.1,
            default: 1.2,
            description: '平行板两板间距 (归一化场景单位)'
        },
        {
            name: 'duration',
            label: '动画时长',
            unit: 's',
            value: 5,
            min: 1,
            max: 10,
            step: 0.5,
            default: 5,
            description: '动画播放时长'
        }
    ],
    buildProblem: params => {
        const modeNum = Math.round(params['mode'] ?? 0);
        const mode: 'point-charge' | 'dipole' | 'parallel-plate' =
            modeNum === 2 ? 'parallel-plate' : modeNum === 1 ? 'dipole' : 'point-charge';
        const q = params['q'] ?? 5;
        const dipoleCharge = params['dipoleCharge'] ?? 5;
        const dipoleSeparation = params['dipoleSeparation'] ?? 1.0;
        const plateVoltage = params['plateVoltage'] ?? 12;
        const plateGap = params['plateGap'] ?? 1.2;
        const duration = params['duration'] ?? 5;
        const constraints: {
            mode: 'point-charge' | 'dipole' | 'parallel-plate';
            charges?: Array<{
                x: number;
                y: number;
                q: number;
            }>;
            dipoleCharge?: number;
            dipoleSeparation?: number;
            plateVoltage?: number;
            plateGap?: number;
            plateLength?: number;
            steps?: number;
            maxLength?: number;
            lineCount?: number;
        } = { mode, steps: 600, maxLength: 6, lineCount: 16 };
        if (mode === 'point-charge') {
            constraints.charges = [{ x: 0, y: 0, q }];
        } else if (mode === 'dipole') {
            constraints.dipoleCharge = dipoleCharge;
            constraints.dipoleSeparation = dipoleSeparation;
        } else {
            constraints.plateVoltage = plateVoltage;
            constraints.plateGap = plateGap;
            constraints.plateLength = 2.0;
        }
        return {
            id: `efield-lines-${Date.now()}`,
            title: '电场线分布',
            model: 'electric-field-lines' as const,
            bodies: [],
            constraints: { electricFieldLines: constraints },
            environment: {},
            timeConfig: makeTimeSeries(duration, 50)
        };
    }
};
