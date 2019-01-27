/**
 * FF Typescript Foundation Library
 * Copyright 2018 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import { Dictionary } from "@ff/core/types";
import Publisher, { ITypedEvent } from "@ff/core/Publisher";

import Node, { NodeOrType, nodeTypeName } from "./Node";

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
    protected _typeLists: Dictionary<Node[]> = { [Node.type]: [] };
    protected _idDict: Dictionary<Node> = {};

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
        if (this._idDict[node.id] !== undefined) {
            throw new Error("node already in set");
        }

        // add node to id dictionary
        this._idDict[node.id] = node;

        let prototype = node;
        const event = { type: "", add: true, remove: false, node };

        // add all types in prototype chain
        do {
            prototype = Object.getPrototypeOf(prototype);

            const type = prototype.type;
            (this._typeLists[type] || (this._typeLists[type] = [])).push(node);

            event.type = type;
            this.emit<INodeEvent>(event);

        } while (prototype.type !== Node.type);
    }

    /**
     * Removes a node from the set. Automatically called by the node's dispose method.
     * @param node
     * @private
     */
    _remove(node: Node)
    {
        if (this._idDict[node.id] !== node) {
            throw new Error("node not in set");
        }

        // remove node from id dictionary
        delete this._idDict[node.id];

        let prototype = node;
        const event = { type: "", add: false, remove: true, node };

        // remove all types in prototype chain
        do {
            prototype = Object.getPrototypeOf(prototype);

            const type = prototype.type;
            const nodes = this._typeLists[type];
            nodes.splice(nodes.indexOf(node), 1);

            event.type = type;
            this.emit<INodeEvent>(event);

        } while (prototype.type !== Node.type);
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
        return this._typeLists[Node.type].length;
    }

    /**
     * Returns true if there are nodes (of a certain type if given) in this set.
     * @param nodeOrType
     */
    has(nodeOrType: NodeOrType): boolean
    {
        const nodes = this._typeLists[nodeTypeName(nodeOrType)];
        return nodes && nodes.length > 0;
    }

    /**
     * Returns true if the given node is part of this set.
     * @param node
     */
    contains(node: Node): boolean
    {
        return !!this._idDict[node.id];
    }

    /**
     * Returns the number of nodes (of a certain type if given) in this set.
     * @param nodeOrType
     */
    count(nodeOrType?: NodeOrType): number
    {
        const nodes = this._typeLists[nodeTypeName(nodeOrType)];
        return nodes ? nodes.length : 0;
    }

    getDictionary(): Readonly<Dictionary<Node>>
    {
        return this._idDict;
    }

    /**
     * Returns an array of nodes in this set of a specific type if given.
     * @param nodeOrType If given only returns nodes of the given type.
     */
    getArray<T extends Node>(nodeOrType?: NodeOrType<T>): Readonly<T[]>
    {
        return (this._typeLists[nodeTypeName(nodeOrType)] || _EMPTY_ARRAY) as T[];
    }

    cloneArray<T extends Node>(nodeOrType?: NodeOrType<T>): Readonly<T[]>
    {
        return this.getArray(nodeOrType).slice();
    }

    /**
     * Returns the first found node in this set of the given type.
     * @param nodeOrType Type of node to return.
     */
    get<T extends Node = Node>(nodeOrType?: NodeOrType<T>): T | undefined
    {
        const nodes = this._typeLists[nodeTypeName(nodeOrType)];
        return nodes ? nodes[0] as T : undefined;
    }

    /**
     * Returns the first found node in this set of the given type.
     * Throws an exception if there is no node of the specified type.
     * @param nodeOrType Type of node to return.
     */
    safeGet<T extends Node = Node>(nodeOrType: NodeOrType<T>): T
    {
        const type = nodeTypeName(nodeOrType);
        const nodes = this._typeLists[type];
        const node = nodes ? nodes[0] as T : undefined;
        if (!node) {
            throw new Error(`no nodes of type '${type}' in set`);
        }

        return node;
    }

    /**
     * Returns a node by its identifier.
     * @param {string} id An node's identifier.
     */
    getById(id: string): Node | null
    {
        return this._idDict[id] || null;
    }

    /**
     * Returns the first node with the given name, or null if no node with
     * the given name exists. Performs a linear search, returns the first matching component found.
     * @param name Name of the node to find.
     * @param nodeOrType Optional type restriction.
     */
    findByName<T extends Node = Node>(name: string, nodeOrType?: NodeOrType<T>): T | null
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
    findRoots<T extends Node = Node>(nodeOrType?: NodeOrType<T>): T[]
    {
        const nodes = this._typeLists[nodeTypeName(nodeOrType)];
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
     * @param nodeOrType Type name of the node, or node constructor.
     * @param callback Callback function, invoked when the event is emitted.
     * @param context Optional: this context for the callback invocation.
     */
    on<T extends Node>(nodeOrType: NodeOrType<T>, callback: (event: INodeEvent<T>) => void, context?: object)
    {
        super.on(nodeTypeName(nodeOrType), callback, context);
    }

    /**
     * Adds a one-time listener for a node add/remove event.
     * @param nodeOrType Type name of the node, or node constructor.
     * @param callback Callback function, invoked when the event is emitted.
     * @param context Optional: this context for the callback invocation.
     */
    once<T extends Node>(nodeOrType: NodeOrType<T>, callback: (event: INodeEvent<T>) => void, context?: object)
    {
        super.once(nodeTypeName(nodeOrType), callback, context);
    }

    /**
     * Removes a listener for a node add/remove event.
     * @param nodeOrType Type name of the node, or node constructor.
     * @param callback Callback function, invoked when the event is emitted.
     * @param context Optional: this context for the callback invocation.
     */
    off<T extends Node>(nodeOrType: NodeOrType<T>, callback?: (event: INodeEvent<T>) => void, context?: object)
    {
        super.off(nodeTypeName(nodeOrType), callback, context);
    }

    toString(verbose: boolean = false)
    {
        if (verbose) {
            return this.getArray().map(node => node.displayName).join("\n");
        }

        return `nodes: ${this.length}, types: ${Object.keys(this._typeLists).length}`;
    }
}