/**
 * FF Typescript Foundation Library
 * Copyright 2018 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import Registry from "../Registry";

import CController from "./CController";
import CGraph from "./CGraph";
import CHierarchy from "./CHierarchy";
import COscillator from "./COscillator";
import CSelection from "./CSelection";

////////////////////////////////////////////////////////////////////////////////

export {
    CController,
    CGraph,
    CHierarchy,
    COscillator,
    CSelection
};

export function registerComponents(registry: Registry)
{
    registry.registerComponentType([
        CGraph,
        CHierarchy,
        COscillator,
        CSelection
    ]);
}