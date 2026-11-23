/**
 * M11 Wave 2 (#179/#180/#181/#182) 2D/3D 与引擎单一真源一致性回归测试
 */
import * as THREE from 'three';
import { describe, it, expect, beforeAll } from 'vitest';
import { loadAllScenes, getSceneSync } from '../../src/scenes/sceneRegistry';
import { runSceneSimulation } from '../../src/adapters/physicsCoreAdapter';
import { drawLightControlSwitchScene } from '../../src/rendering/sensorApplicationScenes';
import { drawElectrostaticInductionScene } from '../../src/rendering/electrostaticFieldScenes';
import { drawInterferenceScene, drawThinFilmScene } from '../../src/rendering/waveOptScenes';
import { circuitRig } from '../../src/components/simulation3d/rigs/circuitRig';
import { electroscopeRig } from '../../src/components/simulation3d/rigs/electroscopeRig';
import { waveOpticsRig } from '../../src/components/simulation3d/rigs/waveOpticsRig';
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

    describe('#181 interference: 单缝前插透明薄片 2D/3D 条纹平移同源回归', () => {
        it('预设已改名「单缝加薄片」，2D 绘制薄片并输出 Δx，3D fringeGroup 同向平移且 Δy 不变', () => {
            const sc = getSceneSync('interference')!;
            expect(sc).toBeDefined();
            const filmPreset = sc.presets?.find(p => p.id === 'thin-film');
            expect(filmPreset?.name).toBe('单缝加薄片');

            const baseParams = { wavelength: 600, slitSep: 0.5, screenDist: 2.0, filmThickness: 0, filmN: 1.38 };
            const filmParams = { wavelength: 600, slitSep: 0.5, screenDist: 2.0, filmThickness: 0.5, filmN: 1.38 };
            const baseSim = runSceneSimulation(sc, baseParams);
            const filmSim = runSceneSimulation(sc, filmParams);
            expect(baseSim.error).toBeNull();
            expect(filmSim.error).toBeNull();

            const mvFilm = filmSim.result!.diagnostics.maxValues as Record<string, number>;
            expect(mvFilm.deltaYmm).toBeCloseTo(2.4, 5);
            expect(mvFilm.fringeShiftMm).toBeCloseTo(0.76, 5);

            // 2D 渲染检查：无旧错误文案，展示薄片与 Δx=+0.76mm
            const recFilm = createRecordingCanvas({ width: 900, height: 600 });
            drawInterferenceScene({
                ctx: recFilm.ctx,
                width: 900,
                height: 600,
                isDark: true,
                params: filmParams,
                simulationResult: filmSim.result,
                currentTime: 0
            });
            const joined = recFilm.texts.join(' ');
            expect(joined).not.toContain('薄膜干涉叠加');
            expect(joined).toContain('薄片 n=1.38');
            expect(joined).toContain('0.76mm');

            // 3D waveOpticsRig 检查：无薄片隐藏薄片且中央条纹 y=0；有薄片显示薄片且中央条纹向 +y 平移
            const sceneBase = new THREE.Scene();
            const builtBase = waveOpticsRig.buildEquipment(sceneBase, baseParams, baseSim.result);
            const hBase = builtBase.handles as {
                filmSlab: THREE.Mesh;
                fringeGroup: THREE.Group;
                interferenceState?: { deltaYmm: number; fringeShiftMm: number; hasFilm: boolean; shiftY: number };
            };
            expect(hBase.filmSlab.visible).toBe(false);
            expect(hBase.interferenceState?.hasFilm).toBe(false);
            expect(hBase.fringeGroup.children[7]!.position.y).toBeCloseTo(0, 6);

            const sceneFilm = new THREE.Scene();
            const builtFilm = waveOpticsRig.buildEquipment(sceneFilm, filmParams, filmSim.result);
            const hFilm = builtFilm.handles as typeof hBase;
            expect(hFilm.filmSlab.visible).toBe(true);
            expect(hFilm.interferenceState?.hasFilm).toBe(true);
            expect(hFilm.interferenceState?.deltaYmm).toBeCloseTo(2.4, 5);
            expect(hFilm.interferenceState?.fringeShiftMm).toBeCloseTo(0.76, 5);
            expect(hFilm.interferenceState!.shiftY).toBeGreaterThan(0);
            expect(hFilm.fringeGroup.children[7]!.position.y).toBeCloseTo(hFilm.interferenceState!.shiftY, 6);
        });
    });

    describe('#182 thin-film: 2D 正确读取 refIndex/subsIndex 并随 hasRelativeHalfWave 切换，2D/3D 与引擎同源', () => {
        it('1→1.38→1.5 (无相对半波损失) 与 1→1.33→1.0 (有相对半波损失) 2D/3D 标牌与引擎一致', () => {
            const sc = getSceneSync('thin-film')!;
            expect(sc).toBeDefined();

            // 场景 1: MgF2 薄膜在玻璃基片上 (1 < 1.38 < 1.5) -> 无相对半波损失，d=10nm 收敛至 0.04
            const glassParams = { thickness: 10, refIndex: 1.38, wavelength: 550, incAngle: 0, subsIndex: 1.5 };
            const glassSim = runSceneSimulation(sc, glassParams);
            expect(glassSim.error).toBeNull();
            const glassMv = glassSim.result!.diagnostics.maxValues as Record<string, number>;
            expect(glassSim.result!.diagnostics.flags?.hasRelativeHalfWave).toBe(false);
            expect(glassMv.Rnorm).toBeCloseTo(0.04, 2);

            const recGlass = createRecordingCanvas({ width: 900, height: 600 });
            drawThinFilmScene({
                ctx: recGlass.ctx,
                width: 900,
                height: 600,
                isDark: true,
                params: glassParams,
                simulationResult: glassSim.result,
                currentTime: 0
            });
            const glassText = recGlass.texts.join(' ');
            expect(glassText).toContain('薄膜 n=1.38');
            expect(glassText).toContain('基片 n_s=1.50');
            expect(glassText).toContain('无相对半波损失');
            expect(glassText).not.toContain('Δ=2nd·cosθ_t+λ/2');

            const threeGlass = new THREE.Scene();
            const builtGlass = waveOpticsRig.buildEquipment(threeGlass, glassParams, glassSim.result);
            const hGlass = builtGlass.handles as {
                thinFilmState?: { Rnorm: number; hasRelativeHalfWave: boolean };
            };
            expect(hGlass.thinFilmState).toBeDefined();
            expect(hGlass.thinFilmState!.hasRelativeHalfWave).toBe(false);
            expect(hGlass.thinFilmState!.Rnorm).toBeCloseTo(glassMv.Rnorm!, 6);

            // 场景 2: 空气-肥皂膜-空气 (1 < 1.33 > 1.0) -> 有相对半波损失，d=10nm 趋于暗膜 R→0
            const soapParams = { thickness: 10, refIndex: 1.33, wavelength: 550, incAngle: 0, subsIndex: 1.0 };
            const soapSim = runSceneSimulation(sc, soapParams);
            expect(soapSim.error).toBeNull();
            const soapMv = soapSim.result!.diagnostics.maxValues as Record<string, number>;
            expect(soapSim.result!.diagnostics.flags?.hasRelativeHalfWave).toBe(true);
            expect(soapMv.Rnorm).toBeLessThan(0.005);

            const recSoap = createRecordingCanvas({ width: 900, height: 600 });
            drawThinFilmScene({
                ctx: recSoap.ctx,
                width: 900,
                height: 600,
                isDark: true,
                params: soapParams,
                simulationResult: soapSim.result,
                currentTime: 0
            });
            const soapText = recSoap.texts.join(' ');
            expect(soapText).toContain('薄膜 n=1.33');
            expect(soapText).toContain('基片 n_s=1.00');
            expect(soapText).toContain('有相对半波损失 +λ/2');
            expect(soapText).toContain('Δ=2nd·cosθ_t+λ/2');

            const threeSoap = new THREE.Scene();
            const builtSoap = waveOpticsRig.buildEquipment(threeSoap, soapParams, soapSim.result);
            const hSoap = builtSoap.handles as {
                thinFilmState?: { Rnorm: number; hasRelativeHalfWave: boolean };
            };
            expect(hSoap.thinFilmState).toBeDefined();
            expect(hSoap.thinFilmState!.hasRelativeHalfWave).toBe(true);
            expect(hSoap.thinFilmState!.Rnorm).toBeCloseTo(soapMv.Rnorm!, 6);
        });
    });
});
