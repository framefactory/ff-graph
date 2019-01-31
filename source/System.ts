/**
 * FF Typescript Foundation Library
 * Copyright 2018 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import Publisher from "@ff/core/Publisher";
import ObjectRegistry from "@ff/core/ObjectRegistry";
import ClassRegistry from "@ff/core/ClassRegistry";

import Component, { ComponentOrClass, IComponentEvent } from "./Component";
import Node, { INodeEvent, NodeOrClass } from "./Node";
import Graph from "./Graph";

////////////////////////////////////////////////////////////////////////////////

export { IComponentEvent, INodeEvent };

export default class System extends Publisher
{
    readonly registry: ClassRegistry;
    readonly graph: Graph;

    readonly nodes = new ObjectRegistry<Node>(Node);
    readonly components = new ObjectRegistry<Component>(Component);


    constructor(registry?: ClassRegistry)
    {
        super({ knownEvents: false });

        this.registry = registry || new ClassRegistry();
        this.graph = new Graph(this, null);
    }

    getComponent<T extends Component = Component>(componentOrClass?: ComponentOrClass<T>, nothrow: boolean = false) {
        return this.components.get(componentOrClass, nothrow);
    }

    getComponents<T extends Component = Component>(componentOrClass?: ComponentOrClass<T>) {
        return this.components.getArray(componentOrClass);
    }

    hasComponents(componentOrClass: ComponentOrClass) {
        return this.components.has(componentOrClass);
    }

    getMainComponent<T extends Component = Component>(componentOrClass?: ComponentOrClass<T>, nothrow: boolean = false) {
        return this.graph.components.get(componentOrClass, nothrow);
    }

    getMainComponents<T extends Component = Component>(componentOrClass?: ComponentOrClass<T>) {
        return this.graph.components.getArray(componentOrClass);
    }

    hasMainComponents(componentOrClass: ComponentOrClass) {
        return this.graph.components.has(componentOrClass);
    }

    getNode<T extends Node = Node>(nodeOrClass?: NodeOrClass<T>, nothrow: boolean = false) {
        return this.nodes.get(nodeOrClass, nothrow);
    }

    getNodes<T extends Node = Node>(nodeOrClass?: NodeOrClass<T>) {
        return this.nodes.getArray(nodeOrClass);
    }

    hasNodes(nodeOrClass: NodeOrClass) {
        return this.nodes.has(nodeOrClass);
    }

    getMainNode<T extends Node = Node>(nodeOrClass?: NodeOrClass<T>, nothrow: boolean = false) {
        return this.graph.nodes.get(nodeOrClass, nothrow);
    }

    getMainNodes<T extends Node = Node>(nodeOrClass?: NodeOrClass<T>) {
        return this.graph.nodes.getArray(nodeOrClass);
    }

    hasMainNodes(nodeOrClass: NodeOrClass) {
        return this.graph.nodes.has(nodeOrClass);
    }

    findNodeByName<T extends Node = Node>(name: string, nodeOrClass?: NodeOrClass<T>): T | undefined
    {
        const nodes = this.nodes.getArray(nodeOrClass);

        for (let i = 0, n = nodes.length; i < n; ++i) {
            if (nodes[i].name === name) {
                return nodes[i];
            }
        }

        return undefined;
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
        this.nodes.add(node);
    }

    _removeNode(node: Node)
    {
        this.nodes.remove(node);
    }

    _addComponent(component: Component)
    {
        if (component.isSystemSingleton && this.components.has(component)) {
            throw new Error(`only one component of class '${component.className}' allowed per system`);
        }

        this.components.add(component);
    }

    _removeComponent(component: Component)
    {
        this.components.remove(component);
    }
}
