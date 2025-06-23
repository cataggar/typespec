import { describe, expect, it } from "vitest";
import { getCommentAtPosition, getPositionBeforeTrivia } from "../../src/core/parser-utils.js";
import { parse } from "../../src/core/parser.js";
import { TypeSpecScriptNode } from "../../src/core/types.js";
import { Comment } from "../../src/index.js";
import { extractCursor } from "../../src/testing/source-utils.js";
import { assert } from "../../src/testing/system-assert.js";
import { dumpAST } from "../ast-test-utils.js";

describe("compiler: parser-utils", () => {
  describe("getCommentAtPosition", () => {
    function getCommentAtCursor(
      sourceWithCursor: string,
      comments = true,
    ): {
      root: TypeSpecScriptNode;
      comment: Comment | undefined;
    } {
      const { source, pos } = extractCursor(sourceWithCursor);
      const root = parse(source, { comments });
      dumpAST(root);
      return { comment: getCommentAtPosition(root, pos), root };
    }

    it("finds one of multiple comments", () => {
      const { root, comment } = getCommentAtCursor(`
        /* First comment */
        // Second comment 
        /**
         * Third comment ┆
         */
      `);
      assert.ok(comment);
      assert.deepStrictEqual(comment, root.comments[2]);
    });

    it("does not find outside comment", () => {
      const { comment } = getCommentAtCursor(`
        /* First comment */
        ┆
        /* Second comment */
        /* Third comment */
      `);
      assert.ok(!comment);
    });

    it("handles adjacent comments", () => {
      // Since the start position is included and end position is not, the
      // right of cursor should be returned.
      const { root, comment } = getCommentAtCursor(`
        /* First comment */┆/*Second comment */
      `);
      assert.ok(comment);
      assert.deepStrictEqual(comment, root.comments[1]);
    });

    it("throws if comments are not enabled", () => {
      expect(() => getCommentAtCursor(`┆`, false)).toThrow();
    });
  });

  describe("getPositionBeforeTrivia", () => {
    function getPositionBeforeTriviaAtCursor(
      sourceWithCursor: string,
      comments = true,
    ): {
      pos: number;
      root: TypeSpecScriptNode;
    } {
      const { source, pos } = extractCursor(sourceWithCursor);
      const root = parse(source, { comments });
      dumpAST(root);
      return { pos: getPositionBeforeTrivia(root, pos), root };
    }

    const testSourceWithoutTrailingTrivia = `model Test {}`;

    it("returns position unchanged with no trivia", () => {
      const { pos } = getPositionBeforeTriviaAtCursor(`${testSourceWithoutTrailingTrivia}┆`);
      assert.strictEqual(pos, testSourceWithoutTrailingTrivia.length);
    });

    it("returns correct position before whitespace", () => {
      const { pos } = getPositionBeforeTriviaAtCursor(`${testSourceWithoutTrailingTrivia} ┆`);
      assert.strictEqual(pos, testSourceWithoutTrailingTrivia.length);
    });

    it("returns correct position before trivia with cursor exactly at the end of comment", () => {
      const { pos } = getPositionBeforeTriviaAtCursor(`model Test {} /* Test */┆`);
      assert.strictEqual(pos, testSourceWithoutTrailingTrivia.length);
    });

    it("returns correct position before lots of trivia with cursor in the middle of comment", () => {
      const { pos } = getPositionBeforeTriviaAtCursor(
        `model Test {} /* Test */ 
        // More

        /*
        More
        */

        /** 
         * Inside the last comment ┆ over here
         */`,
      );
      assert.strictEqual(pos, testSourceWithoutTrailingTrivia.length);
    });

    it("throws if comments are not enabled", () => {
      expect(() => getPositionBeforeTriviaAtCursor(`┆`, false)).toThrow();
    });
  });
});
