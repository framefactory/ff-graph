/**
 * FF Typescript Foundation Library
 * Copyright 2018 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import { ITypedEvent } from "@ff/core/Publisher";

import Component, { ComponentOrType } from "../Component";
import Node from "../Node";

////////////////////////////////////////////////////////////////////////////////

export { Node };

const _getChildComponent = <T extends Component>(
    hierarchy: CHierarchy, componentOrType: ComponentOrType<T>, recursive: boolean): T | null => {

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
    hierarchy: CHierarchy, componentOrType: ComponentOrType<T>, recursive: boolean): T[] => {

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
 * Emitted by [[Hierarchy]] component after it's parent has changed.
 * @event
 */
export interface IHierarchyEvent extends ITypedEvent<"hierarchy">
{
    parent: CHierarchy;
    child: CHierarchy;
    add: boolean;
    remove: boolean;
}

/**
 * Allows arranging components in a hierarchical structure.
 *
 * ### Events
 * - *"change"* - emits [[IHierarchyChangeEvent]] after the instance's state has changed.
 */
export default class CHierarchy extends Component
{
    static readonly type: string = "CHierarchy";

    protected _parent: CHierarchy = null;
    protected _children: CHierarchy[] = [];

    /**
     * Returns the parent component of this.
     * @returns {CHierarchy}
     */
    get parent(): CHierarchy
    {
        return this._parent;
    }

    /**
     * Returns an array of child components of this.
     * @returns {Readonly<CHierarchy[]>}
     */
    get children(): Readonly<CHierarchy[]>
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
     * Returns a component at the root of the hierarchy.
     * @returns A component of the given type that is a sibling of the root hierarchy component.
     */
    getRoot<T extends Component>(componentOrType: ComponentOrType<T>): T | null
    {
        let root: CHierarchy = this;
        while(root._parent) {
            root = root._parent;
        }

        return root ? root.node.components.get(componentOrType) : null;
    }

    /**
     * Returns a component from the parent node of the node of this component.
     * @param componentOrType
     * @param recursive If true, extends search to entire chain of ancestors,
     * including parent graphs.
     */
    getParent<T extends Component>(componentOrType: ComponentOrType<T>, recursive: boolean): T | null
    {
        let parent = this._parent;

        if (!parent) {
            return null;
        }

        let component = parent.node.components.get(componentOrType);
        if (component) {
            return component;
        }

        if (recursive) {
            parent = parent._parent;

            // if at root, continue search at parent graph
            if (!parent) {
                const parentGraphComponent = this.graph.parent;
                parent = parentGraphComponent ? parentGraphComponent.hierarchy : null;
            }

            while(parent) {
                component = parent.node.components.get(componentOrType);
                if (component) {
                    return component;
                }
            }
        }

        return null;
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
     * @param {CHierarchy} component
     */
    addChild(component: CHierarchy)
    {
        if (component._parent) {
            throw new Error("can't add as child: component already has a parent");
        }
        if (component === this.graph.root) {
            throw new Error("can't add as child: component is root of graph");
        }

        component._parent = this;
        this._children.push(component);

        const event: IHierarchyEvent = {
            type: "hierarchy", add: true, remove: false, parent: this, child: component
        };

        while (component) {
            component.emit<IHierarchyEvent>(event);
            component.node.emit<IHierarchyEvent>(event);
            component = component._parent;
        }

        this.graph.emit<IHierarchyEvent>(event);
        this.system.emit<IHierarchyEvent>(event);
    }

    /**
     * Removes a child component from this hierarchy component.
     * Emits a hierarchy event at this component, its node and all their parents.
     * @param {CHierarchy} component
     */
    removeChild(component: CHierarchy)
    {
        if (component._parent !== this) {
            throw new Error("component not a child of this");
        }

        const index = this._children.indexOf(component);
        this._children.splice(index, 1);
        component._parent = null;

        const event: IHierarchyEvent = {
            type: "hierarchy", add: false, remove: true, parent: this, child: component
        };

        while (component) {
            component.emit<IHierarchyEvent>(event);
            component.node.emit<IHierarchyEvent>(event);
            component = component._parent;
        }

        this.graph.emit<IHierarchyEvent>(event);
        this.system.emit<IHierarchyEvent>(event);
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
