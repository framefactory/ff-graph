/**
 * FF Typescript Foundation Library
 * Copyright 2018 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import { ITypedEvent } from "@ff/core/Publisher";
import Commander from "@ff/core/Commander";
import ObjectRegistry from "@ff/core/ObjectRegistry";

import { types } from "../propertyTypes";

import Component, { IComponentEvent } from "../Component";
import Node, { INodeEvent } from "../Node";
import Graph from "../Graph";

import CGraph from "./CGraph";
import CController, { Actions } from "./CController";

////////////////////////////////////////////////////////////////////////////////

export { INodeEvent, IComponentEvent };

export interface IActiveGraphEvent extends ITypedEvent<"active-graph">
{
    previous: Graph;
    next: Graph;
}

export type SelectionActions = Actions<CSelection>;

const outs = {
    selNodeCount: types.Integer("Selection.Nodes"),
    selComponentCount: types.Integer("Selection.Components")
};

export default class CSelection extends CController<CSelection>
{
    static readonly type: string = "CSelection";

    outs = this.addOutputs(outs);

    multiSelect = false;
    exclusiveSelect = true;

    readonly selectedNodes = new ObjectRegistry(Node);
    readonly selectedComponents = new ObjectRegistry(Component);

    private _activeGraph: Graph = null;

    constructor(id: string)
    {
        super(id);
        this.addEvents("select-node", "select-component", "active-graph", "update");

        this.selectedNodes.on(Node, e => this.onSelectNode(e.object, e.add));
        this.selectedComponents.on(Component, e => this.onSelectComponent(e.object, e.add));
    }

    get activeGraph() {
        return this._activeGraph;
    }
    set activeGraph(graph: Graph) {
        if (graph !== this.activeGraph) {
            this.clearSelection();
            const previous = this._activeGraph;
            this._activeGraph = graph;
            this.onActiveGraph(graph);
            this.emit<IActiveGraphEvent>({ type: "active-graph", previous, next: graph });
        }
    }

    hasParentGraph()
    {
        return this._activeGraph && this._activeGraph.parent;
    }

    activateParentGraph()
    {
        if (this._activeGraph && this._activeGraph.parent.graph) {
            this.activeGraph = this._activeGraph.parent.graph;
        }
    }

    hasChildGraph()
    {
        return this.selectedComponents.has(CGraph);
    }

    activateChildGraph()
    {
        const graphComponent = this.selectedComponents.get(CGraph);
        if (graphComponent) {
            this.activeGraph = graphComponent.innerGraph;
        }
    }

    create()
    {
        super.create();

        this._activeGraph = this.system.graph;

        this.system.nodes.on(Node, this.onSystemNode, this);
        this.system.components.on(Component, this.onSystemComponent, this);
    }

    dispose()
    {
        this.system.nodes.off(Node, this.onSystemNode, this);
        this.system.components.off(Component, this.onSystemComponent, this);

        super.dispose();
    }

    createActions(commander: Commander)
    {
        return {
            selectNode: commander.register({
                name: "Select Node", do: this.selectNode, target: this
            }),
            selectComponent: commander.register({
                name: "Select Component", do: this.selectComponent, target: this
            }),
            clearSelection: commander.register({
                name: "Clear Selection", do: this.clearSelection, target: this
            })
        };
    }

    nodeContainsSelectedComponent(node: Node)
    {
        const components = node.components.getArray();
        for (let i = 0, n = components.length; i < n; ++i) {
            if (this.selectedComponents.contains(components[i])) {
                return true;
            }
        }

        return false;
    }

    selectNode(node?: Node, toggle: boolean = false)
    {
        this.activeGraph = node.graph;

        const selectedNodes = this.selectedNodes;
        const multiSelect = this.multiSelect && toggle;

        if (node && selectedNodes.contains(node)) {
            if (multiSelect) {
                selectedNodes.remove(node);
            }
        }
        else {
            if (this.exclusiveSelect) {
                this.selectedComponents.clear();
            }
            if (!multiSelect) {
                selectedNodes.clear();
            }
            if (node) {
                selectedNodes.add(node);
            }
        }

        this.updateStats();
    }

    selectComponent(component?: Component, toggle: boolean = false)
    {
        this.activeGraph = component.graph;

        const selectedComponents = this.selectedComponents;
        const multiSelect = this.multiSelect && toggle;

        if (component && selectedComponents.contains(component)) {
            if (multiSelect) {
                selectedComponents.remove(component);
            }
        }
        else {
            if (this.exclusiveSelect) {
                this.selectedNodes.clear();
            }
            if (!multiSelect) {
                selectedComponents.clear();
            }
            if (component) {
                selectedComponents.add(component);
            }
        }

        this.updateStats();
    }

    clearSelection()
    {
        this.selectedNodes.clear();
        this.selectedComponents.clear();

        this.updateStats();
    }

    protected onSelectNode(node: Node, selected: boolean)
    {
    }

    protected onSelectComponent(component: Component, selected: boolean)
    {
    }

    protected onActiveGraph(graph: Graph)
    {
    }

    protected onSystemNode(event: INodeEvent)
    {
        if (event.remove && this.selectedNodes.contains(event.object)) {
            this.selectedNodes.remove(event.object);
        }
    }

    protected onSystemComponent(event: IComponentEvent)
    {
        if (event.remove && this.selectedComponents.contains(event.object)) {
            this.selectedComponents.remove(event.object);
        }
    }

    protected updateStats()
    {
        const outs = this.outs;
        outs.selNodeCount.setValue(this.selectedNodes.length);
        outs.selComponentCount.setValue(this.selectedComponents.length);
    }
}