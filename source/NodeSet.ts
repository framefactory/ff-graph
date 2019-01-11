/**
 * FF Typescript Foundation Library
 * Copyright 2018 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import { Dictionary } from "@ff/core/types";
import Publisher, { ITypedEvent } from "@ff/core/Publisher";

import Node, { NodeOrType, getNodeTypeString } from "./Node";

import CHierarchy from "./components/CHierarchy";

////////////////////////////////////////////////////////////////////////////////

const _EMPTY_ARRAY = [];

export interface INodeEvent<T extends Node = Node> extends ITypedEvent<string>
{
    add: boolean;
    remove: boolean;
    node: T;
}

export default class NodeSet extends Publisher
{
    protected _typeDict: Dictionary<Node[]> = {};
    protected _dict: Dictionary<Node> = {};
    protected _list: Node[] = [];

    constructor()
    {
        super({ knownEvents: false });
    }

    /**
     * Adds a node to the set. Automatically called by the node constructor.
     * @param node
     * @private
     */
    _add(node: Node)
    {
        if (this._dict[node.id]) {
            throw new Error("node already registered");
        }

        // add node
        this._dict[node.id] = node;
        this._list.push(node);

        let prototype = Object.getPrototypeOf(node);

        const event = { type: "node", add: true, remove: false, node };
        this.emit<INodeEvent>(event);

        // add all types in prototype chain
        while (prototype.type !== Node.type) {
            const type = prototype.type;
            (this._typeDict[type] || (this._typeDict[type] = [])).push(node);

            event.type = type;
            this.emit<INodeEvent>(event);

            prototype = Object.getPrototypeOf(prototype);
        }
    }

    /**
     * Removes a node from the set. Automatically called by the node's dispose method.
     * @param node
     * @private
     */
    _remove(node: Node)
    {
        const index = this._list.indexOf(node);
        if (index < 0) {
            throw new Error("node not found");
        }

        // remove node
        delete this._dict[node.id];
        this._list.splice(index, 1);

        let prototype = node;

        const event = { type: "node", add: false, remove: true, node };
        this.emit<INodeEvent>(event);

        // remove all types in prototype chain
        while (prototype.type !== Node.type) {
            const type = prototype.type;
            const nodes = this._typeDict[type];
            const index = nodes.indexOf(node);
            nodes.splice(index, 1);

            event.type = type;
            this.emit<INodeEvent>(event);

            prototype = Object.getPrototypeOf(prototype);
        }
    }

    /**
     * Removes all nodes from the set.
     * @private
     */
    _clear()
    {
        const nodes = this.cloneArray();
        nodes.forEach(node => this._remove(node));
    }

    get length() {
        return this._list.length;
    }

    /**
     * Returns true if there are nodes (of a certain type if given) in this set.
     * @param nodeOrType
     */
    has(nodeOrType: NodeOrType): boolean
    {
        const nodes = this._typeDict[getNodeTypeString(nodeOrType)];
        return nodes && nodes.length > 0;
    }

    /**
     * Returns true if the given node is part of this set.
     * @param node
     */
    contains(node: Node): boolean
    {
        return !!this._dict[node.id];
    }

    /**
     * Returns the number of nodes (of a certain type if given) in this set.
     * @param nodeOrType
     */
    count(nodeOrType?: NodeOrType): number
    {
        const nodes = nodeOrType ? this._typeDict[getNodeTypeString(nodeOrType)] : this._list;
        return nodes ? nodes.length : 0;
    }

    /**
     * Returns an array of nodes in this set of a specific type if given.
     * @param nodeOrType If given only returns nodes of the given type.
     */
    getArray<T extends Node>(nodeOrType?: NodeOrType<T>): Readonly<T[]>
    {
        if (nodeOrType) {
            return (this._typeDict[getNodeTypeString(nodeOrType)] || _EMPTY_ARRAY) as T[];
        }

        return this._list as T[];
    }

    cloneArray<T extends Node>(nodeOrType?: NodeOrType<T>): Readonly<T[]>
    {
        return this.getArray(nodeOrType).slice();
    }

    /**
     * Returns the first found node in this set of the given type.
     * @param nodeOrType Type of node to return.
     */
    get<T extends Node = Node>(nodeOrType?: NodeOrType<T>): T | null
    {
        if (nodeOrType) {
            const nodes = this._typeDict[getNodeTypeString(nodeOrType)];
            return nodes ? nodes[0] as T : null;
        }

        return this._list[0] as T || null;
    }

    /**
     * Returns the first found node in this set of the given type.
     * Throws an exception if there is no node of the specified type.
     * @param nodeOrType Type of node to return.
     */
    safeGet<T extends Node = Node>(nodeOrType: NodeOrType<T>): T
    {
        const type = getNodeTypeString(nodeOrType);
        const nodes = this._typeDict[type];
        const node = nodes ? nodes[0] as T : undefined;
        if (!node) {
            throw new Error(`missing node: '${type}'`);
        }

        return node;
    }

    /**
     * Returns a node by its identifier.
     * @param {string} id An node's identifier.
     */
    getById(id: string): Node | null
    {
        return this._dict[id] || null;
    }

    /**
     * Returns the first node with the given name, or null if no node with
     * the given name exists. Performs a linear search, returns the first matching component found.
     * @param name Name of the node to find.
     * @param nodeOrType Optional type restriction.
     */
    findByName<T extends Node>(name: string, nodeOrType?: NodeOrType<T>): Node | null
    {
        const nodes = this.getArray(nodeOrType);

        for (let i = 0, n = nodes.length; i < n; ++i) {
            if (nodes[i].name === name) {
                return nodes[i];
            }
        }

        return null;
    }

    /**
     * Returns all nodes not containing a hierarchy component with a parent.
     * Performs a linear search; don't use in time-critical code.
     */
    findRoots(): Node[]
    {
        const nodes = this._list;
        const result = [];

        for (let i = 0, n = nodes.length; i < n; ++i) {
            const hierarchy = nodes[i].components.get<CHierarchy>("CHierarchy");
            if (!hierarchy || !hierarchy.parent) {
                result.push(nodes[i]);
            }
        }

        return result;
    }

    /**
     * Adds a listener for a node add/remove event.
     * @param type Name of the event, type name of the node, or node constructor.
     * @param callback Callback function, invoked when the event is emitted.
     * @param context Optional: this context for the callback invocation.
     */
    on<T extends ITypedEvent<string>>(type: T["type"] | T["type"][], callback: (event: T) => void, context?: any);
    on(type: NodeOrType, callback: (event: INodeEvent) => void, context?: any);
    on(type: string | string[], callback: (event: any) => void, context?: any);
    on(type, callback, context?)
    {
        if (typeof type !== "string" && !Array.isArray(type)) {
            type = type.type;
        }

        super.on(type, callback, context);
    }

    /**
     * Adds a one-time listener for a node add/remove event.
     * @param type Name of the event, type name of the node, or node constructor.
     * @param callback Callback function, invoked when the event is emitted.
     * @param context Optional: this context for the callback invocation.
     */
    once<T extends ITypedEvent<string>>(type: T["type"] | T["type"][], callback: (event: T) => void, context?: any);
    once(type: NodeOrType, callback: (event: INodeEvent) => void, context?: any);
    once(type: string | string[], callback: (event: any) => void, context?: any)
    once(type, callback, context?)
    {
        if (typeof type !== "string" && !Array.isArray(type)) {
            type = type.type;
        }

        super.once(type, callback, context);
    }

    /**
     * Removes a listener for a node add/remove event.
     * @param type Name of the event, type name of the node, or node constructor.
     * @param callback Callback function, invoked when the event is emitted.
     * @param context Optional: this context for the callback invocation.
     */
    off<T extends ITypedEvent<string>>(type: T["type"] | T["type"][], callback?: (event: T) => void, context?: any);
    off(type: NodeOrType, callback: (event: INodeEvent) => void, context?: any);
    off(type: string | string[], callback?: (event: any) => void, context?: any)
    off(type, callback, context?)
    {
        if (typeof type !== "string" && !Array.isArray(type)) {
            type = type.type;
        }

        super.off(type, callback, context);
    }
}