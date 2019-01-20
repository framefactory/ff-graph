/**
 * FF Typescript Foundation Library
 * Copyright 2018 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import Component, { ComponentOrType, getComponentTypeString } from "./Component";
import ComponentSet, { IComponentEvent } from "./ComponentSet";

////////////////////////////////////////////////////////////////////////////////

/**
 * Tracks components of a specific type in the same node.
 * Maintains a reference to the component if found and executes
 * callbacks if the component of the tracked type is added or removed.
 */
export default class ComponentTracker<T extends Component = Component>
{
    /** The type of component to track. */
    readonly type: string;
    /** Access to the component of the tracked type after it has been added. */
    component: T;
    /** Called after a component of the tracked type has been added to the node. */
    didAdd: (component: T) => void;
    /** Called before a component of the tracked type is removed from the node. */
    willRemove: (component: T) => void;

    private _set: ComponentSet;

    constructor(set: ComponentSet, componentOrType: ComponentOrType<T>,
                didAdd?: (component: T) => void, willRemove?: (component: T) => void) {

        this.type = getComponentTypeString(componentOrType);
        this.didAdd = didAdd;
        this.willRemove = willRemove;

        this._set = set;

        set.on(this.type, this.onComponent, this);
        this.component = set.get(componentOrType);

        if (this.component && didAdd) {
            didAdd(this.component);
        }
    }

    dispose()
    {
        this._set.off(this.type, this.onComponent, this);
        this.component = null;
        this.didAdd = null;
        this.willRemove = null;

    }

    protected onComponent(event: IComponentEvent<T>)
    {
        if (event.add) {
            this.component = event.component;
            this.didAdd && this.didAdd(event.component);
        }
        else if (event.remove) {
            this.willRemove && this.willRemove(event.component);
            this.component = null;
        }
    }
}