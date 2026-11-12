import { type ReactNode } from 'react';

/** 步骤元信息：id 稳定标识（stepper key），label 按钮文案 */
export interface StepMeta {
    id: string;
    label: string;
}

/**
 * 步骤导航骨架（#136 γ · docs/composition-reuse-boundary.md §3.4）。两种模式：
 * - 'wizard'：进度条 + "第 x / n 步" + 上一步/重新开始/下一步（GuidancePanel 现行为）；
 * - 'stepper'：按钮组直接跳步（ClassroomScriptPanel 现行为），步内容由调用方自行渲染。
 * 各调用点用 className props 复刻原 class 防视觉回归；步内容由 renderStep 传入。
 */
export interface StepWizardProps {
    steps: StepMeta[];
    activeIndex: number;
    onStepChange: (index: number) => void;
    /** 渲染当前步内容（wizard 模式用；index 为安全钳位后的当前步） */
    renderStep?: (step: StepMeta, index: number) => ReactNode;
    /** 导航形态，默认 wizard */
    mode?: 'wizard' | 'stepper';
    showProgress?: boolean;
    prevLabel?: string;
    nextLabel?: string;
    resetLabel?: string;
    containerClassName?: string;
    buttonClassName?: string;
    activeClassName?: string;
    progressClassName?: string;
    progressBarClassName?: string;
    progressLabelClassName?: string;
    navClassName?: string;
    navButtonClassName?: string;
    nextButtonClassName?: string;
}

export function StepWizard(props: StepWizardProps) {
    const {
        steps,
        activeIndex,
        onStepChange,
        renderStep,
        mode = 'wizard',
        showProgress = true,
        prevLabel = '← 上一步',
        nextLabel = '下一步 →',
        resetLabel = '↺ 重新开始',
        containerClassName,
        buttonClassName,
        activeClassName = 'active',
        progressClassName,
        progressBarClassName,
        progressLabelClassName,
        navClassName,
        navButtonClassName = 'btn btn-sm',
        nextButtonClassName = 'btn btn-sm btn-primary'
    } = props;

    const total = steps.length;
    if (total === 0) return null;

    const idx = Math.min(Math.max(activeIndex, 0), total - 1);
    const atFirst = idx === 0;
    const atLast = idx === total - 1;

    if (mode === 'stepper') {
        return (
            <div className={containerClassName}>
                {steps.map((step, i) => (
                    <button
                        key={step.id}
                        type="button"
                        className={i === idx ? `${buttonClassName} ${activeClassName}` : buttonClassName}
                        onClick={() => onStepChange(i)}
                    >
                        {step.label}
                    </button>
                ))}
            </div>
        );
    }

    return (
        <>
            {showProgress && (
                <>
                    <div className={progressClassName} aria-hidden="true">
                        <div className={progressBarClassName} style={{ width: `${((idx + 1) / total) * 100}%` }} />
                    </div>
                    <div className={progressLabelClassName}>
                        第 {idx + 1} / {total} 步
                    </div>
                </>
            )}
            {renderStep?.(steps[idx]!, idx)}
            <div className={navClassName}>
                <button
                    type="button"
                    className={navButtonClassName}
                    onClick={() => onStepChange(atFirst ? 0 : idx - 1)}
                    disabled={atFirst}
                >
                    {prevLabel}
                </button>
                <button type="button" className={navButtonClassName} onClick={() => onStepChange(0)} disabled={atFirst}>
                    {resetLabel}
                </button>
                <button
                    type="button"
                    className={nextButtonClassName}
                    onClick={() => onStepChange(atLast ? idx : idx + 1)}
                    disabled={atLast}
                >
                    {nextLabel}
                </button>
            </div>
        </>
    );
}
