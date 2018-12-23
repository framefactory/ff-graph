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
     * @param {Component} component
     */
    _add(component: Component)
    {
        if (this._dict[component.id]) {
            throw new Error("component already registered");
        }

        // add component
        this._list.push(component);
        this._dict[component.id] = component;

        let prototype = component;

        const event = { type: "component", add: true, remove: false, component };
        this.emit<IComponentEvent>(event);

        // add all types in prototype chain
        do {
            prototype = Object.getPrototypeOf(prototype);
            const type = prototype.type;
            (this._typeDict[type] || (this._typeDict[type] = [])).push(component);

            event.type = type;
            this.emit<IComponentEvent>(event);

        } while(prototype.type !== Component.type);
    }

    /**
     * Removes a component from the set.
     * @param component
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

        let prototype = component;

        const event = { type: "component", add: false, remove: true, component };
        this.emit<IComponentEvent>(event);

        // remove all types in prototype chain
        do {
            prototype = Object.getPrototypeOf(prototype);
            const type = prototype.type;
            const components = this._typeDict[type];
            index = components.indexOf(component);
            components.splice(index, 1);

            event.type = type;
            this.emit<IComponentEvent>(event);

        } while(prototype.type !== Component.type);
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
    get<T extends Component>(componentOrType: ComponentOrType<T> | T): T | undefined
    {
        const components = this._typeDict[getComponentTypeString(componentOrType)];
        return components ? components[0] as T : undefined;
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
     * @param name Name of the event, type name of the component, or component constructor.
     * @param callback Event handler function.
     * @param context Optional context object on which to call the event handler function.
     */
    on(name: string | string[] | ComponentOrType, callback: (event: any) => void, context?: any): void
    {
        if (typeof name !== "string" && !Array.isArray(name)) {
            name = name.type;
        }

        super.on(name, callback, context);
    }

    /**
     * Removes a listener for a component add/remove event.
     * @param name Name of the event, type name of the component, or component constructor.
     * @param callback Event handler function.
     * @param context Optional context object on which to call the event handler function.
     */
    off(name: string | string[] | ComponentOrType, callback?: (event: any) => void, context?: any): void
    {
        if (typeof name !== "string" && !Array.isArray(name)) {
            name = name.type;
        }

        super.off(name, callback, context);
    }

    /**
     * Adds a one-time listener for a component add/remove event.
     * @param name Name of the event, type name of the component, or component constructor.
     * @param callback Event handler function.
     * @param context Optional context object on which to call the event handler function.
     */
    once(name: string | string[] | ComponentOrType, callback: (event: any) => void, context?: any): void
    {
        if (typeof name !== "string" && !Array.isArray(name)) {
            name = name.type;
        }

        super.once(name, callback, context);
    }
}