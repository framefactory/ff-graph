/**
 * FF Typescript Foundation Library
 * Copyright 2018 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import Component, { ComponentOrType, componentTypeName } from "./Component";
import System from "./System";

////////////////////////////////////////////////////////////////////////////////

/**
 * Maintains a weak reference to a component.
 * The reference is set to null after the linked component is removed.
 */
export default class ComponentReference<T extends Component = Component>
{
    private _id: string;
    private readonly _type: string;
    private readonly _system: System;

    constructor(system: System, componentOrType?: ComponentOrType<T>) {
        this._type = componentOrType ? componentTypeName(componentOrType) : null;
        this._id = componentOrType instanceof Component ? componentOrType.id : undefined;
        this._system = system;
    }

    get component(): T | null {
        return this._id ? this._system.components.getById(this._id) as T || null : null;
    }
    set component(component: T) {
        if (component && this._type && !(component instanceof this._system.registry.getComponentType(this._type))) {
            throw new Error(`can't assign component of type '${(component as Component).type || "unknown"}' to link of type '${this._type}'`);
        }
        this._id = component ? component.id : undefined;
    }
}