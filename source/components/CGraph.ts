/**
 * FF Typescript Foundation Library
 * Copyright 2018 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import Component, { IUpdateContext } from "../Component";
import Graph from "../Graph";

import CHierarchy from "./CHierarchy";

////////////////////////////////////////////////////////////////////////////////

export default class CGraph extends Component
{
    static readonly type: string = "CGraph";

    protected _innerGraph: Graph = null;
    protected _innerRoot: CHierarchy = null;

    get innerGraph() {
        return this._innerGraph;
    }

    get innerRoot() {
        return this._innerRoot;
    }
    set innerRoot(root: CHierarchy) {
        this._innerRoot = root;
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
}
