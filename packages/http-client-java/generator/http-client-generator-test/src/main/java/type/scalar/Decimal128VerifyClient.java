// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// Code generated by Microsoft (R) TypeSpec Code Generator.

package type.scalar;

import com.azure.core.annotation.Generated;
import com.azure.core.annotation.ReturnType;
import com.azure.core.annotation.ServiceClient;
import com.azure.core.annotation.ServiceMethod;
import com.azure.core.exception.ClientAuthenticationException;
import com.azure.core.exception.HttpResponseException;
import com.azure.core.exception.ResourceModifiedException;
import com.azure.core.exception.ResourceNotFoundException;
import com.azure.core.http.rest.RequestOptions;
import com.azure.core.http.rest.Response;
import com.azure.core.util.BinaryData;
import com.azure.core.util.serializer.TypeReference;
import java.math.BigDecimal;
import java.util.List;
import type.scalar.implementation.Decimal128VerifiesImpl;

/**
 * Initializes a new instance of the synchronous ScalarClient type.
 */
@ServiceClient(builder = ScalarClientBuilder.class)
public final class Decimal128VerifyClient {
    @Generated
    private final Decimal128VerifiesImpl serviceClient;

    /**
     * Initializes an instance of Decimal128VerifyClient class.
     * 
     * @param serviceClient the service client implementation.
     */
    @Generated
    Decimal128VerifyClient(Decimal128VerifiesImpl serviceClient) {
        this.serviceClient = serviceClient;
    }

    /**
     * The prepareVerify operation.
     * <p><strong>Response Body Schema</strong></p>
     * 
     * <pre>
     * {@code
     * [
     *     BigDecimal (Required)
     * ]
     * }
     * </pre>
     * 
     * @param requestOptions The options to configure the HTTP request before HTTP client sends it.
     * @throws HttpResponseException thrown if the request is rejected by server.
     * @throws ClientAuthenticationException thrown if the request is rejected by server on status code 401.
     * @throws ResourceNotFoundException thrown if the request is rejected by server on status code 404.
     * @throws ResourceModifiedException thrown if the request is rejected by server on status code 409.
     * @return the response body along with {@link Response}.
     */
    @Generated
    @ServiceMethod(returns = ReturnType.SINGLE)
    public Response<BinaryData> prepareVerifyWithResponse(RequestOptions requestOptions) {
        return this.serviceClient.prepareVerifyWithResponse(requestOptions);
    }

    /**
     * The verify operation.
     * <p><strong>Request Body Schema</strong></p>
     * 
     * <pre>
     * {@code
     * BigDecimal
     * }
     * </pre>
     * 
     * @param body The body parameter.
     * @param requestOptions The options to configure the HTTP request before HTTP client sends it.
     * @throws HttpResponseException thrown if the request is rejected by server.
     * @throws ClientAuthenticationException thrown if the request is rejected by server on status code 401.
     * @throws ResourceNotFoundException thrown if the request is rejected by server on status code 404.
     * @throws ResourceModifiedException thrown if the request is rejected by server on status code 409.
     * @return the {@link Response}.
     */
    @Generated
    @ServiceMethod(returns = ReturnType.SINGLE)
    public Response<Void> verifyWithResponse(BinaryData body, RequestOptions requestOptions) {
        return this.serviceClient.verifyWithResponse(body, requestOptions);
    }

    /**
     * The prepareVerify operation.
     * 
     * @throws HttpResponseException thrown if the request is rejected by server.
     * @throws ClientAuthenticationException thrown if the request is rejected by server on status code 401.
     * @throws ResourceNotFoundException thrown if the request is rejected by server on status code 404.
     * @throws ResourceModifiedException thrown if the request is rejected by server on status code 409.
     * @throws RuntimeException all other wrapped checked exceptions if the request fails to be sent.
     * @return the response.
     */
    @Generated
    @ServiceMethod(returns = ReturnType.SINGLE)
    public List<BigDecimal> prepareVerify() {
        // Generated convenience method for prepareVerifyWithResponse
        RequestOptions requestOptions = new RequestOptions();
        return prepareVerifyWithResponse(requestOptions).getValue().toObject(TYPE_REFERENCE_LIST_BIG_DECIMAL);
    }

    /**
     * The verify operation.
     * 
     * @param body The body parameter.
     * @throws IllegalArgumentException thrown if parameters fail the validation.
     * @throws HttpResponseException thrown if the request is rejected by server.
     * @throws ClientAuthenticationException thrown if the request is rejected by server on status code 401.
     * @throws ResourceNotFoundException thrown if the request is rejected by server on status code 404.
     * @throws ResourceModifiedException thrown if the request is rejected by server on status code 409.
     * @throws RuntimeException all other wrapped checked exceptions if the request fails to be sent.
     */
    @Generated
    @ServiceMethod(returns = ReturnType.SINGLE)
    public void verify(BigDecimal body) {
        // Generated convenience method for verifyWithResponse
        RequestOptions requestOptions = new RequestOptions();
        verifyWithResponse(BinaryData.fromObject(body), requestOptions).getValue();
    }

    @Generated
    private static final TypeReference<List<BigDecimal>> TYPE_REFERENCE_LIST_BIG_DECIMAL
        = new TypeReference<List<BigDecimal>>() {
        };
}
