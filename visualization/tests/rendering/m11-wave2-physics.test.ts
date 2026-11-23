/**
 * M11 Wave 2 (#179/#180/#181/#182) 2D/3D 与引擎单一真源一致性回归测试
 */
import * as THREE from 'three';
import { describe, it, expect, beforeAll } from 'vitest';
import { loadAllScenes, getSceneSync } from '../../src/scenes/sceneRegistry';
import { runSceneSimulation } from '../../src/adapters/physicsCoreAdapter';
import { drawLightControlSwitchScene } from '../../src/rendering/sensorApplicationScenes';
import { circuitRig } from '../../src/components/simulation3d/rigs/circuitRig';
import { createRecordingCanvas } from '../utils/canvasMock';

describe('M11 Wave 2: 2D/3D 与引擎单一真源回归', () => {
    beforeAll(async () => {
        await loadAllScenes();
    });

    describe('#179 light-control-switch: 2D/3D/引擎在 L=0/0.5/5/1000 状态严格一致', () => {
        it('场景移除无效 threshold 滑块，L=0/0.5/5/1000 2D 与 3D 消费引擎 maxValues 一致', () => {
            const sc = getSceneSync('light-control-switch')!;
            expect(sc).toBeDefined();
            expect(sc.parameters.some(p => p.name === 'threshold')).toBe(false);

            const cases = [
                { L: 0, expectOn: true },
                { L: 0.5, expectOn: true },
                { L: 5, expectOn: true },
                { L: 1000, expectOn: false }
            ];

            for (const { L, expectOn } of cases) {
                const params = { lightIntensity: L, Rfix: 10000, Esupply: 12, duration: 24 };
                const { result, error } = runSceneSimulation(sc, params);
                expect(error).toBeNull();
                const mv = result!.diagnostics.maxValues as Record<string, number>;
                expect(mv.lightOnFlag === 1).toBe(expectOn);
                expect(mv.criticalLux).toBeCloseTo(10, 4);

                // 2D 渲染验证
                const rec = createRecordingCanvas({ width: 900, height: 600 });
                drawLightControlSwitchScene({
                    ctx: rec.ctx,
                    width: 900,
                    height: 600,
                    isDark: true,
                    params,
                    simulationResult: result,
                    currentTime: 0
                });
                const joined = rec.texts.join(' ');
                expect(joined).toContain('L_crit');
                expect(joined).toContain(expectOn ? '灯亮' : '灯灭');
                expect(joined).toContain(expectOn ? 'NPN 导通' : 'NPN 截止');

                // 3D circuitRig 光控分支验证
                const threeScene = new THREE.Scene();
                const built = circuitRig.buildEquipment(threeScene, params, result);
                const h = built.handles as {
                    bulbGlow: THREE.PointLight;
                    bulbMesh: THREE.Mesh;
                    lightControlState?: {
                        vB: number;
                        criticalLux: number;
                        transistorOn: boolean;
                        lightOn: boolean;
                    };
                };
                expect(h.lightControlState).toBeDefined();
                expect(h.lightControlState!.lightOn).toBe(expectOn);
                expect(h.lightControlState!.transistorOn).toBe(expectOn);
                expect(h.lightControlState!.vB).toBeCloseTo(mv.vB as number, 6);
                expect(h.lightControlState!.criticalLux).toBeCloseTo(mv.criticalLux as number, 6);
                if (expectOn) {
                    expect(h.bulbGlow.intensity).toBeGreaterThan(0);
                    expect((h.bulbMesh.material as THREE.MeshStandardMaterial).emissiveIntensity).toBeGreaterThan(0);
                } else {
                    expect(h.bulbGlow.intensity).toBe(0);
                    expect((h.bulbMesh.material as THREE.MeshStandardMaterial).emissiveIntensity).toBe(0);
                }
            }
        });
    });
});
