/**
 * FF Typescript Foundation Library
 * Copyright 2018 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import { Dictionary, TypeOf } from "@ff/core/types";
import Publisher, { ITypedEvent } from "@ff/core/Publisher";

import { ValueType, canConvert } from "./convert";
import PropertySet, { ILinkable } from "./PropertySet";
import PropertyLink from "./PropertyLink";
import PropertyObject from "./PropertyObject";

/////////////////////////////////////////////////////////////////////////////////

export type PropertyType = ValueType;

export type PresetOrSchema<T> = T | IPropertySchema<T> | TypeOf<T>;

export interface IPropertySchema<T = any>
{
    preset: T;
    min?: number;
    max?: number;
    step?: number; // increment/decrement step
    speed?: number; // steps per pixel
    precision?: number;
    bar?: boolean;
    percent?: boolean;
    options?: string[];
    labels?: string[];
    objectType?: TypeOf<T>;
    multi?: boolean;
    event?: boolean;
    semantic?: string;
}

export interface IPropertyChangeEvent extends ITypedEvent<"change">
{
    what: string;
    property: Property;
}

export interface IPropertyDisposeEvent extends ITypedEvent<"dispose">
{
    property: Property;
}

/**
 * Linkable property.
 */
export default class Property<T = any> extends Publisher
{
    props: PropertySet;

    key: string;

    value: T;
    changed: boolean;

    readonly path: string;
    readonly preset: T;
    readonly elementCount: number;
    readonly type: PropertyType;
    readonly schema: Readonly<IPropertySchema<T>>;
    readonly user: boolean;

    readonly inLinks: PropertyLink[];
    readonly outLinks: PropertyLink[];

    /**
     * Creates a new linkable property.
     * @param {string} path The path name of this property.
     * @param {PresetOrSchema<T>} presetOrSchema For primitive values (number, boolean, string),
     * this can be a preset value or a schema including a preset value. For objects, this should be
     * the constructor of a class derived from PropertyObject, defining the type of objects that
     * can be assigned to this property.
     * @param {T} preset Optional, if given, replaces the preset value given in the schema.
     * @param {boolean} user Marks the property as user-defined if set to true.
     */
    constructor(path: string, presetOrSchema: PresetOrSchema<T>, preset?: T, user?: boolean)
    {
        super();
        this.addEvents("value", "change", "dispose");

        let schema: IPropertySchema;

        const objectType = presetOrSchema as TypeOf<T>;
        if (objectType.prototype instanceof PropertyObject) {
            schema = { objectType, preset: null };
        }
        else {
            const isSchema = typeof presetOrSchema === "object" && presetOrSchema !== null && !Array.isArray(presetOrSchema);
            schema = isSchema ? presetOrSchema as IPropertySchema<T> : { preset: presetOrSchema as T };
        }

        preset = preset !== undefined ? preset : schema.preset;
        const isArray = Array.isArray(preset);

        this.props = null;
        this.key = null;

        this.path = path;
        this.preset = preset;
        this.elementCount = isArray ? (preset as any).length : 1;
        this.type = typeof (isArray ? preset[0] : preset) as PropertyType;
        this.schema = schema;
        this.user = user || false;

        this.value = null;
        this.changed = !schema.event;

        this.inLinks = [];
        this.outLinks = [];

        this.reset();
    }

    dispose()
    {
        this.unlink();
        this.emit<IPropertyDisposeEvent>({ type: "dispose", property: this });
    }

    setValue(value: T, silent?: boolean)
    {
        this.value = value;

        if (!silent) {
            this.changed = true;

            if (this.props && this.props === this.props.linkable.ins) {
                this.props.linkable.changed = true;
            }
        }

        this.emit("value", value);

        const outLinks = this.outLinks;
        for (let i = 0, n = outLinks.length; i < n; ++i) {
            outLinks[i].push();
        }
    }

    copyValue(value: T, silent?: boolean)
    {
        if (Array.isArray(value)) {
            value = value.slice() as any;
        }

        this.setValue(value, silent);
    }

    set(silent?: boolean)
    {
        if (!silent) {
            this.changed = true;

            if (this.props === this.props.linkable.ins) {
                this.props.linkable.changed = true;
            }
        }

        this.emit("value", this.value);

        const outLinks = this.outLinks;
        for (let i = 0, n = outLinks.length; i < n; ++i) {
            outLinks[i].push();
        }
    }

