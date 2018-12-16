/**
 * FF Typescript Foundation Library
 * Copyright 2018 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import { Dictionary, Readonly } from "@ff/core/types";

import Node from "./Node";

////////////////////////////////////////////////////////////////////////////////

export default class NodeSet
{
    protected _dict: Dictionary<Node> = {};
    protected _list: Node[] = [];

    /**
     * Adds a node to the set. Automatically called by the node constructor.
     * @param {Node} node
     */
    _add(node: Node)
    {
        if (this._dict[node.id]) {
            throw new Error("node already registered");
        }

        this._dict[node.id] = node;
        this._list.push(node);
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
     * Returns an array of all nodes in the set.
     */
    getArray(): Readonly<Node[]>
    {
        return this._list;
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
     * the given name exists. Performs a linear search; don't use in time-critical code.
     * @param name Name of the node to find.
     */
    findByName(name: string): Node | null
    {
        const nodes = this._list;

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
            // TODO: Solve circular dependency on HierarchyComponent
            const hierarchy: any = nodes[i].components.get("Hierarchy");
            if (!hierarchy || !hierarchy.parent) {
                result.push(nodes[i]);
            }
        }

        return result;
    }
}