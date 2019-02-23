/**
 * FF Typescript Foundation Library
 * Copyright 2018 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import Component, { types, ITypedEvent } from "../Component";
import CDocument from "./CDocument";

////////////////////////////////////////////////////////////////////////////////

export interface IActiveDocumentEvent extends ITypedEvent<"active-document">
{
    previous: CDocument;
    next: CDocument;
}

const _inputs = {
    activeDocument: types.Option("Documents.Active", []),
};

export default class CDocumentManager extends Component
{
    static readonly typeName: string = "CDocumentManager";
    static readonly isSystemSingleton = true;

    ins = this.addInputs(_inputs);

    private _documents: CDocument[] = null;
    private _activeDocument: CDocument = null;

    get documents() {
        return this._documents;
    }

    get activeDocument() {
        return this._activeDocument;
    }
    set activeDocument(document: CDocument) {

        if (document !== this._activeDocument) {
            const previous = this._activeDocument;

            if (previous) {
                previous.deactivateInnerGraph();
            }

            this._activeDocument = document;

            if (document) {
                document.activateInnerGraph();
            }

            const index = this._documents.indexOf(document) + 1;
            this.ins.activeDocument.setValue(index, true);

            this.emit<IActiveDocumentEvent>({
                type: "active-document",
                previous,
                next: document
            });
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
            this.activeDocument = index >= 0 ? this._documents[index] : null;
        }

        return true;
    }

    dispose()
    {
        this.components.off(CDocument, this.updateDocuments, this);
    }

    protected updateDocuments()
    {
        const documents = this._documents = this.getComponents(CDocument);
        const names = documents.map(document => document.displayName);
        names.unshift("(none)");
        this.ins.activeDocument.setOptions(names);

        const activeDocument = this._activeDocument;
        if (!activeDocument || (activeDocument && documents.indexOf(activeDocument) < 0)) {
            this.activeDocument = documents[0];
        }
    }
}