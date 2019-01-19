/**
 * FF Typescript Foundation Library
 * Copyright 2018 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import Publisher from "@ff/core/Publisher";

import Component from "./Component";
import ComponentSet, { IComponentEvent } from "./ComponentSet";
import Node from "./Node";
import NodeSet, { INodeEvent } from "./NodeSet";
import Graph from "./Graph";
import Registry from "./Registry";

////////////////////////////////////////////////////////////////////////////////

export { IComponentEvent, INodeEvent };

export default class System extends Publisher
{
    readonly registry: Registry;
    readonly nodes: NodeSet;
    readonly components: ComponentSet;
    readonly graph: Graph;


    constructor(registry?: Registry)
    {
        super({ knownEvents: false });

        this.registry = registry || new Registry();
        this.nodes = new NodeSet();
        this.components = new ComponentSet();
        this.graph = new Graph(this);
    }

    /**
     * Serializes the content of the system, ready to be stringified.
     */
    deflate()
    {
        return this.graph.deflate();
    }

    /**
     * Deserializes the given JSON object.
     * @param json
     */
    inflate(json)
    {
        this.graph.inflate(json);
    }

    toString(verbose: boolean = false)
    {
        const nodes = this.nodes.getArray();
        const numComponents = this.components.count();

        const text = `System - ${nodes.length} nodes, ${numComponents} components.`;

        if (verbose) {
            return text + "\n" + nodes.map(node => node.toString(true)).join("\n");
        }

        return text;
    }

    _addNode(node: Node)
    {
        this.nodes._add(node);
    }

    _removeNode(node: Node)
    {
        this.nodes._remove(node);
    }

    _addComponent(component: Component)
    {
        if (component.isSystemSingleton && this.components.has(component)) {
            throw new Error(`only one component of type '${component.type}' allowed per system`);
        }

        this.components._add(component);
    }

    _removeComponent(component: Component)
    {
        this.components._remove(component);
    }
}
