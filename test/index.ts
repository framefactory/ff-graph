/**
 * FF Typescript Foundation Library
 * Copyright 2022 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

// define vars on node global object (usually done by Webpack)
global["ENV_DEVELOPMENT"] = false;
global["ENV_PRODUCTION"] = true;
global["ENV_VERSION"] = "Test";

import { NodeComponent_test } from "./NodeComponent.test.js";
import { Property_test } from "./Property.test.js";

////////////////////////////////////////////////////////////////////////////////

suite("FF Graph", function() {
    NodeComponent_test();
    Property_test();
});