    cloneValue(): T
    {
        const value = this.value;
        return Array.isArray(value) ? value.slice() as any : value;
    }


    linkTo(destination: Property, sourceIndex?: number, destinationIndex?: number)
    {
        destination.linkFrom(this, sourceIndex, destinationIndex);
    }

    linkFrom(source: Property, sourceIndex?: number, destinationIndex?: number)
    {
        if (!this.canLinkFrom(source, sourceIndex, destinationIndex)) {
            throw new Error("can't link");
        }

        const link = new PropertyLink(source, this, sourceIndex, destinationIndex);
        this.addInLink(link);
        source.addOutLink(link);
    }

    unlinkTo(destination: Property, sourceIndex?: number, destinationIndex?: number): boolean
    {
        return destination.unlinkFrom(this, sourceIndex, destinationIndex);
    }

    unlinkFrom(source: Property, sourceIndex?: number, destinationIndex?: number): boolean
    {
        const link = this.inLinks.find(link =>
            link.source === source
            && link.sourceIndex === sourceIndex
            && link.destinationIndex === destinationIndex
        );

        if (!link) {
            return false;
        }

        this.removeInLink(link);
        source.removeOutLink(link);

        return true;
    }

    unlink()
    {
        this.inLinks.forEach(link => link.source.removeOutLink(link));
        this.inLinks.length = 0;

        this.outLinks.forEach(link => link.destination.removeInLink(link));
        this.outLinks.length = 0;
    }

    addInLink(link: PropertyLink)
    {
        if(link.destination !== this) {
            throw new Error("input link's destination must equal this");
        }

        this.inLinks.push(link);
    }

    addOutLink(link: PropertyLink)
    {
        if(link.source !== this) {
            throw new Error("output link's source must equal this");
        }

        this.outLinks.push(link);

        // push value through added link
        link.push();
    }

    removeInLink(link: PropertyLink)
    {
        const index = this.inLinks.indexOf(link);
        if (index < 0) {
            throw new Error("input link not found");
        }

        this.inLinks.splice(index, 1);

        // if last link is removed and if object, reset to default (usually null) values
        if (this.inLinks.length === 0 && this.type === "object") {
            this.reset();
        }
    }

    removeOutLink(link: PropertyLink)
    {
        const index = this.outLinks.indexOf(link);
        if (index < 0) {
            throw new Error("output link not found");
        }

        this.outLinks.splice(index, 1);
    }

    canLinkTo(destination: Property, sourceIndex?: number, destinationIndex?: number): boolean
    {
        return destination.canLinkFrom(this, sourceIndex, destinationIndex);
    }

    canLinkFrom(source: Property, sourceIndex?: number, destinationIndex?: number): boolean
    {
        // can't link to an output property
        if (this.isOutput()) {
            return false;
        }

        const validSrcIndex = sourceIndex >= 0;
        const validDstIndex = destinationIndex >= 0;

        if (source.elementCount === 1 && validSrcIndex) {
            throw new Error("non-array source property; can't link to element");
        }
        if (this.elementCount === 1 && validDstIndex) {
            throw new Error("non-array destination property; can't link to element");
        }

        const srcIsArray = source.elementCount > 1 && !validSrcIndex;
        const dstIsArray = this.elementCount > 1 && !validDstIndex;

        if (srcIsArray !== dstIsArray) {
            return false;
        }
        if (srcIsArray && source.elementCount !== this.elementCount) {
            return false;
        }

        if (source.type === "object" && this.type === "object") {
            if (source.schema.objectType !== this.schema.objectType) {
                return false;
            }
        }

        return canConvert(source.type, this.type);
    }

    reset()
    {
        if (this.hasInLinks()) {
            throw new Error("can't reset property with input links");
        }

        let value;

        if (this.isMulti()) {
            let multiArray: T[] = this.value as any;

            if (!multiArray) {
                value = multiArray = [] as any;
            }
            else {
                multiArray.length = 1;
            }

            multiArray[0] = this.clonePreset();
        }
        else {
            value = this.clonePreset();
        }

        // set changed flag and push to output links
        this.setValue(value);
    }

    setMultiChannelCount(count: number)
    {
        if (!this.isMulti()) {
            throw new Error("can't set multi channel count on non-multi property");
        }

        const multiArray: T[] = this.value as any;
        const currentCount = multiArray.length;
        multiArray.length = count;

        for (let i = currentCount; i < count; ++i) {
            multiArray[i] = this.clonePreset();
        }

        this.changed = true;
    }

