/**
 * FF Typescript Foundation Library
 * Copyright 2024 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import { Dictionary } from "@ffweb/core/types.js";

import { Socket } from "./Socket.js";
import { PropertySocket, IPropertySchema, type PropertiesFromTemplates } from "./PropertySocket.js";
import { SocketGroup, type ILinkable } from "./SocketGroup.js";

////////////////////////////////////////////////////////////////////////////////

export { type ILinkable };

/**
 * A set of property sockets.
 */
export class PropertySocketGroup extends SocketGroup
{
    sockets: PropertySocket[];

    getSocket(key: string): PropertySocket
    {
        const socket = this[key];
        if (!socket) {
            throw new Error(`no socket found with key '${key}'`);
        }

        return socket;
    }

    /**
     * Appends properties to the set.
     * @param templates plain object with property templates.
     * @param index Optional index at which to insert the properties.
     * @returns this
     */
    createProperties<U>(templates: U, index?: number): this & PropertiesFromTemplates<U>
    {
        Object.keys(templates).forEach((key, i) => {
            const ii = index === undefined ? undefined : index + i;
            const template = templates[key];
            if (template.schema) {
                this.createProperty(template.path, template.schema, key, ii);
            }
            else {
                this.createSocket(template.path, template.kind, key, ii);
            }
        });

        return this as this & PropertiesFromTemplates<U>;
    }

    createSocket(path: string, kind: string, key: string, index?: number): Socket
    {
        const socket = new Socket(path, kind);
        this.addSocket(socket, key, index);
        return socket;
    }

    createProperty(path: string, schema: IPropertySchema, key: string, index?: number): PropertySocket
    {
        const property = new PropertySocket(path, schema);
        this.addSocket(property, key, index);
        return property;
    }

    createCustomProperty(path: string, schema: IPropertySchema, index?: number)
    {
        const property = new PropertySocket(path, schema, /* custom */ true);
        this.addCustomSocket(property, index);
        return property;
    }

    getValues(includeObjects: boolean = false)
    {
        const values: any[] = [];
        this.sockets.map(socket => {
            if (includeObjects || socket.type !== "object") {
                values.push(socket.value)
            }
        });
        return values;
    }

    cloneValues(includeObjects: boolean = false)
    {
        const values: any[] = [];
        this.sockets.map(socket => {
            if (includeObjects || socket.type !== "object") {
                values.push(socket.cloneValue())
            }
        });
        return values;
    }

    setValues(values: Dictionary<any>)
    {
        Object.keys(values).forEach(
            key => this.getSocket(key).value = values[key]
        );
    }

    /**
     * Sets the values of multiple properties. Properties are identified by key.
     * @param values Dictionary of property key/value pairs.
     */
    copyValues(values: Dictionary<any>)
    {
        Object.keys(values).forEach(
            key => this.getSocket(key).copyValue(values[key])
        );
    }

    toJSON()
    {
        let json: any = null;

        this.sockets.forEach(socket => {
            const jsonSock = socket.toJSON();
            if (jsonSock) {
                json = {
                    [socket.key]: jsonSock
                };
            }
        });

        return json;
    }

    fromJSON(json: any)
    {
        Object.keys(json).forEach(key => {
            const jsonSock = json[key];
            if (jsonSock.schema) {
                const property = new PropertySocket(jsonSock.path, jsonSock.schema, /* custom */ true);
                this.addSocket(property, key);
            }
            else if (jsonSock.kind) {
                const socket = new Socket(jsonSock.path, jsonSock.kind, /* custom */ true);
            }
        });
    }

    linksFromJSON(json: any, linkableDict: Dictionary<ILinkable>)
    {
        Object.keys(json).forEach(key => {
            this[key].fromJSON(json[key], linkableDict);
        });
    }
}
