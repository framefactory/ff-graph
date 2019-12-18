/**
 * FF Typescript/React Foundation Library
 * Copyright 2019 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import NodeComponent_test from "./NodeComponent.test";
import Property_test from "./Property.test";

////////////////////////////////////////////////////////////////////////////////

// define global vars on node global object
global["ENV_DEVELOPMENT"] = false;
global["ENV_PRODUCTION"] = true;
global["ENV_VERSION"] = "Test";


suite("FF Graph", function() {
    NodeComponent_test();
    Property_test();
});
