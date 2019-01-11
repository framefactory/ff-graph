/**
 * FF Typescript Foundation Library
 * Copyright 2018 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import Registry from "../Registry";

import COscillator from "./COscillator";
import CSelection from "./CSelection";

////////////////////////////////////////////////////////////////////////////////

export {
    COscillator,
    CSelection
};

export function registerComponents(registry: Registry)
{
    registry.registerComponentType([
        COscillator,
        CSelection
    ]);
}