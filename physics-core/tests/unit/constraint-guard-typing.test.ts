import { describe, it, expect } from 'vitest';
import { requireConstraintNumber, optionalConstraintNumber } from '../../src/models/constraint-guard.js';
import type { ConstraintFieldName } from '../../src/types/problem.js';

/**
 * #120 C3 编译期契约测试：约束字段名收窄为 `ConstraintFieldName` 后，非法字段名在编译期报错。
 *
 * 下方 `_compileTimeOnly` 内的 `@ts-expect-error` 是**常驻断言**：
 *   - 若把守卫签名放宽回 `string`（撤销收窄），这些指令将「无错可抑」→ tsc 报
 *     "Unused '@ts-expect-error' directive" → typecheck 红；
 *   - 若删掉指令本身，`'notAField'` 赋值/传参即为类型错误 → 红。
 * 两个方向都证明收窄确实生效。函数体运行时**不执行**（仅承载类型检查），故不触发 PhysicsError。
 */
describe('constraint-guard 字段名类型收窄 (#120 C3)', () => {
    const valid: ConstraintFieldName[] = ['current', 'magneticField', 'chargeDensity', 'thickness', 'temperature'];

    it('合法约束字段名可赋值给 ConstraintFieldName 且运行时行为不变', () => {
        expect(valid).toHaveLength(5);
        expect(requireConstraintNumber({ current: 2 }, 'current', 'hall-effect')).toBe(2);
        expect(optionalConstraintNumber({ temperature: 300 }, 'temperature', 0)).toBe(300);
        // 缺字段仍按原语义抛错（运行时行为未变）
        expect(() => requireConstraintNumber({ current: 2 }, 'magneticField', 'hall-effect')).toThrow();
    });

    it('非法字段名编译期被拒（撤销收窄或删除指令即红）', () => {
        const _compileTimeOnly = (): ConstraintFieldName => {
            // @ts-expect-error 'notAField' 不是任何约束字段名 → 收窄后应编译报错
            const badLiteral: ConstraintFieldName = 'notAField';
            // @ts-expect-error 同上：非法字段名不可传入 requireConstraintNumber
            requireConstraintNumber({ current: 1 }, 'notAField', 'hall-effect');
            // @ts-expect-error 同上：非法字段名不可传入 optionalConstraintNumber
            optionalConstraintNumber({ temperature: 1 }, 'notAField', 0);
            return badLiteral;
        };
        // 仅确认编译期断言载体存在，运行时不调用（避免触发守卫抛错）
        expect(typeof _compileTimeOnly).toBe('function');
    });
});
