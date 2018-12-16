/**
 * FF Typescript Foundation Library
 * Copyright 2018 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import { Dictionary, TypeOf } from "@ff/core/types";

import Component, { ComponentType } from "./Component";
import Node from "./Node";

////////////////////////////////////////////////////////////////////////////////

/**
 * Registry for component types. Each component type should register itself
 * with the registry. The registry is used to construct subtypes of components
 * during inflation (de-serialization) of a node-component systems.
 */
export default class Registry
{
    types: Dictionary<TypeOf<Component>>;

    constructor()
    {
        this.types = {};
    }

    createComponent<T extends Component>(type: string, node: Node, instanceId?: string): T
    {
        const componentType = this.getComponentType(type) as ComponentType<T>;
        return Component.create(componentType, node, instanceId);
    }

    getComponentType<T extends Component>(type: string): TypeOf<T>
    {
        const componentType = this.types[type] as TypeOf<T>;
        if (!componentType) {
            throw new Error(`component type not found for type id: '${type}'`);
        }

        return componentType;
    }

    registerComponentType(componentType: ComponentType | ComponentType[])
    {
        if (Array.isArray(componentType)) {
            componentType.forEach(componentType => this.registerComponentType(componentType));
        }
        else {
            if (this.types[componentType.type]) {
                console.warn(componentType);
                throw new Error(`component type already registered: '${componentType.type}'`);
            }

            this.types[componentType.type] = componentType;
        }
    }
}
