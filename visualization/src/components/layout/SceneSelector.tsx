import { useState } from 'react';
import { useSimulationStore } from '../../store/simulationStore';

/** 场景分类定义 */
const SCENE_CATEGORIES = [
  {
    label: '力学',
    scenes: [
      { id: 'projectile', name: '平抛/斜抛' },
      { id: 'free-fall', name: '自由落体' },
      { id: 'uniform-accelerated', name: '匀变速直线' },
      { id: 'circular-motion', name: '圆周运动' },
      { id: 'collision', name: '碰撞' },
      { id: 'spring', name: '弹簧振子' },
      { id: 'inclined-plane', name: '斜面运动' },
      { id: 'air-track', name: '气垫导轨' },
    ],
  },
  {
    label: '电磁学',
    scenes: [
      { id: 'electric-field', name: '匀强电场' },
      { id: 'magnetic-field', name: '匀强磁场' },
      { id: 'em-combined', name: '电磁复合场' },
    ],
  },
  {
    label: '相互作用——力',
    scenes: [
      { id: 'hooke-law', name: '胡克定律 F=kx' },
      { id: 'sliding-friction', name: '滑动摩擦力 f=μN' },
      { id: 'force-composition', name: '力的合成 (平行四边形定则)' },
      { id: 'newton-third-law', name: '牛顿第三定律' },
    ],
  },
];

export function SceneSelector() {
  const { currentScene, setScene } = useSimulationStore();
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  // 找到当前选中场景所在的分类
  const activeCategory = SCENE_CATEGORIES.find(cat =>
    cat.scenes.some(s => s.id === currentScene),
  );

  return (
    <div className="scene-selector">
      {SCENE_CATEGORIES.map(cat => {
        const isActive = activeCategory?.label === cat.label;
        const isOpen = openCategory === cat.label;

        return (
          <div key={cat.label} className="scene-category">
            <button
              className={`scene-cat-btn ${isActive ? 'active' : ''}`}
              onClick={() => setOpenCategory(isOpen ? null : cat.label)}
            >
              {cat.label}
              <span className="scene-cat-arrow">{isOpen ? '▴' : '▾'}</span>
            </button>
            {isOpen && (
              <div className="scene-dropdown">
                <div className="scene-dropdown-label">{cat.label}</div>
                {cat.scenes.map(scene => (
                  <button
                    key={scene.id}
                    className={`scene-dropdown-item ${currentScene === scene.id ? 'active' : ''}`}
                    onClick={() => { setScene(scene.id); setOpenCategory(null); }}
                  >
                    {scene.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
