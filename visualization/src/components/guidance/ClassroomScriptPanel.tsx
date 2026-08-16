import { useState } from 'react';
import { useSimulationStore } from '../../store/simulationStore';
import { getClassroomScript } from '../../scenes/classroomScripts';

const STEPS = [
    { id: 'goal', label: '1. 教学目标' },
    { id: 'demo', label: '2. 启发演示' },
    { id: 'compare', label: '3. 变量对比' },
    { id: 'quiz', label: '4. 预测提问' },
    { id: 'conclusion', label: '5. 课堂结论' }
] as const;

type StepId = (typeof STEPS)[number]['id'];

export function ClassroomScriptPanel() {
    const currentScene = useSimulationStore(s => s.currentScene);
    const applyPreset = useSimulationStore(s => s.applyPreset);
    const play = useSimulationStore(s => s.play);
    const compareMode = useSimulationStore(s => s.compareMode);
    const toggleCompareMode = useSimulationStore(s => s.toggleCompareMode);
    const setCompareConfig = useSimulationStore(s => s.setCompareConfig);

    const script = getClassroomScript(currentScene);
    const [currentStep, setCurrentStep] = useState<StepId>('goal');
    const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
    const [showExplanations, setShowExplanations] = useState<Record<number, boolean>>({});

    if (!script) {
        return (
            <div className="classroom-script-panel empty-script">
                <div className="panel-section-title">课堂教学脚本</div>
                <div className="empty-hint">当前实验暂无精编课堂脚本，可直接调节参数进行自由探索。</div>
            </div>
        );
    }

    const handleApplyDemo = () => {
        applyPreset(script.demoParams);
        play();
    };

    const handleStartCompare = () => {
        const { paramName, range, count } = script.compareFocus;
        setCompareConfig({
            paramName,
            min: range[0],
            max: range[1],
            count
        });
        if (!compareMode) {
            toggleCompareMode();
        }
    };

    const handleSelectOption = (quizIndex: number, optionIndex: number) => {
        setSelectedAnswers(prev => ({ ...prev, [quizIndex]: optionIndex }));
        setShowExplanations(prev => ({ ...prev, [quizIndex]: true }));
    };

    return (
        <div className="classroom-script-panel" aria-label="课堂教学脚本">
            <div className="script-header">
                <div className="script-badge">课堂教案</div>
                <h4 className="script-title">{script.title}</h4>
                <div className="script-subtitle">{script.subtitle}</div>
            </div>

            {/* 5 阶段步进导航 */}
            <div className="script-stepper">
                {STEPS.map(step => (
                    <button
                        key={step.id}
                        className={`stepper-btn ${currentStep === step.id ? 'active' : ''}`}
                        onClick={() => setCurrentStep(step.id)}
                    >
                        {step.label}
                    </button>
                ))}
            </div>

            {/* 内容区域 */}
            <div className="script-body">
                {currentStep === 'goal' && (
                    <div className="step-content step-goal">
                        <div className="content-label">【教学目标与难点】</div>
                        <p className="goal-text">{script.goal}</p>
                        <div className="step-actions">
                            <button className="btn btn-primary btn-sm" onClick={() => setCurrentStep('demo')}>
                                下一步：进入启发演示 →
                            </button>
                        </div>
                    </div>
                )}

                {currentStep === 'demo' && (
                    <div className="step-content step-demo">
                        <div className="content-label">【推荐演示方案】</div>
                        <p className="demo-note">{script.demoNote}</p>
                        <div className="preset-params-list">
                            {Object.entries(script.demoParams).map(([k, v]) => (
                                <span key={k} className="param-pill">
                                    {k} = {v}
                                </span>
                            ))}
                        </div>
                        <div className="step-actions">
                            <button className="btn btn-primary btn-sm" onClick={handleApplyDemo}>
                                ⚡ 一键载入黄金参数并播放
                            </button>
                            <button className="btn btn-secondary btn-sm" onClick={() => setCurrentStep('compare')}>
                                下一步：变量对比 →
                            </button>
                        </div>
                    </div>
                )}

                {currentStep === 'compare' && (
                    <div className="step-content step-compare">
                        <div className="content-label">【控制变量与对比探究】</div>
                        <p className="compare-desc">{script.compareFocus.description}</p>
                        <div className="compare-detail">
                            <span>
                                目标参数：<strong>{script.compareFocus.paramName}</strong>
                            </span>
                            <span>
                                取值范围：
                                <strong>
                                    [{script.compareFocus.range[0]}, {script.compareFocus.range[1]}]
                                </strong>
                            </span>
                            <span>
                                变体组数：<strong>{script.compareFocus.count} 组</strong>
                            </span>
                        </div>
                        <div className="step-actions">
                            <button className="btn btn-primary btn-sm" onClick={handleStartCompare}>
                                📊 一键发起参数对比
                            </button>
                            <button className="btn btn-secondary btn-sm" onClick={() => setCurrentStep('quiz')}>
                                下一步：预测提问 →
                            </button>
                        </div>
                    </div>
                )}

                {currentStep === 'quiz' && (
                    <div className="step-content step-quiz">
                        <div className="content-label">【课堂预测与概念诊断】</div>
                        {script.quizzes.map((quiz, qIdx) => {
                            const userAnswer = selectedAnswers[qIdx];
                            const isAnswered = userAnswer !== undefined;
                            const isCorrect = userAnswer === quiz.answer;

                            return (
                                <div key={qIdx} className="quiz-card">
                                    <div className="quiz-question">
                                        <span className="quiz-index">Q{qIdx + 1}.</span> {quiz.question}
                                    </div>
                                    <div className="quiz-options">
                                        {quiz.options.map((opt, optIdx) => {
                                            const isSelected = userAnswer === optIdx;
                                            const isTarget = quiz.answer === optIdx;
                                            let optionClass = 'quiz-option';
                                            if (isAnswered) {
                                                if (isSelected) {
                                                    optionClass += isCorrect ? ' correct' : ' wrong';
                                                } else if (isTarget) {
                                                    optionClass += ' correct-target';
                                                }
                                            }

                                            return (
                                                <button
                                                    key={optIdx}
                                                    className={optionClass}
                                                    onClick={() => handleSelectOption(qIdx, optIdx)}
                                                >
                                                    <span className="option-mark">
                                                        {String.fromCharCode(65 + optIdx)}.
                                                    </span>
                                                    <span>{opt}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {showExplanations[qIdx] && (
                                        <div className={`quiz-explanation ${isCorrect ? 'exp-correct' : 'exp-wrong'}`}>
                                            <div className="exp-badge">
                                                {isCorrect ? '✅ 回答正确' : '❌ 存在典型认知偏差'}
                                            </div>
                                            <div className="exp-text">{quiz.misconception}</div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        <div className="step-actions">
                            <button className="btn btn-primary btn-sm" onClick={() => setCurrentStep('conclusion')}>
                                下一步：总结结论 →
                            </button>
                        </div>
                    </div>
                )}

                {currentStep === 'conclusion' && (
                    <div className="step-content step-conclusion">
                        <div className="content-label">【核心知识与规律总结】</div>
                        <ul className="takeaways-list">
                            {script.conclusion.takeaways.map((item, idx) => (
                                <li key={idx}>{item}</li>
                            ))}
                        </ul>

                        <div className="content-label" style={{ marginTop: 12 }}>
                            【核心公式汇总】
                        </div>
                        <div className="formulas-box">
                            {script.conclusion.formulas.map((f, idx) => (
                                <div key={idx} className="formula-code">
                                    <code>{f}</code>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
