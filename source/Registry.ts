/**
 * FF Typescript Foundation Library
 * Copyright 2018 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import { Dictionary, TypeOf } from "@ff/core/types";

import Component, { ComponentType } from "./Component";
import Node, { NodeType } from "./Node";

////////////////////////////////////////////////////////////////////////////////

/**
 * Registry for component types. Each component type should register itself
 * with the registry. The registry is used to construct subtypes of components
 * during inflation (de-serialization) of a node-component systems.
 */
export default class Registry
{
    protected nodeTypes: Dictionary<TypeOf<Node>>;
    protected componentTypes: Dictionary<TypeOf<Component>>;

    constructor()
    {
        this.componentTypes = {};
    }

    getNodeType<T extends Node>(type: string): TypeOf<T>
    {
        const nodeType = this.nodeTypes[type] as TypeOf<T>;
        if (!nodeType) {
            throw new Error(`node type not found for type id: '${type}'`);
        }

        return nodeType;
    }

    getComponentType<T extends Component>(type: string): TypeOf<T>
    {
        const componentType = this.componentTypes[type] as TypeOf<T>;
        if (!componentType) {
            throw new Error(`component type not found for type id: '${type}'`);
        }

        return componentType;
    }

    registerNodeType(nodeType: NodeType | NodeType[])
    {
        if (Array.isArray(nodeType)) {
            nodeType.forEach(nodeType => this.registerNodeType(nodeType));
        }
        else {
            if (this.nodeTypes[nodeType.type]) {
                console.warn(nodeType);
                throw new Error(`node type already registered: '${nodeType.type}'`);
            }

            this.nodeTypes[nodeType.type] = nodeType;
        }
    }

    registerComponentType(componentType: ComponentType | ComponentType[])
    {
        if (Array.isArray(componentType)) {
            componentType.forEach(componentType => this.registerComponentType(componentType));
        }
        else {
            if (this.componentTypes[componentType.type]) {
                console.warn(componentType);
                throw new Error(`component type already registered: '${componentType.type}'`);
            }

            this.componentTypes[componentType.type] = componentType;
        }
    }
}
