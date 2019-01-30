/**
 * FF Typescript Foundation Library
 * Copyright 2018 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import { Dictionary } from "@ff/core/types";
import Publisher, { ITypedEvent } from "@ff/core/Publisher";

//import { ILinkable } from "./PropertyGroup";
import Component, { ComponentOrType, componentTypeName } from "./Component";

////////////////////////////////////////////////////////////////////////////////

const _EMPTY_ARRAY = [];

// export interface ILinkableSorter
// {
//     sort(linkables: ILinkable[]): ILinkable[];
// }

export interface IComponentEvent<T extends Component = Component> extends ITypedEvent<string>
{
    add: boolean;
    remove: boolean;
    component: T;
}

export default class ComponentSet extends Publisher
{
    protected _typeLists: Dictionary<Component[]> = { [Component.type]: [] };
    protected _idDict: Dictionary<Component> = {};

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
        if (this._idDict[component.id] !== undefined) {
            throw new Error("component already in set");
        }

        // add component to id dictionary
        this._idDict[component.id] = component;

        let prototype = component;
        const event = { type: "", add: true, remove: false, component };

        // add all types in prototype chain
        do {
            prototype = Object.getPrototypeOf(prototype);

            const type = prototype.type;
            (this._typeLists[type] || (this._typeLists[type] = [])).push(component);

            event.type = type;
            this.emit<IComponentEvent>(event);

        } while (prototype.type !== Component.type);
    }

    /**
     * Removes a component from the set.
     * @param component
     * @private
     */
    _remove(component: Component)
    {
        if (this._idDict[component.id] !== component) {
            throw new Error("component not in set");
        }

        // remove component
        delete this._idDict[component.id];

        let prototype = component;
        const event = { type: "", add: false, remove: true, component };

        // remove all types in prototype chain
        do {
            prototype = Object.getPrototypeOf(prototype);

            const type = prototype.type;
            const components = this._typeLists[type];
            components.splice(components.indexOf(component), 1);

            event.type = type;
            this.emit<IComponentEvent>(event);

        } while (prototype.type !== Component.type);
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
        return this._typeLists[Component.type].length;
    }

    // sort(sorter: ILinkableSorter)
    // {
    //     console.log("ComponentSet.sort");
    //     this._typeLists[Component.type] = sorter.sort(this._typeLists[Component.type]) as Component[];
    // }

    /**
     * Returns true if there are components (of a certain type if given) in this set.
     * @param componentOrType
     */
    has(componentOrType: ComponentOrType): boolean
    {
        const components = this._typeLists[componentTypeName(componentOrType)];
        return components && components.length > 0;
    }

    /**
     * Returns true if the given component is part of this set.
     * @param component
     */
    contains(component: Component): boolean
    {
        return !!this._idDict[component.id];
    }

    /**
     * Returns the number of components (of a certain type if given) in this set.
     * @param componentOrType
     */
    count(componentOrType?: ComponentOrType): number
    {
        const components = this._typeLists[componentTypeName(componentOrType)];
        return components ? components.length : 0;
    }

    getDictionary(): Readonly<Dictionary<Component>>
    {
        return this._idDict;
    }

    /**
     * Returns an array of components in this set of a specific type if given.
     * @param componentOrType If given only returns components of the given type.
     */
    getArray<T extends Component>(componentOrType?: ComponentOrType<T>): Readonly<T[]>
    {
        return (this._typeLists[componentTypeName(componentOrType)] || _EMPTY_ARRAY) as T[];
    }

    cloneArray<T extends Component>(componentOrType?: ComponentOrType<T>): Readonly<T[]>
    {
        return this.getArray(componentOrType).slice();
    }

    /**
     * Returns the first found component in this set of the given type.
     * @param componentOrType Type of component to return.
     * @param throws If true, the method throws an error if no component was found.
     */
    get<T extends Component = Component>(componentOrType?: ComponentOrType<T>, throws: boolean = false): T | undefined
    {
        const type = componentTypeName(componentOrType);
        const components = this._typeLists[type];
        const component = components ? components[0] as T : undefined;

        if (throws && !component) {
            throw new Error(`no components of type '${type}' in set`);
        }

        return component;
    }

    /**
     * Returns the first found component in this set of the given type.
     * Throws an exception if there is no component of the specified type.
     * @param componentOrType Type of component to return.
     * @deprecated
     */
    safeGet<T extends Component = Component>(componentOrType: ComponentOrType<T>): T
    {
        const type = componentTypeName(componentOrType);
        const components = this._typeLists[type];
        const component = components ? components[0] as T : undefined;
        if (!component) {
            throw new Error(`no components of type '${type}' in set`);
        }

        return component;
    }

    /**
     * Returns a component by its identifier.
     * @param id A component's identifier.
     */
    getById(id: string): Component | null
    {
        return this._idDict[id] || null;
    }

    /**
     * Returns the first component of the given type with the given name, or null if no component
     * with the given name exists. Performs a linear search, returns the first matching component found.
     * @param name Name of the component to find.
     * @param componentOrType Optional type restriction.
     */
    findByName<T extends Component = Component>(name: string, componentOrType?: ComponentOrType<T>): T | null
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
     * @param componentOrType Type name of the component, or component constructor.
     * @param callback Callback function, invoked when the event is emitted.
     * @param context Optional: this context for the callback invocation.
     */
    on<T extends Component>(componentOrType: ComponentOrType<T>, callback: (event: IComponentEvent<T>) => void, context?: any)
    {
        super.on(componentTypeName(componentOrType), callback, context);
    }

    /**
     * Adds a one-time listener for a component add/remove event.
     * @param componentOrType Type name of the component, or component constructor.
     * @param callback Callback function, invoked when the event is emitted.
     * @param context Optional: this context for the callback invocation.
     */
    once<T extends Component>(componentOrType: ComponentOrType<T>, callback: (event: IComponentEvent<T>) => void, context?: any)
    {
        super.once(componentTypeName(componentOrType), callback, context);
    }

    /**
     * Removes a listener for a component add/remove event.
     * @param componentOrType Type name of the component, or component constructor.
     * @param callback Callback function, invoked when the event is emitted.
     * @param context Optional: this context for the callback invocation.
     */
    off<T extends Component>(componentOrType: ComponentOrType<T>, callback: (event: IComponentEvent<T>) => void, context?: any)
    {
        super.off(componentTypeName(componentOrType), callback, context);
    }

    toString(verbose: boolean = false)
    {
        if (verbose) {
            return this.getArray().map(component => component.displayName).join("\n");
        }

        return `components: ${this.length}, types: ${Object.keys(this._typeLists).length}`;
    }
}