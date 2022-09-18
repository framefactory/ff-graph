/**
 * FF Typescript/React Foundation Library
 * Copyright 2022 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import * as path from "path";
import * as moduleAlias from "module-alias";

moduleAlias.addAliases({
    "@ff/graph": path.resolve(__dirname, "../exports"),
    "@ff/core": path.resolve(__dirname, "../../../core/dist/exports"),
});

// define vars on node global object (usually done by Webpack)
global["ENV_DEVELOPMENT"] = false;
global["ENV_PRODUCTION"] = true;
global["ENV_VERSION"] = "Test";

import NodeComponent_test from "./NodeComponent.test";
import Property_test from "./Property.test";

////////////////////////////////////////////////////////////////////////////////

suite("FF Graph", function() {
    NodeComponent_test();
    Property_test();
});
