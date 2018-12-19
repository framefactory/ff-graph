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

const _findNode = (hierarchy: Hierarchy, name: string): Node | null => {
    if (hierarchy.node.name === name) {
        return hierarchy.node;
    }

    const children = hierarchy.children;
    for (let i = 0, n = children.length; i < n; ++i) {
        const descendant = _findNode(children[i], name);
        if (descendant) {
            return descendant;
        }
    }

    return null;
};

const _findOne = <T extends Component>(hierarchy: Hierarchy, componentOrType: ComponentOrType<T>): T | null => {
    const sibling = hierarchy.components.get(componentOrType);
    if (sibling) {
        return sibling;
    }

    const children = hierarchy.children;
    for (let i = 0, n = children.length; i < n; ++i) {
        const descendant = _findOne(children[i], componentOrType);
        if (descendant) {
            return descendant;
        }
    }

    return null;
};

const _findAll = <T extends Component>(hierarchy: Hierarchy, componentOrType: ComponentOrType<T>): T[] => {

    let result = hierarchy.components.getArray(componentOrType);

    const children = hierarchy.children;
    for (let i = 0, n = children.length; i < n; ++i) {
        const descendants = _findAll(children[i], componentOrType);
        if (descendants.length > 0) {
            result = result.concat(descendants);
        }
    }

    return result;
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
     * Returns the root element of the hierarchy this component belongs to.
     * The root element is the hierarchy component that has no parent.
     * @returns {Hierarchy} The root hierarchy component.
     */
    getRoot(): Hierarchy
    {
        let root: Hierarchy = this;
        while(root._parent) {
            root = root._parent;
        }

        return root;
    }

    findChildNode(name: string): Node | null
    {
        return _findNode(this, name);
    }

    getChildComponent<T extends Component>(componentOrType: ComponentOrType<T>): T | null
    {
        return _findOne(this, componentOrType);
    }

    getChildComponents<T extends Component>(componentOrType: ComponentOrType<T>): Readonly<T[]>
    {
        return _findAll(this, componentOrType);
    }

    hasChildComponents<T extends Component>(componentOrType: ComponentOrType<T>): boolean
    {
        return !!_findOne(this, componentOrType);
    }

    /**
     * Searches for the given component type in this node and then recursively
     * in all parent nodes.
     * @param {ComponentOrType<T>} componentOrType
     * @returns {T | undefined} The component if found or undefined else.
     */
    getNearestParentComponent<T extends Component>(componentOrType: ComponentOrType<T>): T | undefined
    {
        let root: Hierarchy = this;
        let component = undefined;

        while(!component && root) {
            component = root.components.get(componentOrType);
            root = root._parent;
        }

        return component;
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
