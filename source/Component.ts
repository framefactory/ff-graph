/**
 * FF Typescript Foundation Library
 * Copyright 2018 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import { Dictionary, TypeOf } from "@ff/core/types";
import Publisher, { ITypedEvent } from "@ff/core/Publisher";
import { IObjectEvent } from "@ff/core/ObjectRegistry";

import Property, { types, IPropertySchema, IPropertyTemplate, PropertiesFromTemplates } from "./Property";
import PropertyGroup, { ILinkable } from "./PropertyGroup";
import ComponentTracker from "./ComponentTracker";
import ComponentReference from "./ComponentReference";
import Node, { NodeOrType } from "./Node";
import System from "./System";
import CHierarchy from "./components/CHierarchy";

////////////////////////////////////////////////////////////////////////////////

export { types, ITypedEvent };


export interface IUpdateContext
{
}

export interface IComponentEvent<T extends Component = Component> extends IObjectEvent<T>
{
}

/**
 * Emitted by [[Component]] after the instance's state has changed.
 * @event
 */
export interface IComponentChangeEvent<T extends Component = Component> extends ITypedEvent<"change">
{
    component: T;
    what: string;
}

/**
 * Emitted by [[Component]] if the component is about to be disposed.
 * @event
 */
export interface IComponentDisposeEvent<T extends Component = Component> extends ITypedEvent<"dispose">
{
    component: T;
}

/** A [[Component]] instance, [[Component]] constructor function or a component's type string. */
export type ComponentOrType<T extends Component = Component> = T | TypeOf<T> | string;

////////////////////////////////////////////////////////////////////////////////

/**
 * Base class for components in a node-component system.
 *
 * ### Events
 * - *"change"* - emits [[IComponentChangeEvent]] after the component's state (except changed properties) has changed.
 * - *"update"* - emitted after the component has been updated due to changed properties.
 * - *"dispose"* - emits [[IComponentDisposeEvent]] if the component is about to be disposed.
 *
 * ### See also
 * - [[ComponentTracker]]
 * - [[ComponentLink]]
 * - [[ComponentType]]
 * - [[ComponentOrType]]
 * - [[Node]]
 * - [[Graph]]
 * - [[System]]
 */
export default class Component extends Publisher implements ILinkable
{
    static readonly typeName: string = "Component";

    static readonly text: string = "";
    static readonly icon: string = "";

    static readonly isNodeSingleton: boolean = true;
    static readonly isGraphSingleton: boolean = false;
    static readonly isSystemSingleton: boolean = false;

    static getTypeName<T extends Component>(scope?: ComponentOrType<T>): string
    {
        return typeof scope === "function" ? (scope as any).typeName : (typeof scope === "object"
            ? (scope.constructor as typeof Component).typeName : (scope || Component.typeName));
    }

    /** The component's globally unique id. */
    readonly id: string;

    ins: PropertyGroup = new PropertyGroup(this);
    outs: PropertyGroup = new PropertyGroup(this);

    changed: boolean = true;
    updated: boolean = false;

    private _node: Node = null;
    private _name: string = "";
    private _trackers: ComponentTracker[] = [];

    /**
     * Protected constructor. Use [[Node.createComponent]] to create component instances.
     * @param id Unique id for the component. A unique id is usually created automatically,
     * do not specify except while de-serializing the component.
     *
     * Note that during execution of the constructor, the component is not yet attached
     * to a node/graph/system. Do not try to get access to other components,
     * the parent node, graph, or the system here.
     */
    constructor(id: string)
    {
        super({ knownEvents: false });
        this.id = id;
    }

    /**
     * True if the component is a node singleton, i.e. can only be added once per node.
     */
    get isNodeSingleton() {
        return (this.constructor as typeof Component).isNodeSingleton;
    }

    /**
     * True if the component is a graph singleton, i.e. can only be added once per graph.
     */
    get isGraphSingleton() {
        return (this.constructor as typeof Component).isGraphSingleton;
    }

