/**
 * FF Typescript Foundation Library
 * Copyright 2018 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import { Dictionary } from "@ff/core/types";
import uniqueId from "@ff/core/uniqueId";
import Publisher, { IPublisherEvent } from "@ff/core/Publisher";

import { ILinkable } from "./PropertySet";
import Component, { ComponentOrType, getType } from "./Component";
import ComponentSet, { IComponentTypeEvent } from "./ComponentSet";
import Graph from "./Graph";
import System from "./System";

////////////////////////////////////////////////////////////////////////////////

export { IComponentTypeEvent };

export interface INodeEvent extends IPublisherEvent<Node> { }

/**
 * Emitted by [[Node]] after the instance's state has changed.
 * @event
 */
export interface INodeChangeEvent extends INodeEvent
{
    what: "name"
}

/**
 * Emitted by [[Node]] if the component is about to be disposed.
 * @event
 */
export interface INodeDisposeEvent extends INodeEvent { }

export interface INodeComponentEvent<T extends Component = Component>
    extends IPublisherEvent<Node>
{
    add: boolean;
    remove: boolean;
    component: T;
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
export default class Node extends Publisher<Node>
{
    static readonly changeEvent = "change";
    static readonly componentEvent = "component";
    static readonly disposeEvent = "dispose";

    static create(graph: Graph, id?: string): Node
    {
        const node = new Node(graph, id);
        graph._addNode(node);
        return node;
    }

    readonly id: string;
    readonly graph: Graph;
    readonly system: System;
    readonly components: ComponentSet;

    private _name: string;


    constructor(graph: Graph, id?: string)
    {
        super();
        this.addEvents(Node.changeEvent, Node.componentEvent, Node.disposeEvent);

        this.id = id || uniqueId(8);

        this.graph = graph;
        this.system = graph.system;
        this.components = new ComponentSet();

        this._name = "";
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
        this.emit(Node.disposeEvent);
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
        this.emit<INodeChangeEvent>(Node.changeEvent, { what: "name" });
    }

    /**
     * Creates a new component of the given type. Adds it to this node.
     * @param componentOrType Type of the component to create.
     * @param name Optional name for the component.
     * @param id Optional unique identifier for the component.
     */
    createComponent<T extends Component>(componentOrType: ComponentOrType<T>, name?: string, id?: string): T
    {
        const component = this.system.registry.createComponent<T>(getType(componentOrType), this, id);

        if (name) {
            component.name = name;
        }

        return component;
    }

    /**
     * Creates a new component only if a component of this type doesn't exist yet in this node.
     * Otherwise returns the existing component.
     * @param componentOrType Type of the component to create.
     * @param name Optional name for the component.
     */
    getOrCreateComponent<T extends Component>(componentOrType: ComponentOrType<T>, name?: string)
    {
        const component = this.components.get(componentOrType);
        if (component) {
            return component;
        }

        return this.createComponent(componentOrType, name);
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

    /**
     * Adds a listener for component add/remove events for a specific component type.
     * @param componentOrType The component type as example object, constructor function or string.
     * @param callback Event handler function.
     * @param context Optional context object on which to call the event handler function.
     */
    addComponentTypeListener<T extends Component>(
        componentOrType: ComponentOrType<T>, callback: (event: IComponentTypeEvent<T>) => void, context?: any)
    {
        this.components.on(getType(componentOrType), callback, context);
    }

    /**
     * Removes a listener for component add/remove events for a specific component type.
     * @param componentOrType The component type as example object, constructor function or string.
     * @param callback Event handler function.
     * @param context Optional context object on which to call the event handler function.
     */
    removeComponentTypeListener<T extends Component>(
        componentOrType: ComponentOrType<T>, callback: (event: IComponentTypeEvent<T>) => void, context?: any)
    {
        this.components.off(getType(componentOrType), callback, context);
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

        this.emit<INodeComponentEvent>(Node.componentEvent, { add: true, remove: false, component });
    }

    _removeComponent(component: Component)
    {
        this.emit<INodeComponentEvent>(Node.componentEvent, { add: false, remove: true, component });

        this.components._remove(component);
        this.graph._removeComponent(component);
    }
}
