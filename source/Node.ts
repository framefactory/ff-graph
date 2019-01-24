/**
 * FF Typescript Foundation Library
 * Copyright 2018 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import uniqueId from "@ff/core/uniqueId";
import { Dictionary, TypeOf } from "@ff/core/types";
import Publisher, { ITypedEvent } from "@ff/core/Publisher";

import { ILinkable } from "./PropertyGroup";
import Component, { ComponentOrType, componentTypeName } from "./Component";
import ComponentSet, { IComponentEvent } from "./ComponentSet";
import Graph from "./Graph";

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
export function nodeTypeName<T extends Node>(nodeOrType: NodeOrType<T>): string {
    return nodeOrType ? (typeof nodeOrType === "string" ? nodeOrType : nodeOrType.type) : Node.type;
}

/**
 * Node in an graph/node/component system.
 *
 * ### Events
 * - *"change"* - emits [[INodeChangeEvent]] after the node's state has changed.
 * - *"dispose"* - emits [[INodeDisposeEvent]] if the node is about to be disposed.
 *
 * ### See also
 * - [[Component]]
 * - [[Graph]]
 * - [[System]]
 */
export default class Node extends Publisher
{
    static readonly type: string = "Node";

    static readonly text: string = "";
    static readonly icon: string = "";

    /** The node's globally unique id. */
    readonly id: string;
    /** Collection of all components in this node. */
    readonly components = new ComponentSet();

    private _graph: Graph = null;
    private _name: string = "";

    /**
     * Protected constructor. Please use [[Graph.createNode]] / [[Graph.createCustomNode]] to create node instances.
     * @param id Unique id for the node. A unique id is usually created automatically,
     * do not specify except while de-serializing the component.
     *
     * Note that during execution of the constructor, the node is not yet attached to a graph/system.
     * Do not try to get access to other nodes, components, the parent graph, or the system here.
     */
    constructor(id: string)
    {
        super({ knownEvents: false });
        this.id = id;
    }

    /**
     * Returns the type identifier of this component.
     * @returns {string}
     */
    get type() {
        return (this.constructor as typeof Node).type;
    }

    get text() {
        return (this.constructor as typeof Component).text;
    }

    get icon() {
        return (this.constructor as typeof Component).icon;
    }

    /**
     * Returns the system this node and its graph belong to.
     */
    get system() {
        return this._graph.system;
    }

    /**
     * Returns the graph this node is part of.
     */
    get graph() {
        return this._graph;
    }

    /**
     * Returns the name of this node.
     * @returns {string}
     */
    get name() {
        return this._name;
    }

    get displayName() {
        return this._name || this.text || this.type;
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

    /**
     * Adds this node to the given graph and the system.
     * @param graph
     */
    attach(graph: Graph)
    {
        if (this._graph) {
            this.detach();
        }

        this._graph = graph;
        graph._addNode(this);
    }

    /**
     * Removes this node from its graph and system.
     */
    detach()
    {
        if (this._graph) {
            this._graph._removeNode(this);
            this._graph = null;
        }
    }

    /**
     * Override to create an initial set of components for the node.
     * Note that this function is not called if a node is restored from serialization data.
     */
    createComponents()
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
        this.detach();

        // emit dispose event
        this.emit<INodeDisposeEvent>({ type: "dispose", node: this });
    }

    /**
     * Creates a new component of the given type. Adds it to this node.
     * @param componentOrType Component constructor, type name, or instance.
     * @param name Optional name for the component.
     * @param id Optional unique identifier for the component (must omit unless serializing).
     */
    createComponent<T extends Component>(componentOrType: ComponentOrType<T>, name?: string, id?: string): T
    {
        const type = this.system.registry.getComponentType(componentTypeName(componentOrType));
        const component = new type(id || uniqueId(12, this.system.components.getDictionary())) as T;

        component.attach(this);

        if (name) {
            component.name = name;
        }

        return component;
    }

    /**
     * Tests whether the node is of or descends from the given type.
     * @param nodeOrType Node constructor, type name, or instance.
     */
    is(nodeOrType: NodeOrType): boolean
    {
        const type = nodeTypeName(nodeOrType);

        let prototype = this;

        do {
            prototype = Object.getPrototypeOf(prototype);

            if (prototype.type === type) {
                return true;
            }

        } while(prototype.type !== Node.type);

        return false;
    }

    /**
     * Returns a text representation of the node.
     * @param verbose
     */
    toString(verbose: boolean = false)
    {
        const components = this.components.getArray();
        const text = `Node '${this.name}' - ${components.length} components`;

        if (verbose) {
            return text + "\n" + components.map(component => "  " + component.toString()).join("\n");
        }

        return text;
    }

    /**
     * Serializes the node and its components.
     * Return node serialization data, or null if the node should be excluded from serialization.
     */
    deflate()
    {
        const json: any = {};
        const jsonComponents = [];

        const components = this.components.getArray();
        for (let i = 0, n = components.length; i < n; ++i) {
            const component = components[i];

            const jsonComp = this.deflateComponent(component);

            jsonComp.type = component.type;
            jsonComp.id = component.id;

            if (component.name) {
                jsonComp.name = component.name;
            }

            jsonComponents.push(jsonComp);
        }

        if (jsonComponents.length > 0) {
            json.components = jsonComponents;
        }

        return json;
    }

    /**
     * Deserializes the node and its components.
     * @param json serialized node data.
     * @param linkableDict dictionary mapping component ids to components.
     */
    inflate(json, linkableDict: Dictionary<ILinkable>)
    {
        if (json.components) {
            json.forEach(jsonComp => {
                const component = this.createComponent(jsonComp.type, jsonComp.name, jsonComp.id);
                component.inflate(jsonComp);
            });
        }
    }

    /**
     * Deserializes the links of all components.
     * @param json serialized component data.
     */
    inflateReferences(json)
    {
        if (json.components) {
            json.components.forEach(jsonComp => {
                const component = this.components.getById(jsonComp.id);
                component.inflateReferences(jsonComp);
            });
        }
    }

    /**
     * Override to control how components are serialized.
     * Return serialization data or null if the component should be excluded from serialization.
     * @param component The component to be serialized.
     */
    protected deflateComponent(component: Component)
    {
        return component.deflate();
    }

    /**
     * Adds a component to the node, the node's graph and the system. Called by [[Component.attach]],
     * do not call directly.
     * @param component
     * @private
     */
    _addComponent(component: Component)
    {
        if (component.isNodeSingleton && this.components.has(component)) {
            throw new Error(`only one component of type '${component.type}' allowed per node`);
        }

        this.graph._addComponent(component);
        this.components._add(component);
    }

    /**
     * Removes a component from the node, the node's graph and the system. Called by [[Component.detach]],
     * do not call directly.
     * @param component
     * @private
     */
    _removeComponent(component: Component)
    {
        this.components._remove(component);
        this.graph._removeComponent(component);
    }

}
