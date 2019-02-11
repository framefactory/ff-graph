/**
 * FF Typescript Foundation Library
 * Copyright 2018 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import Component, { IUpdateContext, ITypedEvent } from "../Component";

////////////////////////////////////////////////////////////////////////////////

export interface IPulseContext extends IUpdateContext
{
    time: Date;
    secondsElapsed: number;
    secondsDelta: number;
    frameNumber: number;
}

interface IPulseEvent extends ITypedEvent<"pulse">
{
    context: IPulseContext;
}

export default class CPulse extends Component
{
    static readonly typeName: string = "CPulse";
    static readonly isSystemSingleton: boolean = true;

    readonly context: IPulseContext;

    private _secondsStarted: number;
    private _secondsStopped: number;
    private _animHandler: number;
    private _pulseEvent: IPulseEvent;

    constructor(id: string)
    {
        super(id);
        this.addEvent("pulse");

        this.onAnimationFrame = this.onAnimationFrame.bind(this);

        this.context = {
            time: new Date(),
            secondsElapsed: 0,
            secondsDelta: 0,
            frameNumber: 0
        };

        this._secondsStarted = Date.now() * 0.001;
        this._secondsStopped = this._secondsStarted;
        this._animHandler = 0;
        this._pulseEvent = { type: "pulse", context: this.context };
    }

    start()
    {
        if (this._animHandler === 0) {

            if (this._secondsStopped > 0) {
                this._secondsStarted += (Date.now() * 0.001 - this._secondsStopped);
                this._secondsStopped = 0;
            }

            this._animHandler = window.requestAnimationFrame(this.onAnimationFrame);
        }
    }

    stop()
    {
        if (this._animHandler !== 0) {
            if (this._secondsStopped === 0) {
                this._secondsStopped = Date.now() * 0.001;
            }
            window.cancelAnimationFrame(this._animHandler);
            this._animHandler = 0;
        }
    }

    // reset()
    // {
    //     const context = this.context;
    //     context.time = new Date();
    //     context.secondsElapsed = 0;
    //     context.secondsDelta = 0;
    //     context.frameNumber = 0;
    //
    //     this._secondsStarted = Date.now() * 0.001;
    //     this._secondsStopped = this._secondsStarted;
    // }

    pulse(milliseconds: number)
    {
        const context = this.context;

        context.time.setTime(milliseconds);
        const elapsed = milliseconds * 0.001 - this._secondsStarted;
        context.secondsDelta = elapsed - context.secondsElapsed;
        context.secondsElapsed = elapsed;
        context.frameNumber++;

        this.system.graph.tick(this.context);
        this.emit<IPulseEvent>(this._pulseEvent);
        this.system.graph.finalize(this.context);
    }

    protected onAnimationFrame()
    {
        this.pulse(Date.now());
        this._animHandler = window.requestAnimationFrame(this.onAnimationFrame);
    }
}