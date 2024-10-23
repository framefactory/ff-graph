/**
 * FF Typescript Foundation Library
 * Copyright 2024 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

// define vars on node global object (usually done by Webpack)
globalThis["ENV_DEVELOPMENT"] = false;
globalThis["ENV_PRODUCTION"] = true;
globalThis["ENV_VERSION"] = "Test";

import { NodeComponent_test } from "./NodeComponent.test.js";
import { Property_test } from "./Property.test.js";

////////////////////////////////////////////////////////////////////////////////

suite("FF Graph", function() {
    NodeComponent_test();
    Property_test();
});
