import { useState } from 'react';
import { useSimulationStore } from '../../store/simulationStore';
import { SCENES } from '../../scenes/sceneRegistry';

/** 场景分类 — 按 6 大教材分类 + 综合演示 */
const SCENE_CATEGORIES = [
  { label: '必修一 (力学基础)', ids: ['uniform-linear','uniform-accelerated','projectile','free-fall','inclined-plane','air-track','ticker-timer','reaction-time','galileo-incline','inertia','overweight','center-of-gravity','micro-deformation','vernier-caliper','micrometer','multimeter','force-composition','newton-third-law','sliding-friction','hooke-law','newton-second-law','spring'] },
  { label: '必修二 (曲线运动/能量)', ids: ['curve-velocity-direction','curve-condition','motion-commission','transmission-belt','vertical-circle','centrifugal','circular-motion','collision','orbital','cavendish','moon-earth-test','projectile-horizontal','projectile-angular'] },
  { label: '必修三 (电磁学)', ids: ['electric-field','magnetic-field','circuit','capacitor-charge','parallel-plate-capacitor','resistance-law','load-voltage','electrostatic-induction','electroscope','coulomb-force-explore','electrostatic-shielding','faraday-cup','ampere-force','em-wave-hertz'] },
  { label: '选必一 (振动/波/光)', ids: ['simple-pendulum','mechanical-wave','refraction','interference','momentum','sound-waveform','water-diffraction','sound-interference','doppler','thin-film','hologram','single-slit','diffraction-grating','polarization','forced-vibration','resonance','double-pendulum','projectile-collision'] },
  { label: '选必二 (电磁感应/传感器)', ids: ['magnetic-force','em-induction','ac-current','lc-oscillator','current-balance','eddy-current','em-damping','mutual-inductance','self-inductance','em-wave-communication','em-spectrum','hall-effect','reed-switch','thermistor','photoresistor','strain-gauge','security-alarm','light-control-switch'] },
  { label: '选必三 (热学/量子/原子)', ids: ['gas-law','photoelectric','bohr-model','radioactive-decay','diffusion','brownian-motion','molecular-force','liquid-mixing','oil-film','melting-curve','surface-tension','capillary','wetting','liquid-crystal','joule-mechanical','joule-electrical','adiabatic-compression','heat-transfer','energy-transformation','perpetuum-mobile','heat-direction','alpha-scattering','black-body','electron-diffraction','radiation-deflection','decay-statistics','cosmic-ray','neutron-discovery','fission-chain'] },
];

export function SceneSelector() {
  const { currentScene, setScene } = useSimulationStore();
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  const sceneMap = new Map(SCENES.map(s => [s.id, s.name]));

  const activeCategory = SCENE_CATEGORIES.find(cat =>
    cat.ids.includes(currentScene),
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
                {cat.ids.map(id => (
                  <button
                    key={id}
                    className={`scene-dropdown-item ${currentScene === id ? 'active' : ''}`}
                    onClick={() => { setScene(id); setOpenCategory(null); }}
                  >
                    {sceneMap.get(id) ?? id}
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
