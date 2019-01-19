/**
 * FF Typescript Foundation Library
 * Copyright 2018 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import Publisher from "@ff/core/Publisher";

import LinkableSorter from "./LinkableSorter";
import Component, { IUpdateContext } from "./Component";
import ComponentSet, { IComponentEvent } from "./ComponentSet";
import Node, { NodeType } from "./Node";
import NodeSet, { INodeEvent } from "./NodeSet";
import System from "./System";

import CHierarchy from "./components/CHierarchy";
import CGraph from "./components/CGraph";

////////////////////////////////////////////////////////////////////////////////

export { IComponentEvent, INodeEvent };

export default class Graph extends Publisher
{
    readonly system: System;
    readonly parent: CGraph;

    nodes = new NodeSet();
    components = new ComponentSet();

    private _finalizeList: Component[] = [];

    private _root: CHierarchy;
    private _sorter = new LinkableSorter();
    private _sortRequested = false;

    constructor(system: System, parent?: CGraph)
    {
        super({ knownEvents: false });
        this.system = system;
        this.parent = parent;
    }

    set root(root: CHierarchy) {
        this._root = root;

        if (this.parent) {
            this.parent.innerRoot = root;
        }
    }

    get root() {
        return this._root;
    }

    /**
     * Calls update() on all components in the graph whose changed flag is set,
     * then calls tick() on all components.
     * Returns true if at least one component changed its state.
     * @param context
     * @returns true if at least one component was updated.
     */
    tick(context: IUpdateContext): boolean
    {
        if (this._sortRequested) {
            this._sortRequested = false;
            this.sort();
        }

        // call update on components in topological sort order
        const components = this.components.getArray();
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

    finalize(context: IUpdateContext)
    {
        const components = this._finalizeList;
        for (let i = 0, n = components.length; i < n; ++i) {
            components[i].finalize(context);
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
        this.components.sort(this._sorter);
    }

    createNode(name?: string, id?: string): Node;
    createNode<T extends Node>(nodeType: NodeType<T>, name?: string, id?: string): T;
    createNode(nodeTypeOrName?, nameOrId?, id?)
    {
        let node, name;

        if (typeof nodeTypeOrName === "function") {
            node = new nodeTypeOrName(id);
            name = nameOrId;
        }
        else {
            node = new Node(nameOrId);
            name = nodeTypeOrName;
        }

        node.attach(this);

        if (name) {
            node.name = name;
        }

        return node;
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
                node.inflate(jsonNode, linkableDict);
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
    }

    _removeNode(node: Node)
    {
        this.nodes._remove(node);
        this.system._removeNode(node);
    }

    _addComponent(component: Component)
    {
        if (component.isGraphSingleton && this.components.has(component)) {
            throw new Error(`only one component of type '${component.type}' allowed per graph`);
        }

        this.system._addComponent(component);
        this.components._add(component);

        if (component.finalize) {
            this._finalizeList.push(component);
        }
    }

    _removeComponent(component: Component)
    {
        this.components._remove(component);
        this.system._addComponent(component);

        if (component.finalize) {
            this._finalizeList.splice(this._finalizeList.indexOf(component), 1);
        }
    }
}
