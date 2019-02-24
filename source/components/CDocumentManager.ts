/**
 * FF Typescript Foundation Library
 * Copyright 2018 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import Component, { types, ITypedEvent } from "../Component";
import CDocument from "./CDocument";

////////////////////////////////////////////////////////////////////////////////

/**
 * Emitted after the set of documents has changed.
 * @event
 */
export interface IDocumentEvent extends ITypedEvent<"document">
{
}

/**
 * Emitted after the active item has changed.
 * @event
 */
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

    private _activeDocument: CDocument = null;

    get documents() {
        return this.getComponents(CDocument);
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

            this.emit<IActiveDocumentEvent>({
                type: "active-document",
                previous,
                next: document
            });
        }

        const index = this.documents.indexOf(document);
        this.ins.activeDocument.setValue(index + 1, true);
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
            this.activeDocument = index >= 0 ? this.documents[index] : null;
        }

        return true;
    }

    dispose()
    {
        this.components.off(CDocument, this.updateDocuments, this);
    }

    protected updateDocuments()
    {
        console.log("updateDocuments", this.documents);
        const documents = this.documents;
        const names = documents.map(document => document.displayName);
        names.unshift("(none)");
        this.ins.activeDocument.setOptions(names);

        let activeDocument = this._activeDocument;
        if (!activeDocument || documents.indexOf(activeDocument) < 0) {
            activeDocument = documents[0];
        }

        this.activeDocument = activeDocument;
        this.emit<IDocumentEvent>({ type: "document" });
    }
}