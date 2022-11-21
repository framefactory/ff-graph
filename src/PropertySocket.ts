/**
 * FF Typescript Foundation Library
 * Copyright 2022 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import { Dictionary } from "@ffweb/core/types.js";
import { isSubclass } from "@ffweb/core/isSubclass.js";

import { ValueType, canConvert } from "./convert.js";
import { schemas, types, IPropertySchema, IPropertyTemplate } from "./propertyTypes.js";

import { PropertySocketLink } from "./PropertySocketLink.js";
import { ILinkable } from "./PropertySocketGroup.js";

import {
    Socket,
    type ISocketChangeEvent,
    type ISocketLinkEvent,
    type ISocketDisposeEvent
} from "./Socket.js";

////////////////////////////////////////////////////////////////////////////////

export { schemas, types, type IPropertySchema, type IPropertyTemplate };
export { ISocketChangeEvent, ISocketLinkEvent, ISocketDisposeEvent };

export type PropertyFromTemplate<T> = T extends IPropertyTemplate<infer U> ? PropertySocket<U> : never;
export type PropertiesFromTemplates<T> = { [P in keyof T]: PropertyFromTemplate<T[P]> };

export class PropertySocket<T = unknown> extends Socket
{
    value: T;

    readonly type: ValueType;
    readonly schema: IPropertySchema<T>;
    readonly elementCount: number;

    readonly inLinks: PropertySocketLink[];
    readonly outLinks: PropertySocketLink[];

    constructor(path: string, schema: IPropertySchema<T>, custom?: boolean)
    {
        super(path, schema.kind || "property", custom);
        this.addEvent("value");

        if (!schema || schema.preset === undefined) {
            throw new Error("missing schema/preset");
        }

        const preset = schema.preset;
        const isArray = Array.isArray(preset);

        this.type = typeof (isArray ? preset[0] : preset) as ValueType;
        this.schema = schema;
        this.elementCount = isArray ? (preset as any).length : 1;

        this.value = null;
        this.reset();
        this.changed = !schema.event;
    }

    // PROPERTY VALUE

    setValue(value: T, silent?: boolean, noevent?: boolean)
    {
        this.value = value;

        if (!silent) {
            this.changed = true;

            if (this.isInput()) {
                this._group.linkable.changed = true;
            }
        }

        // TODO: Demo hack
        if (!noevent) {
            this.emit("value", value);
        }

        const outLinks = this.outLinks;
        for (let i = 0, n = outLinks.length; i < n; ++i) {
            outLinks[i].push();
        }
    }

    set(silent?: boolean)
    {
        super.set(silent);
        this.emit("value", this.value);
    }

    setOption(option: string, silent?: boolean, noevent?: boolean)
    {
        if (!this.schema.options) {
            throw new Error("not an 'option' type");
        }

        const value = this.schema.options.indexOf(option);
        if (value >= 0) {
            this.setValue(value as any, silent, noevent);
        }

    }

    copyValue(value: T, silent?: boolean)
    {
        if (Array.isArray(value)) {
            value = value.slice() as any;
        }

        this.setValue(value, silent);
    }

    reset()
    {
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

    cloneValue(): T
    {
        const value = this.value;
        return Array.isArray(value) ? value.slice() as any : value;
    }

    /**
     * Returns the property value, validated against the property schema.
     * @param result Optional array to write the validated values into.
     */
    getValidatedValue(result?: T)
    {
        const value = this.value as any;

        if (this.isArray()) {
            result = result || [] as any as T;
            for (let i = 0, n = value.length; i < n; ++i) {
                result[i] = this.validateValue(value[i]);
            }
            return result;
        }

        return this.validateValue(value);
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

        this.schema.options = options.slice();
        this.emit<ISocketChangeEvent>({ type: "change", what: "options", socket: this });
    }

    getOptionText()
    {
        const options = this.schema.options;
        if (this.type === "number" && options) {
            const i = Math.trunc(this.value as any);
            return options[i < 0 ? 0 : (i >= options.length ? 0 : i)] || "";
        }
    }

    isArray(): boolean
    {
        return Array.isArray(this.schema.preset);
    }

    isMulti(): boolean
    {
        return !!this.schema.multi;
    }

    isDefault()
    {
        const value = this.schema.multi ? this.value[0] : this.value;
        const preset = this.schema.preset;
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

    // LINKAGE

    linkTo(destination: PropertySocket, sourceIndex?: number, destinationIndex?: number)
    {
        destination.linkFrom(this, sourceIndex, destinationIndex);
    }

    linkFrom(source: PropertySocket, sourceIndex?: number, destinationIndex?: number)
    {
        if (!this.canLinkFrom(source, sourceIndex, destinationIndex)) {
            throw new Error(`can't link from '${source.path}' to '${this.path}'`);
        }

        const link = new PropertySocketLink(source, this, sourceIndex, destinationIndex);
        source.addOutLink(link);
        this.addInLink(link);
    }

    unlinkTo(destination: PropertySocket, sourceIndex?: number, destinationIndex?: number)
    {
        destination.unlinkFrom(this, sourceIndex, destinationIndex);
    }

    unlinkFrom(source: PropertySocket, sourceIndex?: number, destinationIndex?: number): boolean
    {
        const link = this.inLinks.find(link =>
            link.source === source
            && link.sourceIndex === sourceIndex
            && link.destinationIndex === destinationIndex
        );

        if (!link) {
            return false;
        }

        source.removeOutLink(link);
        this.removeInLink(link);

        return true;
    }

    addOutLink(link: PropertySocketLink)
    {
        super.addOutLink(link);
        link.push();
    }

    removeInLink(link: PropertySocketLink)
    {
        super.removeInLink(link);
        if (this.inLinks.length === 0 && this.type === "object") {
            this.reset();
        }
    }

    canLinkTo(destination: PropertySocket, sourceIndex?: number, destinationIndex?: number): boolean
    {
        return destination.canLinkFrom(this, sourceIndex, destinationIndex);
    }

    canLinkFrom(source: PropertySocket, sourceIndex?: number, destinationIndex?: number): boolean
    {
        // can't link to an output property
        if (this.isOutput()) {
            return false;
        }

        // sockets must be of same kind
        if (this.kind !== source.kind) {
            return false;
        }

        // same kind, output is not a property => can link
        if (source.kind !== "property") {
            return true;
        }

        const hasSrcIndex = sourceIndex >= 0;
        const hasDstIndex = destinationIndex >= 0;

        if (!source.isArray() && hasSrcIndex) {
            throw new Error("non-array source property; can't link to element");
        }
        if (!this.isArray() && hasDstIndex) {
            throw new Error("non-array destination property; can't link to element");
        }

        const srcIsArray = source.isArray() && !hasSrcIndex;
        const dstIsArray = this.isArray() && !hasDstIndex;

        if (srcIsArray !== dstIsArray) {
            return false;
        }
        if (srcIsArray && source.elementCount !== this.elementCount) {
            return false;
        }

        if (source.type === "object" && this.type === "object") {
            if (!isSubclass(source.schema.objectType, this.schema.objectType)) {
                return false;
            }
        }

        return canConvert(source.type, this.type);
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

    toJSON()
    {
        let json: any = this.custom ? {
            path: this.path,
            schema: Object.assign({}, this.schema)
        } : null;

        if (!this.isOutput() && !this.hasMainInLinks() && !this.isDefault() && this.type !== "object") {
            json ??= {};
            json.value = this.value;
        }

        if (this.outLinks.length > 0) {
            json ??= {};
            json.links = this.outLinks.map(link => {
                const jsonLink: any = {
                    id: link.destination._group.linkable.id,
                    key: link.destination.key
                };
                if (link.sourceIndex >= 0) {
                    jsonLink.srcIndex = link.sourceIndex;
                }
                if (link.destinationIndex >= 0) {
                    jsonLink.dstIndex = link.destinationIndex;
                }
                return jsonLink;
            });
        }

        return json;
    }

    fromJSON(json: any, linkableDict: Dictionary<ILinkable>)
    {
        if (json.value !== undefined) {
            this.value = json.value;
        }

        super.fromJSON(json, linkableDict);
    }

    /**
     * Returns a text representation.
     */
    toString()
    {
        const schema = this.schema;
        const typeName = schema.event ? "event" : (schema.options ? "enum" : this.type);
        return `${this.path} [${this.kind}] type ${typeName};`
    }

    dump(indent: string = "")
    {
        console.log(indent + `PropertySocket '${this.path}', key: ${this.key}, value: ${this.value}`);
    }

    /**
     * Validates the given value against the property schema.
     * @param value
     */
    protected validateValue(value: any)
    {
        const schema = this.schema;

        if (schema.enum) {
            const i = Math.trunc(value);
            return schema.enum[i] ? i : 0;
        }
        if (schema.options) {
            const i = Math.trunc(value);
            return i < 0 ? 0 : (i >= schema.options.length ? 0 : i);
        }
        if (this.type === "number") {
            value = schema.min ? Math.max(schema.min, value) : value;
            value = schema.max ? Math.min(schema.max, value) : value;
            return value;
        }

        return value;
    }

    protected clonePreset(): T
    {
        const preset = this.schema.preset;
        return Array.isArray(preset) ? preset.slice() as any : preset;
    }
}