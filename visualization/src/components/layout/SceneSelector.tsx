import { useSimulationStore } from '../../store/simulationStore';
import { SCENES } from '../../scenes/sceneRegistry';

export function SceneSelector() {
  const { currentScene, setScene } = useSimulationStore();

  return (
    <div className="scene-selector">
      {SCENES.map(scene => (
        <button
          key={scene.id}
          className={`scene-btn ${currentScene === scene.id ? 'active' : ''}`}
          onClick={() => setScene(scene.id)}
        >
          {scene.name}
        </button>
      ))}
    </div>
  );
}
