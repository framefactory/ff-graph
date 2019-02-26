/**
 * FF Typescript Foundation Library
 * Copyright 2018 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import { types } from "../Component";
import CGraph from "./CGraph";
import CDocumentManager from "./CDocumentManager";

////////////////////////////////////////////////////////////////////////////////

const _inputs = {
    activate: types.Event("Document.Activate"),
    dump: types.Event("Document.Dump"),
};

const _outputs = {
    active: types.Boolean("Document.Active"),
};

export default class CDocument extends CGraph
{
    static readonly typeName: string = "CDocument";

    ins = this.addInputs(_inputs);
    outs = this.addOutputs(_outputs);

    get documentManager() {
        return this.getComponent(CDocumentManager);
    }

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

        if (ins.activate.changed) {
            this.documentManager.activeDocument = this;
        }

        if (ins.dump.changed) {
            const json = this.deflate();
            console.log("-------------------- DOCUMENT --------------------");
            console.log(JSON.stringify(json, null, 2));
        }

        return true;
    }
}