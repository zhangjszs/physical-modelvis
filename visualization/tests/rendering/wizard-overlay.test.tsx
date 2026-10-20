/**
 * #136 实施单 γ — StepWizard / OverlayDrawer 组件测试
 *
 * 覆盖：StepWizard stepper 跳步/active + wizard 进度文案/边界禁用/推进；
 * OverlayDrawer portal 挂 body、open=false 不渲染、遮罩点击关闭、面板 stopPropagation、aria/dialog。
 */
import { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StepWizard } from '../../src/components/common/StepWizard';
import { OverlayDrawer } from '../../src/components/common/OverlayDrawer';

const THREE = [
    { id: 'a', label: 'A步' },
    { id: 'b', label: 'B步' },
    { id: 'c', label: 'C步' }
];

// ─────────────── StepWizard · stepper 模式 ───────────────

describe('StepWizard · stepper 模式', () => {
    it('渲染按钮组，activeIndex 项带 active class', () => {
        const { container } = render(
            <StepWizard
                mode="stepper"
                steps={THREE}
                activeIndex={1}
                onStepChange={() => {}}
                containerClassName="script-stepper"
                buttonClassName="stepper-btn"
            />
        );
        const btns = container.querySelectorAll('button');
        expect(btns).toHaveLength(3);
        expect(btns[1]!.className).toBe('stepper-btn active');
        expect(btns[0]!.className).toBe('stepper-btn');
    });

    it('点击某步按钮 → onStepChange 收到对应索引', () => {
        const onStepChange = vi.fn();
        render(<StepWizard mode="stepper" steps={THREE} activeIndex={0} onStepChange={onStepChange} />);
        fireEvent.click(screen.getByRole('button', { name: 'C步' }));
        expect(onStepChange).toHaveBeenCalledWith(2);
    });
});

// ─────────────── StepWizard · wizard 模式 ───────────────

describe('StepWizard · wizard 模式', () => {
    it('渲染进度文案"第 x / n 步"，首步禁用上一步/重新开始、末步禁用下一步', () => {
        const { rerender, container } = render(
            <StepWizard steps={THREE} activeIndex={0} onStepChange={() => {}} progressLabelClassName="progress-label" />
        );
        expect(container.querySelector('.progress-label')?.textContent).toBe('第 1 / 3 步');
        expect(screen.getByRole<HTMLButtonElement>('button', { name: '← 上一步' }).disabled).toBe(true);
        expect(screen.getByRole<HTMLButtonElement>('button', { name: '下一步 →' }).disabled).toBe(false);

        rerender(
            <StepWizard steps={THREE} activeIndex={2} onStepChange={() => {}} progressLabelClassName="progress-label" />
        );
        expect(container.querySelector('.progress-label')?.textContent).toBe('第 3 / 3 步');
        expect(screen.getByRole<HTMLButtonElement>('button', { name: '下一步 →' }).disabled).toBe(true);
        expect(screen.getByRole<HTMLButtonElement>('button', { name: '← 上一步' }).disabled).toBe(false);
    });

    it('点击下一步 → onStepChange 收到 idx+1；renderStep 用钳位后索引渲染内容', () => {
        const onStepChange = vi.fn();
        const renderStep = vi.fn((_s: { id: string; label: string }, i: number) => (
            <div data-testid="body">body-{i}</div>
        ));
        render(<StepWizard steps={THREE} activeIndex={0} onStepChange={onStepChange} renderStep={renderStep} />);
        expect(screen.getByTestId('body').textContent).toBe('body-0');
        fireEvent.click(screen.getByRole<HTMLButtonElement>('button', { name: '下一步 →' }));
        expect(onStepChange).toHaveBeenCalledWith(1);
    });

    it('activeIndex 越界被钳位到 [0, n-1]', () => {
        render(
            <StepWizard
                steps={THREE}
                activeIndex={99}
                onStepChange={() => {}}
                progressLabelClassName="progress-label"
            />
        );
        expect(document.querySelector('.progress-label')?.textContent).toBe('第 3 / 3 步');
        expect(screen.getByRole<HTMLButtonElement>('button', { name: '下一步 →' }).disabled).toBe(true);
    });

    it('空 steps → 不渲染（不崩、无除零）', () => {
        const { container } = render(<StepWizard steps={[]} activeIndex={0} onStepChange={() => {}} />);
        expect(container.firstChild).toBeNull();
    });
});

// ─────────────── OverlayDrawer ───────────────

