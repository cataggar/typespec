// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import type { DiagnosticTarget, Model, Namespace, Program, Type, Union } from "@typespec/compiler";
import { isDeprecated } from "@typespec/compiler";
import type { Version } from "@typespec/versioning";
import { reportDiagnostic, state } from "./lib.js";
import type { Reservation } from "./proto.js";
import { $field } from "./proto.js";
import type { VersioningModule } from "./versioning-module.js";

/**
 * Matches AIP-185 / AIP-215 channel-based version identifiers such as `v1`, `v2`, `v1beta`, `v1alpha`, `v1beta1`, or `v1alpha2`.
 */
export const AIP_VERSION_REGEX = /^v([1-9]\d*)(?:(alpha|beta)([1-9]\d*)?)?$/;

/**
 * Parsed components of an AIP-185 / AIP-215 version identifier.
 */
export interface AipVersion {
  major: number;
  channel: "stable" | "beta" | "alpha";
  channelNumber?: number;
}

/**
 * Parses an AIP-185 / AIP-215 version string such as `v1`, `v2`, `v1beta`, `v1alpha`, `v1beta1`, or `v1alpha2`.
 *
 * @param version - The version string to parse.
 * @returns The parsed major version, stability channel, and optional channel number, or `undefined` if invalid.
 */
export function parseAipVersion(version: string): AipVersion | undefined {
  const match = AIP_VERSION_REGEX.exec(version);
  if (!match) {
    return undefined;
  }

  const major = Number.parseInt(match[1], 10);
  const channel = (match[2] as "alpha" | "beta" | undefined) ?? "stable";
  const channelNumber = match[3] !== undefined ? Number.parseInt(match[3], 10) : undefined;

  return channelNumber !== undefined ? { major, channel, channelNumber } : { major, channel };
}

/**
 * Resolves a Protobuf package name for a specific version snapshot.
 *
 * - If `version` is `undefined`, returns `rawName` unchanged.
 * - If `rawName` is `undefined` or `""`, returns `version`.
 * - If `rawName` contains `{version}`, replaces all occurrences of `{version}` with `version`.
 * - Otherwise, appends `.${version}` to `rawName`.
 *
 * @param rawName - The raw package name from `@package`, if any.
 * @param version - The version string for the current snapshot, if versioned.
 * @returns The resolved Protobuf package name.
 */
export function resolvePackageNameForVersion(
  rawName: string | undefined,
  version: string | undefined,
): string | undefined {
  if (version === undefined) {
    return rawName;
  }
  if (rawName === undefined || rawName === "") {
    return version;
  }
  if (rawName.includes("{version}")) {
    return rawName.replaceAll("{version}", version);
  }
  return `${rawName}.${version}`;
}

/**
 * Interpolates `{version}` placeholders in string-valued Protobuf file options for a given version snapshot.
 *
 * @param options - Key-value option entries from `@package`.
 * @param version - The version string for the current snapshot, if versioned.
 * @returns An options object with `{version}` replaced in string values.
 */
export function interpolatePackageOptionsForVersion(
  options: [string, unknown][],
  version: string | undefined,
): Record<string, any> {
  return Object.fromEntries(
    options.map(([k, v]) => [
      k,
      version !== undefined && typeof v === "string" ? v.replaceAll("{version}", version) : v,
    ]),
  );
}

/**
 * Computes auto-synthesized Protobuf `reserved` field numbers and names for a model at `currentVersion`
 * based on properties and inline `oneof` variants that were `@removed` or `@renamedFrom` at or before `currentVersion`.
 *
 * @param program - The TypeSpec program.
 * @param versioning - The loaded `@typespec/versioning` module, if available.
 * @param originalModel - The original source `Model`.
 * @param currentVersion - The version snapshot being emitted, if versioned.
 * @param userReservations - Explicit `@reserve` entries declared on the model, if any.
 * @returns Auto-synthesized reservations not already covered by `userReservations`.
 */
