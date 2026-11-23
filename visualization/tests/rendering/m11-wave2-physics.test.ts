/**
 * M11 Wave 2 (#179/#180/#181/#182) 2D/3D 与引擎单一真源一致性回归测试
 */
import * as THREE from 'three';
import { describe, it, expect, beforeAll } from 'vitest';
import { loadAllScenes, getSceneSync } from '../../src/scenes/sceneRegistry';
import { runSceneSimulation } from '../../src/adapters/physicsCoreAdapter';
import { drawLightControlSwitchScene } from '../../src/rendering/sensorApplicationScenes';
import { drawElectrostaticInductionScene } from '../../src/rendering/electrostaticFieldScenes';
import { circuitRig } from '../../src/components/simulation3d/rigs/circuitRig';
import { electroscopeRig } from '../../src/components/simulation3d/rigs/electroscopeRig';
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

    describe('#180 electrostatic-induction: 2D/3D 消费引擎等量异号感应电荷与有界箔片张角', () => {
        it('默认正电荷、负电荷与零电量下 2D 与 3D 同源消费引擎 q_near/q_far/theta_deg', () => {
            const sc = getSceneSync('electrostatic-induction')!;
            expect(sc).toBeDefined();

            for (const chargeC of [1, -2, 0]) {
                const params = { chargeC, separation: 2, distanceAC: 10, duration: 5 };
                const { result, error } = runSceneSimulation(sc, params);
                expect(error).toBeNull();
                const mv = result!.diagnostics.maxValues as Record<string, number>;
                const qNearUc = mv.qNear_uC!;
                const qFarUc = mv.qFar_uC!;
                const thetaDeg = mv.theta_deg!;
                expect(Number.isFinite(qNearUc)).toBe(true);
                expect(Number.isFinite(qFarUc)).toBe(true);
                expect(Number.isFinite(thetaDeg)).toBe(true);
                expect(Math.abs(qNearUc + qFarUc)).toBeLessThan(1e-12);
                expect(thetaDeg).toBeGreaterThanOrEqual(0);
                expect(thetaDeg).toBeLessThan(90);

                // 2D 渲染消费引擎真源
                const rec = createRecordingCanvas({ width: 900, height: 600 });
                drawElectrostaticInductionScene({
                    ctx: rec.ctx,
                    width: 900,
                    height: 600,
                    isDark: true,
                    params,
                    simulationResult: result,
                    currentTime: 0
                });
                const joined = rec.texts.join(' ');
                expect(joined).toContain(`${thetaDeg.toFixed(1)}°`);
                expect(joined).toContain('净电荷 = 0.000 μC');

                // 3D electroscopeRig 感应分支消费引擎真源
                const threeScene = new THREE.Scene();
                const built = electroscopeRig.buildEquipment(threeScene, params, result);
                const h = built.handles as {
                    foilL: THREE.Mesh;
                    foilR: THREE.Mesh;
                    inductionState?: { qNear_uC: number; qFar_uC: number; thetaDeg: number };
                };
                expect(h.inductionState).toBeDefined();
                expect(h.inductionState!.qNear_uC).toBeCloseTo(qNearUc, 6);
                expect(h.inductionState!.qFar_uC).toBeCloseTo(qFarUc, 6);
                expect(Math.abs(h.inductionState!.qNear_uC + h.inductionState!.qFar_uC)).toBeLessThan(1e-12);
                expect(h.inductionState!.thetaDeg).toBeCloseTo(thetaDeg, 6);
                const expectedRad = (thetaDeg * Math.PI) / 180;
                expect(h.foilL.rotation.z).toBeCloseTo(expectedRad, 5);
                expect(h.foilR.rotation.z).toBeCloseTo(-expectedRad, 5);
            }
        });
    });
});
