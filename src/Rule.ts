/**
 * FF Typescript Foundation Library
 * Copyright 2024 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import { StateMachine } from "./StateMachine.js";
import { State } from "./State.js";
import { Transition } from "./Transition.js";

////////////////////////////////////////////////////////////////////////////////

enum ECondition { Always, Never, Idle, Targeted }

export class Rule
{
    machine: StateMachine;
    events: Set<string>;
    condition: ECondition;
    state: State;
    transition: Transition;
    speed: number;

    get backward() {
        return this.transition && this.transition.toState === this.state;
    }

    test(event: string)
    {
        if (!this.events.has(event)) {
            return false;
        }

        switch(this.condition) {
            case ECondition.Always:
                return true;

            case ECondition.Never:
                return false;

            case ECondition.Idle:
                return this.machine.activeState === this.state;

            case ECondition.Targeted:
                return this.machine.activeState
        }
    }

    execute()
    {

    }
}