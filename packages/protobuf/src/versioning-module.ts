// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * Type of the dynamically imported `@typespec/versioning` module.
 */
export type VersioningModule = typeof import("@typespec/versioning");

/**
 * Dynamically imports `@typespec/versioning` if it is installed, or returns `undefined` when unavailable.
 */
export async function resolveVersioningModule(): Promise<VersioningModule | undefined> {
  try {
    return await import("@typespec/versioning");
  } catch {
    return undefined;
  }
}
