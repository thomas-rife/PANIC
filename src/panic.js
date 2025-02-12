// PANIC Compiler

import * as fs from "fs";
import parse from "./parser.js";
import translate from "./translator.js";

// Read the contents of the file grammar.ohm into a string
if (process.argv.length !== 3) {
  console.error("Usage: node src/panic.js FILENAME");
  process.exit(1);
}

try {
  // synax
  const sourceCode = fs.readFileSync(process.argv[2], "utf8");
  const match = parse(sourceCode);
  // semantics
  const target = translate(match);
  console.log(target.join("\n"));
} catch (e) {
  console.error(`${e}`);
  process.exit(1);
}
// interpreter vs compiler: translates it into something else
