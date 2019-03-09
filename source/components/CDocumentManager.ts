/**
 * FF Typescript Foundation Library
 * Copyright 2018 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import Component, { types } from "../Component";
import CDocument from "./CDocument";

////////////////////////////////////////////////////////////////////////////////

export default class CDocumentManager extends Component
{
    static readonly typeName: string = "CDocumentManager";
    static readonly isSystemSingleton = true;

    protected static readonly ins = {
        activeDocument: types.Option("Documents.ActiveDocument", []),
    };

    protected static readonly outs = {
        activeDocument: types.Object("Documents.ActiveDocument", CDocument),
        changedDocuments: types.Event("Documents.Changed"),
    };

    ins = this.addInputs(CDocumentManager.ins);
    outs = this.addOutputs(CDocumentManager.outs);

    get documents() {
        return this.getComponents(CDocument);
    }
    get activeDocument() {
        return this.outs.activeDocument.value;
    }
    set activeDocument(document: CDocument) {
        if (document !== this.activeDocument) {
            const index = this.documents.indexOf(document);
            this.ins.activeDocument.setValue(index + 1);
        }
    }

    create()
    {
        this.components.on(CDocument, this.updateDocuments, this);
        this.updateDocuments();
    }

    update()
    {
        const ins = this.ins;

        if (ins.activeDocument.changed) {
            const index = ins.activeDocument.getValidatedValue() - 1;
            const nextDocument = index >= 0 ? this.documents[index] : null;
            const activeDocument = this.activeDocument;

            if (nextDocument !== activeDocument) {
                if (activeDocument) {
                    activeDocument.deactivateInnerGraph();
                }
                if (nextDocument) {
                    nextDocument.activateInnerGraph();
                }

                this.outs.activeDocument.setValue(nextDocument);
            }
        }

        return true;
    }

    dispose()
    {
        this.components.off(CDocument, this.updateDocuments, this);
    }

    protected updateDocuments()
    {
        const documents = this.documents;
        const names = documents.map(document => document.displayName);
        names.unshift("(none)");
        this.ins.activeDocument.setOptions(names);

        let activeDocument = this.activeDocument;

        const index = activeDocument ?
            documents.indexOf(activeDocument) :
            Math.min(1, documents.length);

        if (index !== this.ins.activeDocument.getValidatedValue()) {
            this.ins.activeDocument.setValue(index);
        }

        this.outs.changedDocuments.set();
    }
}