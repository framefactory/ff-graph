/**
 * FF Typescript Foundation Library
 * Copyright 2024 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import { uniqueId } from "@ffweb/core/uniqueId.js";
import { Dictionary } from "@ffweb/core/types.js";
import { Publisher, ITypedEvent } from "@ffweb/core/Publisher.js";

import { Socket } from "./Socket.js";

////////////////////////////////////////////////////////////////////////////////

/**
 * To make use of linkable sockets, classes must implement this interface.
 */
export interface ILinkable
{
    /** A unique identifier for this instance. */
    id: string;
    /** Will be set to true if an input property changes. */
    changed: boolean;

    /** Set of input properties. */
    readonly ins: SocketGroup;
    /** Set of output properties. */
    readonly outs: SocketGroup;

    /** Called after property links have been added or removed. */
    topologyChanged: () => void;
}

/**
 * Emitted by {@link SocketGroup} after sockets have been added or removed.
 * @event
 */
export interface ISocketGroupChangeEvent extends ITypedEvent<"change">
{
    add: boolean;
    remove: boolean;
    socket: Socket;
}

/**
 * A set of sockets. Sockets can be linked, such that one socket updates another.
 * After adding sockets to the group, they are available on the group using their key.
 * To make use of linkable properties, classes must implement the {@link ILinkable}
 * interface.
 *
 * ### Events
 * - *"change"* - emits {@link ISocketGroupChangeEvent} after properties have
 *   been added, removed, or renamed.
 */
export class SocketGroup extends Publisher
{
    linkable: ILinkable;
    sockets: Socket[];

    constructor(linkable: ILinkable)
    {
        super();
        this.addEvent("change");

        this.linkable = linkable;
        this.sockets = [];
    }

    get customSockets() {
        return this.sockets.filter(socket => socket.custom);
    }

    dispose()
    {
        this.unlinkAllSockets();
    }

    isInputGroup()
    {
        return this === this.linkable.ins;
    }

    isOutputGroup()
    {
        return this === this.linkable.outs;
    }

    addCustomSocket(socket: Socket, index?: number)
    {
        const key = uniqueId(5);
        this.addSocket(socket, key, index);
    }

    addSocket(socket: Socket, key: string, index?: number)
    {
        if (socket.group) {
            throw new Error("can't add, socket already part of a group");
        }

        if (this[key]) {
            throw new Error(`key '${key}' already exists in group`);
        }

        (socket as any)._group = this;
        (socket as any)._key = key;

        if (index === undefined) {
            this.sockets.push(socket);
        }
        else {
            this.sockets.splice(index, 0, socket);
        }

        this[key] = socket;

        this.emit<ISocketGroupChangeEvent>({
            type: "change", add: true, remove: false, socket
        });
    }

    /**
     * Removes the given property from the set.
     * @param {Property} property The property to be removed.
     */
    removeSocket(socket: Socket)
    {
        if (socket.group !== this) {
            throw new Error("can't remove, socket not in this group");
        }
        if (socket.hasLinks()) {
            throw new Error("can't remove, socket has links");
        }

        if (this[socket.key] !== socket) {
            throw new Error(`socket key '${socket.key}' not found in group`);
        }

        this.sockets.slice(this.sockets.indexOf(socket), 1);

        delete this[socket.key];

        (socket as any)._group = null;
        (socket as any)._key = "";

        this.emit<ISocketGroupChangeEvent>({
            type: "change", add: false, remove: true, socket
        });
    }

    unlinkAllSockets()
    {
        this.sockets.forEach(socket => socket.unlink());
    }

    /**
     * Returns a socket by key.
     * @param {string} key The key of the socket to be returned.
     * @returns {Socket}
     */
    getSocket(key: string): Socket
    {
        const socket = this[key];
        if (!socket) {
            throw new Error(`no socket found with key '${key}'`);
        }

        return socket;
    }

    getKeys(): string[]
    {
        return this.sockets.map(socket => socket.key);
    }

    toJSON()
    {
        let json: any = null;

        this.sockets.forEach(socket => {
            const jsonProp = socket.toJSON();
            if (jsonProp) {
                json = json || {};
                json[socket.key] = jsonProp;
            }
        });

        return json;
    }

    fromJSON(json: any)
    {
        Object.keys(json).forEach(key => {
            const jsonProp = json[key];
            if (jsonProp.schema) {
                const socket = new Socket(jsonProp.path, jsonProp.schema, /* custom */ true);
                this.addSocket(socket, key);
            }
        });
    }

    linksFromJSON(json: any, linkableDict: Dictionary<ILinkable>)
    {
        Object.keys(json).forEach(key => {
            this[key].fromJSON(json[key], linkableDict);
        });
    }
}
