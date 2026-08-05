import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSimulationStore } from '../../store/simulationStore';
import { getSceneGuidance } from '../../scenes/guidance';

/** 实验导学面板 — 按当前场景提供分步引导 */
export function GuidancePanel() {
    const currentScene = useSimulationStore(s => s.currentScene);
    const [open, setOpen] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);

    const guidance = getSceneGuidance(currentScene);
    const total = guidance.steps.length;
    const step = guidance.steps[stepIndex] ?? guidance.steps[0]!;

    useEffect(() => {
        setStepIndex(0);
    }, [currentScene]);

    const goNext = () => setStepIndex(i => Math.min(i + 1, total - 1));
    const goPrev = () => setStepIndex(i => Math.max(i - 1, 0));

    return (
        <>
            <button
                className="btn btn-sm"
                onClick={() => setOpen(prev => !prev)}
                aria-expanded={open}
                aria-label="实验导学"
            >
                📖 导学
            </button>
            {open &&
                createPortal(
                    <div className="guidance-overlay" role="dialog" aria-modal="true" aria-label="实验导学">
                        <div className="guidance-panel">
                            <div className="guidance-header">
                                <h3 className="guidance-title">实验导学</h3>
                                <button className="guidance-close" onClick={() => setOpen(false)} aria-label="关闭导学">
                                    x
                                </button>
                            </div>
                            <p className="guidance-goal">{guidance.goal}</p>
                            <div className="guidance-progress" aria-hidden="true">
                                <div
                                    className="guidance-progress-bar"
                                    style={{ width: `${((stepIndex + 1) / total) * 100}%` }}
                                />
                            </div>
                            <div className="guidance-progress-label">
                                第 {stepIndex + 1} / {total} 步
                            </div>
                            <div className="guidance-step">
                                <div className="guidance-step-title">
                                    {stepIndex + 1}. {step.title}
                                </div>
                                <div className="guidance-step-row">
                                    <span className="guidance-step-tag">操作</span>
                                    <span className="guidance-step-text">{step.action}</span>
                                </div>
                                <div className="guidance-step-row">
                                    <span className="guidance-step-tag observe">观察</span>
                                    <span className="guidance-step-text">{step.observe}</span>
                                </div>
                                {step.paramFocus && step.paramFocus.length > 0 && (
                                    <div className="guidance-step-row">
                                        <span className="guidance-step-tag param">参数</span>
                                        <span className="guidance-step-text">
                                            {step.paramFocus.map(p => (
                                                <code key={p} className="guidance-param-chip">
                                                    {p}
                                                </code>
                                            ))}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div className="guidance-nav">
                                <button className="btn btn-sm" onClick={goPrev} disabled={stepIndex === 0}>
                                    ← 上一步
                                </button>
                                <button
                                    className="btn btn-sm"
                                    onClick={() => setStepIndex(0)}
                                    disabled={stepIndex === 0}
                                >
                                    ↺ 重新开始
                                </button>
                                <button
                                    className="btn btn-sm btn-primary"
                                    onClick={goNext}
                                    disabled={stepIndex === total - 1}
                                >
                                    下一步 →
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
        </>
    );
}
