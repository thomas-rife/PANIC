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
      function compare_numbers_1(x_2, y_3) {
        if (x_2 === y_3) {
          console.log(x_2, " is equal to ", y_3);
        }
        else if (x_2 < y_3) {
          console.log(x_2, " is less than ", y_3);
        }
        else {
          console.log(x_2, " is greater than ", y_3);
        }
      }

      const n1_4 = 10;
      const n2_5 = 20;

      compare_numbers_1(n1_4, n2_5);
      `,
  },
  {
    name: "Fibonacci",
    source: `
      f fibonacci(n int) {
        mu x: 0 
        mu y: 1

        l i in [0...n] {  
          p(x)
          mu z: x
          x: y
          y: z + x
        }
        r 
      }

    im num_terms: 10
    fibonacci(num_terms)
    `,
    expected: dedent`
      function fibonacci(n) {
        let x = 0,
            y = 1;
        for (let i = 0; i < n; i++) {
          console.log(x);
          let next = x + y;
          x = y;
          y = next;
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
      function factorial_1(n_2) {
        if ((n_2 === 0) || (n_2 === 1)) {
          return 1;
        }
        return (n_2 * factorial_1((n_2 - 1)));
      }

      console.log(factorial_1(5));
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
      for (const i_1 = 1; i <= 5; i++) {
        for (const j_2 = 1; j <= i; j++) {
          console.log("*");
        }
        console.log(" ");
      }
    `,
  },
  {
    name: "Arrays",
    source: `
      im x: [1...20, *2]

      im y: [[[x]]]

      mu z: y[0][0][0]

      z: [1 2 3 4 5]
    `,
    expected: dedent `
      const x_1 = [1, 2, 4, 8, 16];

      const y_2 = [[[x_1]]];

      let z_3 = y_2[0,0,0];

      z_3 = [1,2,3,4,5];
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
    `,
    expected: dedent `
      class Dog_1 {
        constructor(name_2) {
          this.name_2 = name_2;
        }
        
        function bark_3(sound_4) {
          const greet_5 = ((name_2 + " says ") + sound_4);
          return greet_5;
        }
      }

      const dog_6 = new Dog_1("rocky");
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
