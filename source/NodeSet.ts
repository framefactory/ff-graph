/**
 * FF Typescript Foundation Library
 * Copyright 2018 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import { Dictionary } from "@ff/core/types";
import Publisher, { ITypedEvent } from "@ff/core/Publisher";

import Node, { NodeOrType, getNodeTypeString } from "./Node";

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
     * @param {Node} node
     */
    _add(node: Node)
    {
        if (this._dict[node.id]) {
            throw new Error("node already registered");
        }

        // add node
        this._dict[node.id] = node;
        this._list.push(node);

        let prototype = node;

        const event = { type: "node", add: true, remove: false, node };
        this.emit<INodeEvent>(event);

        // add all types in prototype chain
        do {
            prototype = Object.getPrototypeOf(prototype);
            const type = prototype.type;
            (this._typeDict[type] || (this._typeDict[type] = [])).push(node);

            event.type = type;
            this.emit<INodeEvent>(event);

        } while(prototype.type !== Node.type);
    }

    /**
     * Removes a node from the set. Automatically called by the node's dispose method.
     * @param {Node} node
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
        do {
            prototype = Object.getPrototypeOf(prototype);
            const type = prototype.type;
            const nodes = this._typeDict[type];
            const index = nodes.indexOf(node);
            nodes.splice(index, 1);

            event.type = type;
            this.emit<INodeEvent>(event);

        } while(prototype.type !== Node.type);
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
     * Returns the first found component in this set of the given type.
     * @param nodeOrType Type of component to return.
     */
    get<T extends Node>(nodeOrType: NodeOrType<T>): T | undefined
    {
        const nodes = this._typeDict[getNodeTypeString(nodeOrType)];
        return nodes ? nodes[0] as T : undefined;
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
            const hierarchy: any = nodes[i].components.get("Hierarchy");
            if (!hierarchy || !hierarchy.parent) {
                result.push(nodes[i]);
            }
        }

        return result;
    }

    /**
     * Adds a listener for a node add/remove event.
     * @param name Name of the event, type name of the node, or node constructor.
     * @param callback Event handler function.
     * @param context Optional context object on which to call the event handler function.
     */
    on(name: string | string[] | NodeOrType, callback: (event: any) => void, context?: any): void
    {
        if (typeof name !== "string" && !Array.isArray(name)) {
            name = name.type;
        }

        super.on(name, callback, context);
    }

    /**
     * Removes a listener for a node add/remove event.
     * @param name Name of the event, type name of the node, or node constructor.
     * @param callback Event handler function.
     * @param context Optional context object on which to call the event handler function.
     */
    off(name: string | string[] | NodeOrType, callback?: (event: any) => void, context?: any): void
    {
        if (typeof name !== "string" && !Array.isArray(name)) {
            name = name.type;
        }

        super.off(name, callback, context);
    }

    /**
     * Adds a one-time listener for a node add/remove event.
     * @param name Name of the event, type name of the node, or node constructor.
     * @param callback Event handler function.
     * @param context Optional context object on which to call the event handler function.
     */
    once(name: string | string[] | NodeOrType, callback: (event: any) => void, context?: any): void
    {
        if (typeof name !== "string" && !Array.isArray(name)) {
            name = name.type;
        }

        super.once(name, callback, context);
    }
}