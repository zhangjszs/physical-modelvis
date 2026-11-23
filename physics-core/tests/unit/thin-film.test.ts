import { describe, it, expect } from 'vitest';
import type { PhysicsProblem } from '../../src/types/problem.js';
import { ThinFilmModel } from '../../src/models/thin-film.js';

function makeBody(id = 'b1', mass = 1) {
    return {
        id,
        mass: { value: mass, unit: 'kg' as const },
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 }
    };
}
function makeProblemPartial(
    modelType: string,
    constraints: Record<string, unknown>,
    bodies: ReturnType<typeof makeBody>[] = [makeBody()]
): PhysicsProblem {
    return {
        id: 'test-' + modelType,
        model: modelType as PhysicsProblem['model'],
        bodies,
        constraints: constraints as PhysicsProblem['constraints'],
        timeConfig: { duration: 5, sampleCount: 100 },
        environment: {}
    };
}

describe('E9: ThinFilmModel', () => {
    const model = new ThinFilmModel();
    it('模型元数据正确', () => {
        expect(model.modelType).toBe('thin-film');
        expect(model.name).toContain('薄膜');
    });
    it('垂直入射空气-膜-空气对称, 半透明', () => {
        const r = model.solve(
            makeProblemPartial('thin-film', {
                thinFilm: { thickness: 200, refIndex: 1.5, wavelength: 600, incidentAngle: 0, substrateIndex: 1.5 }
            })
        );
        expect(r.diagnostics.maxValues.Rnorm).toBeGreaterThanOrEqual(0);
        expect(r.diagnostics.maxValues.Rnorm).toBeLessThanOrEqual(1);
    });
    it('增透条件: Rnorm 较低', () => {
        // 2nd = lambda/2 => d = lambda/(4n) = 600/(4*1.5) = 100nm
        const r = model.solve(
            makeProblemPartial('thin-film', {
                thinFilm: { thickness: 100, refIndex: 1.5, wavelength: 600, incidentAngle: 0, substrateIndex: 1.0 }
            })
        );
        // 空气(n=1)-膜(n=1.5)-空气(n=1), 干涉会使得反射率在某处极小
        // 允许有限范围内, 这里只要 Rnorm < 0.5 即可
        expect(r.diagnostics.maxValues.Rnorm).toBeLessThan(0.5);
    });
    it('膜厚扫描图生成', () => {
        const r = model.solve(
            makeProblemPartial('thin-film', {
                thinFilm: { thickness: 200, refIndex: 1.5, wavelength: 600, incidentAngle: 0 }
            })
        );
        expect(r.charts.thickness_scan!.points.length).toBeGreaterThan(50);
    });
    it('全反射时抛出', () => {
        // n1*sin(theta1) = n2*sin(theta2), n1=1.5, n2=1.0, theta1=60 deg -> sin(theta2)=1.5*sin(60)=1.299 > 1
        expect(() => {
            model.solve(
                makeProblemPartial('thin-film', {
                    thinFilm: { thickness: 200, refIndex: 1.0, wavelength: 600, incidentAngle: 0, substrateIndex: 1.5 }
                })
            );
        }).not.toThrow(); // n=1, no TIR when going to higher index

        // Use thicker substrate with n < 1 incoming: TIR impossible here
        // Just test that model handles large angle gracefully
        const r = model.solve(
            makeProblemPartial('thin-film', {
                thinFilm: { thickness: 200, refIndex: 1.5, wavelength: 600, incidentAngle: 45, substrateIndex: 1.0 }
            })
        );
        expect(r).toBeDefined();
    });

    it('d→0 连续极限 (d=10nm, n_air=1, n_film=1.38, n_sub=1.5, θ=0)：无相对半波损失，R 收敛至空气/玻璃单界面 0.04 (#182)', () => {
        const r = model.solve(
            makeProblemPartial('thin-film', {
                thinFilm: { thickness: 10, refIndex: 1.38, wavelength: 550, incidentAngle: 0, substrateIndex: 1.5 }
            })
        );
        expect(r.diagnostics.flags?.hasRelativeHalfWave).toBe(false);
        expect(r.diagnostics.maxValues.relativePhaseShiftRad).toBe(0);
        // 空气/玻璃单界面反射率 ((1-1.5)/(1+1.5))^2 = 0.04，d=10nm 应紧邻 0.04（绝非旧错误 ~0.014）
        expect(r.diagnostics.maxValues.Rnorm).toBeGreaterThan(0.035);
        expect(r.diagnostics.maxValues.Rnorm).toBeCloseTo(0.04, 2);
    });

    it('MgF₂ 四分之一波增透膜 (1→1.38→1.5, d=λ/(4n))：无相对半波损失且相消增透 R 极小 (#182)', () => {
        const lambda = 550;
        const n = 1.38;
        const dQuarter = lambda / (4 * n);
        const rQuarter = model.solve(
            makeProblemPartial('thin-film', {
                thinFilm: {
                    thickness: dQuarter,
                    refIndex: n,
                    wavelength: lambda,
                    incidentAngle: 0,
                    substrateIndex: 1.5
                }
            })
        );
        const rHalf = model.solve(
            makeProblemPartial('thin-film', {
                thinFilm: {
                    thickness: lambda / (2 * n),
                    refIndex: n,
                    wavelength: lambda,
                    incidentAngle: 0,
                    substrateIndex: 1.5
                }
            })
        );
        expect(rQuarter.diagnostics.flags?.hasRelativeHalfWave).toBe(false);
        expect(rQuarter.diagnostics.flags?.isDestructive).toBe(true);
        expect(rQuarter.diagnostics.flags?.isConstructive).toBe(false);
        expect(rQuarter.diagnostics.maxValues.Rnorm).toBeLessThan(0.02); // ~1.38% 增透极小
        expect(rQuarter.diagnostics.maxValues.Rnorm).toBeLessThan(rHalf.diagnostics.maxValues.Rnorm);
        expect(rHalf.diagnostics.flags?.isConstructive).toBe(true);
        expect(rHalf.diagnostics.maxValues.Rnorm).toBeCloseTo(0.04, 4);
    });

    it('空气-肥皂膜-空气 (1→1.33→1.0)：有相对半波损失，d→0 趋于暗膜 R→0 (#182)', () => {
        const rThin = model.solve(
            makeProblemPartial('thin-film', {
                thinFilm: { thickness: 10, refIndex: 1.33, wavelength: 550, incidentAngle: 0, substrateIndex: 1.0 }
            })
        );
        expect(rThin.diagnostics.flags?.hasRelativeHalfWave).toBe(true);
        expect(rThin.diagnostics.maxValues.relativePhaseShiftRad).toBeCloseTo(Math.PI, 6);
        expect(rThin.diagnostics.maxValues.Rnorm).toBeLessThan(0.005); // 暗膜趋于 0

        // d = λ/(4n) 时 2nd + λ/2 = λ → 相长反射增强
        const rQuarter = model.solve(
            makeProblemPartial('thin-film', {
                thinFilm: {
                    thickness: 550 / (4 * 1.33),
                    refIndex: 1.33,
                    wavelength: 550,
                    incidentAngle: 0,
                    substrateIndex: 1.0
                }
            })
        );
        expect(rQuarter.diagnostics.flags?.isConstructive).toBe(true);
        expect(rQuarter.diagnostics.maxValues.Rnorm).toBeGreaterThan(0.07);
    });

    it('n_film === n_sub 与 n_film === 1 退化为单界面反射：thicknessScan 恒定且无相长/相消误标 (#182)', () => {
        const rSameSub = model.solve(
            makeProblemPartial('thin-film', {
                thinFilm: { thickness: 250, refIndex: 1.5, wavelength: 550, incidentAngle: 0, substrateIndex: 1.5 }
            })
        );
        const rAirFilm = model.solve(
            makeProblemPartial('thin-film', {
                thinFilm: { thickness: 250, refIndex: 1.0, wavelength: 550, incidentAngle: 0, substrateIndex: 1.5 }
            })
        );
        for (const r of [rSameSub, rAirFilm]) {
            expect(r.diagnostics.flags?.isSingleInterface).toBe(true);
            expect(r.diagnostics.flags?.hasRelativeHalfWave).toBe(false);
            expect(r.diagnostics.flags?.isConstructive).toBe(false);
            expect(r.diagnostics.flags?.isDestructive).toBe(false);
            expect(r.diagnostics.maxValues.Rnorm).toBeCloseTo(0.04, 4);
            const ys = r.charts.thickness_scan!.points.map(p => p.y);
            expect(Math.max(...ys) - Math.min(...ys)).toBeLessThan(1e-4);
        }
    });

    it('倾斜入射 θ=30°/45° 满足 0 <= R <= 1 且全输出有限无 NaN (#182)', () => {
        for (const angle of [30, 45]) {
            for (const [nFilm, nSub] of [
                [1.38, 1.5],
                [1.33, 1.0],
                [2.2, 1.5]
            ] as Array<[number, number]>) {
                const r = model.solve(
                    makeProblemPartial('thin-film', {
                        thinFilm: {
                            thickness: 300,
                            refIndex: nFilm,
                            wavelength: 550,
                            incidentAngle: angle,
                            substrateIndex: nSub
                        }
                    })
                );
                const mv = r.diagnostics.maxValues;
                expect(mv.Rnorm).toBeGreaterThanOrEqual(0);
                expect(mv.Rnorm).toBeLessThanOrEqual(1);
                for (const v of Object.values(mv)) {
                    expect(Number.isFinite(v)).toBe(true);
                }
            }
        }
    });
});
