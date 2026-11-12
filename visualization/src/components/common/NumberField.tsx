import { type ChangeEvent } from 'react';

/**
 * 统一数值编辑控件（#135 实施单 β · 接口草案见 docs/composition-reuse-boundary.md §3.2）。
 *
 * - 无 `min`/`max` → 纯 number input（CompositionLab 现行为，`.composition-field`）；
 * - 同时提供 `min` 与 `max` → slider + input 对（ParameterPanel 现行为，`.param-*`），
 *   并对回传值做 [min,max] 截断；空态 / 非法输入回退 0（对齐原 `parseFloat() || 0`）。
 *
 * 约定：debounce / liveUpdate 策略由父组件在 `onChange` 中实现，store 不进入 NumberField。
 */
export interface NumberFieldProps {
    /** 字段标签（渲染于 label 区） */
    label: string;
    /** 受控数值；非有限值按 0 呈现，避免受控 input 崩溃 */
    value: number;
    /** 值变化回调（slider 模式已按 min/max 截断；纯 input 模式仅回传有限值） */
    onChange: (value: number) => void;
    /** 下界：与 max 同时提供时启用 slider 模式 */
    min?: number;
    /** 上界：与 min 同时提供时启用 slider 模式 */
    max?: number;
    /** 步进 */
    step?: number;
    /** 描述文案（slider 模式渲染 `.param-desc`） */
    description?: string;
    /** 单位后缀（slider 模式渲染 `.param-unit`） */
    unit?: string;
    /** 实时/防抖标记：由父组件 debounce 策略消费，NumberField 不内部防抖（字段保留以对齐 §3.2） */
    liveUpdate?: boolean;
    /** 禁用两个输入控件 */
    disabled?: boolean;
}

export function NumberField(props: NumberFieldProps) {
    const { label, value, onChange, min, max, step, description, unit, disabled } = props;
    const sliderMode = typeof min === 'number' && typeof max === 'number';
    const safeValue = Number.isFinite(value) ? value : 0;

    /** slider 模式统一回传：非法 → 0，再按 [min,max] 截断 */
    const emitClamped = (raw: number): void => {
        const base = Number.isFinite(raw) ? raw : 0;
        onChange(min !== undefined && max !== undefined ? Math.max(min, Math.min(max, base)) : base);
    };

    // 纯 number input 模式（无 min/max）：非有限值不回传，保持 CompositionLab 原语义
    if (!sliderMode) {
        return (
            <label className="composition-field">
                <span>{label}</span>
                <input
                    type="number"
                    value={safeValue}
                    step={step}
                    disabled={disabled}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        const parsed = Number(e.target.value);
                        if (Number.isFinite(parsed)) onChange(parsed);
                    }}
                />
            </label>
        );
    }

    // slider + number input 双控件模式（ParameterPanel 现行为）
    return (
        <div className="param-item">
            <div className="param-header">
                <span className="param-label">{label}</span>
                <span className="param-unit">{unit}</span>
            </div>
            <div className="param-control">
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={safeValue}
                    disabled={disabled}
                    onChange={e => emitClamped(Number(e.target.value))}
                    className="param-slider"
                    aria-label={label}
                />
                <input
                    type="number"
                    min={min}
                    max={max}
                    step={step}
                    value={safeValue}
                    disabled={disabled}
                    onChange={e => emitClamped(Number(e.target.value))}
                    className="param-input"
                    aria-label={`${label} 数值输入`}
                />
            </div>
            <div className="param-desc">{description}</div>
        </div>
    );
}
