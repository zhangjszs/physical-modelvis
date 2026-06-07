import { useMemo, useState } from 'react';
import { analyzePhysicsProblem, type ProblemAnalysis } from '../../analysis/problemAnalyzer';
import { useSimulationStore } from '../../store/simulationStore';

const EXAMPLE_PROBLEM = '从距地面 20m 高处以 10m/s 的速度水平抛出一小球，取 g=9.8m/s²，分析小球运动轨迹。';

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const level = confidence >= 0.75 ? 'high' : confidence >= 0.55 ? 'medium' : 'low';
  const label = confidence >= 0.75 ? '高' : confidence >= 0.55 ? '中' : '低';
  return <span className={`analysis-confidence ${level}`}>匹配度 {label} {(confidence * 100).toFixed(0)}%</span>;
}

function AnalysisSummary({ analysis }: { analysis: ProblemAnalysis }) {
  return (
    <div className="analysis-result">
      <div className="analysis-head">
        <div>
          <div className="analysis-scene">{analysis.sceneName}</div>
          <div className="analysis-model">场景 ID: {analysis.sceneId}</div>
        </div>
        <ConfidenceBadge confidence={analysis.confidence} />
      </div>

      {analysis.extracted.length > 0 && (
        <div className="analysis-block">
          <div className="analysis-block-title">识别量</div>
          <div className="analysis-chip-list">
            {analysis.extracted.map((item, index) => (
              <span className="analysis-chip" key={`${item.label}-${index}`}>
                {item.label}: {Number(item.value.toFixed(6))}{item.unit}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="analysis-block">
        <div className="analysis-block-title">搭景参数</div>
        <div className="analysis-param-grid">
          {Object.entries(analysis.parameters).map(([key, value]) => (
            <div className="analysis-param" key={key}>
              <span>{key}</span>
              <strong>{Number(value.toFixed(6))}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="analysis-block">
        <div className="analysis-block-title">公式</div>
        <div className="analysis-list">
          {analysis.formulas.map(formula => <div key={formula}>{formula}</div>)}
        </div>
      </div>

      <div className="analysis-block">
        <div className="analysis-block-title">验证</div>
        <div className="analysis-list">
          {analysis.checks.map(check => <div key={check}>{check}</div>)}
        </div>
      </div>

      {analysis.warnings.length > 0 && (
        <div className="analysis-block warning">
          <div className="analysis-block-title">提醒</div>
          <div className="analysis-list">
            {analysis.warnings.map(warning => <div key={warning}>{warning}</div>)}
          </div>
        </div>
      )}

      <details className="analysis-assumptions">
        <summary>默认假设</summary>
        <div className="analysis-list">
          {analysis.assumptions.map(item => <div key={item}>{item}</div>)}
        </div>
      </details>
    </div>
  );
}

export function ProblemBuilderPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState(EXAMPLE_PROBLEM);
  const [analysis, setAnalysis] = useState<ProblemAnalysis | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const setSceneWithParameters = useSimulationStore(s => s.setSceneWithParameters);

  const canAnalyze = useMemo(() => text.trim().length >= 4, [text]);

  const analyze = () => {
    if (!canAnalyze) {
      setStatus('请输入完整题目。');
      return;
    }
    const next = analyzePhysicsProblem(text);
    setAnalysis(next);
    setStatus(null);
  };

  const loadScene = () => {
    if (!analysis) return;
    setSceneWithParameters(analysis.sceneId, analysis.parameters);
    setStatus('已加载到可视化场景。');
  };

  if (!isOpen) {
    return (
      <button className="btn btn-sm analysis-open-btn" onClick={() => setIsOpen(true)}>
        题目搭景
      </button>
    );
  }

  return (
    <div className="problem-overlay" onClick={() => setIsOpen(false)}>
      <div className="problem-modal" onClick={e => e.stopPropagation()}>
        <button className="problem-close" onClick={() => setIsOpen(false)}>&times;</button>
        <div className="problem-title">题目分析与自动搭景</div>

        <textarea
          className="problem-textarea"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="粘贴高中物理题目..."
        />

        <div className="problem-actions">
          <button className="btn btn-secondary" onClick={() => { setText(EXAMPLE_PROBLEM); setAnalysis(null); setStatus(null); }}>
            示例
          </button>
          <button className="btn btn-primary" onClick={analyze} disabled={!canAnalyze}>
            分析题目
          </button>
          <button className="btn btn-primary" onClick={loadScene} disabled={!analysis}>
            加载场景
          </button>
        </div>

        {status && <div className="analysis-status">{status}</div>}
        {analysis && <AnalysisSummary analysis={analysis} />}
      </div>
    </div>
  );
}
