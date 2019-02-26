/**
 * FF Typescript Foundation Library
 * Copyright 2018 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import uniqueId from "@ff/core/uniqueId";
import { Dictionary, TypeOf } from "@ff/core/types";
import Publisher, { ITypedEvent } from "@ff/core/Publisher";
import ObjectRegistry, { IObjectEvent } from "@ff/core/ObjectRegistry";

import { ILinkable } from "./PropertyGroup";
import Component, { ComponentOrType, IComponentEvent } from "./Component";
import Graph from "./Graph";
import CHierarchy, { IChildComponentEvent } from "./components/CHierarchy";

////////////////////////////////////////////////////////////////////////////////

export { IComponentEvent }

export interface INodeEvent<T extends Node = Node> extends IObjectEvent<T>
{
}

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

/** A [[Node]] instance, [[Node]] constructor function or a node's type string. */
export type NodeOrType<T extends Node = Node> = T | TypeOf<T> | string;

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
    static readonly typeName: string = "Node";

    static readonly text: string = "";
    static readonly icon: string = "";

    static getTypeName<T extends Node>(scope?: NodeOrType<T>): string
    {
        return typeof scope === "function" ? (scope as any).typeName : (typeof scope === "object"
            ? (scope.constructor as typeof Node).typeName : (scope || Node.typeName));
    }

    /** The node's globally unique id. */
    readonly id: string;

    /** Collection of all components in this node. */
    readonly components = new ObjectRegistry<Component>(Component);

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
     * Returns the class name of this node.
     */
    get typeName() {
        return (this.constructor as typeof Node).typeName;
    }
    get displayTypeName() {
        const typeName = this.typeName;
        return typeName === "Node" ? typeName : typeName.substr(1);
    }

    get text() {
        return (this.constructor as typeof Component).text;
    }

    get icon() {
        return (this.constructor as typeof Component).icon;
    }

    /**
     * Returns the name of this node.
     */
    get name() {
        return this._name;
    }

    get displayName() {
        return this._name || this.text || this.displayTypeName;
    }

    /**
     * Sets the name of this node.
     * This emits an [[INodeChangeEvent]]
     * @param value
     */
    set name(value: string) {
        this._name = value;
        this.emit<INodeChangeEvent>({ type: "change", what: "name", node: this });
    }

    /**
     * Returns the graph this node is part of.
     */
    get graph() {
        return this._graph;
    }

    /**
     * Returns the system this node and its graph belong to.
     */
    get system() {
        return this._graph.system;
    }

    getComponent<T extends Component = Component>(componentOrType?: ComponentOrType<T>, nothrow: boolean = false) {
        return this.components.get(componentOrType, nothrow);
    }

    getComponents<T extends Component = Component>(componentOrType?: ComponentOrType<T>) {
        return this.components.getArray(componentOrType);
    }

    hasComponent(componentOrType: ComponentOrType) {
        return this.components.has(componentOrType);
    }

    getGraphComponent<T extends Component = Component>(componentOrType?: ComponentOrType<T>, nothrow: boolean = false) {
        return this.graph.components.get(componentOrType, nothrow);
    }

    getGraphComponents<T extends Component = Component>(componentOrType?: ComponentOrType<T>) {
        return this.graph.components.getArray(componentOrType);
    }

    hasGraphComponent(componentOrType: ComponentOrType) {
        return this.graph.components.has(componentOrType);
    }

    getMainComponent<T extends Component = Component>(componentOrType?: ComponentOrType<T>, nothrow: boolean = false) {
        return this._graph.system.graph.components.get(componentOrType, nothrow);
    }

    getMainComponents<T extends Component = Component>(componentOrType?: ComponentOrType<T>) {
        return this._graph.system.graph.components.getArray(componentOrType);
    }

    hasMainComponent(componentOrType: ComponentOrType) {
        return this._graph.system.graph.components.has(componentOrType);
    }

    getSystemComponent<T extends Component = Component>(componentOrType?: ComponentOrType<T>, nothrow: boolean = false) {
        return this._graph.system.components.get(componentOrType, nothrow);
    }

    getSystemComponents<T extends Component = Component>(componentOrType?: ComponentOrType<T>) {
        return this._graph.system.components.getArray(componentOrType);
    }

    hasSystemComponent(componentOrType: ComponentOrType) {
        return this._graph.system.components.has(componentOrType);
    }

    getComponentById(id: string): Component | null {
        return this._graph.system.components.getById(id);
    }

    getNode<T extends Node = Node>(nodeOrType?: NodeOrType<T>, nothrow: boolean = false) {
        return this._graph.nodes.get(nodeOrType, nothrow);
    }

    getNodes<T extends Node = Node>(nodeOrType?: NodeOrType<T>) {
        return this._graph.nodes.getArray(nodeOrType);
    }

    hasNode(nodeOrType: NodeOrType) {
        return this._graph.nodes.has(nodeOrType);
    }

    getMainNode<T extends Node = Node>(nodeOrType?: NodeOrType<T>, nothrow: boolean = false) {
        return this._graph.system.graph.nodes.get(nodeOrType, nothrow);
    }

    getMainNodes<T extends Node = Node>(nodeOrType?: NodeOrType<T>) {
        return this._graph.system.graph.nodes.getArray(nodeOrType);
    }

    hasMainNode(nodeOrType: NodeOrType) {
        return this._graph.system.graph.nodes.has(nodeOrType);
    }

    getSystemNode<T extends Node = Node>(nodeOrType?: NodeOrType<T>, nothrow: boolean = false) {
        return this._graph.system.nodes.get(nodeOrType, nothrow);
    }

    getSystemNodes<T extends Node = Node>(nodeOrType?: NodeOrType<T>) {
        return this._graph.system.nodes.getArray(nodeOrType);
    }

    hasSystemNode(nodeOrType: NodeOrType) {
        return this._graph.system.nodes.has(nodeOrType);
    }

    getNodeById(id: string): Node | null {
        return this._graph.system.nodes.getById(id);
    }

    /**
     * Adds this node to the given graph and the system.
     * @param graph
     */
    attach(graph: Graph)
    {
        this._graph = graph;
        graph._addNode(this);
    }

    /**
     * Override to create an initial set of components for the node.
     * Note that this function is not called if a node is restored from serialization data.
     */
    createComponents()
    {
    }

    clear()
    {
        // dispose components
        const componentList = this.components.getArray().slice();
        componentList.forEach(component => component.dispose());
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
        if (this._graph) {
            this._graph._removeNode(this);
            this._graph = null;
        }

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
        const type = this.system.registry.getType(componentOrType);
        const component = new type(id || uniqueId(12, this.system.components.getDictionary())) as T;

        component.attach(this);

        if (name) {
            component.name = name;
        }

        return component;
    }

    /**
     * Tests whether the node is of or descends from the given type.
     * @param scope Node constructor, type name, or instance.
     */
    is(scope: NodeOrType): boolean
    {
        const typeName = Node.getTypeName(scope);

        let prototype = this;

        do {
            prototype = Object.getPrototypeOf(prototype);

            if ((prototype.constructor as typeof Node).typeName === typeName) {
                return true;
            }

        } while((prototype.constructor as typeof Node).typeName !== Node.typeName);

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
            if (jsonComp) {
                jsonComp.type = component.typeName;
                jsonComp.id = component.id;

                if (component.name) {
                    jsonComp.name = component.name;
                }

                jsonComponents.push(jsonComp);
            }
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
            throw new Error(`only one component of type '${component.typeName}' allowed per node`);
        }

        this.graph._addComponent(component);
        this.components.add(component);

        const hierarchy = this.components.get<CHierarchy>("CHierarchy", true);
        if (hierarchy) {
            const event: IChildComponentEvent = { type: "child-component", add: true, remove: false, component };
            hierarchy.traverseUp(true, false, true, component => component.emit(event));
        }
    }

    /**
     * Removes a component from the node, the node's graph and the system. Called by [[Component.detach]],
     * do not call directly.
     * @param component
     * @private
     */
    _removeComponent(component: Component)
    {
        const hierarchy = this.components.get<CHierarchy>("CHierarchy", true);
        if (hierarchy) {
            const event: IChildComponentEvent = { type: "child-component", add: false, remove: true, component };
            hierarchy.traverseUp(true, false, true, component => component.emit(event));
        }

        this.components.remove(component);
        this.graph._removeComponent(component);
    }

}
