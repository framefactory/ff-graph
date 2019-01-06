/**
 * FF Typescript Foundation Library
 * Copyright 2018 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import System from "./System";
import Graph from "./Graph";
import Node from "./Node";
import Hierarchy from "./Hierarchy";
import { ComponentOrType } from "./Component";
import Property, { IPropertyDisposeEvent } from "./Property";

////////////////////////////////////////////////////////////////////////////////

const _findInSubtree = function(componentType: ComponentOrType, node: Node) {
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
    private _property: Property<T> = null;
    private _callback: (value: T) => void;
    private _context: any;

    constructor(callback?: (value: T) => void, context?: any)
    {
        this._callback = callback;
        this._context = context;
    }

    get property() {
        return this._property;
    }

    set property(property: Property<T>) {
        this.detach();
        this._property = property;
        property.on("value", this.onPropertyValue, this);
        property.on<IPropertyDisposeEvent>("dispose", this.onPropertyDispose, this);
    }

    getValue(defaultValue?: T) {
        return this._property ? this._property.value : defaultValue;
    }

    setValue(value: T) {
        if (this._property) {
            this._property.setValue(value);
        }
    }

    set() {
        if (this._property) {
            this._property.set();
        }
    }

    attachInput(scope: Node | Graph | System, componentType: ComponentOrType, key: string)
    {
        let component = scope instanceof Node
            ? _findInSubtree(componentType, scope)
            : scope.components.get(componentType);

        if (!component) {
            throw new Error(`component type not found: '${componentType}'`);
        }

        this.property = component.ins.getProperty(key);
    }

    attachOutput(scope: Node | Graph | System, componentType: ComponentOrType, key: string)
    {
        let component = scope instanceof Node
            ? _findInSubtree(componentType, scope)
            : scope.components.get(componentType);

        if (!component) {
            throw new Error(`component type not found: '${componentType}'`);
        }

        this.property = component.outs.getProperty(key);
    }

    detach()
    {
        if (this._property) {
            this._property.off("value", this.onPropertyValue, this);
            this._property.off<IPropertyDisposeEvent>("dispose", this.onPropertyDispose, this);
        }
    }

    isAttached(): boolean
    {
        return !!this._property;
    }

    protected onPropertyValue(value: T)
    {
        if (this._callback) {
            if (this._context) {
                this._callback.call(this._context, value);
            }
            else {
                this._callback(value);
            }
        }
    }

    protected onPropertyDispose()
    {
        this._property.off("value", this.onPropertyValue, this);
        this._property.off("dispose", this.onPropertyDispose, this);
        this._property = null;
    }
}

