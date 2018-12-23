/**
 * FF Typescript/React Foundation Library
 * Copyright 2018 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import Component, { IUpdateContext } from "../source/Component";
import { types } from "../source/propertyTypes";

////////////////////////////////////////////////////////////////////////////////

export default class TestComponent extends Component
{
    static readonly type: string = "Test";
    static readonly isEntitySingleton: boolean = false;

    ins = this.ins.append({
        num0: types.Number("Test.Number0"),
        num1: types.Property("Test.Number1", 42),
        vec2: types.Vector2("Test.Vector2"),
        vec3: types.Vector3("Test.Vector3", { preset: [ 1, 2, 3] }),
        vec4: types.Vector4("Test.Vector4", [ 1, 2, 3, 4 ]),
        bool0: types.Property("Test.Boolean0", false),
        bool1: types.Boolean("Test.Boolean1", { preset: true }),
        str0: types.String("Test.String0"),
        str1: types.String("Test.String1", "Hello"),
        strVec2: types.Property("Test.StrVec", [ "first", "second" ]),
        enum0: types.Enum("Test.Enum0", [ "one", "two", "three" ]),
        enum1: types.Enum("Test.Enum1", [ "four", "five", "six" ], 2),
        enum2: types.Property("Test.Enum2", { options: [ "seven", "eight", "nine" ], preset: 1 }),
        obj0: types.Object("Test.Object0")
    });

    outs = this.outs.append({
        num0: types.Number("Test.Number0"),
        num1: types.Property("Test.Number1", 42),
        vec2: types.Vector2("Test.Vector2"),
        vec3: types.Vector3("Test.Vector3", { preset: [ 1, 2, 3] }),
        vec4: types.Vector4("Test.Vector4", [ 1, 2, 3, 4 ]),
        bool0: types.Property("Test.Boolean0", false),
        bool1: types.Boolean("Test.Boolean1", { preset: true }),
        str0: types.String("Test.String0"),
        str1: types.String("Test.String1", "Hello"),
        strVec2: types.Property("Test.StrVec", [ "first", "second" ]),
        enum0: types.Enum("Test.Enum0", [ "one", "two", "three" ]),
        enum1: types.Enum("Test.Enum1", [ "four", "five", "six" ], 2),
        enum2: types.Property("Test.Enum2", { options: [ "seven", "eight", "nine" ], preset: 1 }),
        obj0: types.Object("Test.Object0")
    });

    create()
    {
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


