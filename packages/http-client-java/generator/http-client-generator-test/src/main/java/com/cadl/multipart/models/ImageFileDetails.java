// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// Code generated by Microsoft (R) TypeSpec Code Generator.

package com.cadl.multipart.models;

import com.azure.core.annotation.Fluent;
import com.azure.core.annotation.Generated;
import com.azure.core.util.BinaryData;

/**
 * The file details for the "image" field.
 */
@Fluent
public final class ImageFileDetails {
    /*
     * The content of the file.
     */
    @Generated
    private final BinaryData content;

    /*
     * The filename of the file.
     */
    @Generated
    private String filename;

    /*
     * The content-type of the file.
     */
    @Generated
    private String contentType = "application/octet-stream";

    /**
     * Creates an instance of ImageFileDetails class.
     * 
     * @param content the content value to set.
     */
    @Generated
    public ImageFileDetails(BinaryData content) {
        this.content = content;
    }

    /**
     * Get the content property: The content of the file.
     * 
     * @return the content value.
     */
    @Generated
    public BinaryData getContent() {
        return this.content;
    }

    /**
     * Get the filename property: The filename of the file.
     * 
     * @return the filename value.
     */
    @Generated
    public String getFilename() {
        return this.filename;
    }

    /**
     * Set the filename property: The filename of the file.
     * 
     * @param filename the filename value to set.
     * @return the ImageFileDetails object itself.
     */
    @Generated
    public ImageFileDetails setFilename(String filename) {
        this.filename = filename;
        return this;
    }

    /**
     * Get the contentType property: The content-type of the file.
     * 
     * @return the contentType value.
     */
    @Generated
    public String getContentType() {
        return this.contentType;
    }

    /**
     * Set the contentType property: The content-type of the file.
     * 
     * @param contentType the contentType value to set.
     * @return the ImageFileDetails object itself.
     */
    @Generated
    public ImageFileDetails setContentType(String contentType) {
        this.contentType = contentType;
        return this;
    }
}