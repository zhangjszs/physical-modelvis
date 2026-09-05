import { useEffect, useRef } from 'react';
import { useSimulationStore } from '../../store/simulationStore';
import type { SceneParameter } from '../../types/visualization';

interface ParameterPanelProps {
    onRunSimulation: () => void;
}

export function ParameterPanel({ onRunSimulation }: ParameterPanelProps) {
    const currentScene = useSimulationStore(s => s.currentScene);
    const parameters = useSimulationStore(s => s.parameters);
    const setParameter = useSimulationStore(s => s.setParameter);
    const applyPreset = useSimulationStore(s => s.applyPreset);
    const scenes = useSimulationStore(s => s.scenes);
    const scene = scenes.find(s => s.id === currentScene);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

    if (!scene) return null;

    const liveUpdate = scene.liveUpdate ?? true;

    const handleChange = (param: SceneParameter, value: number) => {
        const clamped = Math.max(param.min, Math.min(param.max, value));
        setParameter(param.name, clamped);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            if (liveUpdate) {
                onRunSimulation();
            }
        }, 150);
    };

    const handleReset = () => {
        for (const p of scene.parameters) {
            setParameter(p.name, p.default);
        }
        if (liveUpdate) {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => onRunSimulation(), 150);
        }
    };

    const handleApplyPreset = (presetParams: Record<string, number>) => {
        applyPreset(presetParams);
        if (liveUpdate) {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => onRunSimulation(), 150);
        }
    };

    return (
        <div className="panel-section">
            <div className="panel-title">实验参数</div>
            {scene.presets && scene.presets.length > 0 && (
                <div className="preset-bar">
                    <div className="preset-label">预设</div>
                    <div className="preset-buttons">
                        {scene.presets.map(preset => (
                            <button
                                key={preset.id}
                                onClick={() => handleApplyPreset(preset.parameters)}
                                className="btn btn-preset"
                                title={preset.description}
                            >
                                {preset.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            {scene.parameters.map(param => (
                <div key={param.name} className="param-item">
                    <div className="param-header">
                        <span className="param-label">{param.label}</span>
                        <span className="param-unit">{param.unit}</span>
                    </div>
                    <div className="param-control">
                        <input
                            type="range"
                            min={param.min}
                            max={param.max}
                            step={param.step}
                            value={parameters[param.name] ?? param.default}
                            onChange={e => handleChange(param, parseFloat(e.target.value))}
                            className="param-slider"
                            aria-label={param.label}
                        />
                        <input
                            type="number"
                            min={param.min}
                            max={param.max}
                            step={param.step}
                            value={parameters[param.name] ?? param.default}
                            onChange={e => handleChange(param, parseFloat(e.target.value) || 0)}
                            className="param-input"
                            aria-label={`${param.label} 数值输入`}
                        />
                    </div>
                    <div className="param-desc">{param.description}</div>
                </div>
            ))}
            <div className="param-actions">
                <button onClick={handleReset} className="btn btn-secondary">
                    重置参数
                </button>
                {!liveUpdate && (
                    <button onClick={onRunSimulation} className="btn btn-primary">
                        运行仿真
                    </button>
                )}
            </div>
        </div>
    );
}