export function computeAutoReservationsForModel(
  program: Program,
  versioning: VersioningModule | undefined,
  originalModel: Model,
  currentVersion: Version | undefined,
  userReservations: Reservation[] | undefined,
): Reservation[] {
  if (!versioning || !currentVersion) {
    return [];
  }

  const allVersions =
    versioning.getAllVersions(program, originalModel) ??
    versioning.getVersions(program, originalModel)[1]?.getVersions();
  if (!allVersions) {
    return [];
  }

  const helpers = createReservationCollector(
    program,
    versioning,
    allVersions,
    currentVersion,
    userReservations,
  );

  for (const prop of originalModel.properties.values()) {
    const isInlineOneOf =
      prop.type.kind === "Union" && !prop.decorators.some((d) => d.decorator === $field);

    if (helpers.wasAvailableBeforeAndUnavailableAt(prop)) {
      if (isInlineOneOf && prop.type.kind === "Union") {
        for (const variant of prop.type.variants.values()) {
          if (helpers.wasAvailableTogetherBefore(prop, variant)) {
            const index = program.stateMap(state.fieldIndex).get(variant) as number | undefined;
            helpers.addNumber(index);
            for (const name of helpers.getHistoricalNamesWhenAvailableTogetherBefore(
              prop,
              variant,
            )) {
              helpers.addName(name);
            }
          }
        }
      } else {
        const index = program.stateMap(state.fieldIndex).get(prop) as number | undefined;
        helpers.addNumber(index);
        for (const name of helpers.getHistoricalNamesBeforeOrAt(prop, true)) {
          helpers.addName(name);
        }
      }
    } else if (helpers.isAvailableAt(prop, currentVersion)) {
      if (isInlineOneOf && prop.type.kind === "Union") {
        for (const variant of prop.type.variants.values()) {
          if (helpers.wasAvailableBeforeAndUnavailableAt(variant)) {
            const index = program.stateMap(state.fieldIndex).get(variant) as number | undefined;
            helpers.addNumber(index);
            for (const name of helpers.getHistoricalNamesBeforeOrAt(variant, true)) {
              helpers.addName(name);
            }
          } else if (helpers.isAvailableAt(variant, currentVersion)) {
            for (const name of helpers.getHistoricalNamesBeforeOrAt(variant, false)) {
              helpers.addName(name);
            }
          }
        }
      } else {
        for (const name of helpers.getHistoricalNamesBeforeOrAt(prop, false)) {
          helpers.addName(name);
        }
      }
    }
  }

  return helpers.result;
}

/**
 * Computes auto-synthesized Protobuf `reserved` field numbers and names for a union wrapper message at `currentVersion`
 * based on union variants that were `@removed` or `@renamedFrom` at or before `currentVersion`.
 *
 * @param program - The TypeSpec program.
 * @param versioning - The loaded `@typespec/versioning` module, if available.
 * @param originalUnion - The original source `Union`.
 * @param currentVersion - The version snapshot being emitted, if versioned.
 * @param userReservations - Explicit `@reserve` entries declared on the union, if any.
 * @returns Auto-synthesized reservations not already covered by `userReservations`.
 */
export function computeAutoReservationsForUnion(
  program: Program,
  versioning: VersioningModule | undefined,
  originalUnion: Union,
  currentVersion: Version | undefined,
  userReservations: Reservation[] | undefined,
): Reservation[] {
  if (!versioning || !currentVersion) {
    return [];
  }

  const allVersions =
    versioning.getAllVersions(program, originalUnion) ??
    versioning.getVersions(program, originalUnion)[1]?.getVersions();
  if (!allVersions) {
    return [];
  }

  const helpers = createReservationCollector(
    program,
    versioning,
    allVersions,
    currentVersion,
    userReservations,
  );

  for (const variant of originalUnion.variants.values()) {
    if (helpers.wasAvailableBeforeAndUnavailableAt(variant)) {
      const index = program.stateMap(state.fieldIndex).get(variant) as number | undefined;
      helpers.addNumber(index);
      for (const name of helpers.getHistoricalNamesBeforeOrAt(variant, true)) {
        helpers.addName(name);
      }
    } else if (helpers.isAvailableAt(variant, currentVersion)) {
      for (const name of helpers.getHistoricalNamesBeforeOrAt(variant, false)) {
        helpers.addName(name);
      }
    }
  }

  return helpers.result;
}

