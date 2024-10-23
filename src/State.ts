/**
 * FF Typescript Foundation Library
 * Copyright 2024 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import { StateMachine } from "./StateMachine.js";
import { Rule } from "./Rule.js";

////////////////////////////////////////////////////////////////////////////////

export class State
{
    rules: Set<Rule>;

    readonly machine: StateMachine;

    constructor(machine: StateMachine)
    {
        this.rules = new Set();
        this.machine = machine;
    }
}