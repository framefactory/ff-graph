/**
 * FF Typescript Foundation Library
 * Copyright 2018 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import { IPropagatingEvent, ITypedEvent } from "@ff/core/Publisher";

import Component, { ComponentOrClass, types } from "../Component";
import Node from "../Node";
import CGraph from "./CGraph";

////////////////////////////////////////////////////////////////////////////////

export { Node };

const _getChildComponent = <T extends Component>(
    hierarchy: CHierarchy, componentOrType: ComponentOrClass<T>, recursive: boolean): T | null => {

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
    hierarchy: CHierarchy, componentOrType: ComponentOrClass<T>, recursive: boolean): T[] => {

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
 * Emitted by [[Hierarchy]] components if a hierarchy relation has changed in its tree line.
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
 * Emitted by [[Hierarchy]] components if a child component has been added or removed.
 * @event
 */
export interface IChildComponentEvent extends ITypedEvent<"child-component">
{
    add: boolean;
    remove: boolean;
    component: Component;
}

const _inputs = {
    blocked: types.Boolean("Hierarchy.Blocked"),
};

/**
 * Allows arranging components in a hierarchical structure.
 *
 * ### Events
 * - *"hierarchy"* - emits [[IHierarchyEvent]] if a hierarchy relation has changed in the component's tree line.
 * - *"child-component"* - emits [[IChildComponentEvent]] if a child component has been added or removed.
 */
export default class CHierarchy extends Component
{
    ins = this.addInputs(_inputs);

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

    create()
    {
        super.create();
        this.graph._addRoot(this);
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
    getRoot<T extends Component>(componentOrType: ComponentOrClass<T>): T | null
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
    getParent<T extends Component>(componentOrType: ComponentOrClass<T>, recursive: boolean): T | undefined
    {
        let parent = this._parent;

        do {
            while(parent) {
                const component = parent.node.components.get(componentOrType, true);
                if (component) {
                    return component;
                }

                parent = parent._parent;

                // if at root, continue search at parent graph
                if (!parent) {
                    const parentGraphComponent = this.graph.parent;
                    parent = parentGraphComponent ? parentGraphComponent.hierarchy : undefined;
                }

            }
        } while(parent && recursive);

        return undefined;
    }

    /**
     * Returns the child component of the given type.
     * @param componentOrType
     * @param recursive If true, extends search to entire subtree (breadth-first).
     */
    getChild<T extends Component>(componentOrType: ComponentOrClass<T>, recursive: boolean): T | null
    {
        return _getChildComponent(this, componentOrType, recursive);
    }

    /**
     * Returns all child components of the given type.
     * @param componentOrType
     * @param recursive If true, extends search to entire subtree (breadth-first).
     */
    getChildren<T extends Component>(componentOrType: ComponentOrClass<T>, recursive: boolean): Readonly<T[]>
    {
        return _getChildComponents(this, componentOrType, recursive);
    }

    /**
     * Traverses the hierarchy up starting from this component. Executes the given callback function
     * for each visited component.
     * @param includeThis Includes this component in traversal.
     * @param includeSiblings For each hierarchy component, executes callback for all sibling components in the same node.
     * @param acrossGraphs When arriving at the root hierarchy component, continues traversal at the parent graph.
     * @param callback The callback function to execute for each visited component.
     */
    traverseUp(includeThis: boolean, includeSiblings: boolean, acrossGraphs: boolean, callback: (component: Component) => boolean)
    {
        if (includeThis) {
            if (includeSiblings) {
                const siblings = this.node.components.getArray();
                for (let i = 0, n = siblings.length; i < n; ++i) {
                    if (callback(siblings[i])) {
                        return;
                    }
                }
            }
            else if (callback(this)) {
                return;
            }
        }

        let parent = this._parent;

        if (!parent && acrossGraphs) {
            const graphComponent = this.node.graph.parent;
            parent = graphComponent ? graphComponent.getComponent(CHierarchy, true) : null;
        }

        if (parent) {
            parent.traverseUp(true, includeSiblings, acrossGraphs, callback);
        }
    }

    /**
     * Traverses the hierarchy down starting from this component. Executes the given callback function
     * for each visited component.
     * @param includeThis Includes this component in traversal.
     * @param includeSiblings For each hierarchy component, executes callback for all sibling components in the same node.
     * @param acrossGraphs Includes subgraphs in traversal.
     * @param callback The callback function to execute for each visited component.
     */
    traverseDown(includeThis: boolean, includeSiblings: boolean, acrossGraphs: boolean, callback: (component: Component) => boolean)
    {
        if (includeThis) {
            if (includeSiblings) {
                const siblings = this.node.components.getArray();
                for (let i = 0, n = siblings.length; i < n; ++i) {
                    if (callback(siblings[i])) {
                        return;
                    }
                }
            }
            else if (callback(this)) {
                return;
            }
        }

        if (acrossGraphs) {
            const graphs = this.node.components.getArray(CGraph);
            for (let i = 0, n = graphs.length; i < n; ++i) {
                const innerRoots = graphs[i].getInnerRoots();
                for (let j = 0, m = innerRoots.length; j < m; ++j) {
                    innerRoots[j].traverseDown(true, includeSiblings, acrossGraphs, callback);
                }
            }
        }

        const children = this._children;
        for (let i = 0, n = children.length; i < n; ++i) {
            children[i].traverseDown(true, includeSiblings, acrossGraphs, callback);
        }
    }

    /**
     * Emits the given event on this component and on all parent components.
     * Stops propagation as soon as `stopPropagation` is set to true on the event.
     * @param includeSiblings Also emits the event on all sibling components in the same node.
     * @param acrossGraphs When arriving at the root hierarchy component, continues traversal at the parent graph.
     * @param event The event to be emitted.
     */
    propagateUp(includeSiblings: boolean, acrossGraphs: boolean, event: IPropagatingEvent<string>)
    {
        this.traverseUp(true, includeSiblings, acrossGraphs, component => {
            component.emit(event);
            return event.stopPropagation;
        });
    }

    /**
     * Emits the given event on this component and on all child components.
     * Stops propagation as soon as `stopPropagation` is set to true on the event.
     * @param includeSiblings Also emits the event on all sibling components in the same node.
     * @param acrossGraphs Includes subgraphs in traversal.
     * @param event The event to be emitted.
     */
    propagateDown(includeSiblings: boolean, acrossGraphs: boolean, event: IPropagatingEvent<string>)
    {
        this.traverseDown(true, includeSiblings, acrossGraphs, component => {
            component.emit(event);
            return event.stopPropagation;
        });
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

        component._parent = this;
        this._children.push(component);

        this.graph._removeRoot(component);

        const event: IHierarchyEvent = {
            type: "hierarchy", add: true, remove: false, parent: this, child: component
        };

        this.traverseUp(true, false, true, component => component.emit(event));
        this.traverseDown(false, false, true, component => component.emit(event));
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

        this.graph._addRoot(component);

        const event: IHierarchyEvent = {
            type: "hierarchy", add: false, remove: true, parent: this, child: component
        };

        this.traverseUp(true, false, true, component => component.emit(event));
        this.traverseDown(false, false, true, component => component.emit(event));
        this.system.emit<IHierarchyEvent>(event);
    }

    deflate()
    {
        const json = super.deflate();

        if (this._children.length > 0) {
            json.children = this._children.map(child => child.id);
        }

        return json;
    }

    inflateReferences(json: any)
    {
        super.inflateReferences(json);

        const dict = this.system.components.getDictionary();

        if (json.children) {
            json.children.forEach(childId => {
                const child = dict[childId] as CHierarchy;
                this.addChild(child);
            })
        }
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
