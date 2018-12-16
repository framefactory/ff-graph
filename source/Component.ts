/**
 * FF Typescript Foundation Library
 * Copyright 2018 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import { Dictionary, TypeOf } from "@ff/core/types";
import uniqueId from "@ff/core/uniqueId";
import Publisher, { IPublisherEvent } from "@ff/core/Publisher";

import Property from "./Property";
import PropertySet, { ILinkable } from "./PropertySet";
import Node, { IComponentTypeEvent } from "./Node";
import System, { IUpdateContext, IRenderContext } from "./System";
import Hierarchy from "./Hierarchy";

////////////////////////////////////////////////////////////////////////////////

export interface IComponentEvent<T extends Component = Component> extends IPublisherEvent<T> { }

/**
 * Emitted by [[Component]] after the instance's state has changed.
 * @event
 */
export interface IComponentChangeEvent<T extends Component = Component> extends IComponentEvent<T>
{
    what: string;
}

/**
 * Emitted by [[Component]] if the component is about to be disposed.
 * @event
 */
export interface IComponentDisposeEvent<T extends Component = Component> extends IComponentEvent<T> { }



/** The constructor function of a [[Component]]. */
export type ComponentType<T extends Component = Component> = TypeOf<T> & { type: string };

/** A [[Component]] instance, [[Component]] constructor function or a type string. */
export type ComponentOrType<T extends Component = Component> = T | ComponentType<T> | string;

/** Returns the type string of the given [[ComponentOrType]]. */
export function getType<T extends Component>(componentOrType: ComponentOrType<T>): string {
    return typeof componentOrType === "string" ? componentOrType : componentOrType.type;
}

/**
 * Tracks components of a specific type in the same node.
 * Maintains a reference to the component if found and executes
 * callbacks if the component of the tracked type is added or removed.
 */
export class ComponentTracker<T extends Component = Component>
{
    /** The component being tracked. */
    component: T;
    /** Called after a component has been assigned to the tracker. */
    didAdd: (component: T) => void;
    /** Called before a component is removed from the tracker. */
    willRemove: (component: T) => void;

    private _node: Node;
    private _type: ComponentOrType<T>;

    constructor(node: Node, componentOrType: ComponentOrType<T>,
                didAdd?: (component: T) => void, willRemove?: (component: T) => void) {

        this.didAdd = didAdd;
        this.willRemove = willRemove;

        this._node = node;
        this._type = componentOrType;

        node.addComponentTypeListener(this._type, this.onComponent, this);
        this.component = node.components.get(componentOrType);

        if (this.component && didAdd) {
            didAdd(this.component);
        }
    }

    dispose()
    {
        this._node.removeComponentTypeListener(this._type, this.onComponent, this);
    }

    protected onComponent(event: IComponentTypeEvent<T>)
    {
        if (event.add) {
            this.component = event.component;
            this.didAdd(event.component);
        }
        else if (event.remove) {
            this.willRemove(event.component);
            this.component = null;
        }
    }
}

/**
 * Maintains a weak reference to a component.
 * The reference is set to null after the linked component is removed.
 */
export class ComponentLink<T extends Component = Component>
{
    private _id: string;
    private readonly _type: string;
    private readonly _system: System;

    constructor(owner: Component, componentOrType?: ComponentOrType<T>) {
        this._type = componentOrType ? getType(componentOrType) : null;
        this._id = componentOrType instanceof Component ? componentOrType.id : undefined;
        this._system = owner.system;
    }

    get component(): T | null {
        return this._id ? this._system.components.getById(this._id) as T || null : null;
    }
    set component(component: T) {
        if (component && this._type && !(component instanceof this._system.registry.getComponentType(this._type))) {
            throw new Error(`can't assign component of type '${(component as Component).type || "unknown"}' to link of type '${this._type}'`);
        }
        this._id = component ? component.id : undefined;
    }
}

/**
 * Base class for components in an node-component system.
 *
 * ### Events
 * - *"change"* - emits [[IComponentChangeEvent]] after the instance's state has changed.
 *
 * ### See also
 * - [[ComponentTracker]]
 * - [[ComponentLink]]
 * - [[ComponentType]]
 * - [[ComponentOrType]]
 * - [[Node]]
 * - [[System]]
 */
export default class Component extends Publisher<Component> implements ILinkable
{
    static readonly type: string = "Component";

    static readonly isNodeSingleton: boolean = true;
    static readonly isGraphSingleton: boolean = false;
    static readonly isSystemSingleton: boolean = false;

    static readonly changeEvent = "change";
    static readonly disposeEvent = "dispose";

    /**
     * Creates a new component and attaches it to the given node.
     * @param type Type of the component to create.
     * @param node Node to attach the component new to.
     * @param id Unique id for the component. Can be omitted, will be created automatically.
     */
    static create<T extends Component = Component>(type: ComponentType<T>, node: Node, id?: string): T
    {
        const Ctor = type as TypeOf<T>;
        const component = new Ctor(node, id);

        component.create();
        node._addComponent(component);
        return component;
    }

    readonly id: string;
    readonly node: Node;

    ins: PropertySet = new PropertySet(this);
    outs: PropertySet = new PropertySet(this);

    changed: boolean = true;

    private _name: string = "";
    private _trackers: ComponentTracker[] = [];

