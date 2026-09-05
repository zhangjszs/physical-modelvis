/**
 * 曲线运动/能量 rig 包 — 必修二
 * 曲线运动条件/运动的合成/传动带/圆周/碰撞/动量/天体/万有引力/卡文迪许
 */
import type { SceneRig } from '../../EquipmentStage';
import { curveConditionRig } from '../curveConditionRig';
import { curveVelocityDirectionRig } from '../curveVelocityDirectionRig';
import { motionCompositionRig } from '../motionCompositionRig';
import { transmissionBeltRig } from '../transmissionBeltRig';
import { circularMotionRig } from '../circularMotionRig';
import { verticalCircleRig } from '../verticalCircleRig';
import { centrifugalRig } from '../centrifugalRig';
import { collisionRig } from '../collisionRig';
import { orbitalRig } from '../orbitalRig';
import { cavendishRig } from '../cavendishRig';

export default {
    'curve-velocity-direction': curveVelocityDirectionRig,
    'curve-condition': curveConditionRig,
    'motion-composition': motionCompositionRig,
    'transmission-belt': transmissionBeltRig,
    'vertical-circle': verticalCircleRig,
    centrifugal: centrifugalRig,
    'circular-motion': circularMotionRig,
    collision: collisionRig,
    momentum: collisionRig,
    orbital: orbitalRig,
    'moon-earth-test': orbitalRig,
    cavendish: cavendishRig
} as Record<string, SceneRig>;