    /**
     * True if the component is a system singleton, i.e. can only be added once per system.
     */
    get isSystemSingleton() {
        return (this.constructor as typeof Component).isSystemSingleton;
    }

    /**
     * Returns the type name of this component.
     * @returns {string}
     */
    get typeName() {
        return (this.constructor as typeof Component).typeName;
    }
    get displayTypeName() {
        const typeName = this.typeName;
        return typeName === "Component" ? typeName : typeName.substr(1);
    }

    get text() {
        return (this.constructor as typeof Component).text;
    }

    get icon() {
        return (this.constructor as typeof Component).icon;
    }

    /**
     * Returns the name of this component.
     */
    get name() {
        return this._name;
    }

    get displayName() {
        return this._name || this.text || this.displayTypeName;
    }

    /**
     * Sets the name of this component.
     * This emits an [[IComponentChangeEvent]].
     * @param value
     */
    set name(value: string)
    {
        this._name = value;
        this.emit<IComponentChangeEvent>({ type: "change", component: this, what: "name" });
    }

    /**
     * Returns the node this component belongs to.
     */
    get node() {
        return this._node;
    }

    /**
     * Returns the graph this component and its node belong to.
     */
    get graph() {
        return this._node.graph;
    }

    /**
     * Returns the system this component and its node belong to.
     */
    get system(): System {
        return this._node.system;
    }

    /**
     * Returns the set of sibling components of this component.
     * Sibling components are components belonging to the same node.
     */
    get components() {
        return this._node.components;
    }

    /**
     * Returns true if the component's graph is active.
     */
    get isActive() {
        return this.graph.isActive;
    }

    /**
     * Returns the sibling hierarchy component if available.
     */
    get hierarchy() {
        return this._node.components.get<CHierarchy>("CHierarchy");
    }

    getComponent<T extends Component = Component>(componentOrType?: ComponentOrType<T>, nothrow: boolean = false) {
        return this._node.components.get(componentOrType, nothrow);
    }

    getComponents<T extends Component = Component>(componentOrType?: ComponentOrType<T>) {
        return this._node.components.getArray(componentOrType);
    }

    hasComponent(componentOrType: ComponentOrType) {
        return this._node.components.has(componentOrType);
    }

    getGraphComponent<T extends Component = Component>(componentOrType?: ComponentOrType<T>, nothrow: boolean = false) {
        return this._node.graph.components.get(componentOrType, nothrow);
    }

    getGraphComponents<T extends Component = Component>(componentOrType?: ComponentOrType<T>) {
        return this._node.graph.components.getArray(componentOrType);
    }

    hasGraphComponent(componentOrType: ComponentOrType) {
        return this._node.graph.components.has(componentOrType);
    }

    getMainComponent<T extends Component = Component>(componentOrType?: ComponentOrType<T>, nothrow: boolean = false) {
        return this._node.system.graph.components.get(componentOrType, nothrow);
    }

    getMainComponents<T extends Component = Component>(componentOrType?: ComponentOrType<T>) {
        return this._node.system.graph.components.getArray(componentOrType);
    }

    hasMainComponent(componentOrType: ComponentOrType) {
        return this._node.system.graph.components.has(componentOrType);
    }

    getSystemComponent<T extends Component = Component>(componentOrType?: ComponentOrType<T>, nothrow: boolean = false) {
        return this._node.system.components.get(componentOrType, nothrow);
    }

    getSystemComponents<T extends Component = Component>(componentOrType?: ComponentOrType<T>) {
        return this._node.system.components.getArray(componentOrType);
    }

    hasSystemComponent(componentOrType: ComponentOrType) {
        return this._node.system.components.has(componentOrType);
    }

    getComponentById(id: string): Component | null {
        return this._node.system.components.getById(id);
    }

    getNode<T extends Node = Node>(nodeOrType?: NodeOrType<T>, nothrow: boolean = false) {
        return this._node.graph.nodes.get(nodeOrType, nothrow);
    }

