/**
 * FF Typescript Foundation Library
 * Copyright 2024 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import { Dictionary } from "@ffweb/core/types.js";
import { Publisher, ITypedEvent } from "@ffweb/core/Publisher.js";

import { SocketGroup, ILinkable } from "./SocketGroup.js";
import { SocketLink } from "./SocketLink.js";

////////////////////////////////////////////////////////////////////////////////

export interface ISocketChangeEvent extends ITypedEvent<"change">
{
    socket: Socket;
    what: "path" | string;
}

export interface ISocketLinkEvent extends ITypedEvent<"link">
{
    link: SocketLink;
    add: boolean;
    remove: boolean;
}

export interface ISocketDisposeEvent extends ITypedEvent<"dispose">
{
    socket: Socket;
}

export class Socket extends Publisher
{
    changed: boolean;

    readonly kind: string;
    readonly custom: boolean;

    readonly inLinks: SocketLink[];
    readonly outLinks: SocketLink[];

    protected _path: string;
    protected _group: SocketGroup;
    protected _key: string;

    constructor(path: string, kind: string, custom?: boolean)
    {
        super();
        this.addEvents("change", "link", "dispose");

        this.kind = kind;
        this.custom = custom ?? false;

        this.inLinks = [];
        this.outLinks = [];

        this._path = path;
    }

    get group(): SocketGroup {
        return this._group;
    }

    get linkable(): ILinkable {
        return this._group.linkable;
    }

    get key(): string {
        return this._key;
    }

    get name(): string {
        return this._path.split(".").pop();
    }
    
    get path() {
        return this._path;
    }
    
    set path(path: string) {
        this._path = path;
        this.emit<ISocketChangeEvent>({ type: "change", what: "path", socket: this });
    }

    set(silent?: boolean)
    {
        if (!silent) {
            this.changed = true;

            if (this.isInput()) {
                this._group.linkable.changed = true;
            }
        }

        const outLinks = this.outLinks;
        for (let i = 0, n = outLinks.length; i < n; ++i) {
            outLinks[i].push();
        }
    }

    topologyChanged()
    {
        if (this._group && this._group.linkable) {
            this._group.linkable.topologyChanged();
        }
    }

    isInput(): boolean
    {
        return this._group && this._group === this._group.linkable.ins;
    }

    isOutput(): boolean
    {
        return this._group && this._group === this._group.linkable.outs;
    }

    linkTo(destination: Socket)
    {
        destination.linkFrom(this);
    }

    linkFrom(source: Socket)
    {
        if (!this.canLinkFrom(source)) {
            throw new Error(`can't link from '${source.path}' to '${this.path}'`);
        }

        const link = new SocketLink(source, this);
        source.addOutLink(link);
        this.addInLink(link);
    }

    unlinkTo(destination: Socket)
    {
        destination.unlinkFrom(this);
    }

    unlinkFrom(source: Socket): boolean
    {
        const link = this.inLinks.find(link => link.source === source);

        if (!link) {
            return false;
        }

        source.removeOutLink(link);
        this.removeInLink(link);

        return true;
    }

    unlink()
    {
        const inLinks = this.inLinks.slice();
        inLinks.forEach(link => {
            link.source.removeOutLink(link);
            this.removeInLink(link)
        });

        const outLinks = this.outLinks.slice();
        outLinks.forEach(link => {
            this.removeOutLink(link);
            link.destination.removeInLink(link);
        });

        if (this.inLinks.length !== 0 || this.outLinks.length !== 0) {
            throw new Error("fatal: leftover links");
        }
    }

    addInLink(link: SocketLink)
    {
        if(link.destination !== this) {
            throw new Error("input link's destination must be equal to this");
        }

        this.inLinks.push(link);
        this.topologyChanged();

        this.emit<ISocketLinkEvent>({
            type: "link", add: true, remove: false, link
        });
    }

    addOutLink(link: SocketLink)
    {
        if(link.source !== this) {
            throw new Error("output link's source must be equal to this");
        }

        this.outLinks.push(link);
        this.topologyChanged();
    }

    removeInLink(link: SocketLink)
    {
        const index = this.inLinks.indexOf(link);
        if (index < 0) {
            throw new Error("input link not found");
        }

        this.inLinks.splice(index, 1);
        this.topologyChanged();

        this.emit<ISocketLinkEvent>({
            type: "link", add: false, remove: true, link
        });
    }

    removeOutLink(link: SocketLink)
    {
        const index = this.outLinks.indexOf(link);
        if (index < 0) {
            throw new Error("output link not found");
        }

        this.outLinks.splice(index, 1);
        this.topologyChanged();
    }

    canLinkTo(destination: Socket): boolean
    {
        return destination.canLinkFrom(this);
    }

    canLinkFrom(source: Socket): boolean
    {
        // can't link to an output property
        if (this.isOutput()) {
            return false;
        }

        // sockets must be of same kind
        return this.kind === source.kind;
    }

    hasLinks()
    {
        return this.inLinks.length > 0 || this.outLinks.length > 0;
    }

    hasInLinks()
    {
        return this.inLinks.length > 0;
    }

    hasOutLinks(index?: number)
    {
        return this.outLinks.length > 0;
    }

    inLinkCount()
    {
        return this.inLinks.length;
    }

    outLinkCount()
    {
        return this.outLinks.length;
    }

    toJSON()
    {
        let json: any = this.custom ? {
            path: this.path,
            kind: this.kind,
        } : null;

        if (this.outLinks.length > 0) {
            json ??= {};
            json.links = this.outLinks.map(link => ({
                id: link.destination._group.linkable.id,
                key: link.destination.key
            }));
        }

        return json;
    }

    fromJSON(json: any, linkableDict: Dictionary<ILinkable>)
    {
        if (json.links !== undefined) {
            json.links.forEach(link => {
                const target = linkableDict[link.id];
                const socket = target.ins[link.key];
                socket.linkFrom(this, link.srcIndex, link.dstIndex);
            });
        }
    }

    /**
     * Returns a text representation.
     */
    toString()
    {
        return `${this.path} [${this.kind}]`
    }

    dump(indent: string = "")
    {
        console.log(indent + `Socket '${this.path}', key: ${this.key}`);
    }
}