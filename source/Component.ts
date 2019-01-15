/**
 * FF Typescript Foundation Library
 * Copyright 2018 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import { Dictionary, TypeOf } from "@ff/core/types";
import uniqueId from "@ff/core/uniqueId";
import Publisher, { IPropagatingEvent, ITypedEvent } from "@ff/core/Publisher";

import { types, IPropertyTemplate, PropertiesFromTemplates } from "./Property";
import PropertySet, { ILinkable } from "./PropertySet";
import ComponentTracker from "./ComponentTracker";
import ComponentReference from "./ComponentReference";
import Node from "./Node";
import System from "./System";
import CHierarchy from "./components/CHierarchy";

////////////////////////////////////////////////////////////////////////////////

export { types, ITypedEvent };

export interface IUpdateContext
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

/** The constructor function of a [[Component]]. */
export type ComponentType<T extends Component = Component> = TypeOf<T> & { type: string };

/** A [[Component]] instance, [[Component]] constructor function or a component's type string. */
export type ComponentOrType<T extends Component = Component> = T | ComponentType<T> | string;

/** Returns the type string of the given [[ComponentOrType]]. */
export function getComponentTypeString<T extends Component>(componentOrType: ComponentOrType<T> | string): string {
    return typeof componentOrType === "string" ? componentOrType : componentOrType.type;
}

////////////////////////////////////////////////////////////////////////////////

/**
 * Base class for components in a node-component system.
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
export default class Component extends Publisher implements ILinkable
{
    static readonly type: string = "Component";

    static readonly isNodeSingleton: boolean = true;
    static readonly isGraphSingleton: boolean = false;
    static readonly isSystemSingleton: boolean = false;

    /**
     * Creates a new component and attaches it to the given node.
     * @param type Type of the component to create.
     * @param node Node to attach the component new to.
     * @param id Unique id for the component. Can be omitted, will be created automatically.
     */
    static create<T extends Component = Component>(type: ComponentType<T>, node: Node, id?: string): T
    {
        if (!type || !type.type) {
            throw new Error("invalid component type");
        }

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
    updated: boolean = false;

    private _name: string = "";
    private _trackers: ComponentTracker[] = [];

    /**
     * Protected constructor. Use the static [[Component.create]] method to create component instances.
     * @param node Node to attach the new component to.
     * @param id Unique id for the component. A unique id is usually created automatically,
     * do not specify except while de-serializing the component.
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
     * Returns the system this component and its node belong to.
     */
    get system(): System {
        return this.node.system;
    }

    /**
     * Returns the graph this component and its node belong to.
     */
    get graph() {
        return this.node.graph;
    }

    /**
     * Returns the set of sibling components of this component.
     * Sibling components are components belonging to the same node.
     */
    get components() {
        return this.node.components;
    }

    /**
     * Returns the sibling hierarchy component if available.
     */
    get hierarchy() {
        return this.node.components.get<CHierarchy>("CHierarchy");
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
     * Returns the name of this component.
     * @returns {string}
     */
    get name() {
        return this._name;
    }

    /**
     * Sets the name of this component.
     * This emits an [[IComponentChangeEvent]].
     * @param {string} value
     */
    set name(value: string)
    {
        this._name = value;
        this.emit<IComponentChangeEvent>({ type: "change", component: this, what: "name" });
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
    finalize(context: IUpdateContext)
    {
        throw new Error("this should never be called");
    }

    /**
     * Removes the component from its node and deletes it.
     * Override to perform cleanup tasks (remove event listeners, etc.).
     * Must call super implementation if overridden!
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
        this.emit<IComponentDisposeEvent>({ type: "dispose", component: this });
    }

    /**
     * Returns true if this component has or inherits from the given type.
     * @param componentOrType
     */
    is(componentOrType: ComponentOrType): boolean
    {
        const type = getComponentTypeString(componentOrType);
        let prototype = this;

        do {
            prototype = Object.getPrototypeOf(prototype);
            if (prototype.type === type) {
                return true;
            }
        } while (prototype.type !== Component.type);

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
        const tracker = new ComponentTracker(this.node.components, componentOrType, didAdd, willRemove);
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
     * Propagates and emits an event as follows, until event.stopPropagation is set to true.
     * 1. this component
     * 2. sibling components of this
     * 3. parent hierarchy component if available
     * 4. siblings of parent hierarchy component
     * 5. repeat 3/4 until at root
     * 6. emits event on system
     * @param event
     */
    propagateUp(event: IPropagatingEvent<string>)
    {
        let target = this as Component;

        while (target) {
            target.emit(event);

            if (event.stopPropagation) {
                return;
            }

            const components = target.components.getArray();
            for (let i = 0, n = components.length; i < n; ++i) {
                const component = components[i];
                if (component !== target) {
                    component.emit(event);

                    if (event.stopPropagation) {
                        return;
                    }
                }
            }

            const hierarchy = target.components.get<CHierarchy>("CHierarchy");
            target = hierarchy ? hierarchy.parent : null;

            // TODO: Should event propagate to parent graph?
            // if (!target) {
            //     target = hierarchy.graph.parent;
            // }
        }

        if (!event.stopPropagation) {
            this.system.emit(event);
        }
    }

    /**
     * Propagates and emits an event as follows, until event.stopPropagation is set to true.
     * 1. all children of the sibling hierarchy of this
     * 2. for each child, repeat 1 until reaching leaf components with no children
     * @param event
     */
    propagateDown(event: IPropagatingEvent<string>)
    {
        const hierarchy = this.components.get<CHierarchy>("CHierarchy");
        const children = hierarchy ? hierarchy.children : null;

        for (let i = 0, n = children.length; i < n; ++i) {
            const components = children[i].components.getArray();
            for (let j = 0, m = components.length; j < m; ++i) {
                components[j].emit(event);
                if (event.stopPropagation) {
                    return;
                }
            }
            for (let j = 0, m = components.length; j < m; ++i) {
                components[j].propagateDown(event);
                if (event.stopPropagation) {
                    return;
                }
            }
        }
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

    /**
     * Adds input properties to the component, specified by the provided property templates.
     * @param templates A plain object with property templates.
     * @param index Optional index at which to insert the new properties.
     */
    protected addInputs<T extends Component = Component, U extends Dictionary<IPropertyTemplate> = {}>
    (templates: U, index?: number) : PropertySet & T["ins"] & PropertiesFromTemplates<U>
    {
        return this.ins.createPropertiesFromTemplates(templates, index) as any;
    }

    /**
     * Adds output properties to the component, specified by the provided property templates.
     * @param templates A plain object with property templates.
     * @param index Optional index at which to insert the new properties.
     */
    protected addOutputs<T extends Component = Component, U extends Dictionary<IPropertyTemplate> = {}>
    (templates: U, index?: number) : PropertySet & T["outs"] & PropertiesFromTemplates<U>
    {
        return this.outs.createPropertiesFromTemplates(templates, index) as any;
    }
}

Component.prototype.update = null;
Component.prototype.tick = null;
Component.prototype.finalize = null;
