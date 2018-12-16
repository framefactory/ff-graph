/**
 * FF Typescript Foundation Library
 * Copyright 2018 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import { Component, types, Pulse } from "../index";

////////////////////////////////////////////////////////////////////////////////

export default class Oscillator extends Component
{
    static readonly type: string = "Oscillator";

    ins = this.ins.append({

    });

    outs = this.outs.append({
        result: types.Number("Result")
    });

    create()
    {

    }

    update(pulse: Pulse)
    {
        return false;
    }

    tick(pulse: Pulse)
    {
        const value = pulse.secondsElapsed * 30;
        this.outs.result.setValue(value);

        return true;
    }
}