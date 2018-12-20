/**
 * FF Typescript Foundation Library
 * Copyright 2018 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import { Dictionary, Readonly } from "@ff/core/types";
import Publisher, { IPublisherEvent } from "@ff/core/Publisher";

import Node, { getNodeTypeString, NodeOrType } from "./Node";

////////////////////////////////////////////////////////////////////////////////

const _EMPTY_ARRAY = [];

export interface INodeTypeEvent<T extends Node = Node> extends IPublisherEvent<NodeSet>
{
    add: boolean;
    remove: boolean;
    node: T;
}

export default class NodeSet extends Publisher<NodeSet>
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

        const event: INodeTypeEvent = { add: true, remove: false, node, sender: this };

        // add to actual type
        let type = node.type;
        (this._typeDict[type] || (this._typeDict[type] = [])).push(node);
        this.emit(type, event);

        // add to base types
        let baseType = Object.getPrototypeOf(node);
        while((baseType = Object.getPrototypeOf(baseType)).type !== Node.type) {
            type = baseType.type;
            (this._typeDict[type] || (this._typeDict[type] = [])).push(node);
            this.emit(type, event);
        }
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

        delete this._dict[node.id];
        this._list.splice(index, 1);
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
}