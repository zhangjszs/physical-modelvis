import { useEffect, useCallback } from 'react';
import { useSimulationStore } from '../store/simulationStore';
import { runSceneSimulation } from '../adapters/physicsCoreAdapter';
import { SCENES, getDefaultParams } from './sceneRegistry';
import { SimulationCanvas } from '../components/simulation/SimulationCanvas';
import { ParameterPanel } from '../components/controls/ParameterPanel';
import { PlaybackControls } from '../components/controls/PlaybackControls';
import { StateInspector } from '../components/simulation/StateInspector';
import { GraphPanel } from '../components/charts/GraphPanel';
import { DiagnosticsPanel } from '../components/diagnostics/DiagnosticsPanel';
import { FormulaPanel } from '../components/formula/FormulaPanel';
import { LayerToggle } from '../components/layout/LayerToggle';

export function ProjectileScene() {
  const {
    currentScene, parameters, sceneLoadVersion, setSimulationResult, setErrorMessage, ensureSceneParameters,
  } = useSimulationStore();

  const scene = SCENES.find(s => s.id === currentScene);

  // 初始化默认参数
  useEffect(() => {
    if (!scene) return;
    const defaults = getDefaultParams(currentScene);
    ensureSceneParameters(currentScene, defaults);
  }, [currentScene, ensureSceneParameters]);

  // 运行仿真
  const runSimulation = useCallback(() => {
    if (!scene) return;
    const { result, error } = runSceneSimulation(scene, parameters);
    if (error) {
      setErrorMessage(error);
      return;
    }
    if (result) {
      setSimulationResult(result);
    }
  }, [scene, parameters, setSimulationResult, setErrorMessage]);

  // 首次加载自动运行
  useEffect(() => {
    runSimulation();
  }, [currentScene, sceneLoadVersion]);

  return (
    <div className="scene-container">
      {/* 左侧参数 */}
      <div className="sidebar left-sidebar">
        <ParameterPanel onRunSimulation={runSimulation} />
        <LayerToggle />
      </div>

      {/* 中间主画布 */}
      <div className="main-area">
        <SimulationCanvas />
        <PlaybackControls />
      </div>

      {/* 右侧状态 */}
      <div className="sidebar right-sidebar">
        <StateInspector />
        <DiagnosticsPanel />
      </div>

      {/* 底部图表和公式 */}
      <div className="bottom-area">
        <GraphPanel />
        <FormulaPanel />
      </div>
    </div>
  );
}
