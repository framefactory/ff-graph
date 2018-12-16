/**
 * FF Typescript Foundation Library
 * Copyright 2018 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import Registry from "../Registry";

import Oscillator from "./Oscillator";

////////////////////////////////////////////////////////////////////////////////

export {
    Oscillator
};

export function registerComponents(registry: Registry)
{
    registry.registerComponentType([
        Oscillator
    ]);
}