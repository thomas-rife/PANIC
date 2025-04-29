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
    name: "Boolean logic",
    source: `
      im x: true
      im y: false
      im z: x and y or x
    `,
    expected: dedent`
        const x_1 = true;
        const y_2 = false;
        const z_3 = ((x_1 && y_2) || x_1);
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
        function fibonacci_1(n_2) {
          let x_3 = 0;
          let y_4 = 1;
          for (let i_5 = 0; i_5 <= n_2; i_5 += 1) {
            console.log(x_3);
            let z_6 = x_3;
            x_3 = y_4;
            y_4 = (z_6 + x_3);
          }
          return;
        }
        const num_terms_7 = 10;
        fibonacci_1(num_terms_7);
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
    expected: dedent`
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
    for (let i_1 = 1; i_1 <= 5; i_1 += 1) {
      for (let j_2 = 1; j_2 <= i_1; j_2++) {
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
    expected: dedent`
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
      dog.bark("woof")
    `,
    expected: dedent`
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
    dog_6.bark_3("woof")
    `,
  },
  {
    name: "While",
    source: `
    mu x: 3
    l x < 100 {
      if x = 35{
        break
      } 
      p(x)
    }
      `,
    expected: dedent`
      let x_1 = 3;
      while (x_1 < 100) {
        if (x_1 === 35) {
          break;
        }
        console.log(x_1);
      }
      `,
  },
  {
    name: "Cool features",
    source: `
      f cool(x: 10) -> int {
        r -x
      }

      l i in [10...1, -1]{
        p(i)
      }

      im n: 4
      c weird{
        con(x: n)
      }

      im x: [2...10000000000, **2]
      im z: [100000...10, /10]
      im m: [4...2, %2]
      im y: [4.0...4.4, +0.2]
      im a: [4.4...4.0, -0.2]
      im a_1: []
      `,
    expected: dedent`
    function cool_1(x_2 = 10) {
    return -(x_2 = 10);
    }
    for (let i_3 = 10; i_3 >= 1; i_3 -= 1) {
    console.log(i_3);
    }
    const n_4 = 4;
    class weird_5 {
    constructor() {
    this.x_2 = n_4;
    }
    }
    const x_2 = [2, 4, 16, 256, 65536, 4294967296];
    const z_6 = [100000, 10000, 1000, 100, 10];
    const m_7 = [4];
    const y_8 = [4, 4.2, 4.4];
    const a_9 = [4.4, 4.2, 4];
    const a_1_10 = [];
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
