/**
 * FF Typescript Foundation Library
 * Copyright 2022 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import { Node } from "./Node.js";

////////////////////////////////////////////////////////////////////////////////

export class CustomNode extends Node
{
    static readonly type: string = "CustomNode";
}