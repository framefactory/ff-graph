/**
 * FF Typescript Foundation Library
 * Copyright 2018 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import { Dictionary, TypeOf } from "@ff/core/types";
import uniqueId from "@ff/core/uniqueId";
import Publisher, { ITypedEvent } from "@ff/core/Publisher";

import { ILinkable } from "./PropertySet";
import Component, { ComponentOrType, getComponentTypeString } from "./Component";
import ComponentSet, { IComponentEvent } from "./ComponentSet";
import Graph from "./Graph";
import System from "./System";
import Hierarchy from "./Hierarchy";

////////////////////////////////////////////////////////////////////////////////

const _EMPTY_ARRAY = [];

const _getChildNode = <T extends Node>(node: Node, nodeOrType: NodeOrType<T>, recursive: boolean): T | null => {

    const children = node.hierarchy.children;
    for (let i = 0, n = children.length; i < n; ++i) {
        const childNode = children[i].node;

        if (childNode.is(nodeOrType)) {
            return childNode as T;
        }
    }

    if (recursive) {
        for (let i = 0, n = children.length; i < n; ++i) {
            const descendant = _getChildNode(children[i].node, nodeOrType, true);
            if (descendant) {
                return descendant as T;
            }
        }
    }

    return null;
};

const _getChildNodes = <T extends Node>(node: Node, nodeOrType: NodeOrType<T>, recursive: boolean): T[] => {

    const children = node.hierarchy.children;
    let result = [];

    for (let i = 0, n = children.length; i < n; ++i) {
        const childNode = children[i].node;

        if (childNode.is(nodeOrType)) {
            result.push(childNode);
        }
    }

    if (recursive) {
        for (let i = 0, n = children.length; i < n; ++i) {
            result = result.concat(_getChildNodes(children[i].node, nodeOrType, true));
        }
    }

    return result;
};

const _findChildNode = (node: Node, name: string, recursive: boolean): Node | null => {

    const children = node.hierarchy.children;
    for (let i = 0, n = children.length; i < n; ++i) {
        const childNode = children[i].node;

        if (childNode.name === name) {
            return childNode;
        }
    }

    if (recursive) {
        for (let i = 0, n = children.length; i < n; ++i) {
            const descendant = _findChildNode(children[i].node, name, true);
            if (descendant) {
                return descendant;
            }
        }
    }

    return null;
};

////////////////////////////////////////////////////////////////////////////////

export { IComponentEvent };

/**
 * Emitted by [[Node]] after the instance's state has changed.
 * @event
 */
export interface INodeChangeEvent<T extends Node = Node> extends ITypedEvent<"change">
{
    node: T;
    what: string;
}

/**
 * Emitted by [[Node]] if the component is about to be disposed.
 * @event
 */
export interface INodeDisposeEvent<T extends Node = Node> extends ITypedEvent<"dispose">
{
    node: T;
}

/** The constructor function of a [[Node]]. */
export type NodeType<T extends Node = Node> = TypeOf<T> & { type: string };

/** A [[Node]] instance, [[Node]] constructor function or a node's type string. */
export type NodeOrType<T extends Node = Node> = T | NodeType<T> | string;

/** Returns the type string of the given [[NodeOrType]]. */
export function getNodeTypeString<T extends Node>(nodeOrType: NodeOrType<T> | string): string {
    return typeof nodeOrType === "string" ? nodeOrType : nodeOrType.type;
}

/**
 * Node in an node/component system.
 *
 * ### Events
 * - *"change"* - emits [[INodeChangeEvent]] after the instance's state has changed.
 *
 * ### See also
 * - [[Component]]
 * - [[System]]
 */
export default class Node extends Publisher
{
    static readonly type: string = "Node";

    static create<T extends Node = Node>(type: NodeType<T>, graph: Graph, id?: string): T
    {
        if (!type || !type.type) {
            throw new Error("invalid node type");
        }

        const Ctor = type as TypeOf<T>;
        const node = new Ctor(graph, id);

        node.create();
        graph._addNode(node);
        return node;
    }

    readonly id: string;
    readonly graph: Graph;
    readonly system: System;
    readonly components = new ComponentSet();

    private _name: string = "";

    /**
     * Protected constructor. Please use the static [[Node.create]] method to create node instances.
     * @param graph Graph to attach the new node to.
     * @param id Unique id for the node. Should be omitted except for de-serialization, will be created automatically.
     */
    constructor(graph: Graph, id?: string)
    {
        super({ knownEvents: false });

        this.id = id || uniqueId(8);

        this.graph = graph;
        this.system = graph.system;

        this._name = "";
    }

    /**
     * Returns the type identifier of this component.
     * @returns {string}
     */
    get type() {
        return (this.constructor as typeof Node).type;
    }

    get hierarchy(): Hierarchy {
        return this.components.get<Hierarchy>("Hierarchy");
    }

    /**
     * Returns the name of this node.
     * @returns {string}
     */
    get name() {
        return this._name;
    }

    /**
     * Sets the name of this node.
     * This emits an [[INodeChangeEvent]]
     * @param {string} value
     */
    set name(value: string) {
        this._name = value;
        this.emit<INodeChangeEvent>({ type: "change", what: "name", node: this });
    }

    create()
    {
    }

