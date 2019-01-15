/**
 * FF Typescript Foundation Library
 * Copyright 2018 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import CController from "./CController";
import CGraph from "./CGraph";
import CHierarchy from "./CHierarchy";
import COscillator from "./COscillator";
import CPulse from "./CPulse";
import CSelection from "./CSelection";

////////////////////////////////////////////////////////////////////////////////

export {
    CController,
    CGraph,
    CHierarchy,
    COscillator,
    CPulse,
    CSelection
};

export const componentTypes = [
    CGraph,
    CHierarchy,
    COscillator,
    CPulse,
    CSelection
];
