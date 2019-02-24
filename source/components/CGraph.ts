/**
 * FF Typescript Foundation Library
 * Copyright 2018 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import Component, { ComponentOrType, IUpdateContext } from "../Component";
import Graph from "../Graph";

import CHierarchy from "./CHierarchy";
import Node, { NodeOrType } from "../Node";

////////////////////////////////////////////////////////////////////////////////

export default class CGraph extends Component
{
    static readonly typeName: string = "CGraph";

    protected _innerGraph: Graph = null;
    protected _innerRoot: CHierarchy = null;

    get innerGraph() {
        return this._innerGraph;
    }
    get innerNodes() {
        return this._innerGraph.nodes;
    }
    get innerComponents() {
        return this._innerGraph.components;
    }
    get innerRoots() {
        return this._innerGraph.roots;
    }

    getInnerComponent<T extends Component = Component>(componentOrClass?: ComponentOrType<T>, nothrow: boolean = false) {
        return this._innerGraph.components.get(componentOrClass, nothrow);
    }

    getInnerComponents<T extends Component = Component>(componentOrClass?: ComponentOrType<T>) {
        return this._innerGraph.components.getArray(componentOrClass);
    }

    hasInnerComponent(componentOrClass: ComponentOrType) {
        return this._innerGraph.components.has(componentOrClass);
    }

    getInnerNode<T extends Node = Node>(nodeOrClass?: NodeOrType<T>, nothrow: boolean = false) {
        return this._innerGraph.nodes.get(nodeOrClass, nothrow);
    }

    getInnerNodes<T extends Node = Node>(nodeOrClass?: NodeOrType<T>) {
        return this._innerGraph.nodes.getArray(nodeOrClass);
    }

    hasInnerNode(nodeOrClass: NodeOrType) {
        return this._innerGraph.nodes.has(nodeOrClass);
    }

    create()
    {
        this._innerGraph = new Graph(this.system, this);
    }

    update(context: IUpdateContext): boolean
    {
        // TODO: Evaluate interface ins/outs
        return false;
    }

    tick(context: IUpdateContext): boolean
    {
        return this._innerGraph.tick(context);
    }

    complete(context: IUpdateContext)
    {
        return this._innerGraph.complete(context);
    }

    dispose()
    {
        this._innerGraph.clear();
        this._innerGraph = null;
        this._innerRoot = null;

        super.dispose();
    }

    activateInnerGraph()
    {
        this._innerGraph.activate();
    }

    deactivateInnerGraph()
    {
        this._innerGraph.deactivate();
    }

    /**
     * Removes all components and nodes from the inner graph.
     */
    clearInnerGraph()
    {
        this._innerGraph.clear();
    }

    inflate(json: any)
    {
        super.inflate(json);
        this._innerGraph.inflate(json.graph);
    }

    deflate()
    {
        const json = super.deflate();
        json.graph = this._innerGraph.deflate();
        return json;
    }

    onAddInnerRoot(component: CHierarchy)
    {
    }

    onRemoveInnerRoot(component: CHierarchy)
    {
    }
}

