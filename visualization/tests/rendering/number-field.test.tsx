/**
 * #135 实施单 β — NumberField 统一数值控件测试
 *
 * 覆盖：slider+input 联动 / 纯 input（无 min/max）/ disabled / 边界（min/max 截断）/ 空态 NaN。
 */
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { NumberField } from '../../src/components/common/NumberField';

const rangeOf = (container: HTMLElement) => container.querySelector('input[type="range"]') as HTMLInputElement;
const numOf = (container: HTMLElement) => container.querySelector('input[type="number"]') as HTMLInputElement;

// ─────────────── slider + input 模式（提供 min/max · ParameterPanel 现行为）───────────────

describe('NumberField · slider+input 模式', () => {
    it('渲染 .param-item 壳 + range + number 双控件，受控 value 同步显示，unit 渲染', () => {
        const { container } = render(
            <NumberField label="长度" unit="m" min={0} max={100} step={1} value={42} onChange={() => {}} />
        );
        expect(container.querySelector('.param-item')).not.toBeNull();
        expect(container.querySelector('.param-slider')).not.toBeNull();
        expect(container.querySelector('.param-input')).not.toBeNull();
        expect(rangeOf(container).value).toBe('42');
        expect(numOf(container).value).toBe('42');
        expect(container.querySelector('.param-unit')?.textContent).toBe('m');
    });

    it('拖动 slider → onChange 收到解析后的有限值（联动）', () => {
        const onChange = vi.fn();
        const { container } = render(
            <NumberField label="长度" min={0} max={100} step={1} value={42} onChange={onChange} />
        );
        fireEvent.change(rangeOf(container), { target: { value: '77' } });
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledWith(77);
    });

    it('number 输入越界 → 按 [min,max] 截断后回传（上界 + 下界）', () => {
        const onChange = vi.fn();
        const { container } = render(
            <NumberField label="长度" min={0} max={50} step={1} value={10} onChange={onChange} />
        );
        const num = numOf(container);
        fireEvent.change(num, { target: { value: '999' } });
        expect(onChange).toHaveBeenLastCalledWith(50);
        fireEvent.change(num, { target: { value: '-5' } });
        expect(onChange).toHaveBeenLastCalledWith(0);
    });

    it('number 输入清空 → 回传有限值 0，绝不向 onChange 传播 NaN', () => {
        const onChange = vi.fn();
        const { container } = render(
            <NumberField label="长度" min={0} max={50} step={1} value={10} onChange={onChange} />
        );
        fireEvent.change(numOf(container), { target: { value: '' } });
        expect(onChange).toHaveBeenCalledTimes(1);
        const arg = onChange.mock.calls[0]![0] as number;
        expect(Number.isFinite(arg)).toBe(true);
        expect(arg).toBe(0);
    });

    it('disabled → range 与 number 均禁用', () => {
        const { container } = render(
            <NumberField label="长度" min={0} max={100} value={1} onChange={() => {}} disabled />
        );
        expect(rangeOf(container).disabled).toBe(true);
        expect(numOf(container).disabled).toBe(true);
    });

    it('受控 value 为 NaN → 安全渲染为 0（slider 模式不崩）', () => {
        const { container } = render(<NumberField label="长度" min={0} max={100} value={NaN} onChange={() => {}} />);
        expect(rangeOf(container).value).toBe('0');
        expect(numOf(container).value).toBe('0');
    });
});

// ─────────────── 纯 number input 模式（无 min/max · CompositionLab 现行为）───────────────

describe('NumberField · 纯 input 模式', () => {
    it('渲染 .composition-field，且不含 range/slider', () => {
        const { container } = render(<NumberField label="电荷量 q (C)" step={1e-8} value={1e-7} onChange={() => {}} />);
        expect(container.querySelector('.composition-field')).not.toBeNull();
        expect(container.querySelector('input[type="range"]')).toBeNull();
        expect(container.querySelector('.param-slider')).toBeNull();
    });

    it('合法输入 → onChange 收到解析值', () => {
        const onChange = vi.fn();
        const { container } = render(<NumberField label="时长 (s)" step={0.5} value={2} onChange={onChange} />);
        fireEvent.change(numOf(container), { target: { value: '5' } });
        expect(onChange).toHaveBeenCalledWith(5);
    });

    it('清空输入 (Number("")=0) → 回传有限值 0，onChange 永不为 NaN（CompositionLab 语义）', () => {
        const onChange = vi.fn();
        const { container } = render(<NumberField label="时长 (s)" step={0.5} value={2} onChange={onChange} />);
        fireEvent.change(numOf(container), { target: { value: '' } });
        expect(onChange).toHaveBeenCalledTimes(1);
        for (const call of onChange.mock.calls) {
            expect(Number.isFinite(call[0] as number)).toBe(true);
        }
    });

    it('disabled → 单个 number 输入禁用', () => {
        const { container } = render(
            <NumberField label="时长 (s)" step={0.5} value={2} onChange={() => {}} disabled />
        );
        expect(numOf(container).disabled).toBe(true);
    });
});
