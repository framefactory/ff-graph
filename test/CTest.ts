/**
 * FF Typescript Foundation Library
 * Copyright 2022 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import { Component, IUpdateContext } from "@ffweb/graph/Component.js";
import { types } from "@ffweb/graph/propertyTypes.js";

////////////////////////////////////////////////////////////////////////////////

export enum Enum1 { four, five, six }
export enum Enum2 { seven, eight, nine }

const ins = {
    num0: types.Number("TestPath.Number0"),
    num1: types.Number("TestPath.Number1", 42),
    vec2: types.Vector2("TestPath.Vector2"),
    vec3: types.Vector3("TestPath.Vector3", { preset: [ 1, 2, 3] }),
    vec4: types.Vector4("TestPath.Vector4", [ 1, 2, 3, 4 ]),
    bool0: types.Boolean("TestPath.Boolean0", false),
    bool1: types.Boolean("TestPath.Boolean1", { preset: true }),
    str0: types.String("TestPath.String0"),
    str1: types.String("TestPath.String1", "Hello"),
    strVec2: types.Property("TestPath.StrVec", [ "first", "second" ]),
    option0: types.Option("TestPath.Enum0", [ "one", "two", "three" ]),
    option1: types.Enum("TestPath.Enum1", Enum1, 2),
    option2: types.Property("TestPath.Enum2", { options: [ "seven", "eight", "nine" ], preset: 1 }),
    obj0: types.Object("TestPath.Object0", Object)
};

const outs = {
    num0: types.Number("TestPath.Number0"),
    num1: types.Number("TestPath.Number1", 42),
    vec2: types.Vector2("TestPath.Vector2"),
    vec3: types.Vector3("TestPath.Vector3", { preset: [ 1, 2, 3] }),
    vec4: types.Vector4("TestPath.Vector4", [ 1, 2, 3, 4 ]),
    bool0: types.Boolean("TestPath.Boolean0", false),
    bool1: types.Boolean("TestPath.Boolean1", { preset: true }),
    str0: types.String("TestPath.String0"),
    str1: types.String("TestPath.String1", "Hello"),
    strVec2: types.Property("TestPath.StrVec", [ "first", "second" ]),
    option0: types.Option("TestPath.Enum0", [ "one", "two", "three" ]),
    option1: types.Enum("TestPath.Enum1", Enum1, 2),
    option2: types.Property("TestPath.Enum2", { options: [ "seven", "eight", "nine" ], preset: 1 }),
    obj0: types.Object("TestPath.Object0", Object)
};

export class CTest extends Component
{
    static readonly typeName: string = "CTest";

    static readonly isNodeSingleton: boolean = false;

    ins = this.addInputs(ins);
    outs = this.addOutputs(outs);

    create()
    {
        super.create();
    }

    update(context: IUpdateContext)
    {
        return false;
    }

    tick(context: IUpdateContext)
    {
        return false;
    }
}