describe('OverlayDrawer', () => {
    it('open=false → body 内不渲染 dialog', () => {
        render(
            <OverlayDrawer open={false} onClose={() => {}} title="标题" overlayClassName="ov">
                <p>x</p>
            </OverlayDrawer>
        );
        expect(screen.queryByRole('dialog')).toBeNull();
        expect(document.querySelector('.ov')).toBeNull();
    });

    it('open=true → portal 挂 document.body（非 render 容器内）', () => {
        const { container } = render(
            <OverlayDrawer open onClose={() => {}} title="标题" overlayClassName="ov" panelClassName="panel">
                <p className="child">内容</p>
            </OverlayDrawer>
        );
        // render 容器内找不到（portal 到 body），但 document.body 能找到
        expect(container.querySelector('.ov')).toBeNull();
        expect(document.body.querySelector('.ov')).not.toBeNull();
        expect(screen.getByText('内容')).toBeDefined();
    });

    it('遮罩(dialog)点击 → onClose；面板点击 stopPropagation 不触发 onClose', () => {
        const onClose = vi.fn();
        render(
            <OverlayDrawer open onClose={onClose} title="标题" overlayClassName="ov" panelClassName="panel">
                <p>x</p>
            </OverlayDrawer>
        );
        fireEvent.click(screen.getByRole('dialog'));
        expect(onClose).toHaveBeenCalledTimes(1);
        fireEvent.click(document.querySelector('.panel') as HTMLElement);
        expect(onClose).toHaveBeenCalledTimes(1); // 未增加
    });

    it('title 作为 dialog 可访问名；关闭按钮可用 closeAriaLabel 且触发 onClose', () => {
        const onClose = vi.fn();
        render(
            <OverlayDrawer
                open
                onClose={onClose}
                title="实验导学"
                closeClassName="guidance-close"
                closeText="x"
                closeAriaLabel="关闭导学"
            >
                <p>x</p>
            </OverlayDrawer>
        );
        expect(screen.getByRole('dialog', { name: '实验导学' })).toBeDefined();
        fireEvent.click(screen.getByRole('button', { name: '关闭导学' }));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('headerBadge 存在时徽标与标题同处内层 div（复刻 formula-drawer-head 结构）', () => {
        render(
            <OverlayDrawer
                open
                onClose={() => {}}
                title="公式推导"
                headerBadge={<span>按需讲解</span>}
                headerClassName="formula-drawer-head"
            >
                <p>x</p>
            </OverlayDrawer>
        );
        const head = document.querySelector('.formula-drawer-head');
        expect(head?.querySelector('span')?.textContent).toBe('按需讲解');
        expect(head?.querySelector('h3')?.textContent).toBe('公式推导');
    });

    it('按下 Escape 键 → 调用 onClose 并阻止冒泡', () => {
        const onClose = vi.fn();
        render(
            <OverlayDrawer open onClose={onClose} title="Esc测试">
                <p>内容</p>
            </OverlayDrawer>
        );
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('打开后初始焦点置于面板内（优先关闭按钮）', () => {
        render(
            <OverlayDrawer
                open
                onClose={() => {}}
                title="实验导学"
                closeClassName="guidance-close"
                closeText="x"
                closeAriaLabel="关闭导学"
            >
                <p>内容</p>
            </OverlayDrawer>
        );
        const closeBtn = screen.getByRole('button', { name: '关闭导学' });
        expect(document.activeElement).toBe(closeBtn);
    });

    it('关闭后将焦点可靠归还给先前触发元素', () => {
        function DrawerTriggerHarness() {
            const [open, setOpen] = useState(false);
            return (
                <div>
                    <button id="trigger-btn" onClick={() => setOpen(true)}>
                        打开抽屉
                    </button>
                    <OverlayDrawer open={open} onClose={() => setOpen(false)} title="抽屉归还测试">
                        <p>抽屉内部</p>
                    </OverlayDrawer>
                </div>
            );
        }

        render(<DrawerTriggerHarness />);
        const triggerBtn = screen.getByRole('button', { name: '打开抽屉' });
        triggerBtn.focus();
        expect(document.activeElement).toBe(triggerBtn);

        fireEvent.click(triggerBtn);
        expect(screen.getByRole('dialog', { name: '抽屉归还测试' })).toBeDefined();
        expect(document.activeElement).not.toBe(triggerBtn);

        fireEvent.keyDown(document, { key: 'Escape' });
        expect(screen.queryByRole('dialog')).toBeNull();
        expect(document.activeElement).toBe(triggerBtn);
    });

    it('Tab / Shift+Tab 在面板内循环约束（两端首尾回绕，不逃出 dialog）', () => {
        render(
            <OverlayDrawer open onClose={() => {}} title="约束测试" closeAriaLabel="关闭面板">
                <input data-testid="field-1" />
                <button data-testid="field-2">提交</button>
            </OverlayDrawer>
        );
        const closeBtn = screen.getByRole('button', { name: '关闭面板' });
        const inputField = screen.getByTestId('field-1');
        const submitBtn = screen.getByTestId('field-2');

        // 初始聚焦在首项关闭按钮
        expect(document.activeElement).toBe(closeBtn);

        // 在首项按 Shift+Tab → 回绕至末项
        fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
        expect(document.activeElement).toBe(submitBtn);

        // 在末项按 Tab → 回绕至首项
        fireEvent.keyDown(document, { key: 'Tab' });
        expect(document.activeElement).toBe(closeBtn);

        // 焦点脱出至外部时按 Tab → 抓回首项
        inputField.focus();
        expect(document.activeElement).toBe(inputField);
        inputField.blur();
        expect(document.activeElement).toBe(document.body);
        fireEvent.keyDown(document, { key: 'Tab' });
        expect(document.activeElement).toBe(closeBtn);
    });
});
