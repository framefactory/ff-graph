/**
 * FF Typescript Foundation Library
 * Copyright 2018 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */
import { Readonly } from "@ff/core/types";

import Component, { ComponentOrType, IComponentEvent } from "./Component";
import Node from "./Node";

////////////////////////////////////////////////////////////////////////////////

export { Node };

const _getChildComponent = <T extends Component>(
    hierarchy: Hierarchy, componentOrType: ComponentOrType<T>, recursive: boolean): T | null => {

    let component;

    const children = hierarchy.children;
    for (let i = 0, n = children.length; i < n; ++i) {
        component = children[i].components.get(componentOrType);

        if (component) {
            return component;
        }
    }

    if (recursive) {
        for (let i = 0, n = children.length; i < n; ++i) {
            component = _getChildComponent(children[i], componentOrType, true);
            if (component) {
                return component;
            }
        }
    }

    return null;
};

const _getChildComponents = <T extends Component>(
    hierarchy: Hierarchy, componentOrType: ComponentOrType<T>, recursive: boolean): T[] => {

    let components = [];

    const children = hierarchy.children;
    for (let i = 0, n = children.length; i < n; ++i) {
        components = components.concat(children[i].components.getArray(componentOrType));
    }

    if (recursive) {
        for (let i = 0, n = children.length; i < n; ++i) {
            components = components.concat(_getChildComponents(children[i], componentOrType, true));
        }
    }

    return components;
};

////////////////////////////////////////////////////////////////////////////////

/**
 * Emitted by [[Hierarchy]] component after the instance's state has changed.
 * @event
 */
export interface IHierarchyEvent extends IComponentEvent<Hierarchy>
{
    parent: Hierarchy;
    child: Hierarchy;
    add: boolean;
    remove: boolean;
}

/**
 * Allows arranging components in a hierarchical structure.
 *
 * ### Events
 * - *"change"* - emits [[IHierarchyChangeEvent]] after the instance's state has changed.
 */
export default class Hierarchy extends Component
{
    static readonly type: string = "Hierarchy";

    static readonly hierarchyEvent: "hierarchy";

    protected _parent: Hierarchy = null;
    protected _children: Hierarchy[] = [];

    constructor(node: Node, id?: string)
    {
        super(node, id);
        this.addEvent(Hierarchy.hierarchyEvent);
    }

    /**
     * Returns the parent component of this.
     * @returns {Hierarchy}
     */
    get parent(): Hierarchy
    {
        return this._parent;
    }

    /**
     * Returns an array of child components of this.
     * @returns {Readonly<Hierarchy[]>}
     */
    get children(): Readonly<Hierarchy[]>
    {
        return this._children || [];
    }

    dispose()
    {
        // detach this from its parent
        if (this._parent) {
            this._parent.removeChild(this);
        }

        // dispose of children
        this._children.slice().forEach(child => child.node.dispose());

        super.dispose();
    }

    /**
     * Returns the root element of the hierarchy this component belongs to.
     * The root element is the hierarchy component that has no parent.
     * @returns {Hierarchy} The root hierarchy component.
     */
    getRoot<T extends Component>(componentOrType: ComponentOrType<T>): T | null
    {
        let root: Hierarchy = this;
        while(root._parent) {
            root = root._parent;
        }

        return root ? root.node.components.get(componentOrType) : null;
    }

    getParent<T extends Component>(componentOrType: ComponentOrType<T>): T | null
    {
        const parent = this.parent;
        return parent ? parent.node.components.get(componentOrType) : null;
    }

    /**
     * Searches for the given component type in this node and then recursively
     * in all parent nodes.
     * @param componentOrType
     * @returns The component if found or undefined else.
     */
    getNearestParent<T extends Component>(componentOrType: ComponentOrType<T>): T | null
    {
        let root = this.hierarchy;
        let component = null;

        while(!component && root) {
            component = root.node.components.get(componentOrType);
            root = root._parent;
        }

        return component;
    }

    /**
     * Returns the child component of the given type.
     * @param componentOrType
     * @param recursive If true, extends search to entire subtree (breadth-first).
     */
    getChild<T extends Component>(componentOrType: ComponentOrType<T>, recursive: boolean): T | null
    {
        return _getChildComponent(this, componentOrType, recursive);
    }

    /**
     * Returns all child components of the given type.
     * @param componentOrType
     * @param recursive If true, extends search to entire subtree (breadth-first).
     */
    getChildren<T extends Component>(componentOrType: ComponentOrType<T>, recursive: boolean): Readonly<T[]>
    {
        return _getChildComponents(this, componentOrType, recursive);
    }

    /**
     * Returns true if there is a child component of the given type.
     * @param componentOrType
     * @param recursive If true, extends search to entire subtree (breadth-first).
     */
    hasChildren<T extends Component>(componentOrType: ComponentOrType<T>, recursive: boolean): boolean
    {
        return !!_getChildComponent(this, componentOrType, recursive);
    }

    /**
     * Adds another hierarchy component as a child to this component.
     * Emits a hierarchy event at this component, its node and all their parents.
     * @param {Hierarchy} component
     */
    addChild(component: Hierarchy)
    {
        if (component._parent) {
            throw new Error("component should not have a parent");
        }

        component._parent = this;
        this._children.push(component);

        const event = {
            add: true, remove: false, parent: this, child: component
        };

        while (component) {
            component.emit(Hierarchy.hierarchyEvent, event);
            component.node.emit(Hierarchy.hierarchyEvent, event);
            component = component._parent;
        }

        this.system.emit(Hierarchy.hierarchyEvent, event);
    }

    /**
     * Removes a child component from this hierarchy component.
     * Emits a hierarchy event at this component, its node and all their parents.
     * @param {Hierarchy} component
     */
    removeChild(component: Hierarchy)
    {
        if (component._parent !== this) {
            throw new Error("component not a child of this");
        }

        const index = this._children.indexOf(component);
        this._children.splice(index, 1);
        component._parent = null;

        const event = {
            add: false, remove: true, parent: this, child: component
        };

        while (component) {
            component.emit(Hierarchy.hierarchyEvent, event);
            component.node.emit(Hierarchy.hierarchyEvent, event);
            component = component._parent;
        }

        this.system.emit(Hierarchy.hierarchyEvent, event);
    }

    /**
     * Returns a text representation of this object.
     * @returns {string}
     */
    toString()
    {
        return super.toString() + ` - children: ${this.children.length}`;
    }
}
