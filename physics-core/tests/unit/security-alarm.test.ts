import { describe, it, expect } from 'vitest';
import type { PhysicsProblem } from '../../src/types/problem.js';
import { SecurityAlarmModel } from '../../src/models/security-alarm.js';

function makeBody(id = 'b1', mass = 1) {
    return { id, mass: { value: mass, unit: 'kg' as const }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } };
}
function makeProblem(
    modelType: string,
    constraints: Record<string, unknown>,
    bodies: ReturnType<typeof makeBody>[] = [makeBody()]
): PhysicsProblem {
    return {
        id: 'test-' + modelType,
        model: modelType as PhysicsProblem['model'],
        bodies,
        constraints: constraints as unknown as PhysicsProblem['constraints'],
        timeConfig: { duration: 5, sampleCount: 100 },
        environment: {}
    };
}

describe('F13: SecurityAlarmModel', () => {
    const model = new SecurityAlarmModel();
    it('metadata ok', () => {
        expect(model.modelType).toBe('security-alarm');
    });
    it('result ok', () => {
        const r = model.solve(
            makeProblem('security-alarm', { securityAlarm: { doorState: 'open', magnetDistance: 50 } })
        );
        expect(r.explanation.summary).toBeTruthy();
    });
    it('NaN 参数 → validate 拒绝 (NON_FINITE_PARAMETER, #85 守卫恢复)', () => {
        const v = model.validate(
            makeProblem('security-alarm', { securityAlarm: { doorState: 'open', magnetDistance: NaN } })
        );
        expect(v.valid).toBe(false);
        expect(v.errors.some(e => e.code === 'NON_FINITE_PARAMETER')).toBe(true);
    });
});
