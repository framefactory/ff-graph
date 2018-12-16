/**
 * FF Typescript Foundation Library
 * Copyright 2018 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import System from "./System";
import Node from "./Node";
import Hierarchy from "./Hierarchy";
import { ComponentType } from "./Component";
import Property from "./Property";

////////////////////////////////////////////////////////////////////////////////

const _findInSubtree = function(componentType: ComponentType, node: Node) {
    const component = node.components.get(componentType);
    if (component) {
        return component;
    }

    const hierarchy = node.components.get(Hierarchy);
    if (!hierarchy || hierarchy.children.length === 0) {
        return null;
    }

    for (let i = 0, n = hierarchy.children.length; i < n; ++i) {
        const component = _findInSubtree(componentType, hierarchy.children[i].node);
        if (component) {
            return component;
        }
    }

    return null;
};

export default class PropertyTracker<T extends any = any>
{
    onValue: (value: T) => void;
    readonly system: System;

    protected _property: Property<T>;

    constructor(system: System)
    {
        this.system = system;
    }

    get property() {
        return this._property;
    }

    set property(property: Property<T>) {
        this.detach();
        property.on("value", this.onPropertyValue, this);
        this._property.on("dispose", this.onPropertyDispose, this);
        this._property = property;
    }

    attachInput(componentType: ComponentType, path: string, scope?: Node)
    {
        const component = scope
            ? _findInSubtree(componentType, scope)
            : this.system.components.get(componentType);

        if (!component) {
            throw new Error(`component type not found: '${componentType}'`);
        }

        this.property = component.in(path);
    }

    attachOutput(componentType: ComponentType, path: string, scope?: Node)
    {
        const component = scope
            ? _findInSubtree(componentType, scope)
            : this.system.components.get(componentType);

        if (!component) {
            throw new Error(`component type not found: '${componentType}'`);
        }

        this.property = component.out(path);
    }

    detach()
    {
        if (this._property) {
            this._property.off("value", this.onPropertyValue, this);
            this._property.off("dispose", this.onPropertyDispose, this);
        }
    }

    isAttached(): boolean
    {
        return !!this._property;
    }

    protected onPropertyValue(value: T)
    {
        this.onValue && this.onValue(value);
    }

    protected onPropertyDispose()
    {
        this._property.off("value", this.onPropertyValue, this);
        this._property.off("dispose", this.onPropertyDispose, this);
        this._property = null;
    }
}

