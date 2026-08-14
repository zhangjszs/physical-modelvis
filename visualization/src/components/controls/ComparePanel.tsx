import { useEffect, useState } from 'react';
import { useSimulationStore } from '../../store/simulationStore';

const MAX_COMPARE = 8;
const MIN_COMPARE = 2;

/**
 * 参数对比实验面板。
 * 开启后,选定一个物理参数,设定范围与份数,自动生成多组仿真并叠加显示。
 */
export function ComparePanel() {
    const compareMode = useSimulationStore(s => s.compareMode);
    const compareConfig = useSimulationStore(s => s.compareConfig);
    const compareResults = useSimulationStore(s => s.compareResults);
    const toggleCompareMode = useSimulationStore(s => s.toggleCompareMode);
    const setCompareConfig = useSimulationStore(s => s.setCompareConfig);

    const currentScene = useSimulationStore(s => s.currentScene);
    const scenes = useSimulationStore(s => s.scenes);
    const scene = scenes.find(s => s.id === currentScene);

    // 本地 UI 状态（未确认前不写入 store）
    const [selectedParam, setSelectedParam] = useState('');
    const [rangeMin, setRangeMin] = useState(0);
    const [rangeMax, setRangeMax] = useState(100);
    const [count, setCount] = useState(5);

    // 场景切换或关闭对比模式时重置本地状态
    useEffect(() => {
        if (compareConfig) {
            setSelectedParam(compareConfig.paramName);
            setRangeMin(compareConfig.min);
            setRangeMax(compareConfig.max);
            setCount(compareConfig.count);
        } else if (scene && scene.parameters.length > 0) {
            const first = scene.parameters[0]!;
            setSelectedParam(first.name);
            setRangeMin(first.min);
            setRangeMax(first.max);
            setCount(5);
        }
    }, [scene, compareConfig, compareMode]);

    if (!scene) return null;

    const params = scene.parameters;
    const activeParam = params.find(p => p.name === selectedParam);

    const handleParamChange = (name: string) => {
        setSelectedParam(name);
        const p = params.find(x => x.name === name);
        if (p) {
            setRangeMin(p.min);
            setRangeMax(p.max);
        }
    };

    const handleGenerate = () => {
        if (!activeParam || count < MIN_COMPARE) return;
        const min = Math.min(rangeMin, rangeMax);
        const max = Math.max(rangeMin, rangeMax);
        // 越界值自动修正至有效范围，避免引擎求解失败
        const correctedMin = Math.max(activeParam.min, Math.min(min, activeParam.max));
        const correctedMax = Math.max(activeParam.min, Math.min(max, activeParam.max));
        setCompareConfig({
            paramName: activeParam.name,
            count,
            min: correctedMin,
            max: correctedMax
        });
    };

    const handleDisable = () => {
        setCompareConfig(null);
        toggleCompareMode();
    };

    return (
        <div className="compare-panel">
            <div className="compare-panel-head">
                <span className="panel-title">参数对比</span>
                <label className="compare-toggle">
                    <input type="checkbox" checked={compareMode} onChange={toggleCompareMode} />
                    <span>{compareMode ? '开启' : '关闭'}</span>
                </label>
            </div>

            {compareMode && (
                <div className="compare-panel-body">
                    <div className="compare-row">
                        <label className="compare-label">对比参数</label>
                        <select
                            className="compare-select"
                            value={selectedParam}
                            onChange={e => handleParamChange(e.target.value)}
                        >
                            {params.map(p => (
                                <option key={p.name} value={p.name}>
                                    {p.label} ({p.unit})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="compare-row">
                        <label className="compare-label">
                            范围: {rangeMin} ~ {rangeMax} {activeParam?.unit ?? ''}
                        </label>
                        <div className="compare-range-row">
                            <input
                                type="number"
                                className="compare-number"
                                value={rangeMin}
                                min={activeParam?.min}
                                max={activeParam?.max}
                                step={activeParam?.step ?? 1}
                                onChange={e => setRangeMin(Number(e.target.value))}
                            />
                            <span className="compare-range-sep">~</span>
                            <input
                                type="number"
                                className="compare-number"
                                value={rangeMax}
                                min={activeParam?.min}
                                max={activeParam?.max}
                                step={activeParam?.step ?? 1}
                                onChange={e => setRangeMax(Number(e.target.value))}
                            />
                        </div>
                    </div>

                    <div className="compare-row">
                        <label className="compare-label">份数: {count}</label>
                        <input
                            type="range"
                            className="compare-slider"
                            min={MIN_COMPARE}
                            max={MAX_COMPARE}
                            step={1}
                            value={count}
                            onChange={e => setCount(Number(e.target.value))}
                        />
                    </div>

                    <button className="btn btn-primary btn-sm compare-generate-btn" onClick={handleGenerate}>
                        生成对比
                    </button>

                    {compareResults.length > 0 && (
                        <div className="compare-legend">
                            <div className="compare-legend-title">图例</div>
                            {compareResults.map((entry, i) => (
                                <div key={i} className="compare-legend-item">
                                    <span className="compare-legend-color" style={{ backgroundColor: entry.color }} />
                                    <span className="compare-legend-label">
                                        {activeParam?.label ?? activeParam?.name} = {entry.paramValue}{' '}
                                        {activeParam?.unit ?? ''}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {compareMode && (
                        <button className="btn btn-sm btn-ghost compare-disable-btn" onClick={handleDisable}>
                            关闭对比模式
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
