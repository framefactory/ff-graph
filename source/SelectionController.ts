/**
 * FF Typescript Foundation Library
 * Copyright 2018 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import System, { ISystemComponentEvent, ISystemNodeEvent } from "./System";
import Node from "./Node";
import Component from "./Component";

import Controller, {
    Commander,
    Actions,
    IPublisherEvent
} from "@ff/core/Controller";

////////////////////////////////////////////////////////////////////////////////

export type SelectionActions = Actions<SelectionController>;

export interface ISelectNodeEvent extends IPublisherEvent<SelectionController>
{
    node: Node;
    selected: boolean;
}

export interface ISelectComponentEvent extends IPublisherEvent<SelectionController>
{
    component: Component;
    selected: boolean;
}

export interface IControllerUpdateEvent extends IPublisherEvent<SelectionController>
{
}

export default class SelectionController extends Controller<SelectionController>
{
    static readonly selectNodeEvent = "node";
    static readonly selectComponentEvent = "component";
    static readonly updateEvent = "update";

    multiSelect = false;
    exclusiveSelect = true;

    readonly system: System;
    readonly actions: SelectionActions;

    protected _selectedNodes: Set<Node> = new Set();
    protected _selectedComponents: Set<Component> = new Set();

    constructor(system: System, commander: Commander)
    {
        super(commander);
        this.addEvents(
            SelectionController.selectNodeEvent,
            SelectionController.selectComponentEvent,
            SelectionController.updateEvent
        );

        this.system = system;
        this.actions = this.createActions(commander);

        system.on(System.nodeEvent, this.onSystemNode, this);
        system.on(System.componentEvent, this.onSystemComponent, this);
    }

    dispose()
    {
        this.system.off(System.nodeEvent, this.onSystemNode, this);
        this.system.off(System.componentEvent, this.onSystemComponent, this);
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
        const selectedNodes = this._selectedNodes;
        const multiSelect = this.multiSelect && toggle;

        if (node && selectedNodes.has(node)) {
            if (multiSelect) {
                selectedNodes.delete(node);
                this.emitSelectNodeEvent(node, false);
            }
        }
        else {
            if (this.exclusiveSelect) {
                for (let selectedComponent of this._selectedComponents) {
                    this.emitSelectComponentEvent(selectedComponent, false);
                }
                this._selectedComponents.clear();
            }
            if (!multiSelect) {
                for (let selectedNode of selectedNodes) {
                    this.emitSelectNodeEvent(selectedNode, false);
                }
                selectedNodes.clear();
            }
            if (node) {
                selectedNodes.add(node);
                this.emitSelectNodeEvent(node, true);
            }
        }
    }

    selectComponent(component?: Component, toggle: boolean = false)
    {
        const selectedComponents = this._selectedComponents;
        const multiSelect = this.multiSelect && toggle;

        if (component && selectedComponents.has(component)) {
            if (multiSelect) {
                selectedComponents.delete(component);
                this.emitSelectComponentEvent(component, false);
            }
        }
        else {
            if (this.exclusiveSelect) {
                for (let selectedNode of this._selectedNodes) {
                    this.emitSelectNodeEvent(selectedNode, false);
                }
                this._selectedNodes.clear();
            }
            if (!multiSelect) {
                for (let selectedComponent of selectedComponents) {
                    this.emitSelectComponentEvent(selectedComponent, false);
                }
                selectedComponents.clear();
            }
            if (component) {
                selectedComponents.add(component);
                this.emitSelectComponentEvent(component, true);
            }
        }
    }

    clearSelection()
    {
        for (let selectedNode of this._selectedNodes) {
            this.emitSelectNodeEvent(selectedNode, false);
        }
        this._selectedNodes.clear();

        for (let selectedComponent of this._selectedComponents) {
            this.emitSelectComponentEvent(selectedComponent, false);
        }
        this._selectedComponents.clear();
    }

    isNodeSelected(node: Node)
    {
        return this._selectedNodes.has(node);
    }

    isComponentSelected(component: Component)
    {
        return this._selectedComponents.has(component);
    }

    getFirstSelectedNode(): Node | undefined
    {
        return this._selectedNodes.values().next().value;
    }

    getSelectedNodes(): Node[]
    {
        const result = [];
        this._selectedNodes.forEach(node => result.push(node));
        return result;
    }

    getFirstSelectedComponent(): Component | undefined
    {
        return this._selectedComponents.values().next().value;
    }

    getSelectedComponents(): Component[]
    {
        const result = [];
        this._selectedComponents.forEach(component => result.push(component));
        return result;
    }

    protected emitSelectNodeEvent(node: Node, selected: boolean)
    {
        this.emit<ISelectNodeEvent>(
            SelectionController.selectNodeEvent, { node: node, selected }
        );
    }

    protected emitSelectComponentEvent(component: Component, selected: boolean)
    {
        const event = { component, selected };
        this.emit<ISelectComponentEvent>(SelectionController.selectComponentEvent, event);
        this.system.emitComponentEvent(component, SelectionController.selectComponentEvent, event);
    }

    protected onSystemNode(event: ISystemNodeEvent)
    {
        if (event.remove && this._selectedNodes.has(event.node)) {
            this.selectNode(event.node, false);
        }

        this.emit<IControllerUpdateEvent>(SelectionController.updateEvent);
    }

    protected onSystemComponent(event: ISystemComponentEvent)
    {
        if (event.remove && this._selectedComponents.has(event.component)) {
            this.selectComponent(event.component, false);
        }

        this.emit<IControllerUpdateEvent>(SelectionController.updateEvent);
    }
}