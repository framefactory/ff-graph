/**
 * FF Typescript Foundation Library
 * Copyright 2018 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import System from "./System";
import Node from "./Node";
import NodeSet, { INodeEvent } from "./NodeSet";
import Component from "./Component";
import ComponentSet, { IComponentEvent } from "./ComponentSet";

import Controller, {
    Commander,
    Actions
} from "@ff/core/Controller";

////////////////////////////////////////////////////////////////////////////////

export { INodeEvent, IComponentEvent };

export type SelectionActions = Actions<Selection>;

export default class Selection extends Controller<Selection>
{
    multiSelect = false;
    exclusiveSelect = true;

    readonly system: System;
    readonly actions: SelectionActions;

    readonly nodes = new NodeSet();
    readonly components = new ComponentSet();


    constructor(system: System, commander: Commander)
    {
        super(commander);
        this.addEvents("select-node", "select-component", "update");

        this.system = system;
        this.actions = this.createActions(commander);

        this.nodes.on<INodeEvent>("node", e => this.onSelectNode(e.node, e.add));
        this.components.on<IComponentEvent>("component", e => this.onSelectComponent(e.component, e.add));

        system.nodes.on("node", this.onSystemNode, this);
        system.components.on("component", this.onSystemComponent, this);
    }

    dispose()
    {
        this.system.nodes.off("node", this.onSystemNode, this);
        this.system.components.off("component", this.onSystemComponent, this);
    }

    createActions(commander: Commander)
    {
        return {
            selectNode: commander.register({
                name: "Select Node", do: this.selectNode, target: this
            }),
            selectComponent: commander.register({
                name: "Select Component", do: this.selectComponent, target: this
            })
        };
    }

    selectNode(node?: Node, toggle: boolean = false)
    {
        const selectedNodes = this.nodes;

        const multiSelect = this.multiSelect && toggle;

        if (node && selectedNodes.contains(node)) {
            if (multiSelect) {
                selectedNodes._remove(node);
            }
        }
        else {
            if (this.exclusiveSelect) {
                this.components._clear();
            }
            if (!multiSelect) {
                selectedNodes._clear();
            }
            if (node) {
                selectedNodes._add(node);
            }
        }
    }

    selectComponent(component?: Component, toggle: boolean = false)
    {
        const selectedComponents = this.components;

        const multiSelect = this.multiSelect && toggle;

        if (component && selectedComponents.contains(component)) {
            if (multiSelect) {
                selectedComponents._remove(component);
            }
        }
        else {
            if (this.exclusiveSelect) {
                this.nodes._clear();
            }
            if (!multiSelect) {
                selectedComponents._clear();
            }
            if (component) {
                selectedComponents._add(component);
            }
        }
    }

    clearSelection()
    {
        this.nodes._clear();
        this.components._clear();
    }

    protected onSelectNode(node: Node, selected: boolean)
    {
    }

    protected onSelectComponent(component: Component, selected: boolean)
    {
    }

    protected onSystemNode(event: INodeEvent)
    {
        if (event.remove && this.nodes.contains(event.node)) {
            this.nodes._remove(event.node);
        }
    }

    protected onSystemComponent(event: IComponentEvent)
    {
        if (event.remove && this.components.contains(event.component)) {
            this.components._remove(event.component);
        }
    }
}