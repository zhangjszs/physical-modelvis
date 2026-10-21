import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { DirectionEditor } from '../../src/components/composition/DirectionEditor';
import { CompositionLab } from '../../src/components/composition/CompositionLab';
import { useCompositionStore } from '../../src/store/compositionStore';
import type { Vector3D } from 'physics-core';
vi.mock('../../src/components/composition/CompositionStage', () => ({
    CompositionStage: () => <div data-testid="composition-stage-stub" />
}));
afterEach(() => {
    cleanup();
});

describe('DirectionEditor 器材朝向编辑组件', () => {
    it('正确呈现方向标签、向量读数与预设按钮', () => {
        const onChange = vi.fn();
        const val: Vector3D = { x: 0, y: 1, z: 0 };
        const { container } = render(
            <DirectionEditor id="coil-1" fieldKey="axis" label="线圈轴向" value={val} onChange={onChange} />
        );

        expect(screen.getByText('线圈轴向')).toBeDefined();
        expect(screen.getByText('(0.00, 1.00, 0.00)')).toBeDefined();

        // 预设轴下拉菜单
        const select = screen.getByLabelText('线圈轴向预设旋转轴') as HTMLSelectElement;
        expect(select.value).toBe('z');

        // 6个预设按钮
        const buttons = container.querySelectorAll('.composition-preset-buttons button');
        expect(buttons).toHaveLength(6);
    });

    it('点击预设按钮触发 onChange 回调对应向量', () => {
        const onChange = vi.fn();
        const val: Vector3D = { x: 0, y: 1, z: 0 };
        render(<DirectionEditor id="coil-1" fieldKey="axis" label="线圈轴向" value={val} onChange={onChange} />);

        // 点击 +Z (竖直上)
        const btnZ = screen.getByTitle('+Z (竖直上)');
        fireEvent.click(btnZ);
        expect(onChange).toHaveBeenCalledWith({ x: 0, y: 0, z: 1 });

        // 点击 +X (水平右)
        const btnX = screen.getByTitle('+X (水平右)');
        fireEvent.click(btnX);
        expect(onChange).toHaveBeenCalledWith({ x: 1, y: 0, z: 0 });
    });

    it('更改旋转轴下拉项，按当前角度生成新方向向量', () => {
        const onChange = vi.fn();
        const val: Vector3D = { x: 0, y: 1, z: 0 }; // 0°
        render(<DirectionEditor id="wire-1" fieldKey="direction" label="导线方向" value={val} onChange={onChange} />);

        const select = screen.getByLabelText('导线方向预设旋转轴') as HTMLSelectElement;
        // 切换为 X 轴 (正立面)
        fireEvent.change(select, { target: { value: 'x' } });
        expect(onChange).toHaveBeenCalledWith({ x: 0, y: 1, z: 0 });
    });

    it('拖动/修改角度输入框，生成对应角度的单位向量', () => {
        const onChange = vi.fn();
        const val: Vector3D = { x: 0, y: 1, z: 0 }; // Z 轴 0°
        const { container } = render(
            <DirectionEditor id="plate-1" fieldKey="normal" label="极板法线" value={val} onChange={onChange} />
        );

        const numberInput = container.querySelector('input[type="number"]') as HTMLInputElement;
        expect(numberInput).not.toBeNull();

        // 改为 90°
        fireEvent.change(numberInput, { target: { value: '90' } });
        expect(onChange).toHaveBeenCalledWith({ x: 1, y: 0, z: 0 });

        // 改为 30°
        fireEvent.change(numberInput, { target: { value: '30' } });
        expect(onChange).toHaveBeenLastCalledWith({ x: 0.5, y: 0.866025, z: 0 });
    });
});

describe('CompositionLab 选中器材检查器与方向更新集成', () => {
    beforeEach(() => {
        useCompositionStore.getState().resetLab();
    });

    it('选中 circular-coil 时展示线圈轴向 DirectionEditor，修改角度重算轨迹', () => {
        useCompositionStore.getState().addSource('circular-coil');
        const source = useCompositionStore.getState().sources[0]!;
        useCompositionStore.getState().select(source.id);

        const { container } = render(<CompositionLab onExit={() => {}} />);

        expect(screen.getByText('线圈轴向')).toBeDefined();
        const numberInput = container.querySelector('.composition-direction-editor input[type="number"]');
        expect(numberInput).not.toBeNull();

        // 点击 +Z 预设按钮
        const btnZ = screen.getByTitle('+Z (竖直上)');
        fireEvent.click(btnZ);
        const updated = useCompositionStore.getState().sources[0]!.source;
        expect(updated.kind).toBe('circular-coil');
        if (updated.kind === 'circular-coil') {
            expect(updated.axis).toEqual({ x: 0, y: 0, z: 1 });
        }
        expect(useCompositionStore.getState().validationMessage).toBeNull();
        expect(useCompositionStore.getState().result).not.toBeNull();
    });

    it('选中 charged-plate / straight-wire / bar-magnet 均显示对应方向编辑入口', () => {
        useCompositionStore.getState().addSource('charged-plate');
        const plateId = useCompositionStore.getState().sources[0]!.id;
        useCompositionStore.getState().select(plateId);

        const { rerender } = render(<CompositionLab onExit={() => {}} />);
        expect(screen.getByText('极板法线')).toBeDefined();

        // 切换到 straight-wire
        useCompositionStore.getState().addSource('straight-wire');
        const wireId = useCompositionStore.getState().sources[1]!.id;
        useCompositionStore.getState().select(wireId);
        rerender(<CompositionLab onExit={() => {}} />);
        expect(screen.getByText('导线方向')).toBeDefined();

        // 切换到 bar-magnet
        useCompositionStore.getState().addSource('bar-magnet');
        const magnetId = useCompositionStore.getState().sources[2]!.id;
        useCompositionStore.getState().select(magnetId);
        rerender(<CompositionLab onExit={() => {}} />);
        expect(screen.getByText('磁矩方向 (N极)')).toBeDefined();
    });
});
