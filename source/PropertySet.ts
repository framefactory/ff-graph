/**
 * FF Typescript Foundation Library
 * Copyright 2018 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import { Dictionary } from "@ff/core/types";
import Publisher, { ITypedEvent } from "@ff/core/Publisher";

import Property from "./Property";

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
    readonly ins: PropertySet;
    /** Set of output properties. */
    readonly outs: PropertySet;
}

/**
 * Emitted by [[Properties]] after changes in the properties configuration.
 * @event
 */
export interface IPropertySetChangeEvent extends ITypedEvent<"change">
{
    what: "add" | "remove" | "update";
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
export default class PropertySet extends Publisher
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

    isInputSet()
    {
        return this === this.linkable.ins;
    }

    isOutputSet()
    {
        return this === this.linkable.outs;
    }

    /**
     * Appends properties to the set.
     * @param {U} properties plain object with keys and properties.
     * @param index Optional index at which to insert the properties.
     * @returns {this & U}
     */
    append<U extends Dictionary<Property>>(properties: U, index?: number): this & U
    {
        Object.keys(properties).forEach(key => {
            const property = properties[key];
            property.key = key;
            this.insertProperty(property, index);
        });

        return this as this & U;
    }

    /**
     * Adds the given property to the set.
     * @param property The property to be added.
     * @param index Optional index at which to insert the property.
     */
    insertProperty(property: Property, index?: number)
    {
        const key = property.key;
        if (!key) {
            throw new Error("can't add property without key");
        }

        if (this[key]) {
            throw new Error(`key already exists in properties: '${key}'`);
        }

        property.props = this;

        this[key] = property;
        if (index === undefined) {
            this.properties.push(property);
        }
        else {
            this.properties.splice(index, 0, property);
        }

        this.emit<IPropertySetChangeEvent>({ type: "change", what: "add", property });
    }

    /**
     * Removes the given property from the set.
     * @param {Property} property The property to be removed.
     */
    removeProperty(property: Property)
    {
        if (this[property.key] !== property) {
            throw new Error(`property not found in set: ${property.key}`);
        }

        delete this[property.key];

        const props = this.properties;
        const index = props.indexOf(property);
        props.slice(index, 1);

        this.emit<IPropertySetChangeEvent>({ type: "change", what: "remove", property });
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

    /**
     * Sets the values of multiple properties. Properties are identified by key.
     * @param values Dictionary of property key/value pairs.
     */
    setPropertyValues(values: Dictionary<any>)
    {
        Object.keys(values).forEach(
            key => this.getProperty(key).setValue(values[key])
        );
    }

    unlinkAllProperties()
    {
        this.properties.forEach(property => property.unlink());
    }

    deflate()
    {
        let json = null;

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
                const property = new Property(jsonProp.path, jsonProp.schema, jsonProp.preset, true);
                property.key = key;
                this.insertProperty(property);
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