    /**
     * Must be called to delete/destroy the node. This unregisters the node
     * and all its components from the system.
     */
    dispose()
    {
        // dispose components
        const componentList = this.components.getArray().slice();
        componentList.forEach(component => component.dispose());

        // remove node from system and graph
        this.graph._removeNode(this);

        // emit dispose event
        this.emit<INodeDisposeEvent>({ type: "dispose", node: this });
    }

    /**
     * Creates a new component of the given type. Adds it to this node.
     * @param componentOrType Type of the component to create.
     * @param name Optional name for the component.
     * @param id Optional unique identifier for the component.
     */
    createComponent<T extends Component>(componentOrType: ComponentOrType<T>, name?: string, id?: string): T
    {
        const component = this.system.registry.createComponent<T>(
            getComponentTypeString(componentOrType), this, id
        );

        if (name) {
            component.name = name;
        }

        return component;
    }

    getRoot(): Node
    {
        let node = this as Node;
        let hierarchy = this.hierarchy;

        while(hierarchy) {
            node = hierarchy.node;
            hierarchy = hierarchy.parent;
        }

        return node;
    }

    is(nodeOrType: NodeOrType): boolean
    {
        const type = getNodeTypeString(nodeOrType);

        let prototype = Object.getPrototypeOf(this);

        do {
            if (prototype.type === type) {
                return true;
            }
        } while(prototype.type !== Node.type);

        return false;
    }

    getParent<T extends Node>(nodeOrType: NodeOrType<T>, recursive: boolean): T | null
    {
        let hierarchy = this.hierarchy;
        let parent = hierarchy ? hierarchy.parent : null;

        if (!parent) {
            return null;
        }

        if (parent.node.is(nodeOrType)) {
            return parent.node as T;
        }

        if (recursive) {
            parent = parent.parent;
            while(parent) {
                if (parent.node.is(nodeOrType)) {
                    return parent.node as T;
                }
            }
        }

        return null;
    }

    /**
     * Returns the child node with the given name.
     * @param name
     * @param recursive If true, extends search to entire subtree (breadth-first).
     */
    findChild(name: string, recursive: boolean): Node | null
    {
        return this.hierarchy ? _findChildNode(this, name, recursive) : null;
    }

    /**
     * Returns the child node of the given type.
     * @param nodeOrType
     * @param recursive If true, extends search to entire subtree (breadth-first).
     */
    getChild<T extends Node>(nodeOrType: NodeOrType<T>, recursive: boolean): T | null
    {
        return this.hierarchy ? _getChildNode(this, nodeOrType, recursive) : null;
    }

    /**
     * Returns all child nodes of the given type.
     * @param nodeOrType
     * @param recursive If true, extends search to entire subtree (breadth-first).
     */
    getChildren<T extends Node>(nodeOrType: NodeOrType<T>, recursive: boolean): Readonly<T[]>
    {
        return this.hierarchy ? _getChildNodes(this, nodeOrType, recursive) : _EMPTY_ARRAY;
    }

    /**
     * Returns true if there is a child node of the given type.
     * @param nodeOrType
     * @param recursive If true, extends search to entire subtree (breadth-first).
     */
    hasChildren<T extends Node>(nodeOrType: NodeOrType<T>, recursive: boolean): boolean
    {
        return this.hierarchy ? !!_getChildNode(this, nodeOrType, recursive) : false;
    }

    setValue(path: string, value: any);
    setValue(componentOrType: ComponentOrType, path: string, value: any);
    setValue(location, pathOrValue, value?)
    {
        let component: Component;
        let path;

        if (typeof location === "string") {
            const parts = location.split(":");
            component = this.components.findByName(parts[0]) || this.components.get(parts[0]);
            path = parts[1];
            value = pathOrValue;
        }
        else {
            component = this.components.get(location);
            path = pathOrValue;
        }

        if (!component) {
            throw new Error("component not found");
        }
        if (!path) {
            throw new Error("invalid path");
        }

        component.in(path).setValue(value);
    }

    deflate()
    {
        const json: any = {
            id: this.id
        };

        if (this.name) {
            json.name = this.name;
        }

        if (this.components.length > 0) {
            json.components = this.components.getArray().map(component => component.deflate());
        }

        return json;
    }

    inflate(json, linkableDict: Dictionary<ILinkable>)
    {
        if (json.components) {
            json.components.forEach(jsonComp => {
                const component = this.createComponent(jsonComp.type, jsonComp.name, jsonComp.id);
                component.inflate(jsonComp);
                linkableDict[jsonComp.id] = component;
            });
        }
    }

    inflateLinks(json, linkableDict: Dictionary<ILinkable>)
    {
        if (json.components) {
            json.components.forEach(jsonComp => {
                const component = this.components.getById(jsonComp.id);
                component.inflateLinks(jsonComp, linkableDict);
            });
        }
    }

    toString(verbose: boolean = false)
    {
        const components = this.components.getArray();
        const text = `Node '${this.name}' - ${components.length} components`;

        if (verbose) {
            return text + "\n" + components.map(component => "  " + component.toString()).join("\n");
        }

        return text;
    }

    _addComponent(component: Component)
    {
        if (component.node !== this) {
            throw new Error("component belongs to a different node");
        }
        if (component.isNodeSingleton && this.components.has(component)) {
            throw new Error(`only one component of type '${component.type}' allowed per node`);
        }

        this.graph._addComponent(component);
        this.components._add(component);
    }

    _removeComponent(component: Component)
    {
        this.components._remove(component);
        this.graph._removeComponent(component);
    }
}