function createReservationCollector(
  program: Program,
  versioning: VersioningModule,
  allVersions: Version[],
  currentVersion: Version,
  userReservations: Reservation[] | undefined,
) {
  const result: Reservation[] = [];
  const seenNumbers = new Set<number>();
  const seenNames = new Set<string>();

  function isAvailableAt(target: Type, version: Version): boolean {
    const avail = versioning.getAvailabilityMap(program, target);
    if (!avail) {
      return true;
    }
    const status = avail.get(version.name);
    return status === versioning.Availability.Added || status === versioning.Availability.Available;
  }

  function wasAvailableBeforeAndUnavailableAt(target: Type): boolean {
    const avail = versioning.getAvailabilityMap(program, target);
    if (!avail) {
      return false;
    }
    const curr = avail.get(currentVersion.name);
    if (curr !== versioning.Availability.Removed && curr !== versioning.Availability.Unavailable) {
      return false;
    }
    return allVersions.some(
      (v) =>
        v.index < currentVersion.index &&
        (avail.get(v.name) === versioning.Availability.Added ||
          avail.get(v.name) === versioning.Availability.Available),
    );
  }

  function wasAvailableTogetherBefore(parent: Type, child: Type): boolean {
    return allVersions.some(
      (v) => v.index < currentVersion.index && isAvailableAt(parent, v) && isAvailableAt(child, v),
    );
  }

  function getNameAtVersion(
    target: Type & { name?: string | symbol },
    version: Version,
  ): string | undefined {
    const renames = versioning.getRenamedFrom(program, target);
    if (renames) {
      for (const entry of renames) {
        if (entry.version.index > version.index) {
          return entry.oldName;
        }
      }
    }
    return typeof target.name === "string" ? target.name : undefined;
  }

  function getHistoricalNamesBeforeOrAt(
    target: Type & { name?: string | symbol },
    includeCurrentIfRemoved: boolean,
  ): string[] {
    const names: string[] = [];
    if (includeCurrentIfRemoved) {
      for (const v of allVersions) {
        if (v.index < currentVersion.index && isAvailableAt(target, v)) {
          const nameAtV = getNameAtVersion(target, v);
          if (nameAtV && !names.includes(nameAtV)) {
            names.push(nameAtV);
          }
        }
      }
    } else {
      const renames = versioning.getRenamedFrom(program, target) ?? [];
      for (const entry of renames) {
        if (entry.version.index <= currentVersion.index && !names.includes(entry.oldName)) {
          names.push(entry.oldName);
        }
      }
    }
    return names;
  }

  function getHistoricalNamesWhenAvailableTogetherBefore(
    parent: Type,
    child: Type & { name?: string | symbol },
  ): string[] {
    const names: string[] = [];
    for (const v of allVersions) {
      if (v.index < currentVersion.index && isAvailableAt(parent, v) && isAvailableAt(child, v)) {
        const nameAtV = getNameAtVersion(child, v);
        if (nameAtV && !names.includes(nameAtV)) {
          names.push(nameAtV);
        }
      }
    }
    return names;
  }

  function isCoveredByUserNumber(num: number): boolean {
    if (!userReservations) {
      return false;
    }
    for (const r of userReservations) {
      if (typeof r === "number" && r === num) {
        return true;
      }
      if (Array.isArray(r) && num >= r[0] && num <= r[1]) {
        return true;
      }
    }
    return false;
  }

  function isCoveredByUserName(name: string): boolean {
    if (!userReservations) {
      return false;
    }
    for (const r of userReservations) {
      if (typeof r === "string" && r === name) {
        return true;
      }
    }
    return false;
  }

  function addNumber(num: number | undefined) {
    if (num === undefined || seenNumbers.has(num) || isCoveredByUserNumber(num)) {
      return;
    }
    seenNumbers.add(num);
    result.push(num);
  }

  function addName(name: string | undefined) {
    if (!name || seenNames.has(name) || isCoveredByUserName(name)) {
      return;
    }
    seenNames.add(name);
    result.push(name);
  }

  return {
    result,
    isAvailableAt,
    wasAvailableBeforeAndUnavailableAt,
    wasAvailableTogetherBefore,
    getHistoricalNamesBeforeOrAt,
    getHistoricalNamesWhenAvailableTogetherBefore,
    addNumber,
    addName,
  };
}

/**
 * Validates that a version enum member value follows the AIP-185 / AIP-215 channel-based versioning format.
 * Reports a warning diagnostic if it does not match {@link AIP_VERSION_REGEX}.
 *
 * @param program - The TypeSpec program.
 * @param version - The version metadata to validate.
 */
export function validateVersionIdentifier(program: Program, version: Version): void {
  if (!AIP_VERSION_REGEX.test(version.value)) {
    reportDiagnostic.once(program, {
      code: "invalid-version-identifier",
      format: { version: version.value },
      target: version.enumMember,
    });
  }
}

/**
 * Validates that `#deprecated` declarations added in a pre-release channel (`alpha` or `beta`) do not graduate
 * to a more stable channel (`beta` or `stable`) per AIP-185.
 *
 * @param program - The TypeSpec program.
 * @param versioning - The loaded `@typespec/versioning` module.
 * @param packageNs - The `@package` namespace to inspect.
 */
