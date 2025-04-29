import { describe, it } from "node:test";
import assert from "node:assert/strict";
import parse from "../src/parser.js";
import analyze from "../src/analyzer.js";
import optimize from "../src/optimizer.js";
import generate from "../src/generator.js";

function dedent(s) {
  return `${s}`.replace(/(?<=\n)\s+/g, "").trim();
}

const fixtures = [
  {
    name: "simple variables",
    source: `
      im x: 3
      mu y: 4
      y: x
    `,
    expected: dedent`
      const x_1 = 3;
      let y_2 = 4;
      y_2 = x_1;
    `,
  },
  {
    name: "hello world",
    source: `
    p("Hello, World!")
    `,
    expected: dedent`
    console.log("Hello, World!");
    `,
  },
  {
    name: "Comparison Function",
    source: `
      f compare_numbers(x int y int) {
        if x = y {
          p(x " is equal to " y)
        }
        elif x < y {
          p(x " is less than " y)
        }
        else {
          p(x " is greater than " y)
        }
      }

      im n1: 10
      im n2: 20

      compare_numbers(n1 n2)
      `,
    expected: dedent`
      function compare_numbers(a, b) {
        if (a === b) {
          console.log(a + " is equal to " + b);
        } else if (a < b) {
          console.log(a + " is less than " + b);
        } else {
          console.log(a + " is greater than " + b);
        }
      }

      let n1 = 10;
      let n2 = 20;

      compareNumbers(n1, n2);
      `,
  },
  {
    name: "Fibonacci",
    source: `
      f fibonacci(n int) {
      mu a: 0 
      mu b: 1

      l i in [0...n] {  
        p(a)
        mu z: a
        a: b
        b: z + a
      }

      r 
    }

    im num_terms: 10
    fibonacci(num_terms)
    `,
    expected: dedent`
      function fibonacci(n) {
        let a = 0,
            b = 1;
        for (let i = 0; i < n; i++) {
          console.log(a);
          let next = a + b;
          a = b;
          b = next;
        }
      }

      let numTerms = 10;
      fibonacci(numTerms);
    `,
  },
  {
    name: "Factorials with Tail Recursion",
    source: `
      f factorial(n int) -> int {
        if n = 0 or n = 1 {
          r 1 
        }
        r n * factorial(n-1)
      }
      p(factorial(5))
    `,
    expected: dedent `
      function factorial(n) {
        if (n === 0) || (n === 1) {
          return 1;
        }
        return (n_2 * factorial(n_2 - 1));
      }

      console.log(factorial(5));
    `,
  },
  {
    name: "Recursive Looping",
    source: `
      l i in [1...5] {
        l j in i {
          p("*")
        }
        p(" ")
      }
    `,
    expected: dedent`
      for (let i = 1; i <= 5; i++) {
        let row = "";
        for (let j = 1; j <= i; j++) {
          row += "* ";
        }
        console.log(row);
      }
    `,
  },
  {
    name: "Arrays",
    source: `
      im x: [1...20, *2]

      im y: [[[x]]]

      mu z: y[0][0][0]

      z: [1, 2, 3, 4, 5]
    `,
    expected: dedent `
      const x = Array.from({ length: 20 }, (_, i) => (i + 1) * 2);

      const y = [[[x]]];

      let z = y[0][0][0];

      z = [1, 2, 3, 4, 5];
    `,
  },
  {
    name: "Classes",
    source: `
      c Dog {
        con(name string)
          f bark(sound string) -> string {
              im greet: name + " says " + sound
              return greet
          }
      }

      im dog: Dog("rocky")

      dog.bark("woof")
    `,
    expected: dedent `
      class Dog {
        constructor(name) {
          this.name = name;
        }
        
        bark(sound) {
          const greet = this.name + " says " + sound;
          return greet;
        }
      }

      const dog = new Dog("rocky");
      console.log(dog.bark("woof"));
    `,
  },
];

describe("The code generator", () => {
  for (const fixture of fixtures) {
    it(`produces expected js output for the ${fixture.name} program`, () => {
      const actual = generate(optimize(analyze(parse(fixture.source))));
      assert.deepEqual(actual, fixture.expected);
    });
  }
});
