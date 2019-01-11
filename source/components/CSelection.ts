/**
 * FF Typescript Foundation Library
 * Copyright 2018 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import Commander from "@ff/core/Commander";
import { types } from "../propertyTypes";

import Component from "../Component";
import ComponentSet, { IComponentEvent } from "../ComponentSet";
import Node from "../Node";
import NodeSet, { INodeEvent } from "../NodeSet";

import CController, { Actions } from "./CController";

////////////////////////////////////////////////////////////////////////////////

export { INodeEvent, IComponentEvent };

export type SelectionActions = Actions<CSelection>;

export default class CSelection extends CController<CSelection>
{
    static readonly type: string = "CSelection";

    outs = this.outs.append({
        selNodeCount: types.Integer("Selection.Nodes"),
        selComponentCount: types.Integer("Selection.Components")
    });

    multiSelect = false;
    exclusiveSelect = true;

    readonly selectedNodes = new NodeSet();
    readonly selectedComponents = new ComponentSet();

    constructor(node: Node, id?: string)
    {
        super(node, id);
        this.addEvents("select-node", "select-component", "update");

        this.selectedNodes.on<INodeEvent>("node", e => this.onSelectNode(e.node, e.add));
        this.selectedComponents.on<IComponentEvent>("component", e => this.onSelectComponent(e.component, e.add));
    }

    create()
    {
        super.create();

        this.system.nodes.on("node", this.onSystemNode, this);
        this.system.components.on("component", this.onSystemComponent, this);
    }

    dispose()
    {
        this.system.nodes.off("node", this.onSystemNode, this);
        this.system.components.off("component", this.onSystemComponent, this);

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

    selectNode(node?: Node, toggle: boolean = false)
    {
        const selectedNodes = this.selectedNodes;

        const multiSelect = this.multiSelect && toggle;

        if (node && selectedNodes.contains(node)) {
            if (multiSelect) {
                selectedNodes._remove(node);
            }
        }
        else {
            if (this.exclusiveSelect) {
                this.selectedComponents._clear();
            }
            if (!multiSelect) {
                selectedNodes._clear();
            }
            if (node) {
                selectedNodes._add(node);
            }
        }

        this.updateStats();
    }

    selectComponent(component?: Component, toggle: boolean = false)
    {
        const selectedComponents = this.selectedComponents;

        const multiSelect = this.multiSelect && toggle;

        if (component && selectedComponents.contains(component)) {
            if (multiSelect) {
                selectedComponents._remove(component);
            }
        }
        else {
            if (this.exclusiveSelect) {
                this.selectedNodes._clear();
            }
            if (!multiSelect) {
                selectedComponents._clear();
            }
            if (component) {
                selectedComponents._add(component);
            }
        }

        this.updateStats();
    }

    clearSelection()
    {
        this.selectedNodes._clear();
        this.selectedComponents._clear();

        this.updateStats();
    }

    protected onSelectNode(node: Node, selected: boolean)
    {
    }

    protected onSelectComponent(component: Component, selected: boolean)
    {
    }

    protected onSystemNode(event: INodeEvent)
    {
        if (event.remove && this.selectedNodes.contains(event.node)) {
            this.selectedNodes._remove(event.node);
        }
    }

    protected onSystemComponent(event: IComponentEvent)
    {
        if (event.remove && this.selectedComponents.contains(event.component)) {
            this.selectedComponents._remove(event.component);
        }
    }

    protected updateStats()
    {
        const outs = this.outs;
        outs.selNodeCount.setValue(this.selectedNodes.length);
        outs.selComponentCount.setValue(this.selectedComponents.length);
    }
}