export function validateDeprecatedChannelGraduation(
  program: Program,
  versioning: VersioningModule,
  packageNs: Namespace,
): void {
  function isHigherStabilityChannel(
    fromChannel: "alpha" | "beta",
    toChannel: "stable" | "beta" | "alpha",
  ): boolean {
    if (fromChannel === "alpha") {
      return toChannel === "beta" || toChannel === "stable";
    }
    return toChannel === "stable";
  }

  function getParentType(decl: Type): Type | undefined {
    switch (decl.kind) {
      case "ModelProperty":
        return decl.model;
      case "UnionVariant":
        return decl.union;
      case "EnumMember":
        return decl.enum;
      case "Operation":
        return decl.interface;
      default:
        return undefined;
    }
  }

  function getEffectiveAvailability(
    decl: Type,
    allVersions: Version[],
  ): Map<string, import("@typespec/versioning").Availability> | undefined {
    const avail = versioning.getAvailabilityMap(program, decl);
    if (avail) {
      return avail;
    }
    const parent = getParentType(decl);
    if (parent) {
      const parentAvail = versioning.getAvailabilityMap(program, parent);
      if (parentAvail) {
        return parentAvail;
      }
    }
    if (allVersions.length === 0) {
      return undefined;
    }
    const synthesized = new Map<string, import("@typespec/versioning").Availability>();
    synthesized.set(allVersions[0].name, versioning.Availability.Added);
    for (let i = 1; i < allVersions.length; i++) {
      synthesized.set(allVersions[i].name, versioning.Availability.Available);
    }
    return synthesized;
  }

  function checkDeclaration(decl: Type & { name?: string | symbol }) {
    if (!isDeprecated(program, decl)) {
      return;
    }
    const allVersions =
      versioning.getAllVersions(program, decl) ??
      versioning.getVersions(program, decl)[1]?.getVersions();
    if (!allVersions) {
      return;
    }
    const avail = getEffectiveAvailability(decl, allVersions);
    if (!avail) {
      return;
    }

    const addedVer = allVersions.find((v) => avail.get(v.name) === versioning.Availability.Added);
    const addedParsed = addedVer ? parseAipVersion(addedVer.value) : undefined;
    if (!addedParsed || (addedParsed.channel !== "alpha" && addedParsed.channel !== "beta")) {
      return;
    }

    const parent = getParentType(decl);
    const parentAvail = parent ? versioning.getAvailabilityMap(program, parent) : undefined;

    const graduatedVer = allVersions.find((v) => {
      if (v.index <= addedVer!.index) {
        return false;
      }
      const status = avail.get(v.name);
      if (
        status !== versioning.Availability.Available &&
        status !== versioning.Availability.Added
      ) {
        return false;
      }
      if (parentAvail) {
        const parentStatus = parentAvail.get(v.name);
        if (
          parentStatus !== versioning.Availability.Available &&
          parentStatus !== versioning.Availability.Added
        ) {
          return false;
        }
      }
      const vParsed = parseAipVersion(v.value);
      return (
        vParsed !== undefined &&
        isHigherStabilityChannel(addedParsed.channel as "alpha" | "beta", vParsed.channel)
      );
    });

    if (graduatedVer) {
      reportDiagnostic.once(program, {
        code: "deprecated-channel-graduation",
        format: {
          name: String(decl.name),
          addedVersion: addedVer!.value,
          targetVersion: graduatedVer.value,
        },
        target: decl,
      });
    }
  }

  function visitNamespace(ns: Namespace) {
    for (const model of ns.models.values()) {
      checkDeclaration(model);
      for (const prop of model.properties.values()) {
        checkDeclaration(prop);
      }
    }
    for (const union of ns.unions.values()) {
      checkDeclaration(union);
      for (const variant of union.variants.values()) {
        checkDeclaration(variant);
      }
    }
    for (const enumType of ns.enums.values()) {
      checkDeclaration(enumType);
      for (const member of enumType.members.values()) {
        checkDeclaration(member);
      }
    }
    for (const iface of ns.interfaces.values()) {
      checkDeclaration(iface);
      for (const op of iface.operations.values()) {
        checkDeclaration(op);
      }
    }
    for (const childNs of ns.namespaces.values()) {
      if (!program.stateMap(state.package).has(childNs)) {
        visitNamespace(childNs);
      }
    }
  }

  visitNamespace(packageNs);
}

/**
 * Validates that a versioned Protobuf package does not import from another versioned Protobuf package
 * at a different version per AIP-185 / AIP-215.
 *
 * @param program - The TypeSpec program.
 * @param sourcePackageName - The resolved name of the importing package.
 * @param sourceVersion - The version of the importing package, if versioned.
 * @param targetPackageName - The resolved name of the imported package.
 * @param targetVersion - The version of the imported package, if versioned.
 * @param target - Diagnostic target for reporting the cross-version import warning.
 */
export function validateCrossPackageVersionImport(
  program: Program,
  sourcePackageName: string | undefined,
  sourceVersion: Version | undefined,
  targetPackageName: string | undefined,
  targetVersion: Version | undefined,
  target: DiagnosticTarget,
): void {
  if (sourceVersion && targetVersion && sourceVersion.value !== targetVersion.value) {
    reportDiagnostic.once(program, {
      code: "cross-package-version-import",
      format: {
        sourcePackage: sourcePackageName ?? "<anonymous>",
        targetPackage: targetPackageName ?? "<anonymous>",
      },
      target,
    });
  }
}
