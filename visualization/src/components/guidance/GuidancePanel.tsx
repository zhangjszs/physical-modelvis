import { useEffect, useState } from 'react';
import { useSimulationStore } from '../../store/simulationStore';
import { getSceneGuidance } from '../../scenes/guidance';
import { OverlayDrawer } from '../common/OverlayDrawer';
import { StepWizard } from '../common/StepWizard';

/**
 * 实验导学面板 — 按当前场景提供分步引导。
 *
 * #136 γ：浮层外壳改调 `OverlayDrawer`（portal 挂 body + 遮罩点击关闭），
 * 步骤导航改调 `StepWizard`（wizard 模式：进度条 + 上一步/重新开始/下一步）；
 * 各 className 保持原 guidance-* 以便样式与 Playwright 冒烟零回归。
 */
export function GuidancePanel() {
    const currentScene = useSimulationStore(s => s.currentScene);
    const [open, setOpen] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);

    const guidance = getSceneGuidance(currentScene);

    useEffect(() => {
        setStepIndex(0);
    }, [currentScene]);

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
            <OverlayDrawer
                open={open}
                onClose={() => setOpen(false)}
                title="实验导学"
                overlayClassName="guidance-overlay"
                panelClassName="guidance-panel"
                headerClassName="guidance-header"
                titleClassName="guidance-title"
                closeClassName="guidance-close"
                closeText="x"
                closeAriaLabel="关闭导学"
            >
                <p className="guidance-goal">{guidance.goal}</p>
                <StepWizard
                    steps={guidance.steps.map((s, i) => ({ id: `${currentScene}-${i}`, label: s.title }))}
                    activeIndex={stepIndex}
                    onStepChange={setStepIndex}
                    mode="wizard"
                    prevLabel="← 上一步"
                    nextLabel="下一步 →"
                    resetLabel="↺ 重新开始"
                    progressClassName="guidance-progress"
                    progressBarClassName="guidance-progress-bar"
                    progressLabelClassName="guidance-progress-label"
                    navClassName="guidance-nav"
                    navButtonClassName="btn btn-sm"
                    nextButtonClassName="btn btn-sm btn-primary"
                    renderStep={(_step, i) => {
                        const st = guidance.steps[i] ?? guidance.steps[0]!;
                        return (
                            <div className="guidance-step">
                                <div className="guidance-step-title">
                                    {i + 1}. {st.title}
                                </div>
                                <div className="guidance-step-row">
                                    <span className="guidance-step-tag">操作</span>
                                    <span className="guidance-step-text">{st.action}</span>
                                </div>
                                <div className="guidance-step-row">
                                    <span className="guidance-step-tag observe">观察</span>
                                    <span className="guidance-step-text">{st.observe}</span>
                                </div>
                                {st.paramFocus && st.paramFocus.length > 0 && (
                                    <div className="guidance-step-row">
                                        <span className="guidance-step-tag param">参数</span>
                                        <span className="guidance-step-text">
                                            {st.paramFocus.map(p => (
                                                <code key={p} className="guidance-param-chip">
                                                    {p}
                                                </code>
                                            ))}
                                        </span>
                                    </div>
                                )}
                            </div>
                        );
                    }}
                />
            </OverlayDrawer>
        </>
    );
}