    setOptions(options: string[])
    {
        if (!this.schema.options) {
            throw new Error(`property type mismatch, can't set options on '${this.path}'`);
        }

        (this.schema as IPropertySchema).options = options.slice();
        this.emit<IPropertyChangeEvent>({ type: "change", what: "options", property: this });
    }

    getOptionText()
    {
        const options = this.schema.options;
        if (this.type === "number" && options) {
            const i = Math.trunc(this.value as any);
            return options[i < 0 ? 0 : (i >= options.length ? 0 : i)] || "";
        }
    }

    getOptionIndex()
    {
        const options = this.schema.options;
        if (this.type === "number" && options && options.length > 0) {
            const i = Math.trunc(this.value as any);
            return i < 0 ? 0 : (i >= options.length ? 0 : i);
        }

        return -1;
    }

    isInput(): boolean
    {
        return this.props === this.props.linkable.ins;
    }

    isOutput(): boolean
    {
        return this.props === this.props.linkable.outs;
    }

    isArray(): boolean
    {
        return Array.isArray(this.preset);
    }

    isMulti(): boolean
    {
        return !!this.schema.multi;
    }

    isDefault()
    {
        const value = this.schema.multi ? this.value[0] : this.value;
        const preset = this.preset;
        const valueLength = Array.isArray(value) ? value.length : -1;
        const presetLength = Array.isArray(preset) ? preset.length : -1;

        if (valueLength !== presetLength) {
            return false;
        }

        if (valueLength >= 0) {
            for (let i = 0; i < valueLength; ++i) {
                if (value[i] !== preset[i]) {
                    return false;
                }
            }
            return true;
        }

        return value === preset;
    }

    hasInLinks(index?: number)
    {
        const links = this.inLinks;

        if (!(index >= 0)) {
            return links.length > 0;
        }

        for (let i = 0, n = links.length; i < n; ++i) {
            if (links[i].destinationIndex === index) {
                return true;
            }
        }

        return false;
    }

    hasMainInLinks()
    {
        const links = this.inLinks;

        for (let i = 0, n = links.length; i < n; ++i) {
            if (!(links[i].destinationIndex >= 0)) {
                return true;
            }
        }

        return false;
    }

    hasOutLinks(index?: number)
    {
        const links = this.outLinks;

        if (!(index >= 0)) {
            return links.length > 0;
        }

        for (let i = 0, n = links.length; i < n; ++i) {
            if (links[i].sourceIndex === index) {
                return true;
            }
        }

        return false;
    }

    inLinkCount()
    {
        return this.inLinks.length;
    }

    outLinkCount()
    {
        return this.outLinks.length;
    }

    deflate()
    {
        let json: any = this.user ? {
            path: this.path,
            schema: this.cloneSchemaWithoutPreset(),
            preset: this.preset
        } : null;

        if (!this.hasMainInLinks() && !this.isDefault() && this.type !== "object") {
            json = json || {};
            json.value = this.value;
        }

        if (this.outLinks.length > 0) {
            json = json || {};
            json.links = this.outLinks.map(link => {
                const jsonLink: any = {
                    id: link.destination.props.linkable.id,
                    key: link.destination.key
                };
                if (link.sourceIndex >= 0) {
                    jsonLink.si = link.sourceIndex;
                }
                if (link.destinationIndex >= 0) {
                    jsonLink.di = link.destinationIndex;
                }
                return jsonLink;
            });
        }

        return json;
    }

    inflate(json: any, linkableDict: Dictionary<ILinkable>)
    {
        if (json.value !== undefined) {
            this.value = json.value;
        }

        if (json.links !== undefined) {
            json.links.forEach(link => {
                const target = linkableDict[link.id];
                const property = target.ins[link.key];
                property.linkFrom(this, link.si, link.di);
            });
        }
    }

    /**
     * Returns a text representation.
     */
    toString()
    {
        const schema = this.schema;
        const typeName = schema.event ? "event" : (schema.options ? "enum" : this.type);
        return `${this.path} [${typeName}]`
    }

    protected clonePreset(): T
    {
        const preset = this.preset;
        return Array.isArray(preset) ? preset.slice() as any : preset;
    }

    protected cloneSchemaWithoutPreset()
    {
        const clone = Object.assign({}, this.schema) as IPropertySchema;
        delete clone.preset;
        return clone;
    }
}