    /**
     * Protected constructor. Use the static [[Component.create]] method instead.
     * @param node Node to attach the component new to.
     * @param id Unique id for the component. Can be omitted, will be created automatically.
     */
    constructor(node: Node, id?: string)
    {
        super({ knownEvents: false });

        this.id = id || uniqueId();
        this.node = node;
    }

    /**
     * Returns the type identifier of this component.
     * @returns {string}
     */
    get type() {
        return (this.constructor as typeof Component).type;
    }

    /**
     * Returns the set of sibling components of this component.
     * Sibling components are components belonging to the same node.
     */
    get components() {
        return this.node.components;
    }

    get hierarchy() {
        return this.node.components.get(Hierarchy);
    }

    /**
     * Returns the graph this component and its node belong to.
     */
    get graph() {
        return this.node.graph;
    }

    /**
     * Returns the system this component and its node belong to.
     */
    get system(): System {
        return this.node.system;
    }

    /**
     * Returns the name of this component.
     * @returns {string}
     */
    get name() {
        return this._name;
    }

    get isNodeSingleton() {
        return (this.constructor as typeof Component).isNodeSingleton;
    }

    get isGraphSingleton() {
        return (this.constructor as typeof Component).isGraphSingleton;
    }

    get isSystemSingleton() {
        return (this.constructor as typeof Component).isSystemSingleton;
    }

    /**
     * Sets the name of this component.
     * This emits an [[IComponentChangeEvent]].
     * @param {string} value
     */
    set name(value: string)
    {
        this._name = value;
        this.emit<IComponentChangeEvent>(Component.changeEvent, { what: "name" });
    }

    /**
     * Called after construction of the component.
     * Override to perform initialization tasks where you need access to other components.
     */
    create()
    {
    }

    /**
     * Called during each cycle if the component's input properties have changed.
     * Override to update the status of the component based on the input properties.
     * @param context
     * @returns True if the state of the component has been changed during the update.
     */
    update(context: IUpdateContext): boolean
    {
        throw new Error("this should never be called");
    }

    /**
     * Called during each cycle, after the component has been updated.
     * Override to let the component perform regular tasks.
     * @param context
     */
    tick(context: IUpdateContext): boolean
    {
        throw new Error("this should never be called");
    }

    /**
     * Called just before the component is rendered.
     * This function can be called multiple times during each cycle,
     * once for each render target.
     * @param context Information about the render configuration.
     */
    preRender(context: IRenderContext)
    {
        throw new Error("this should never be called");
    }

    /**
     * Called just after the component has been rendered.
     * This function can be called multiple times during each cycle,
     * once for each render target.
     * @param context Information about the render configuration.
     */
    postRender(context: IRenderContext)
    {
        throw new Error("this should never be called");
    }

    /**
     * Removes the component from its node and deletes it.
     */
    dispose()
    {
        // remove all links and trackers
        this.ins.dispose();
        this.outs.dispose();

        this._trackers.forEach(tracker => tracker.dispose());

        // remove component from node
        this.node._removeComponent(this);

        // emit dispose event
        this.emit(Component.disposeEvent);
    }

    in<T>(path: string): Property<T>
    {
        const property = this.ins.getProperty(path);
        if (!property) {
            throw new Error(`${this.type} - input property not found in path: '${path}'`);
        }

        return property;
    }

    out<T>(path: string): Property<T>
    {
        const property = this.outs.getProperty(path);
        if (!property) {
            throw new Error(`${this.type} - output property not found in path: '${path}'`);
        }

        return property;
    }

    unlink()
    {
        this.ins.unlink();
        this.outs.unlink();
    }

    resetChanged()
    {
        this.changed = false;
        const ins = this.ins.properties;
        for (let i = 0, n = ins.length; i < n; ++i) {
            ins[i].changed = false;
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
        const tracker = new ComponentTracker(this.node, componentOrType, didAdd, willRemove);
        this._trackers.push(tracker);
        return tracker;
    }

    /**
     * Returns a weak reference to a component.
     * The reference is set to null after the linked component is removed.
     */
    linkComponent<T extends Component>(component: T): ComponentLink<T>
    {
        return new ComponentLink<T>(this, component);
    }

    // is(componentOrType: ComponentOrType)
    // {
    //     return this.type === getType(componentOrType);
    // }

    /**
     * Use "this.ins.append" instead.
     * @deprecated
     * @param {T} props
     * @returns {PropertySet & T}
     */
    protected makeProps<T extends Dictionary<Property>>(props: T): PropertySet & T
    {
        throw new Error("'makeProps' is deprecated. Use 'this.ins.append' instead.");
    }

    deflate()
    {
        const json: any = {
            type: this.type,
            id: this.id
        };

        if (this.name) {
            json.name = this.name;
        }
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

    inflateLinks(json: any, linkableDict: Dictionary<ILinkable>)
    {
        if (json.ins) {
            this.ins.inflateLinks(json, linkableDict);
        }
        if (json.outs) {
            this.outs.inflateLinks(json, linkableDict);
        }
    }

    /**
     * Returns a text representation of the component.
     * @returns {string}
     */
    toString()
    {
        return `${this.type}${this.name ? " (" + this.name + ")" : ""}`;
    }
}

Component.prototype.update = null;
Component.prototype.tick = null;
Component.prototype.preRender = null;
Component.prototype.postRender = null;
