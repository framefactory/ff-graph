/**
 * FF Typescript Foundation Library
 * Copyright 2018 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import Component, { ComponentOrClass } from "./Component";
import System from "./System";

////////////////////////////////////////////////////////////////////////////////

/**
 * Maintains a weak reference to a component.
 * The reference is set to null after the linked component is removed.
 */
export default class ComponentReference<T extends Component = Component>
{
    private _id: string;
    private readonly _className: string;
    private readonly _system: System;

    constructor(system: System, scope?: ComponentOrClass<T>) {
        this._className = scope ? Component.getClassName(scope) : null;
        this._id = scope instanceof Component ? scope.id : undefined;
        this._system = system;
    }

    get component(): T | null {
        return this._id ? this._system.components.getById(this._id) as T || null : null;
    }
    set component(component: T) {
        if (component && this._className && !(component instanceof this._system.registry.getClass(this._className))) {
            throw new Error(`can't assign component of class '${(component as Component).constructor.name || "unknown"}' to link of class '${this._className}'`);
        }
        this._id = component ? component.id : undefined;
    }
}