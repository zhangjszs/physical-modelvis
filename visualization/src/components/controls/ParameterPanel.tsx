import { useEffect, useRef } from 'react';
import { useSimulationStore } from '../../store/simulationStore';
import { SCENES } from '../../scenes/sceneRegistry';
import type { SceneParameter } from '../../types/visualization';

interface ParameterPanelProps {
    onRunSimulation: () => void;
}

export function ParameterPanel({ onRunSimulation }: ParameterPanelProps) {
    const { currentScene, parameters, setParameter } = useSimulationStore();
    const scene = SCENES.find(s => s.id === currentScene);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

    if (!scene) return null;

    const handleChange = (param: SceneParameter, value: number) => {
        const clamped = Math.max(param.min, Math.min(param.max, value));
        setParameter(param.name, clamped);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            onRunSimulation();
        }, 300);
    };

    const handleReset = () => {
        for (const p of scene.parameters) {
            setParameter(p.name, p.default);
        }
    };

    return (
        <div className="panel-section">
            <div className="panel-title">实验参数</div>
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
                        />
                        <input
                            type="number"
                            min={param.min}
                            max={param.max}
                            step={param.step}
                            value={parameters[param.name] ?? param.default}
                            onChange={e => handleChange(param, parseFloat(e.target.value) || 0)}
                            className="param-input"
                        />
                    </div>
                    <div className="param-desc">{param.description}</div>
                </div>
            ))}
            <div className="param-actions">
                <button onClick={handleReset} className="btn btn-secondary">
                    重置参数
                </button>
                <button onClick={onRunSimulation} className="btn btn-primary">
                    运行仿真
                </button>
            </div>
        </div>
    );
}
