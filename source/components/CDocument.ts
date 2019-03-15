/**
 * FF Typescript Foundation Library
 * Copyright 2018 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import { types } from "../Component";

import CGraph from "./CGraph";

////////////////////////////////////////////////////////////////////////////////

export default class CDocument extends CGraph
{
    static readonly typeName: string = "CDocument";

    protected static readonly docIns = {
        dump: types.Event("Document.Dump"),
    };

    protected static readonly docOuts = {
        active: types.Boolean("Document.Active"),
    };

    ins = this.addInputs(CDocument.docIns);
    outs = this.addOutputs(CDocument.docOuts);


    activateInnerGraph()
    {
        super.activateInnerGraph();
        this.outs.active.setValue(true);
    }

    deactivateInnerGraph()
    {
        super.deactivateInnerGraph();
        this.outs.active.setValue(false);
    }

    update(context)
    {
        const ins = this.ins;

        if (ins.dump.changed) {
            const json = this.toJSON();
            console.log("-------------------- DOCUMENT --------------------");
            console.log(JSON.stringify(json, null, 2));
        }

        return true;
    }
}