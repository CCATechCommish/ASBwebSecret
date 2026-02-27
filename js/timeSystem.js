// timeSystem.js — SUPERHOT time dilation mechanic
// Time only moves when the player moves

export class TimeSystem {
    constructor() {
        this.timeScale = 0.02;       // near-frozen when idle
        this.targetTimeScale = 0.02;
        this.minTimeScale = 0.02;
        this.maxTimeScale = 1.0;
        this.lerpSpeed = 8.0;

        this.mouseMovement = 0;
        this.keyboardActive = false;
        this.isThrowing = false;

        this._decayRate = 0.9;
    }

    registerMouseMovement(dx, dy) {
        this.mouseMovement += Math.abs(dx) + Math.abs(dy);
    }

    registerKeyboard(active) {
        this.keyboardActive = active;
    }

    registerThrow() {
        this.isThrowing = true;
    }

    update(rawDelta) {
        // Determine activity level
        let activity = 0;

        if (this.keyboardActive) {
            activity += 0.6;
        }

        if (this.mouseMovement > 2) {
            activity += Math.min(this.mouseMovement / 30, 0.6);
        }

        if (this.isThrowing) {
            activity += 0.8;
            this.isThrowing = false;
        }

        activity = Math.min(activity, 1.0);

        this.targetTimeScale = this.minTimeScale + (this.maxTimeScale - this.minTimeScale) * activity;

        // Smooth interpolation
        this.timeScale += (this.targetTimeScale - this.timeScale) * Math.min(this.lerpSpeed * rawDelta, 1.0);
        this.timeScale = Math.max(this.minTimeScale, Math.min(this.maxTimeScale, this.timeScale));

        // Decay mouse movement
        this.mouseMovement *= this._decayRate;
        if (this.mouseMovement < 0.1) this.mouseMovement = 0;

        return this.timeScale;
    }

    getScaledDelta(rawDelta) {
        return rawDelta * this.timeScale;
    }
}
