import * as fs from "fs";
import * as ohm from "ohm-js";

const grammar = ohm.grammar(fs.readFileSync("src/panic.ohm", "utf8"));

// takes file name and raeds it into a string, tries to match it with grammar
export default function parse(sourceCodeFileName) {
  const sourceCode = fs.readFileSync(sourceCodeFileName, "utf8");
  const match = grammar.match(sourceCode);
  if (match.failed()) {
    throw match.message;
  }
  return match;
}