    getNodes<T extends Node = Node>(nodeOrType?: NodeOrType<T>) {
        return this._node.graph.nodes.getArray(nodeOrType);
    }

    hasNode(nodeOrType: NodeOrType) {
        return this._node.graph.nodes.has(nodeOrType);
    }

    getMainNode<T extends Node = Node>(nodeOrType?: NodeOrType<T>, nothrow: boolean = false) {
        return this._node.system.graph.nodes.get(nodeOrType, nothrow);
    }

    getMainNodes<T extends Node = Node>(nodeOrType?: NodeOrType<T>) {
        return this._node.system.graph.nodes.getArray(nodeOrType);
    }

    hasMainNode(nodeOrType: NodeOrType) {
        return this._node.system.graph.nodes.has(nodeOrType);
    }

    getSystemNode<T extends Node = Node>(nodeOrType?: NodeOrType<T>, nothrow: boolean = false) {
        return this._node.system.nodes.get(nodeOrType, nothrow);
    }

    getSystemNodes<T extends Node = Node>(nodeOrType?: NodeOrType<T>) {
        return this._node.system.nodes.getArray(nodeOrType);
    }

    hasSystemNode(nodeOrType: NodeOrType) {
        return this._node.system.nodes.has(nodeOrType);
    }

    getNodeById(id: string): Node | null {
        return this._node.system.nodes.getById(id);
    }

    /**
     * Adds the component to the given node.
     * @param node Node to attach the new component to.
     */
    attach(node: Node)
    {
        this._node = node;

        this.create();

        // if graph is active, activate component
        if (this.graph.isActive && this.activate) {
            this.activate();
        }

        // note: adding the component informs subscribers, this must happen after create()
        node._addComponent(this);
    }

    /**
     * Called after the component has been constructed and attached to a node.
     * Override to perform initialization tasks where you need access to other components.
     */
    create()
    {
    }

    activate()
    {
    }

    /**
     * Called during each cycle if the component's input properties have changed.
     * Override to update the status of the component based on the input properties.
     * @param context Information about the current update cycle.
     * @returns True if the state of the component has been changed during the update.
     */
    update(context: IUpdateContext): boolean
    {
        throw new Error("this should never be called");
    }

    /**
     * Called during each cycle, after the component has been updated.
     * Override to let the component perform regular tasks.
     * @param context Information about the current update cycle.
     */
    tick(context: IUpdateContext): boolean
    {
        throw new Error("this should never be called");
    }

    /**
     * Called after rendering is completed.
     * Override to perform update operations which need to happen
     * only after all rendering is done.
     * @param context Information about the current update cycle.
     */
    complete(context: IUpdateContext)
    {
        throw new Error("this should never be called");
    }

    deactivate()
    {
    }

    /**
     * Removes the component from its node and deletes it.
     * Override to perform cleanup tasks (remove event listeners, etc.).
     * Must call super implementation if overridden!
     */
    dispose()
    {
        // deactivate component if graph is active
        if (this.graph.isActive && this.deactivate) {
            this.deactivate();
        }

        // remove all links and trackers
        this.ins.dispose();
        this.outs.dispose();

        this._trackers.forEach(tracker => tracker.dispose());

        // remove component from node
        if (this._node) {
            this._node._removeComponent(this);
            this._node = null;
        }

        // emit dispose event
        this.emit<IComponentDisposeEvent>({ type: "dispose", component: this });
    }

    requestSort()
    {
        this.graph.requestSort();
    }

    /**
     * Returns true if this component has or inherits from the given type.
     * @param scope
     */
    is(scope: ComponentOrType): boolean
    {
        const typeName = Component.getTypeName(scope);

        let prototype = this;

        do {
            prototype = Object.getPrototypeOf(prototype);

            if ((prototype.constructor as typeof Component).typeName === typeName) {
                return true;
            }

        } while ((prototype.constructor as typeof Component).typeName !== Component.typeName);

        return false;
    }

    /**
     * Removes links from all input and output properties.
     */
    unlinkAllProperties()
    {
        this.ins.unlinkAllProperties();
        this.outs.unlinkAllProperties();
    }

