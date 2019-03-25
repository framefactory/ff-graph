/**
 * FF Typescript Foundation Library
 * Copyright 2018 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import Component, { ITypedEvent, types } from "../Component";
import Node, { NodeOrType } from "../Node";

import CGraph from "./CGraph";
import CSelection, { INodeEvent, IComponentEvent } from "./CSelection";

////////////////////////////////////////////////////////////////////////////////

export enum ENodeScope {
    // Components in the given scoped graph.
    Graph,
    // Nodes in the main graph.
    Main,
    // All nodes in the system.
    System,
}

/**
 * Emitted by [[CActiveNode]] if the active node changes.
 * @event
 */
export interface IActiveNodeEvent<T extends Node = Node> extends ITypedEvent<"active-node">
{
    previous: T;
    next: T;
}

/**
 * Defines a scope of nodes. Exactly one node can be the active node. The scope
 * of candidate nodes is definable. The active node can be driven by the current selection.
 *
 * ### Events
 * - *"active-node"* - Emits [[IActiveNodeEvent]] if the active node changes.
 */
export default class CActiveNode<T extends Node = Node> extends Component
{
    static readonly typeName: string = "CActiveNode";

    protected static readonly anOuts = {
        activeNode: types.Object("Nodes.Active", Node),
        scopeUpdate: types.Event("Nodes.Update"),
    };

    outs = this.addOutputs(CActiveNode.anOuts);
    
    protected readonly nodeType: NodeOrType<T> = Node as any;
    /** If a node in scope is selected, it becomes the active node. */
    protected readonly followNodeSelection = true;
    /** If a component is selected whose parent node is in scope, the node becomes the active node. */
    protected readonly followComponentSelection = false;
    /** If the active node is unselected, keep it active anyway. */
    protected readonly retainSelection = true;

    private _scope: ENodeScope = ENodeScope.Graph;
    private _scopedGraph: CGraph = null;

    get scope() {
        return this._scope;
    }
    set scope(scope: ENodeScope) {
        this._scope = scope;
        if (!this.isNodeInScope(this.activeNode)) {
            this.activeNode = null;
        }
    }
    
    get scopedGraph() {
        return this._scopedGraph;
    }
    set scopedGraph(graphComponent: CGraph) {
        this._scopedGraph = graphComponent;
        if (!this.isNodeInScope(this.activeNode)) {
            this.activeNode = null;
        }
    }

    get scopedNodes() {
        switch (this._scope) {
            case ENodeScope.Graph:
                const graph = this._scopedGraph ? this._scopedGraph.innerGraph : this.graph;
                return graph.getNodes(this.nodeType);
            case ENodeScope.Main:
                return this.getMainNodes(this.nodeType);
            case ENodeScope.System:
                return this.getSystemNodes(this.nodeType);
        }
    }
    get activeNode(): T {
        return this.outs.activeNode.value as T;
    }
    set activeNode(node: T) {
        if (!this.isNodeInScope(node)) {
            throw new Error("can't activate, node out of scope");
        }

        const activeNode = this.activeNode;

        if (node !== activeNode) {
            if (activeNode) {
                this.deactivateNode(activeNode);
            }
            if (node) {
                this.activateNode(node);
            }

            this.emit<IActiveNodeEvent>({ type: "active-node", previous: activeNode, next: node });
            this.outs.activeNode.setValue(node);
        }
    }

    protected get selection() {
        return this.getSystemComponent(CSelection);
    }

    create()
    {
        super.create();

        this.system.nodes.on(Node, this.onNode, this);

        if (this.followNodeSelection) {
            this.selection.selectedNodes.on(this.nodeType, this.onSelectNode, this);
        }
        if (this.followComponentSelection) {
            this.selection.selectedComponents.on(Component, this.onSelectComponent, this);
        }
    }

    dispose()
    {
        this.system.nodes.off(Node, this.onNode, this);

        if (this.followNodeSelection) {
            this.selection.selectedNodes.off(this.nodeType, this.onSelectNode, this);
        }
        if (this.followComponentSelection) {
            this.selection.selectedComponents.off(Component, this.onSelectComponent, this);
        }

        super.dispose();
    }

    protected activateNode(node: T)
    {
    }

    protected deactivateNode(node: T)
    {
    }

    protected onNode(event: INodeEvent)
    {
        // in case the active node is removed
        if (event.remove && event.object === this.activeNode) {
            this.activeNode = null;
        }

        if (this.isNodeInScope(event.object)) {
            this.outs.scopeUpdate.set();
        }
    }

    protected onSelectNode(event: INodeEvent<T>)
    {
        const node = event.object;

        if (this.isNodeInScope(node)) {
            if (event.add) {
                this.activeNode = node;
            }
            else if (event.remove && !this.retainSelection && node === this.activeNode) {
                this.activeNode = null;
            }
        }
    }

    protected onSelectComponent(event: IComponentEvent)
    {
        const node = event.object.node;
        if (node.is(this.nodeType)) {
            this.onSelectNode({
                type: node.typeName, object: node as T, add: event.add, remove: event.remove
            });
        }
    }

    protected isNodeInScope(node: Node)
    {
        switch (this._scope) {
            case ENodeScope.Graph:
                const graph = this._scopedGraph ? this._scopedGraph.innerGraph : this.graph;
                return node.graph === graph;
            case ENodeScope.Main:
                return node.graph === this.system.graph;
            case ENodeScope.System:
                return true;
        }

        return false;
    }
}