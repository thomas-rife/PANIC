// PANIC Compiler

// PANIC is a completely statically typed language
// pretty much everything at compile time

import * as fs from "fs";
import parse from "./parser.js";

// Read the contents of the file grammar.ohm into a string
if (process.argv.length !== 3) {
  console.error("Usage: node src/panic.js <FILENAME>");
  process.exit(1);
}

try {
  // synax
  const sourceCode = fs.readFileSync(process.argv[2], "utf8");
  const match = parse(sourceCode);

  console.log(match.join("\n"));
} catch (e) {
  console.error(`${e}`);
  process.exit(1);
}
// interpreter vs compiler: translates it into something else
