/**
 * FF Typescript Foundation Library
 * Copyright 2018 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import uniqueId from "@ff/core/uniqueId";
import Publisher from "@ff/core/Publisher";

import LinkableSorter from "./LinkableSorter";
import Component, { IUpdateContext } from "./Component";
import Node, { NodeOrClass } from "./Node";
import System from "./System";

import CHierarchy from "./components/CHierarchy";
import CGraph from "./components/CGraph";
import ObjectRegistry from "@ff/core/ObjectRegistry";

////////////////////////////////////////////////////////////////////////////////

/**
 * Graph in a graph/node/component system. A graph contains a collection of nodes.
 * Graphs can be nested, i.e. a graph can be a subgraph of another graph, the parent graph.
 *
 * ### See also
 * - [[Component]]
 * - [[Node]]
 * - [[System]]
 */
export default class Graph extends Publisher
{
    /** The system this graph belongs to. */
    readonly system: System;
    /** For subgraphs: the parent component. For the root graph (system graph), this is null. */
    readonly parent: CGraph;

    /** Collection of all nodes in this graph. */
    readonly nodes = new ObjectRegistry<Node>(Node);
    /** Collection of all components in this graph. */
    readonly components = new ObjectRegistry<Component>(Component);

    private _root: CHierarchy;
    private _sorter = new LinkableSorter();
    private _sortRequested = true;
    private _sortedList: Component[] = null;
    private _finalizeList: Component[] = [];

    /**
     * Creates a new graph instance.
     * @param system System this graph belongs to.
     * @param parent Optional parent component of this graph.
     */
    constructor(system: System, parent: CGraph | null)
    {
        super({ knownEvents: false });
        this.system = system;
        this.parent = parent;
    }

    // TODO: This should use a tracker for the root component

    /** Sets the root hierarchy component of this graph. */
    set root(root: CHierarchy) {
        this._root = root;

        if (this.parent) {
            this.parent.innerRoot = root;
        }
    }

    /** Returns the root hierarchy component of this graph. */
    get root() {
        return this._root;
    }

    /**
     * Called at the begin of each frame cycle. Calls update() on all components
     * in the graph whose changed flag is set, then calls tick() on all components.
     * Returns true if at least one component changed its state.
     * @param context Context-specific information such as time, etc.
     * @returns true if at least one component was updated.
     */
    tick(context: IUpdateContext): boolean
    {
        if (this._sortRequested) {
            this._sortRequested = false;
            this.sort();
        }

        // call update on components in topological sort order
        const components = this._sortedList;
        let updated = false;

        for (let i = 0, n = components.length; i < n; ++i) {
            const component = components[i];
            component.updated = false;

            if (component.changed) {
                if (component.update && component.update(context)) {
                    updated = component.updated = true;
                }

                component.resetChanged();
            }

            if (component.tick && component.tick(context)) {
                updated = true;
            }
        }

        return updated;
    }

    /**
     * Calls finalize on all components in the graph.
     * The finalize call happens at the end of a frame cycle.
     * @param context Context-specific information such as time, etc.
     */
    finalize(context: IUpdateContext)
    {
        const components = this._finalizeList;
        for (let i = 0, n = components.length; i < n; ++i) {
            components[i].finalize(context);
        }
    }

