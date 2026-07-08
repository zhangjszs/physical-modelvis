import '@testing-library/jest-dom';

// jsdom 抛出 "Not implemented: HTMLCanvasElement.prototype.getContext"。
// makeTextSprite / updateTextSprite 需要 2d context; 提供 no-op mock 让其在 Node 环境可用。
if (typeof HTMLCanvasElement !== 'undefined') {
    const noop = () => undefined;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, _type: string) {
        return new Proxy(
            { canvas: this },
            {
                get(target, prop) {
                    if (prop in target) return (target as Record<string | symbol, unknown>)[prop];
                    if (prop === 'measureText') return () => ({ width: 100 });
                    return noop;
                },
                set() {
                    return true;
                }
            }
        );
    } as typeof HTMLCanvasElement.prototype.getContext;
}
