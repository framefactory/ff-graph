/**
 * FF Typescript Foundation Library
 * Copyright 2018 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import { Dictionary } from "@ff/core/types";
import Publisher, { ITypedEvent } from "@ff/core/Publisher";

import { ILinkable } from "./PropertySet";
import Component, { ComponentOrType, getComponentTypeString } from "./Component";

////////////////////////////////////////////////////////////////////////////////

const _EMPTY_ARRAY = [];

export interface ILinkableSorter
{
    sort(linkables: ILinkable[]): ILinkable[];
}

export interface IComponentEvent<T extends Component = Component> extends ITypedEvent<string>
{
    add: boolean;
    remove: boolean;
    component: T;
}

export default class ComponentSet extends Publisher
{
    protected _typeDict: Dictionary<Component[]> = {};
    protected _dict: Dictionary<Component> = {};
    protected _list: Component[] = [];

    constructor()
    {
        super({ knownEvents: false });
    }

    /**
     * Adds a new component to the set.
     * @param component
     * @private
     */
    _add(component: Component)
    {
        if (this._dict[component.id]) {
            throw new Error("component already registered");
        }

        // add component
        this._list.push(component);
        this._dict[component.id] = component;

        let prototype = Object.getPrototypeOf(component);

        const event = { type: "component", add: true, remove: false, component };
        this.emit<IComponentEvent>(event);

        // add all types in prototype chain
        while (prototype.type !== Component.type) {
            const type = prototype.type;
            (this._typeDict[type] || (this._typeDict[type] = [])).push(component);

            event.type = type;
            this.emit<IComponentEvent>(event);

            prototype = Object.getPrototypeOf(prototype);
        }
    }

    /**
     * Removes a component from the set.
     * @param component
     * @private
     */
    _remove(component: Component)
    {
        let index = this._list.indexOf(component);
        if (index < 0) {
            throw new Error("component not found");
        }

        // remove component
        delete this._dict[component.id];
        this._list.splice(index, 1);

        let prototype = Object.getPrototypeOf(component);

        const event = { type: "component", add: false, remove: true, component };
        this.emit<IComponentEvent>(event);

        // remove all types in prototype chain
        while (prototype.type !== Component.type) {
            const type = prototype.type;
            const components = this._typeDict[type];
            index = components.indexOf(component);
            components.splice(index, 1);

            event.type = type;
            this.emit<IComponentEvent>(event);

            prototype = Object.getPrototypeOf(prototype);
        }
    }

    /**
     * Removes all components from the set.
     * @private
     */
    _clear()
    {
        const components = this.cloneArray();
        components.forEach(component => this._remove(component));
    }

    get length() {
        return this._list.length;
    }

    sort(sorter: ILinkableSorter)
    {
        console.log("ComponentSet.sort");
        this._list = sorter.sort(this._list) as Component[];
    }

    /**
     * Returns true if there are components (of a certain type if given) in this set.
     * @param componentOrType
     */
    has(componentOrType: ComponentOrType): boolean
    {
        const components = this._typeDict[getComponentTypeString(componentOrType)];
        return components && components.length > 0;
    }

    /**
     * Returns true if the given component is part of this set.
     * @param component
     */
    contains(component: Component): boolean
    {
        return !!this._dict[component.id];
    }

    /**
     * Returns the number of components (of a certain type if given) in this set.
     * @param componentOrType
     */
    count(componentOrType?: ComponentOrType): number
    {
        const components = componentOrType ? this._typeDict[getComponentTypeString(componentOrType)] : this._list;
        return components ? components.length : 0;
    }

    /**
     * Returns an array of components in this set of a specific type if given.
     * @param componentOrType If given only returns components of the given type.
     */
    getArray<T extends Component>(componentOrType?: ComponentOrType<T> | T): Readonly<T[]>
    {
        if (componentOrType) {
            return (this._typeDict[getComponentTypeString(componentOrType)] || _EMPTY_ARRAY) as T[];
        }

        return this._list as T[];
    }

    cloneArray<T extends Component>(componentOrType?: ComponentOrType<T> | T): Readonly<T[]>
    {
        return this.getArray(componentOrType).slice();
    }

    /**
     * Returns the first found component in this set of the given type.
     * @param componentOrType Type of component to return.
     */
    get<T extends Component = Component>(componentOrType?: ComponentOrType<T> | T): T | undefined
    {
        if (componentOrType) {
            const components = this._typeDict[getComponentTypeString(componentOrType)];
            return components ? components[0] as T : undefined;
        }

        return this._list[0] as T;
    }

    /**
     * Returns the first found component in this set of the given type.
     * Throws an exception if there is no component of the specified type.
     * @param componentOrType Type of component to return.
     */
    getSafe<T extends Component = Component>(componentOrType: ComponentOrType<T> | T): T
    {
        const type = getComponentTypeString(componentOrType);
        const components = this._typeDict[type];
        const component = components ? components[0] as T : undefined;
        if (!component) {
            throw new Error(`missing component: '${type}'`);
        }

        return component;
    }

    /**
     * Returns the component with the given identifier in this set.
     * @param id Identifier of the node to retrieve.
     */
    getById(id: string): Component | undefined
    {
        return this._dict[id];
    }

    /**
     * Returns the first component of the given type with the given name, or null if no component
     * with the given name exists. Performs a linear search, returns the first matching component found.
     * @param name Name of the component to find.
     * @param componentOrType Optional type restriction.
     */
    findByName<T extends Component>(name: string, componentOrType?: ComponentOrType<T>): T | undefined
    {
        const components = this.getArray(componentOrType);

        for (let i = 0, n = components.length; i < n; ++i) {
            if (components[i].name === name) {
                return components[i];
            }
        }

        return null;
    }

    /**
     * Adds a listener for a component add/remove event.
     * @param type Name of the event, type name of the component, or component constructor.
     * @param callback Callback function, invoked when the event is emitted.
     * @param context Optional: this context for the callback invocation.
     */
    on<T extends ITypedEvent<string>>(type: T["type"] | T["type"][], callback: (event: T) => void, context?: any);
    on(type: ComponentOrType, callback: (event: IComponentEvent) => void, context?: any);
    on(type: string | string[], callback: (event: any) => void, context?: any);
    on(type, callback, context?)
    {
        if (typeof type !== "string" && !Array.isArray(type)) {
            type = type.type;
        }

        super.on(type, callback, context);
    }

    /**
     * Adds a one-time listener for a component add/remove event.
     * @param type Name of the event, type name of the component, or component constructor.
     * @param callback Callback function, invoked when the event is emitted.
     * @param context Optional: this context for the callback invocation.
     */
    once<T extends ITypedEvent<string>>(type: T["type"] | T["type"][], callback: (event: T) => void, context?: any);
    once(type: ComponentOrType, callback: (event: IComponentEvent) => void, context?: any);
    once(type: string | string[], callback: (event: any) => void, context?: any);
    once(type, callback, context?)
    {
        if (typeof type !== "string" && !Array.isArray(type)) {
            type = type.type;
        }

        super.once(type, callback, context);
    }

    /**
     * Removes a listener for a component add/remove event.
     * @param type Name of the event, type name of the component, or component constructor.
     * @param callback Callback function, invoked when the event is emitted.
     * @param context Optional: this context for the callback invocation.
     */
    off<T extends ITypedEvent<string>>(type: T["type"] | T["type"][], callback: (event: T) => void, context?: any);
    off(type: ComponentOrType, callback: (event: IComponentEvent) => void, context?: any);
    off(type: string | string[], callback: (event: any) => void, context?: any);
    off(type, callback, context?)
    {
        if (typeof type !== "string" && !Array.isArray(type)) {
            type = type.type;
        }

        super.off(type, callback, context);
    }
}