    clear()
    {
        const nodes = this.nodes.cloneArray();
        for (let i = 0, n = nodes.length; i < n; ++i) {
            nodes[i].dispose();
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

    sort()
    {
        this._sortedList = this._sorter.sort(this.components.getArray()) as Component[];

        const name = this.parent ? this.parent.name || this.parent.className : "System";
        console.log("Graph.sort - %s: sorted %s components", name, this._sortedList.length);
    }

    /**
     * Creates a new node of the given type. Adds it to the graph.
     * @param nodeOrClass Type of the node to create.
     * @param name Optional name for the node.
     * @param id Optional unique identifier for the node (must omit unless serializing).
     */
    createCustomNode<T extends Node>(nodeOrClass: NodeOrClass<T>, name?: string, id?: string): T
    {
        const classType = this.system.registry.getClass(nodeOrClass);
        const node = new classType(id || uniqueId(12, this.system.nodes.getDictionary())) as T;

        node.attach(this);

        if (name) {
            node.name = name;
        }

        if (!id) {
            node.createComponents();
        }

        return node;
    }

    /**
     * Creates a new, plain, empty node (of base type [[Node]]). Adds it to the graph.
     * @param name Optional name for the node.
     * @param id Optional unique identifier for the node (must omit unless serializing).
     */
    createNode(name?: string, id?: string): Node
    {
        const node = new Node(id || uniqueId(12, this.system.nodes.getDictionary()));

        node.attach(this);

        if (name) {
            node.name = name;
        }

        return node;
    }

    findNodeByName<T extends Node = Node>(name: string, nodeOrClass?: NodeOrClass<T>): T | undefined
    {
        const nodes = this.nodes.getArray(nodeOrClass);

        for (let i = 0, n = nodes.length; i < n; ++i) {
            if (nodes[i].name === name) {
                return nodes[i];
            }
        }

        return undefined;
    }

    findRootNodes<T extends Node = Node>(nodeOrType?: NodeOrClass<T>): T[]
    {
        const nodes = this.nodes.getArray(nodeOrType);
        const result = [];

        for (let i = 0, n = nodes.length; i < n; ++i) {
            const hierarchy = nodes[i].components.get<CHierarchy>("CHierarchy");
            if (!hierarchy || !hierarchy.parent) {
                result.push(nodes[i]);
            }
        }

        return result;
    }

    /**
     * Returns a text representation of the graph.
     * @param verbose
     */
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

    /**
     * Serializes the graph, its nodes and components.
     * Returns graph serialization data, which must be cloned or stringified immediately.
     */
    deflate()
    {
        const json: any = {};
        const jsonNodes = [];

        const nodes = this.nodes.getArray();
        for (let i = 0, n = nodes.length; i < n; ++i) {
            const node = nodes[i];

            const jsonNode = this.deflateNode(node);

            jsonNode.type = node.className;
            jsonNode.id = node.id;

            if (node.name) {
                jsonNode.name = node.name;
            }

            jsonNodes.push(jsonNode);
        }

        if (jsonNodes.length > 0) {
            json.nodes = jsonNodes;
        }

        return json;
    }

    /**
     * Deserializes the graph, its nodes and components.
     * @param json serialized graph data.
     */
    inflate(json)
    {
        if (json.nodes) {
            json.nodes.forEach(jsonNode => {
                const node = this.createCustomNode(jsonNode.type, jsonNode.name, jsonNode.id);
                node.inflate(jsonNode);
            });
        }
    }

    /**
     * Deserializes references between graphs, nodes, and components
     * @param json serialized graph data.
     */
    inflateReferences(json)
    {
        if (json.nodes) {
            json.nodes.forEach(jsonNode => {
                const node = this.nodes.getById(jsonNode.id);
                node.inflateReferences(jsonNode);
            });
        }
    }

    /**
     * Override to control how nodes are serialized.
     * Return serialization data or null if the node should be excluded from serialization.
     * @param node The node to be serialized.
     */
    protected deflateNode(node: Node)
    {
        return node.deflate();
    }

    /**
     * Adds a node to the graph and the system. Called by [[Node.attach]], do not call directly.
     * @param node
     * @private
     */
    _addNode(node: Node)
    {
        this.system._addNode(node);
        this.nodes.add(node);
    }

    /**
     * Removes a node from the graph and the system. Called by [[Node.detach]], do not call directly.
     * @param node
     * @private
     */
    _removeNode(node: Node)
    {
        this.nodes.remove(node);
        this.system._removeNode(node);
    }

    /**
     * Adds a component to the graph and the system. Called by [[Component.attach]], do not call directly.
     * @param component
     * @private
     */
    _addComponent(component: Component)
    {
        if (component.isGraphSingleton && this.components.has(component)) {
            throw new Error(`only one component of class '${component.className}' allowed per graph`);
        }

        this.system._addComponent(component);
        this.components.add(component);

        if (component.finalize) {
            this._finalizeList.push(component);
        }

        this._sortRequested = true;
    }

    /**
     * Removes a component from the graph and the system. Called by [[Component.detach]], do not call directly.
     * @param component
     * @private
     */
    _removeComponent(component: Component)
    {
        this.components.remove(component);
        this.system._removeComponent(component);

        if (component.finalize) {
            this._finalizeList.splice(this._finalizeList.indexOf(component), 1);
        }

        this._sortRequested = true;
    }
}
