# PANIC

![alt text](docs/logo.png)

## Introduction

- As college students, we don't have a ton of time to complete every assignment. Some of the languages we use require complex syntax and deep knowledge of documentation. When trying to complete something quickly, it's difficult to finish when simple spelling errors or syntax errors are preventing you from turning in your assignment. PANIC is meant to be a quick, fast, and efficient language so that if you have waited until the last minute to complete a coding assignment, you can quickly write, debug, and run so that you finish on time. The shorthand abbreviations combined with the full words allow users to be as verbose as they want, while simultaneously allowing them to script very efficiently.

## List of Features

- We wanted to target students, and people who want to focus on programming and not syntactic sugar that many languages like to use. There are very shorthand, single-letter ways to write common statements, including declaring functions as `f`, return being `r`, and so on.
- We wanted the language to focus on scripting speed above all, abbreviations and easy shortcuts are going to make this language quick to write and fast to debug.
- We took inspiration from Python's use of indentation to avoid the use of brackets, something we find to be unnecessary. While we do encourage the use of shorthand notation, we will also allow multiple spellings of each keyword, such as p and print both functioning the same. If you scripted something in the shorthand notation and wanted to publish it to make it more readable, you could expand out your keywords and it would function the same.
- We took several aspects of other languages that we liked and incorporated their ideas into our language, for example we loved how Swift handled range in loops and wanted to do so something similar. We settled on the `...` operator to show the range of a loop. Also, we tried to avoid other common practices which to us didn't make sense, such as the `==` sign.
- Strong statically typed language, very similar to Swift's type stystem.
- Keyword and positional arguments as well as rest parameters.
- First-class functions with support for functional programming, both function composition and pipelining written with either a left or right arrow.

## Example Programs

### Example 0: Hello World

Starting out simple, printing is very easy in PANIC, simply write print or p. Furthermore, one can either use parenthesis or not for function calls.

<table>
<tr> <th>PANIC</th><th>JS</th><tr>
</tr>
<td>

```PANIC
p "Hello, World!" # Print a message

```

</td>
<td>

```javascript
console.log("Hello, World!");
```

</td>
</table>

### Example 1: Comparision function

In PANIC function declarations need to have explicitly typed parameters. In addition, if, else, and elif statements are very Pythonic, however, they don't need to end with colons. Variable assignments follow the form `name: literal`. This is because we use the equals sign to test for equality. Because the function returns void the return type does not need to explicitly be marked, similar to Swift.

<table>
<tr> <th>PANIC</th><th>JS</th><tr>
</tr>
<td>

```PANIC
f compare_numbers(a, b):  # Function Definition
  if a = b:
    p a, "is equal to", b
  elif a < b:
    p a, "is less than", b
  else:
    p a, "is greater than", b


n1: 10 # variable assignment
n2: 20
compare_numbers(n1, n2)  # Call the function
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

In PANIC `l` stands for loop and it is used both for whiles and for loops. We use the `...` for shorthand notation to make ranges. Ranges start from the first number and include the last number, but don't go above it.

<table>
<tr> <th>PANIC</th><th>JS</th><tr>
</tr>
<td>

```PANIC
f fibonacci(n):
  a: 0  # Initialize starting values
  b: 1
  l i:0 in [0...n]:  # Loop from 0 to n
    p a
    a
    b: b
    a + b

num_terms: 10
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

Here we have to declare a return type for the function factorial. Also, `or` is spelled out instead of being `||`.

<table>
<tr> <th>PANIC</th><th>JS</th><tr>
</tr>
<td>

```PANIC
f factorial(n):
  if n = 0:
    r 1
  elif n = 1:
    r 1
  r n*factorial(n-1)

  p factorial(5)
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

In PANIC arguments to a function can either be positional or keyword. Positional arguments come first, then keyword args, and `...` is used to collect the rest of the arguments into an array. Here we utilize keyword arguments by calling print with `end=" "`.

<table>
<tr> <th>PANIC</th><th>JS</th><tr>
</tr>
<td>

```PANIC
l i:1 in [1...5]:
  l j:0 in i:
    p "*"
      p " "
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

### Example 5: Anonymous Functions, Range and Maps

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
</table>
