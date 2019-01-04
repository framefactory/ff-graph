/**
 * FF Typescript Foundation Library
 * Copyright 2018 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import Publisher from "@ff/core/Publisher";

import LinkableSorter from "./LinkableSorter";
import Component from "./Component";
import ComponentSet, { IComponentEvent } from "./ComponentSet";
import Node, { NodeType } from "./Node";
import NodeSet, { INodeEvent } from "./NodeSet";
import System, { IUpdateContext, IRenderContext } from "./System";

import Hierarchy from "./Hierarchy";
import Subgraph from "./Subgraph";

////////////////////////////////////////////////////////////////////////////////

export { IComponentEvent, INodeEvent };

export default class Graph extends Publisher
{
    readonly system: System;

    nodes = new NodeSet();
    components = new ComponentSet();

    protected preRenderList: Component[] = [];
    protected postRenderList: Component[] = [];

    private _root: Hierarchy;
    private _parent: Subgraph = null;
    private _sorter = new LinkableSorter();
    private _sortRequested = false;

    constructor(system: System)
    {
        super({ knownEvents: false });
        this.system = system;
    }

    get parent() {
        return this._parent;
    }

    set root(root: Hierarchy) {
        this._root = root;

        if (this._parent) {
            this._parent.root = root;
        }
    }

    get root() {
        return this._root;
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
    sort()
    {
        this._sortRequested = true;
    }

    createNode(name?: string, id?: string): Node;
    createNode<T extends Node>(nodeType: NodeType<T>, name?: string, id?: string): T;
    createNode(nodeTypeOrName?, nameOrId?, id?)
    {
        let node, name;

        if (typeof nodeTypeOrName === "function") {
            node = Node.create(nodeTypeOrName, this, id);
            name = nameOrId;
        }
        else {
            node = Node.create(this, nameOrId);
            name = nodeTypeOrName;
        }

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

        if (component.preRender) {
            this.preRenderList.push(component);
        }
        if (component.postRender) {
            this.postRenderList.push(component);
        }
    }

    _removeComponent(component: Component)
    {
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
