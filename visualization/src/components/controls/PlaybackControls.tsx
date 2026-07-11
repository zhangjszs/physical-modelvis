import { useEffect } from 'react';
import { useSimulationStore } from '../../store/simulationStore';
import { getTotalDuration } from '../../utils/frameUtils';

const SPEED_OPTIONS = [0.25, 0.5, 1, 2, 5];

export function PlaybackControls() {
    const simulationResult = useSimulationStore(s => s.simulationResult);
    const currentTime = useSimulationStore(s => s.currentTime);
    const isPlaying = useSimulationStore(s => s.isPlaying);
    const playbackSpeed = useSimulationStore(s => s.playbackSpeed);
    // action selectors 返回稳定引用, 不会触发重渲染
    const play = useSimulationStore(s => s.play);
    const pause = useSimulationStore(s => s.pause);
    const reset = useSimulationStore(s => s.reset);
    const stepForward = useSimulationStore(s => s.stepForward);
    const stepBackward = useSimulationStore(s => s.stepBackward);
    const setPlaybackSpeed = useSimulationStore(s => s.setPlaybackSpeed);
    const setCurrentTime = useSimulationStore(s => s.setCurrentTime);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement).tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;
            if (!simulationResult) return;

            switch (e.key) {
                case ' ':
                    e.preventDefault();
                    if (isPlaying) {
                        pause();
                    } else {
                        play();
                    }
                    break;
                case 'r':
                case 'R':
                    reset();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    stepBackward();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    stepForward();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [simulationResult, isPlaying, play, pause, reset, stepForward, stepBackward]);

    const totalDuration = simulationResult ? getTotalDuration(simulationResult.trajectories) : 0;

    return (
        <div className="playback-controls">
            <div className="playback-buttons">
                <button onClick={reset} className="btn btn-icon" title="重置">
                    ⏮
                </button>
                <button onClick={stepBackward} className="btn btn-icon" title="后退一步" disabled={!simulationResult}>
                    ⏪
                </button>
                <button
                    onClick={isPlaying ? pause : play}
                    className={`btn btn-icon btn-primary ${isPlaying ? 'active' : ''}`}
                    disabled={!simulationResult}
                    title={isPlaying ? '暂停' : '播放'}
                >
                    {isPlaying ? '⏸' : '▶'}
                </button>
                <button onClick={stepForward} className="btn btn-icon" title="前进一步" disabled={!simulationResult}>
                    ⏩
                </button>
            </div>

            <div className="playback-timeline">
                <span className="time-label">{currentTime.toFixed(2)}s</span>
                <input
                    type="range"
                    min={0}
                    max={totalDuration || 1}
                    step={0.001}
                    value={currentTime}
                    onChange={e => setCurrentTime(parseFloat(e.target.value))}
                    className="timeline-slider"
                    disabled={!simulationResult}
                />
                <span className="time-label">{totalDuration.toFixed(2)}s</span>
            </div>

            <div className="playback-speed">
                <span className="speed-label">速度</span>
                {SPEED_OPTIONS.map(s => (
                    <button
                        key={s}
                        className={`btn btn-sm ${playbackSpeed === s ? 'active' : ''}`}
                        onClick={() => setPlaybackSpeed(s)}
                    >
                        {s}x
                    </button>
                ))}
            </div>
        </div>
    );
}
