/**
 * FF Typescript Foundation Library
 * Copyright 2022 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import { Dictionary } from "@ffweb/core/types.js";
import { ILinkable } from "./SocketGroup.js";

////////////////////////////////////////////////////////////////////////////////

/**
 * Sorts an array of [[ILinkable]] such that if a is linked to b, a comes before b.
 */
export class LinkableSorter
{
    protected visited: Dictionary<boolean>;
    protected visiting: Dictionary<boolean>;
    protected sorted: ILinkable[];

    constructor()
    {
        this.visited = {};
        this.visiting = {};
        this.sorted = [];
    }

    sort(linkables: Readonly<ILinkable[]>): ILinkable[]
    {
        for (let i = 0, n = linkables.length; i < n; ++i) {
            this.visit(linkables[i]);
        }

        const sorted = this.sorted;

        this.visited = {};
        this.visiting = {};
        this.sorted = [];

        return sorted;
    }

    protected visit(linkable: ILinkable)
    {
        const visited = this.visited;
        const visiting = this.visiting;

        if (visited[linkable.id] || visiting[linkable.id]) {
            return;
        }

        visiting[linkable.id] = true;

        // for each in/out property, follow all outgoing links
        const outProps = linkable.outs.sockets.concat(linkable.ins.sockets);

        for (let i0 = 0, n0 = outProps.length; i0 < n0; ++i0) {
            const outLinks = outProps[i0].outLinks;
            for (let i1 = 0, n1 = outLinks.length; i1 < n1; ++i1) {
                const ins = outLinks[i1].destination.group;

                // follow outgoing links at input sockets
                const inSocks = ins.sockets;
                for (let i2 = 0, n2 = inSocks.length; i2 < n2; ++i2) {
                    const links = inSocks[i2].outLinks;
                    for (let i3 = 0, n3 = links.length; i3 < n3; ++i3) {
                        const linkedIns = links[i3].destination.group;
                        this.visit(linkedIns.linkable);
                    }
                }

                this.visit(ins.linkable);
            }
        }

        visiting[linkable.id] = undefined;
        visited[linkable.id] = true;

        this.sorted.unshift(linkable);
    }
}
