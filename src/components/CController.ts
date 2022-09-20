/**
 * FF Typescript Foundation Library
 * Copyright 2022 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import { ReturnType } from "@ffweb/core/types.js";
import { Commander } from "@ffweb/core/Commander.js";

import { Component, types } from "../Component.js";

////////////////////////////////////////////////////////////////////////////////

export { Commander, types  };
export type Actions<T extends CController<any>> = ReturnType<T["createActions"]>;

export class CController<T extends CController<any>> extends Component
{
    static readonly typeName: string = "CController";
    static readonly isSystemSingleton: boolean = true;

    readonly actions: Actions<CController<T>>;

    createActions(commander: Commander)
    {
        return {};
    }
}