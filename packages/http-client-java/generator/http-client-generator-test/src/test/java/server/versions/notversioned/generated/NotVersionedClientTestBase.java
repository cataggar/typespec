// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// Code generated by Microsoft (R) TypeSpec Code Generator.

package server.versions.notversioned.generated;

// The Java test files under 'generated' package are generated for your reference.
// If you wish to modify these files, please copy them out of the 'generated' package, and modify there.
// See https://aka.ms/azsdk/dpg/java/tests for guide on adding a test.

import com.azure.core.http.policy.HttpLogDetailLevel;
import com.azure.core.http.policy.HttpLogOptions;
import com.azure.core.test.TestMode;
import com.azure.core.test.TestProxyTestBase;
import com.azure.core.util.Configuration;
import server.versions.notversioned.NotVersionedClient;
import server.versions.notversioned.NotVersionedClientBuilder;

class NotVersionedClientTestBase extends TestProxyTestBase {
    protected NotVersionedClient notVersionedClient;

    @Override
    protected void beforeTest() {
        NotVersionedClientBuilder notVersionedClientbuilder = new NotVersionedClientBuilder()
            .endpoint(Configuration.getGlobalConfiguration().get("ENDPOINT", "endpoint"))
            .httpClient(getHttpClientOrUsePlayback(getHttpClients().findFirst().orElse(null)))
            .httpLogOptions(new HttpLogOptions().setLogLevel(HttpLogDetailLevel.BASIC));
        if (getTestMode() == TestMode.RECORD) {
            notVersionedClientbuilder.addPolicy(interceptorManager.getRecordPolicy());
        }
        notVersionedClient = notVersionedClientbuilder.buildClient();

    }
}
