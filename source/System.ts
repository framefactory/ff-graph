/**
 * FF Typescript Foundation Library
 * Copyright 2018 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import Publisher, { IPublisherEvent } from "@ff/core/Publisher";

import Component from "./Component";
import ComponentSet, { IComponentEvent } from "./ComponentSet";
import Node from "./Node";
import NodeSet, { INodeEvent } from "./NodeSet";
import Graph from "./Graph";
import Registry from "./Registry";
import Hierarchy from "./Hierarchy";

////////////////////////////////////////////////////////////////////////////////

export { IComponentEvent, INodeEvent };

export interface ISystemNodeEvent extends IPublisherEvent<System>
{
    add: boolean;
    remove: boolean;
    node: Node;
}

export interface ISystemComponentEvent<T extends Component = Component>
    extends IPublisherEvent<System>
{
    add: boolean;
    remove: boolean;
    component: T;
}

export interface IUpdateContext
{
}

export interface IRenderContext
{
}

export default class System extends Publisher<System>
{
    static readonly nodeEvent = "node";
    static readonly componentEvent = "component";

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
     * Calls update() on all components in the system whose changed flag is set.
     * @param context
     * @returns true if the state of at least one component has changed.
     */
    update(context: IUpdateContext): boolean
    {
        return this.graph.update(context);
    }

    /**
     * Calls tick() on all components in the system.
     * @param context
     * @returns true if the state of at least one component has changed.
     */
    tick(context: IUpdateContext): boolean
    {
        return this.graph.tick(context);
    }

    preRender(context: IRenderContext)
    {
        this.graph.preRender(context);
    }

    postRender(context: IRenderContext)
    {
        this.graph.postRender(context);
    }

    emitComponentEvent(target: Component, name: string, event: any)
    {
        while (target) {
            target.emitAny(name, event);

            if (event.stopPropagation) {
                return;
            }

            const components = target.components.getArray();
            for (let i = 0, n = components.length; i < n; ++i) {
                const component = components[i];
                if (component !== target) {
                    component.emitAny(name, event);

                    if (event.stopPropagation) {
                        return;
                    }
                }
            }

            const hierarchy = target.components.get(Hierarchy);
            target = hierarchy ? hierarchy.parent : null;
        }

        if (!event.stopPropagation) {
            this.emitAny(name, event);
        }
    }

    deflate()
    {
        return this.graph.deflate();
    }

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

        this.nodeAdded(node);
        this.emit<ISystemNodeEvent>(System.nodeEvent, { add: true, remove: false, node: node });
    }

    _removeNode(node: Node)
    {
        this.nodes._remove(node);

        this.nodeRemoved(node);
        this.emit<ISystemNodeEvent>(System.nodeEvent, { add: false, remove: true, node: node });
    }

    _addComponent(component: Component)
    {
        if (component.isSystemSingleton && this.components.has(component)) {
            throw new Error(`only one component of type '${component.type}' allowed per system`);
        }

        this.components._add(component);

        this.componentAdded(component);
        this.emit<ISystemComponentEvent>(System.componentEvent, { add: true, remove: false, component });
    }

    _removeComponent(component: Component)
    {
        this.components._remove(component);

        this.componentRemoved(component);
        this.emit<ISystemComponentEvent>(System.componentEvent, { add: false, remove: true, component });
    }

    /**
     * Called after a new node has been added to the system.
     * [[ISystemNodeEvent]] has not been fired yet.
     * Override to perform custom operations after a node has been added.
     * @param {Node} node The node added to the system.
     */
    protected nodeAdded(node: Node)
    {
    }

    /**
     * Called before a node is removed from the system.
     * [[ISystemNodeEvent]] has not been fired yet.
     * Override to perform custom operations before a node is removed.
     * @param {Node} node The node being removed from the system.
     */
    protected nodeRemoved(node: Node)
    {
    }

    /**
     * Called after a new component has been added to the system.
     * [[ISystemComponentEvent]] has not been fired yet.
     * Override to perform custom operations after a component has been added.
     * @param {Component} component The component added to the system.
     */
    protected componentAdded(component: Component)
    {
    }

    /**
     * Called before a component is removed from the system.
     * [[ISystemComponentEvent]] has not been fired yet.
     * Override to perform custom operations before a component is removed.
     * @param {Component} component The component being removed from the system.
     */
    protected componentRemoved(component: Component)
    {
    }
}
