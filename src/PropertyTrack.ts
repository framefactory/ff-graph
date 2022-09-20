/**
 * FF Typescript Foundation Library
 * Copyright 2022 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import { AnimationTrack, IKeyItem } from "@ffweb/core/AnimationTrack.js";
import { SplineTrack } from "@ffweb/core/SplineTrack.js";

import { Property } from "./Property.js";

////////////////////////////////////////////////////////////////////////////////

export class PropertyTrack
{
    readonly property: Property;
    readonly tracks: AnimationTrack[];

    constructor(property: Property)
    {
        this.property = property;
        this.tracks = [];

        const type = property.type;
        const schema = property.schema;
        let TrackType: any = AnimationTrack;

        if (type === "number" && !schema.options && !schema.event) {
            TrackType = SplineTrack;
        }

        if (property.isArray()) {
            for (let i = 0, n = property.elementCount; i < n; ++i) {
                const track = new TrackType();
                track.setDefaultValue(property.schema.preset[i]);
                this.tracks.push(track);
            }
        }
        else {
            const track = new TrackType();
            track.setDefaultValue(property.schema.preset);
            this.tracks.push(track);
        }
    }

    evaluateAt(time: number)
    {
        const { property, tracks } = this;

        if (property.isArray()) {
            for (let i = 0, n = tracks.length; i < n; ++i) {
                property.value[i] = tracks[i].valueAt(time);
            }
            property.set();
        }
        else {
            property.setValue(tracks[0].valueAt(time));
        }
    }

    insertKey(time: number)
    {
        const { property, tracks } = this;

        if (property.isArray()) {
            for (let i = 0, n = tracks.length; i < n; ++i) {
                tracks[i].insert(time, property.value[i]);
            }
        }
        else {
            tracks[0].insert(time, property.value);
        }
    }

    removeKeyAt(time: number)
    {
        const tracks = this.tracks;
        for (let i = 0, n = tracks.length; i < n; ++i) {
            tracks[i].removeKeyAt(time);
        }
    }

    getKeys(index?: number): IKeyItem<any>[] {
        if (index >= 0) {
            return this.tracks[index].keys.items;
        }
        else {
            return this.tracks[0].keys.items;
        }
    }
}