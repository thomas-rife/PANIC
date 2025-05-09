# PANIC Programming Langauage

### By Thomas Rife, August Wetterau, Brian Bowers, Walter Campos

![alt text](docs/logo.png)

### [Check out our website with more info about PANIC](https://thomas-rife.github.io/PANIC/)

## Introduction

As college students, time is always in short supply. Traditional
programming languages require complex syntax and deep familiarity with
detailed documentation, which can slow you down when you’re racing
against a deadline. The PANIC programming language was designed with
this in mind, offering a streamlined, efficient approach that cuts the
complexity so you can write, debug, and run your programs quickly,
even if you only have a quick minute to get it done.

PANIC achieves this efficiency by blending shorthand abbreviations
with the option to use full descriptive commands. This approach allows
users to choose a more concise, rapid coding style when speed is
essential, or a more traditional format when clarity and readability
are more important. PANIC's flexible keywords and simple notation
reduce the risk of small syntax errors preventing your program from
running smoothy the first time. This also makes debugging faster, more
intuitive and much easier to understand.

Ultimately, PANIC is more than just another coding language, it’s a
practical tool for modern software challenges. Whether you’re tackling
an urgent assignment or experimenting with new ideas, PANIC provides a
flexible, high-performance environment that allows you to focus on
scripting efficiently rather than fighting with a language's verbose
syntax. This makes it an ideal choice for both the procrastinating
student and the experienced developer seeking a fresh approach to
development.

## List of Features

- We wanted to target students, and people who want to focus on programming and not syntactic sugar that many languages like to use. There are very shorthand, single-letter ways to write common statements, including declaring functions as `f`, return being `r`, and so on.
- We wanted the language to focus on scripting speed above all, abbreviations and easy shortcuts are going to make this language quick to write and fast to debug.
- While we do encourage the use of shorthand notation, we will also allow multiple spellings of each keyword, such as `p` and `print` both functioning the same. If you scripted something in the shorthand notation and wanted to publish it to make it more readable, you could expand out your keywords and it would function the same.
- We took several aspects of other languages that we liked and incorporated their ideas into our language, for example we loved how Swift handled range in loops and wanted to do so something similar. We settled on the `...` operator to show the range of a loop. Also, we tried to avoid other common practices which to us didn't make sense, such as the `==` sign.
- Strong statically typed language, very similar to Swift's type system.
- Keyword and positional arguments as well as rest parameters.
- Easy way to create ranges using ranges as well as easy array slicing to preserve immutability.

## Example Programs

### Example 0: Hello World

Starting out simple, printing is very easy in PANIC, simply write print or p. Furthermore, one can either use parenthesis or not for function calls.

<table>
<tr> <th>PANIC</th><th>JS</th><tr>
</tr>
<td>

```PANIC
p("Hello, World!") # Print a message

```

</td>
<td>

```javascript
console.log("Hello, World!");
```

</td>
</table>

### Example 1: Comparison function

In PANIC, function declarations have explicitly typed parameters. The
conditional statements (if, elif, else) resemble Python but without
requiring colons, and variable assignments use the form
`name: literal` (since the equals sign is used for equality
tests).

<table>
<tr> <th>PANIC</th><th>JS</th><tr>
</tr>
<td>

```PANIC
f compare_numbers(x int y int){  # Function Definition
  if x = y {
    pl (x "is equal to" y)
  }
  elif x < y {
    pl (x "is less than" y)
  }
  else {
    pl (x "is greater than" y)
  }
}

im n1: 10 # variable assignment
im n2: 20
compare_numbers(n1 n2)  # Call the function
```

</td>
<td>

```javascript
function compareNumbers(a, b) {
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
```

</td>
</table>

### Example 2: Fibonacci

In PANIC, `l` stands for loop, which is used for both for
and while loops. Mutable variables are denoted as `mu` and
immutable ones are denoted as `im`. Ranges are written using
`...`, which includes the starting and ending numbers.

<table>
<tr> <th>PANIC</th><th>JS</th><tr>
</tr>
<td>

```PANIC
f fibonacci(n int){
  mu x: 0  # Initialize starting values
  mu y: 1
  l i in [0...n]{  # Loop from 0 to n
    p(x " ")
    mu z: x
    x : y
    y: z + x
  }
  r # return
}
im num_terms: 10
fibonacci(num_terms)
```

</td>
<td>

```javascript
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
```

</td>
</table>

### Example 3: Factorials with tail recursion

