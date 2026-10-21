import { useEffect, useState } from 'react';
import type { Vector3D } from 'physics-core';
import { NumberField } from '../common/NumberField';
import {
    axisAngleToVector,
    vectorToAxisAngle,
    formatVector,
    ROTATION_AXIS_OPTIONS,
    PRESET_DIRECTIONS,
    type RotationAxis
} from '../../utils/directionUtils';

export interface DirectionEditorProps {
    readonly id: string;
    readonly fieldKey: string;
    readonly label: string;
    readonly value: Vector3D;
    readonly onChange: (v: Vector3D) => void;
}

/**
 * 器材旋转/朝向编辑控件（#100）。
 *
 * 规范：预设轴 + 绕轴角度，外加六向快捷预设按钮与当前矢量读数。
 * 避免师生直接输入复杂的自由 3D 向量，保证所见即所得与教学表达直观。
 */
export function DirectionEditor(props: DirectionEditorProps) {
    const { label, value, onChange } = props;

    const initial = vectorToAxisAngle(value);
    const [axis, setAxis] = useState<RotationAxis>(initial.axis);
    const [angle, setAngle] = useState<number>(initial.angle);

    // 外部值（如模板/撤销/重置）变更时对齐状态
    useEffect(() => {
        const current = axisAngleToVector(axis, angle);
        const diff = Math.hypot(value.x - current.x, value.y - current.y, value.z - current.z);
        if (diff > 0.01) {
            const parsed = vectorToAxisAngle(value);
            setAxis(parsed.axis);
            setAngle(parsed.angle);
        }
    }, [value, axis, angle]);

    const handleAxisChange = (newAxis: RotationAxis) => {
        setAxis(newAxis);
        const newVec = axisAngleToVector(newAxis, angle);
        onChange(newVec);
    };

    const handleAngleChange = (newAngle: number) => {
        setAngle(newAngle);
        const newVec = axisAngleToVector(axis, newAngle);
        onChange(newVec);
    };

    return (
        <div className="composition-direction-editor">
            <div className="composition-direction-header">
                <span className="composition-direction-label">{label}</span>
                <span className="composition-vector-readout" title="当前物理方向单位向量 (x, y, z)">
                    {formatVector(value)}
                </span>
            </div>

            <div className="composition-field">
                <span>预设旋转轴</span>
                <select
                    className="composition-axis-select"
                    value={axis}
                    onChange={e => handleAxisChange(e.target.value as RotationAxis)}
                    aria-label={`${label}预设旋转轴`}
                >
                    {ROTATION_AXIS_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            </div>

            <NumberField
                label="绕轴角度 (°)"
                value={angle}
                min={-180}
                max={180}
                step={5}
                unit="°"
                onChange={handleAngleChange}
            />

            <div className="composition-preset-row">
                <span className="composition-density-title">预设朝向</span>
                <div className="composition-preset-buttons">
                    {PRESET_DIRECTIONS.map(p => {
                        const isMatch =
                            Math.hypot(value.x - p.vector.x, value.y - p.vector.y, value.z - p.vector.z) < 0.02;
                        return (
                            <button
                                key={p.id}
                                type="button"
                                className={`btn btn-sm${isMatch ? ' active' : ''}`}
                                onClick={() => {
                                    setAxis(p.axis);
                                    setAngle(p.angle);
                                    onChange(p.vector);
                                }}
                                title={p.label}
                            >
                                {p.id.toUpperCase()}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
