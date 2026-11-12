import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { CompositionOutliner } from '../../src/components/composition/CompositionOutliner';
import { useCompositionStore } from '../../src/store/compositionStore';

/** CompositionOutliner 器材列表 (#166 P0 S-4/S-6/S-8/A-7) — jsdom 组件级验证 */
afterEach(() => {
    cleanup();
    act(() => {
        useCompositionStore.getState().resetLab();
    });
});

describe('CompositionOutliner 器材列表', () => {
    it('S-4/S-8: 行数与可读命名「类型 + 序号」, 不展示内部完整 id; 空列表有提示', () => {
        act(() => {
            useCompositionStore.getState().resetLab();
        });
        const { container } = render(<CompositionOutliner />);
        expect(container.querySelectorAll('.composition-outliner-row')).toHaveLength(0);
        expect(screen.getByText(/从上方器材面板添加场源后/)).toBeDefined();

        act(() => {
            useCompositionStore.getState().addSource('point-charge');
            useCompositionStore.getState().addSource('uniform-field-zone');
            useCompositionStore.getState().addSource('circular-coil');
        });
        const rows = container.querySelectorAll('.composition-outliner-row');
        expect(rows).toHaveLength(3);
        // 可读命名按 store 中的实际 id 尾号 (计数器跨测试累加, 不写死)
        const ids = useCompositionStore.getState().sources.map(p => p.id);
        expect(rows[0]!.textContent?.trim()).toBe(`点电荷 #${tailNum(ids[0]!)}`);
        expect(rows[1]!.textContent?.trim()).toBe(`匀强磁场区 #${tailNum(ids[1]!)}`);
        expect(rows[2]!.textContent?.trim()).toBe(`圆形线圈 #${tailNum(ids[2]!)}`);
        // 行文本不含内部 id 形态 (如 point-charge-N)
        expect(rows[0]!.textContent).not.toContain('point-charge-');
    });

    it('S-7: 点击行选中 (双向同步 selectedId) 且呈现 selected 高亮态', () => {
        act(() => {
            useCompositionStore.getState().resetLab();
            useCompositionStore.getState().addSource('point-charge');
            useCompositionStore.getState().addSource('bar-magnet');
        });
        const ids = useCompositionStore.getState().sources.map(p => p.id);
        const { container } = render(<CompositionOutliner />);

        const rows = container.querySelectorAll('.composition-outliner-row');
        fireEvent.click(rows[1]!);
        expect(useCompositionStore.getState().selectedId).toBe(ids[1]);
        expect(rows[1]!.className).toContain('selected');
        expect(rows[0]!.className).not.toContain('selected');
        // 再点击另一行 → 选中切换
        fireEvent.click(rows[0]!);
        expect(useCompositionStore.getState().selectedId).toBe(ids[0]);
    });

    it('S-6: 行 hover 写入 hoverId (与 3D 悬停高亮联动), 移出清空', () => {
        act(() => {
            useCompositionStore.getState().resetLab();
            useCompositionStore.getState().addSource('point-charge');
            useCompositionStore.getState().addSource('straight-wire');
        });
        const ids = useCompositionStore.getState().sources.map(p => p.id);
        const { container } = render(<CompositionOutliner />);

        const rows = container.querySelectorAll('.composition-outliner-row');
        fireEvent.mouseEnter(rows[1]!);
        expect(useCompositionStore.getState().hoverId).toBe(ids[1]);
        expect(rows[1]!.className).toContain('hover');
        fireEvent.mouseLeave(rows[1]!);
        expect(useCompositionStore.getState().hoverId).toBeNull();
        expect(rows[1]!.className).not.toContain('hover');
    });

    it('A-7 键盘: ↓ 移动焦点行 + Enter 选中 + Delete 删除焦点行 (含回绕)', () => {
        act(() => {
            useCompositionStore.getState().resetLab();
            useCompositionStore.getState().addSource('point-charge');
            useCompositionStore.getState().addSource('uniform-field-zone');
            useCompositionStore.getState().addSource('bar-magnet');
        });
        const ids = useCompositionStore.getState().sources.map(p => p.id);
        const { container } = render(<CompositionOutliner />);

        const listbox = container.querySelector('.composition-outliner') as HTMLDivElement;
        expect(listbox).not.toBeNull();

        // ↓ 从第 1 行移到第 2 行, Enter 选中
        fireEvent.keyDown(listbox, { key: 'ArrowDown' });
        let rows = container.querySelectorAll('.composition-outliner-row');
        expect(rows[1]!.className).toContain('focus');
        fireEvent.keyDown(listbox, { key: 'Enter' });
        expect(useCompositionStore.getState().selectedId).toBe(ids[1]);

        // ↑ 回绕: 第 2 行 → ↑ 第 1 行 → ↑ 末行 (3 行回绕)
        fireEvent.keyDown(listbox, { key: 'ArrowUp' });
        fireEvent.keyDown(listbox, { key: 'ArrowUp' });
        rows = container.querySelectorAll('.composition-outliner-row');
        expect(rows[2]!.className).toContain('focus');

        // Delete 删除焦点行 (第 3 行 bar-magnet), 列表变 2 行
        fireEvent.keyDown(listbox, { key: 'Delete' });
        rows = container.querySelectorAll('.composition-outliner-row');
        expect(rows).toHaveLength(2);
        expect(useCompositionStore.getState().sources).toHaveLength(2);
        expect(useCompositionStore.getState().sources.map(p => p.id)).not.toContain(ids[2]);
    });

    it('焦点行随器材删除后自动夹回有效范围', () => {
        act(() => {
            useCompositionStore.getState().resetLab();
            useCompositionStore.getState().addSource('point-charge');
            useCompositionStore.getState().addSource('bar-magnet');
        });
        const { container } = render(<CompositionOutliner />);
        const listbox = container.querySelector('.composition-outliner') as HTMLDivElement;

        // 焦点移到末行 (第 2 行)
        fireEvent.keyDown(listbox, { key: 'ArrowDown' });
        let rows = container.querySelectorAll('.composition-outliner-row');
        expect(rows[1]!.className).toContain('focus');

        // 选中末行后从外部删除它 → 焦点夹回第 1 行
        fireEvent.keyDown(listbox, { key: 'Enter' });
        const id = useCompositionStore.getState().selectedId;
        act(() => {
            useCompositionStore.getState().removeSource(id!);
        });
        rows = container.querySelectorAll('.composition-outliner-row');
        expect(rows).toHaveLength(1);
        expect(rows[0]!.className).toContain('focus');
    });
});

/** id 尾段数字 (id 形如 `point-charge-3`) */
function tailNum(id: string): string {
    const tail = id.slice(id.lastIndexOf('-') + 1);
    if (!/^\d+$/.test(tail)) throw new Error(`测试 id 尾段非数字: ${id}`);
    return tail;
}