In PANIC, you must declare a return type for the function. Also,
logical operators like `or` are spelled out instead of
using `||`.

<table>
<tr> <th>PANIC</th><th>JS</th><tr>
</tr>
<td>

```PANIC
f factorial(n int) -> int {
  if n = 0 or n = 1 {
    r 1
  }
  r n*factorial(n-1)
}
p(factorial(5))
```

</td>
<td>

```javascript
function factorial(n) {
  if (n === 0 || n === 1) {
    return 1;
  }
  return n * factorial(n - 1);
}

console.log(factorial(5));
```

</td>
</table>

### Example 4: Recursive looping

In PANIC, arguments to a function can either be positional or keyword. Positional arguments come first, then keyword args, and `...` is used to collect the rest of the arguments into an array.

<table>
<tr> <th>PANIC</th><th>JS</th><tr>
</tr>
<td>

```PANIC
l i in [1...5]{
	l j in i {
	    p("*")
	}
	p(" ")
}
```

</td>
<td>

```javascript
for (let i = 1; i <= 5; i++) {
  let row = "";
  for (let j = 1; j <= i; j++) {
    row += "* ";
  }
  console.log(row);
}
```

</td>
</table>

### Example 5: Arrays

This is how arrays are done in PANIC compared to JavaScript. The arrays all have types and they are all checked.

<table>
<tr> <th>PANIC</th><th>JS</th><tr>
</tr>
<td>

```PANIC
# Create immutable array ranging from 1 to 20, each multiplied by 2
im x: [1...20, *2]

# Create a nested array structure
im y: [[[x]]]

# Access the first element of the nested array
mu z: y[0][0][0]

# Modify the value of z to a new array
z: [1 2 3 4 5]
```

</td>
<td>

```javascript
const x = Array.from({ length: 20 }, (_, i) => (i + 1) * 2);

const y = [[[x]]];

let z = y[0][0][0];

z = [1, 2, 3, 4, 5];
```

</td>
</table>

### Example 6: Classes

This is how classes are done in PANIC compared to JavaScript. Classes are defined using `c` with constructors being defined using `con`. Objects can be created as immutable or mutable.

<table>
<tr> <th>PANIC</th><th>JS</th><tr>
</tr>
<td>

```PANIC
# Define a class Dog
c Dog {
  # Define constructor
  con(name string)
    f bark(sound string) -> string {
        im greet: name + " says " + sound
        return greet
    }
}

# Create a new Dog
im dog: Dog("rocky")

p(dog.bark("woof"))
```

</td>
<td>

```javascript
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
```

</td>
</table>

<!-- ### Example 7: Anonymous Functions, Range and Maps

This is an example of functional programming and first-class functions in our language. In our language, the arrows show the flow of data, which can be written both ways. Despite the way it is written the function composition will still be the same: in this case `p(d(b))`.

<table>
<tr> <th>PANIC</th><th>JS</th><tr>
</tr>
<td>

```PANIC
d int: int x r x + 1
b: [1...7, +2]
b -> d -> p     # or p <- d <- b
```

</td>
<td>

```javascript
d = (x) => x + 1;
b = [1, 3, 5, 7];
x = b.map(d);
console.log(x);
```

</td>
</table> -->

## List of Semantic Checks

- Functions, variables and classes must have unique names
- Parameters must have different names
- Function calls must have correct number of arguments
- Function arguments must be the same type as expected parameter types, in the case if default parameters, params are matched from left to right
- Can only return from a function
- Can only break from within a loop
- For loops must be over items that are iterable (ranges, arrays, strings, etc)
- Arrays must contain all the same types elements
- Ids used in expressions must exist
- When adding to a string, must be of type string
- For most expressions, such as add, multiply, power, you can apply with one being type int and the other type float
- When comparing though, they must be the same type (2 < 2.000000001 don't want this happening)
- Can only index and slice arrays
- When assigning to a variable it must be mutable
- When assigning to a variable the target type and value type must match (if the type is an array, the array dimensions must match)
- Checking array indexing bounds will be deferred to run-time
- Can only call functions, not expressions or ids
- When using a class method on an object, the method must be declared in the class definition of the object
- When calling a constructor the params must be correct both in type and number
- Can return from any function, regardless of it's return type, but if the function is marked as void, you can not return a value
- Whenever there is a test, in an if statement or in a while or elsewhere, must have type boolean
- and others

## List of Optimizations

- constant folding
- algebraic simplification
- unreachable code elimination
- range optimizations
- dead-code elimination
- and more
