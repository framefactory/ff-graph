/**
 * FF Typescript Foundation Library
 * Copyright 2018 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import { Dictionary } from "@ff/core/types";
import Publisher, { ITypedEvent } from "@ff/core/Publisher";

import Property, { IPropertyTemplate, PropertiesFromTemplates } from "./Property";

////////////////////////////////////////////////////////////////////////////////

/**
 * To make use of linkable properties and property sets, classes must implement this interface.
 */
export interface ILinkable
{
    /** A unique identifier for this instance. */
    id: string;
    /** Will be set to true if an input property changes. */
    changed: boolean;

    /** Set of input properties. */
    readonly ins: PropertyGroup;
    /** Set of output properties. */
    readonly outs: PropertyGroup;
}

/**
 * Emitted by [[Properties]] after changes in the properties configuration.
 * @event
 */
export interface IPropertyGroupPropertyEvent extends ITypedEvent<"property">
{
    add: boolean;
    remove: boolean;
    property: Property;
}

/**
 * A set of properties. Properties can be linked, such that one property updates another.
 * After adding properties to the set, they are available on the set using their key.
 * To make use of linkable properties, classes must implement the [[ILinkable]] interface.
 *
 * ### Events
 * - *"change"* - emits [[IPropertiesChangeEvent]] after properties have been added, removed, or renamed.
 */
export default class PropertyGroup extends Publisher
{
    linkable: ILinkable;
    properties: Property[];

    constructor(linkable: ILinkable)
    {
        super();
        this.addEvents("change");

        this.linkable = linkable;
        this.properties = [];
    }

    dispose()
    {
        this.unlinkAllProperties();
    }

    isInputGroup()
    {
        return this === this.linkable.ins;
    }

    isOutputGroup()
    {
        return this === this.linkable.outs;
    }

    /**
     * Appends properties to the set.
     * @param templates plain object with property templates.
     * @param index Optional index at which to insert the properties.
     */
    createPropertiesFromTemplates<U>(templates: U, index?: number): this & PropertiesFromTemplates<U>
    {
        Object.keys(templates).forEach((key, i) => {
            const ii = index === undefined ? undefined : index + i;
            this.createPropertyFromTemplate(templates[key], key, ii);
        });

        return this as this & PropertiesFromTemplates<U>;
    }

    createPropertyFromTemplate(template: IPropertyTemplate, key?: string, index?: number)
    {
        const property = new Property(template.path, template.schema);
        this.addProperty(property, key, index);
    }

    /**
     * Adds the given property to the set.
     * @param property The property to be added.
     * @param key An optional key under which the property is accessible in the group.
     * @param index Optional index at which to insert the property.
     */
    addProperty(property: Property, key?: string, index?: number)
    {
        if (property.group) {
            property.removeFromGroup();
        }

        if (key && this[key]) {
            throw new Error(`key '${key}' already exists in group`);
        }

        property["_group"] = this;
        property["_key"] = key;

        if (index === undefined) {
            this.properties.push(property);
        }
        else {
            this.properties.splice(index, 0, property);
        }

        if (key) {
            this[key] = property;
        }

        this.emit<IPropertyGroupPropertyEvent>({
            type: "property", add: true, remove: false, property
        });
    }

    /**
     * Removes the given property from the set.
     * @param {Property} property The property to be removed.
     */
    removeProperty(property: Property)
    {
        if (property.group === this) {
            if (this[property.key] !== property) {
                throw new Error(`property not found in group: ${property.key}`);
            }

            this.properties.slice(this.properties.indexOf(property), 1);

            if (property.key) {
                delete this[property.key];
            }

            property["_group"] = null;
            property["_key"] = "";

            this.emit<IPropertyGroupPropertyEvent>({
                type: "property", add: false, remove: true, property
            });
        }
    }

    /**
     * Returns a property by key.
     * @param {string} key The key of the property to be returned.
     * @returns {Property}
     */
    getProperty(key: string)
    {
        const property = this[key];
        if (!property) {
            throw new Error(`no property found with key '${key}'`);
        }

        return property;
    }

    getKeys(includeObjects: boolean = false)
    {
        const keys: string[] = [];
        this.properties.forEach(property => {
            if (includeObjects || property.type !== "object") {
                keys.push(property.key)
            }
        });
        return keys;
    }

    getValues(includeObjects: boolean = false)
    {
        const values: any[] = [];
        this.properties.map(property => {
            if (includeObjects || property.type !== "object") {
                values.push(property.value)
            }
        });
        return values;
    }

    cloneValues(includeObjects: boolean = false)
    {
        const values: any[] = [];
        this.properties.map(property => {
            if (includeObjects || property.type !== "object") {
                values.push(property.cloneValue())
            }
        });
        return values;
    }

    setValues(values: Dictionary<any>)
    {
        Object.keys(values).forEach(
            key => this.getProperty(key).value = values[key]
        );
    }

    /**
     * Sets the values of multiple properties. Properties are identified by key.
     * @param values Dictionary of property key/value pairs.
     */
    copyValues(values: Dictionary<any>)
    {
        Object.keys(values).forEach(
            key => this.getProperty(key).copyValue(values[key])
        );
    }

    unlinkAllProperties()
    {
        this.properties.forEach(property => property.unlink());
    }

    deflate()
    {
        let json: any = null;

        this.properties.forEach(property => {
            const jsonProp = property.deflate();
            if (jsonProp) {
                json = json || {};
                json[property.key] = jsonProp;
            }
        });

        return json;
    }

    inflate(json: any)
    {
        Object.keys(json).forEach(key => {
            const jsonProp = json[key];
            if (jsonProp.schema) {
                const property = new Property(jsonProp.path, jsonProp.schema, true);
                this.addProperty(property, key);
            }
        });
    }

    inflateLinks(json: any, linkableDict: Dictionary<ILinkable>)
    {
        Object.keys(json).forEach(key => {
            this[key].inflate(json[key], linkableDict);
        });
    }
}
