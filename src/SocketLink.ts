/**
 * FF Typescript Foundation Library
 * Copyright 2024 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import { type Socket } from "./Socket.js";

////////////////////////////////////////////////////////////////////////////////

export class SocketLink
{
    source: Socket;
    destination: Socket;

    constructor(source: Socket, destination: Socket)
    {
        this.source = source;
        this.destination = destination;
    }

    push()
    {
        this.destination.set();
    }
}