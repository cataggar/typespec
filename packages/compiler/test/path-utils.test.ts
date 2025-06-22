import { describe, it } from "vitest";
import {
  getAnyExtensionFromPath,
  getBaseFileName,
  getDirectoryPath,
  getPathComponents,
  getRootLength,
  isUrl,
  joinPaths,
  normalizeSlashes,
  reducePathComponents,
  resolvePath,
} from "../src/core/path-utils.js";
import { assert } from "../src/testing/system-assert.js";

describe("compiler: path utils", () => {
  it("normalizeSlashes", () => {
    assert.strictEqual(normalizeSlashes("a"), "a");
    assert.strictEqual(normalizeSlashes("a/b"), "a/b");
    assert.strictEqual(normalizeSlashes("a\\b"), "a/b");
    assert.strictEqual(normalizeSlashes("\\\\server\\path"), "//server/path");
  });

  it("getRootLength", () => {
    assert.strictEqual(getRootLength("a"), 0);
    assert.strictEqual(getRootLength("/"), 1);
    assert.strictEqual(getRootLength("/path"), 1);
    assert.strictEqual(getRootLength("c:"), 2);
    assert.strictEqual(getRootLength("c:d"), 0);
    assert.strictEqual(getRootLength("c:/"), 3);
    assert.strictEqual(getRootLength("c:\\"), 3);
    assert.strictEqual(getRootLength("//server"), 8);
    assert.strictEqual(getRootLength("//server/share"), 9);
    assert.strictEqual(getRootLength("\\\\server"), 8);
    assert.strictEqual(getRootLength("\\\\server\\share"), 9);
    assert.strictEqual(getRootLength("file:///"), 8);
    assert.strictEqual(getRootLength("file:///path"), 8);
    assert.strictEqual(getRootLength("file:///c:"), 10);
    assert.strictEqual(getRootLength("file:///c:d"), 8);
    assert.strictEqual(getRootLength("file:///c:/path"), 11);
    assert.strictEqual(getRootLength("file:///c%3a"), 12);
    assert.strictEqual(getRootLength("file:///c%3ad"), 8);
    assert.strictEqual(getRootLength("file:///c%3a/path"), 13);
    assert.strictEqual(getRootLength("file:///c%3A"), 12);
    assert.strictEqual(getRootLength("file:///c%3Ad"), 8);
    assert.strictEqual(getRootLength("file:///c%3A/path"), 13);
    assert.strictEqual(getRootLength("file://localhost"), 16);
    assert.strictEqual(getRootLength("file://localhost/"), 17);
    assert.strictEqual(getRootLength("file://localhost/path"), 17);
    assert.strictEqual(getRootLength("file://localhost/c:"), 19);
    assert.strictEqual(getRootLength("file://localhost/c:d"), 17);
    assert.strictEqual(getRootLength("file://localhost/c:/path"), 20);
    assert.strictEqual(getRootLength("file://localhost/c%3a"), 21);
    assert.strictEqual(getRootLength("file://localhost/c%3ad"), 17);
    assert.strictEqual(getRootLength("file://localhost/c%3a/path"), 22);
    assert.strictEqual(getRootLength("file://localhost/c%3A"), 21);
    assert.strictEqual(getRootLength("file://localhost/c%3Ad"), 17);
    assert.strictEqual(getRootLength("file://localhost/c%3A/path"), 22);
    assert.strictEqual(getRootLength("file://server"), 13);
    assert.strictEqual(getRootLength("file://server/"), 14);
    assert.strictEqual(getRootLength("file://server/path"), 14);
    assert.strictEqual(getRootLength("file://server/c:"), 14);
    assert.strictEqual(getRootLength("file://server/c:d"), 14);
    assert.strictEqual(getRootLength("file://server/c:/d"), 14);
    assert.strictEqual(getRootLength("file://server/c%3a"), 14);
    assert.strictEqual(getRootLength("file://server/c%3ad"), 14);
    assert.strictEqual(getRootLength("file://server/c%3a/d"), 14);
    assert.strictEqual(getRootLength("file://server/c%3A"), 14);
    assert.strictEqual(getRootLength("file://server/c%3Ad"), 14);
    assert.strictEqual(getRootLength("file://server/c%3A/d"), 14);
    assert.strictEqual(getRootLength("http://server"), 13);
    assert.strictEqual(getRootLength("http://server/path"), 14);
  });

  it("isUrl", () => {
    // NOT url
    assert.ok(!isUrl("a"));
    assert.ok(!isUrl("/"));
    assert.ok(!isUrl("c:"));
    assert.ok(!isUrl("c:d"));
    assert.ok(!isUrl("c:/"));
    assert.ok(!isUrl("c:\\"));
    assert.ok(!isUrl("//server"));
    assert.ok(!isUrl("//server/share"));
    assert.ok(!isUrl("\\\\server"));
    assert.ok(!isUrl("\\\\server\\share"));

    // Is Url
    assert.ok(isUrl("file:///path"));
    assert.ok(isUrl("file:///c:"));
    assert.ok(isUrl("file:///c:d"));
    assert.ok(isUrl("file:///c:/path"));
    assert.ok(isUrl("file://server"));
    assert.ok(isUrl("file://server/path"));
    assert.ok(isUrl("http://server"));
    assert.ok(isUrl("http://server/path"));
  });

  it("getDirectoryPath", () => {
    assert.strictEqual(getDirectoryPath(""), "");
    assert.strictEqual(getDirectoryPath("a"), "");
    assert.strictEqual(getDirectoryPath("a/b"), "a");
    assert.strictEqual(getDirectoryPath("/"), "/");
    assert.strictEqual(getDirectoryPath("/a"), "/");
    assert.strictEqual(getDirectoryPath("/a/"), "/");
    assert.strictEqual(getDirectoryPath("/a/b"), "/a");
    assert.strictEqual(getDirectoryPath("/a/b/"), "/a");
    assert.strictEqual(getDirectoryPath("c:"), "c:");
    assert.strictEqual(getDirectoryPath("c:d"), "");
    assert.strictEqual(getDirectoryPath("c:/"), "c:/");
    assert.strictEqual(getDirectoryPath("c:/path"), "c:/");
    assert.strictEqual(getDirectoryPath("c:/path/"), "c:/");
    assert.strictEqual(getDirectoryPath("//server"), "//server");
    assert.strictEqual(getDirectoryPath("//server/"), "//server/");
    assert.strictEqual(getDirectoryPath("//server/share"), "//server/");
    assert.strictEqual(getDirectoryPath("//server/share/"), "//server/");
    assert.strictEqual(getDirectoryPath("\\\\server"), "//server");
    assert.strictEqual(getDirectoryPath("\\\\server\\"), "//server/");
    assert.strictEqual(getDirectoryPath("\\\\server\\share"), "//server/");
    assert.strictEqual(getDirectoryPath("\\\\server\\share\\"), "//server/");
    assert.strictEqual(getDirectoryPath("file:///"), "file:///");
    assert.strictEqual(getDirectoryPath("file:///path"), "file:///");
    assert.strictEqual(getDirectoryPath("file:///path/"), "file:///");
    assert.strictEqual(getDirectoryPath("file:///c:"), "file:///c:");
    assert.strictEqual(getDirectoryPath("file:///c:d"), "file:///");
    assert.strictEqual(getDirectoryPath("file:///c:/"), "file:///c:/");
    assert.strictEqual(getDirectoryPath("file:///c:/path"), "file:///c:/");
    assert.strictEqual(getDirectoryPath("file:///c:/path/"), "file:///c:/");
    assert.strictEqual(getDirectoryPath("file://server"), "file://server");
    assert.strictEqual(getDirectoryPath("file://server/"), "file://server/");
    assert.strictEqual(getDirectoryPath("file://server/path"), "file://server/");
    assert.strictEqual(getDirectoryPath("file://server/path/"), "file://server/");
    assert.strictEqual(getDirectoryPath("http://server"), "http://server");
    assert.strictEqual(getDirectoryPath("http://server/"), "http://server/");
    assert.strictEqual(getDirectoryPath("http://server/path"), "http://server/");
    assert.strictEqual(getDirectoryPath("http://server/path/"), "http://server/");
  });

  it("getBaseFileName", () => {
    assert.strictEqual(getBaseFileName(""), "");
    assert.strictEqual(getBaseFileName("a"), "a");
    assert.strictEqual(getBaseFileName("a/"), "a");
    assert.strictEqual(getBaseFileName("/"), "");
    assert.strictEqual(getBaseFileName("/a"), "a");
    assert.strictEqual(getBaseFileName("/a/"), "a");
    assert.strictEqual(getBaseFileName("/a/b"), "b");
    assert.strictEqual(getBaseFileName("c:"), "");
    assert.strictEqual(getBaseFileName("c:d"), "c:d");
    assert.strictEqual(getBaseFileName("c:/"), "");
    assert.strictEqual(getBaseFileName("c:\\"), "");
    assert.strictEqual(getBaseFileName("c:/path"), "path");
    assert.strictEqual(getBaseFileName("c:/path/"), "path");
    assert.strictEqual(getBaseFileName("//server"), "");
    assert.strictEqual(getBaseFileName("//server/"), "");
    assert.strictEqual(getBaseFileName("//server/share"), "share");
    assert.strictEqual(getBaseFileName("//server/share/"), "share");
    assert.strictEqual(getBaseFileName("file:///"), "");
    assert.strictEqual(getBaseFileName("file:///path"), "path");
    assert.strictEqual(getBaseFileName("file:///path/"), "path");
    assert.strictEqual(getBaseFileName("file:///c:"), "");
    assert.strictEqual(getBaseFileName("file:///c:/"), "");
    assert.strictEqual(getBaseFileName("file:///c:d"), "c:d");
    assert.strictEqual(getBaseFileName("file:///c:/d"), "d");
    assert.strictEqual(getBaseFileName("file:///c:/d/"), "d");
    assert.strictEqual(getBaseFileName("http://server"), "");
    assert.strictEqual(getBaseFileName("http://server/"), "");
    assert.strictEqual(getBaseFileName("http://server/a"), "a");
    assert.strictEqual(getBaseFileName("http://server/a/"), "a");
  });

  it("getAnyExtensionFromPath", () => {
    assert.strictEqual(getAnyExtensionFromPath(""), "");
    assert.strictEqual(getAnyExtensionFromPath(".ext"), ".ext");
    assert.strictEqual(getAnyExtensionFromPath("a.ext"), ".ext");
    assert.strictEqual(getAnyExtensionFromPath("/a.ext"), ".ext");
    assert.strictEqual(getAnyExtensionFromPath("a.ext/"), ".ext");
    assert.strictEqual(getAnyExtensionFromPath(".EXT"), ".ext");
    assert.strictEqual(getAnyExtensionFromPath("a.EXT"), ".ext");
    assert.strictEqual(getAnyExtensionFromPath("/a.EXT"), ".ext");
    assert.strictEqual(getAnyExtensionFromPath("a.EXT/"), ".ext");
  });

  it("getPathComponents", () => {
    assert.deepStrictEqual(getPathComponents(""), [""]);
    assert.deepStrictEqual(getPathComponents("a"), ["", "a"]);
    assert.deepStrictEqual(getPathComponents("./a"), ["", ".", "a"]);
    assert.deepStrictEqual(getPathComponents("/"), ["/"]);
    assert.deepStrictEqual(getPathComponents("/a"), ["/", "a"]);
    assert.deepStrictEqual(getPathComponents("/a/"), ["/", "a"]);
    assert.deepStrictEqual(getPathComponents("c:"), ["c:"]);
    assert.deepStrictEqual(getPathComponents("c:d"), ["", "c:d"]);
    assert.deepStrictEqual(getPathComponents("c:/"), ["c:/"]);
    assert.deepStrictEqual(getPathComponents("c:/path"), ["c:/", "path"]);
    assert.deepStrictEqual(getPathComponents("//server"), ["//server"]);
    assert.deepStrictEqual(getPathComponents("//server/"), ["//server/"]);
    assert.deepStrictEqual(getPathComponents("//server/share"), ["//server/", "share"]);
    assert.deepStrictEqual(getPathComponents("file:///"), ["file:///"]);
    assert.deepStrictEqual(getPathComponents("file:///path"), ["file:///", "path"]);
    assert.deepStrictEqual(getPathComponents("file:///c:"), ["file:///c:"]);
    assert.deepStrictEqual(getPathComponents("file:///c:d"), ["file:///", "c:d"]);
    assert.deepStrictEqual(getPathComponents("file:///c:/"), ["file:///c:/"]);
    assert.deepStrictEqual(getPathComponents("file:///c:/path"), ["file:///c:/", "path"]);
    assert.deepStrictEqual(getPathComponents("file://server"), ["file://server"]);
    assert.deepStrictEqual(getPathComponents("file://server/"), ["file://server/"]);
    assert.deepStrictEqual(getPathComponents("file://server/path"), ["file://server/", "path"]);
    assert.deepStrictEqual(getPathComponents("http://server"), ["http://server"]);
    assert.deepStrictEqual(getPathComponents("http://server/"), ["http://server/"]);
    assert.deepStrictEqual(getPathComponents("http://server/path"), ["http://server/", "path"]);
  });

  it("reducePathComponents", () => {
    assert.deepStrictEqual(reducePathComponents([]), []);
    assert.deepStrictEqual(reducePathComponents([""]), [""]);
    assert.deepStrictEqual(reducePathComponents(["", "."]), [""]);
    assert.deepStrictEqual(reducePathComponents(["", ".", "a"]), ["", "a"]);
    assert.deepStrictEqual(reducePathComponents(["", "a", "."]), ["", "a"]);
    assert.deepStrictEqual(reducePathComponents(["", ".."]), ["", ".."]);
    assert.deepStrictEqual(reducePathComponents(["", "..", ".."]), ["", "..", ".."]);
    assert.deepStrictEqual(reducePathComponents(["", "..", ".", ".."]), ["", "..", ".."]);
    assert.deepStrictEqual(reducePathComponents(["", "a", ".."]), [""]);
    assert.deepStrictEqual(reducePathComponents(["", "..", "a"]), ["", "..", "a"]);
    assert.deepStrictEqual(reducePathComponents(["/"]), ["/"]);
    assert.deepStrictEqual(reducePathComponents(["/", "."]), ["/"]);
    assert.deepStrictEqual(reducePathComponents(["/", ".."]), ["/"]);
    assert.deepStrictEqual(reducePathComponents(["/", "a", ".."]), ["/"]);
  });

  it("joinPaths", () => {
    assert.strictEqual(joinPaths("/", "/node_modules/@types"), "/node_modules/@types");
    assert.strictEqual(joinPaths("/a/..", ""), "/a/..");
    assert.strictEqual(joinPaths("/a/..", "b"), "/a/../b");
    assert.strictEqual(joinPaths("/a/..", "b/"), "/a/../b/");
    assert.strictEqual(joinPaths("/a/..", "/"), "/");
    assert.strictEqual(joinPaths("/a/..", "/b"), "/b");
  });

  it("resolvePath", () => {
    assert.strictEqual(resolvePath(""), "");
    assert.strictEqual(resolvePath("."), "");
    assert.strictEqual(resolvePath("./"), "");
    assert.strictEqual(resolvePath(".."), "..");
    assert.strictEqual(resolvePath("../"), "../");
    assert.strictEqual(resolvePath("/"), "/");
    assert.strictEqual(resolvePath("/."), "/");
    assert.strictEqual(resolvePath("/./"), "/");
    assert.strictEqual(resolvePath("/../"), "/");
    assert.strictEqual(resolvePath("/a"), "/a");
    assert.strictEqual(resolvePath("/a/"), "/a/");
    assert.strictEqual(resolvePath("/a/."), "/a");
    assert.strictEqual(resolvePath("/a/./"), "/a/");
    assert.strictEqual(resolvePath("/a/./b"), "/a/b");
    assert.strictEqual(resolvePath("/a/./b/"), "/a/b/");
    assert.strictEqual(resolvePath("/a/.."), "/");
    assert.strictEqual(resolvePath("/a/../"), "/");
    assert.strictEqual(resolvePath("/a/../b"), "/b");
    assert.strictEqual(resolvePath("/a/../b/"), "/b/");
    assert.strictEqual(resolvePath("/a/..", "b"), "/b");
    assert.strictEqual(resolvePath("/a/..", "/"), "/");
    assert.strictEqual(resolvePath("/a/..", "b/"), "/b/");
    assert.strictEqual(resolvePath("/a/..", "/b"), "/b");
    assert.strictEqual(resolvePath("/a/.", "b"), "/a/b");
    assert.strictEqual(resolvePath("/a/.", "."), "/a");
    assert.strictEqual(resolvePath("a", "b", "c"), "a/b/c");
    assert.strictEqual(resolvePath("a", "b", "/c"), "/c");
    assert.strictEqual(resolvePath("a", "b", "../c"), "a/c");
  });
});
