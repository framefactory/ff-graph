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

    readonly graph = new Graph(this.system);

    protected _root: CHierarchy;

    set root(root: CHierarchy) {
        this._root = root;
    }

    get root() {
        return this._root;
    }

    update(context: IUpdateContext): boolean
    {
        // TODO: Evaluate interface ins/outs
        return false;
    }

    tick(context: IUpdateContext): boolean
    {
        return this.graph.tick(context);
    }

    inflate(json: any)
    {
        super.inflate(json);
        this.graph.inflate(json.graph);
    }

    deflate()
    {
        const json = super.deflate();
        json.graph = this.graph.deflate();
    }
}
