/**
 * FF Typescript Foundation Library
 * Copyright 2018 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import Publisher, { IPublisherEvent } from "@ff/core/Publisher";

import LinkableSorter from "./LinkableSorter";
import Component, { ComponentOrType, getComponentTypeString } from "./Component";
import ComponentSet, { IComponentTypeEvent } from "./ComponentSet";
import Node, { NodeType } from "./Node";
import NodeSet from "./NodeSet";
import System, { IUpdateContext, IRenderContext } from "./System";

////////////////////////////////////////////////////////////////////////////////

export { IComponentTypeEvent };

export interface IGraphNodeEvent extends IPublisherEvent<Graph>
{
    add: boolean;
    remove: boolean;
    node: Node;
}

export interface IGraphComponentEvent<T extends Component = Component>
    extends IPublisherEvent<Graph>
{
    add: boolean;
    remove: boolean;
    component: T;
}

export default class Graph extends Publisher<Graph>
{
    static readonly nodeEvent = "node";
    static readonly componentEvent = "component";

    readonly system: System;

    nodes = new NodeSet();
    components = new ComponentSet();

    protected preRenderList: Component[] = [];
    protected postRenderList: Component[] = [];

    private _sorter = new LinkableSorter();
    private _sortRequested = false;

    constructor(system: System)
    {
        super({ knownEvents: false });
        this.addEvents(Graph.nodeEvent, Graph.componentEvent);

        this.system = system;
    }

    /**
     * Calls update() on all components in the graph whose changed flag is set.
     * Returns true if at least one component changed its state.
     * @param context
     * @returns true if at least one component was updated.
     */
    update(context: IUpdateContext): boolean
    {
        if (this._sortRequested) {
            this._sortRequested = false;
            this.components.sort(this._sorter);
        }

        // call update on components in topological sort order
        const components = this.components.getArray();
        let updated = false;

        for (let i = 0, n = components.length; i < n; ++i) {
            const component = components[i];
            component.updated = false;

            if (component.changed) {
                if (component.update && component.update(context)) {
                    component.updated = updated = true;
                }

                component.resetChanged();
            }
        }

        return updated;
    }

    /**
     * Calls tick() on all components in the graph.
     * @param context
     */
    tick(context: IUpdateContext): boolean
    {
        const components = this.components.getArray();
        let updated = false;

        for (let i = 0, n = components.length; i < n; ++i) {
            const component = components[i];
            if (component.tick && component.tick(context)) {
                updated = true;
            }
        }

        return updated;
    }

    preRender(context: IRenderContext)
    {
        const components = this.preRenderList;
        for (let i = 0, n = components.length; i < n; ++i) {
            components[i].preRender(context);
        }
    }

    postRender(context: IRenderContext)
    {
        const components = this.postRenderList;
        for (let i = 0, n = components.length; i < n; ++i) {
            components[i].postRender(context);
        }
    }

    /**
     * Requests a topological sort of the list of components based on how they are interlinked.
     * The sort is executed before the next update.
     */
    requestSort()
    {
        this._sortRequested = true;
    }

    createNode(name?: string, id?: string): Node
    {
        return this.createCustomNode(Node, name, id);
    }

    createCustomNode<T extends Node>(type: NodeType<T>, name?: string, id?: string): T
    {
        const node = Node.create(type, this, id);

        if (name) {
            node.name = name;
        }

        return node;
    }

    findOrCreateNode(name: string): Node
    {
        const node = this.nodes.findByName(name);
        if (node) {
            return node;
        }

        return this.createNode(name);
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
        this.components.on(getComponentTypeString(componentOrType), callback, context);
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
        this.components.off(getComponentTypeString(componentOrType), callback, context);
    }

    deflate()
    {
        const json: any = {};

        if (this.nodes.length > 0) {
            json.nodes = this.nodes.getArray().map(node => node.deflate());
        }

        return json;
    }

    inflate(json)
    {
        if (json.nodes) {
            const linkableDict = {};

            json.nodes.forEach(jsonNode => {
                const node = this.createNode(jsonNode.name, jsonNode.id);
                node.inflate(json, linkableDict);
            });
            json.nodes.forEach(jsonNode => {
                const node = this.nodes.getById(jsonNode.id);
                node.inflateLinks(jsonNode, linkableDict);
            })
        }
    }

    toString(verbose: boolean = false)
    {
        const nodes = this.nodes.getArray();
        const numComponents = this.components.count();

        const text = `Graph - ${nodes.length} nodes, ${numComponents} components.`;

        if (verbose) {
            return text + "\n" + nodes.map(node => node.toString(true)).join("\n");
        }

        return text;
    }

    _addNode(node: Node)
    {
        this.system._addNode(node);
        this.nodes._add(node);

        this.emit<IGraphNodeEvent>(Graph.nodeEvent, { add: true, remove: false, node: node });
    }

    _removeNode(node: Node)
    {
        this.nodes._remove(node);
        this.system._removeNode(node);

        this.emit<IGraphNodeEvent>(Graph.nodeEvent, { add: false, remove: true, node: node });
    }

    _addComponent(component: Component)
    {
        if (component.isGraphSingleton && this.components.has(component)) {
            throw new Error(`only one component of type '${component.type}' allowed per graph`);
        }

        this.system._addComponent(component);
        this.components._add(component);

        if (component.preRender) {
            this.preRenderList.push(component);
        }
        if (component.postRender) {
            this.postRenderList.push(component);
        }

        const event = { add: true, remove: false, component, sender: this };
        this.emit<IGraphComponentEvent>(Graph.componentEvent, event);
        this.emit<IGraphComponentEvent>(component.type, event);
    }

    _removeComponent(component: Component)
    {
        const event = { add: false, remove: true, component, sender: this };
        this.emit<IGraphComponentEvent>(Graph.componentEvent, event);
        this.emit<IGraphComponentEvent>(component.type, event);

        this.components._remove(component);
        this.system._addComponent(component);

        if (component.preRender) {
            this.preRenderList.splice(this.preRenderList.indexOf(component), 1);
        }
        if (component.postRender) {
            this.postRenderList.splice(this.preRenderList.indexOf(component), 1);
        }
    }
}