    /**
     * Sets the changed flags of this component and of all input properties to false;
     */
    resetChanged()
    {
        this.changed = false;

        const ins = this.ins.properties;
        for (let i = 0, n = ins.length; i < n; ++i) {
            ins[i].changed = false;
        }

        const outs = this.outs.properties;
        for (let i = 0, n = outs.length; i < n; ++i) {
            outs[i].changed = false;
        }
    }

    /**
     * Tracks the given component type. If a component of this type is added
     * to or removed from the node, it will be added or removed from the tracker.
     * @param {ComponentOrType} componentOrType
     * @param {(component: T) => void} didAdd
     * @param {(component: T) => void} willRemove
     */
    trackComponent<T extends Component>(componentOrType: ComponentOrType<T>,
        didAdd?: (component: T) => void, willRemove?: (component: T) => void): ComponentTracker<T>
    {
        const tracker = new ComponentTracker(this._node.components, componentOrType, didAdd, willRemove);
        this._trackers.push(tracker);
        return tracker;
    }

    /**
     * Returns a weak reference to a component.
     * The reference is set to null after the linked component is removed.
     * @param componentOrType The type of component this reference accepts, or the component to link.
     */
    referenceComponent<T extends Component>(componentOrType: ComponentOrType<T>): ComponentReference<T>
    {
        return new ComponentReference<T>(this.system, componentOrType);
    }

    /**
     * Returns a text representation of the component.
     * @returns {string}
     */
    toString()
    {
        return `${this.typeName}${this.name ? " (" + this.name + ")" : ""}`;
    }

    deflate()
    {
        let json: any = {};

        const jsonIns = this.ins.deflate();
        if (jsonIns) {
            json.ins = jsonIns;
        }
        const jsonOuts = this.outs.deflate();
        if (jsonOuts) {
            json.outs = jsonOuts;
        }

        return json;
    }

    inflate(json: any)
    {
        if (json.ins) {
            this.ins.inflate(json.ins);
        }
        if (json.outs) {
            this.outs.inflate(json.outs);
        }
    }

    inflateReferences(json: any)
    {
        const dict = this.system.components.getDictionary();

        if (json.ins) {
            this.ins.inflateLinks(json.ins, dict);
        }
        if (json.outs) {
            this.outs.inflateLinks(json.outs, dict);
        }
    }

    addCustomInput(path: string, schema: IPropertySchema, index?: number): Property
    {
        this.changed = true;
        return this.ins.createCustomProperty(path, schema, index);
    }

    allowCustomInput(schema: IPropertySchema): boolean
    {
        return false;
    }

    addCustomOutput(path: string, schema: IPropertySchema, index?: number): Property
    {
        return this.outs.createCustomProperty(path, schema, index);
    }

    allowCustomOutput(schema: IPropertySchema): boolean
    {
        return false;
    }

     /**
     * Adds input properties to the component, specified by the provided property templates.
     * @param templates A plain object with property templates.
     * @param index Optional index at which to insert the new properties.
     */
    protected addInputs<T extends Component = Component, U extends Dictionary<IPropertyTemplate> = {}>
    (templates: U, index?: number) : PropertyGroup & T["ins"] & PropertiesFromTemplates<U>
    {
        return this.ins.createProperties(templates, index) as any;
    }

    /**
     * Adds output properties to the component, specified by the provided property templates.
     * @param templates A plain object with property templates.
     * @param index Optional index at which to insert the new properties.
     */
    protected addOutputs<T extends Component = Component, U extends Dictionary<IPropertyTemplate> = {}>
    (templates: U, index?: number) : PropertyGroup & T["outs"] & PropertiesFromTemplates<U>
    {
        return this.outs.createProperties(templates, index) as any;
    }
}

Component.prototype.activate = null;
Component.prototype.update = null;
Component.prototype.tick = null;
Component.prototype.complete = null;
Component.prototype.deactivate = null;
