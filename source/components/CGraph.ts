/**
 * FF Typescript Foundation Library
 * Copyright 2018 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import Component, { ComponentOrClass, IUpdateContext } from "../Component";
import Graph from "../Graph";

import CHierarchy from "./CHierarchy";
import Node, { NodeOrClass } from "../Node";

////////////////////////////////////////////////////////////////////////////////

export default class CGraph extends Component
{
    static readonly type: string = "CGraph";

    protected _innerGraph: Graph = null;
    protected _innerRoot: CHierarchy = null;

    get innerGraph() {
        return this._innerGraph;
    }

    getInnerRoots() {
        return this._innerGraph.roots;
    }

    getInnerComponent<T extends Component = Component>(componentOrClass?: ComponentOrClass<T>, nothrow: boolean = false) {
        return this._innerGraph.components.get(componentOrClass, nothrow);
    }

    getInnerComponents<T extends Component = Component>(componentOrClass?: ComponentOrClass<T>) {
        return this._innerGraph.components.getArray(componentOrClass);
    }

    hasInnerComponent(componentOrClass: ComponentOrClass) {
        return this._innerGraph.components.has(componentOrClass);
    }

    getInnerNode<T extends Node = Node>(nodeOrClass?: NodeOrClass<T>, nothrow: boolean = false) {
        return this._innerGraph.nodes.get(nodeOrClass, nothrow);
    }

    getInnerNodes<T extends Node = Node>(nodeOrClass?: NodeOrClass<T>) {
        return this._innerGraph.nodes.getArray(nodeOrClass);
    }

    hasInnerNode(nodeOrClass: NodeOrClass) {
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

    finalize(context: IUpdateContext)
    {
        return this._innerGraph.finalize(context);
    }

    dispose()
    {
        this._innerGraph.clear();
        this._innerGraph = null;
        this._innerRoot = null;

        super.dispose();
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

