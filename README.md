# PANIC

![alt text](docs/logo.png)

## Introduction

- We wanted this language to be quick, fast and efficient so that if you have waited until the last minute to complete a coding assignment, you can quickly write, debug and run so that you finish on time.

## List of Features

- Do you have a specific audience in mind? Artists? Graphic designers? AI researchers? Numeric and Scientific nerds? Natural language types? Game developers? Machine learning people? Animators? High performance folks? System programmers? Or do you want a general purpose language? Or do you just want to do what you want?
  - We wanted to target students, and people who want to focus on programming and not syntactic sugar that many languages like to use
- Understand the audience that the language is designed for, and what kinds of things they want to create with it (or problems they want to solve with it).
  - Speed above all, abbreviations and easy shortcuts are going to make this language quick to write and fast to debug
- Determine if your language is to be (1) a reasonable, usable language or (2) an esoteric/joke/golfing language.
- Determine if it is to be pragmatic, idealistic, researchy, or evil.
- Determine whether you want your language firmly in one camp—OO, functional, logic, concatenative, plain-imperative—or be a multiparadigm symphony. Or a multiparadigm cacophony.
- Determine whether it is to be built on a single characteristic building block (a crystallization of style) or one with a huge variety of syntactic forms for multiple semantic aspects (an agglutination of features).
- Determine your concurrency model. Do you want all your programs to be single-threaded and sequential? Or are you looking for something event-driven and async? Or multithreaded? Or distributed?

## Example Programs

### Ex #1 Factorial With Tail Recursion

### Anonymous Functions

<table>
<tr> <th>PANIC</th><th>JS</th><tr>
</tr>
<td>

```PANIC
f x r x + 1

b: [1...7, +2]

b -> f -> p

\\ or p <- f <- b

```

</td>
<td>

```javascript
f = (x) => x + 1;
b = [1, 3, 5, 7];
x = b.map(f);
console.log(x);
```

</td>
</table>

### Hello World

<table>
<tr> <th>PANIC</th><th>JS</th><tr>
</tr>
<td>

```PANIC
pr("Hello, World!") # Print a message

```

</td>
<td>

```javascript
console.log("Hello, World!");
```

</td>
</table>

### Comparison function

<table>
<tr> <th>PANIC</th><th>JS</th><tr>
</tr>
<td>

```PANIC
f compare_numbers(a, b):  # function definition
  if a > b:
    pr(a, "is greater than", b)
  elif a < b:
    pr(a, "is less than", b)
  r a == b: pr(a, "is equal to", b)

n1 = 10 #variable assignment
n2 = 20
compare_numbers(n1, n2)  # Call the function
```

</td>
<td>

```javascript
function compareNumbers(a, b) {
  if (a > b) {
    console.log(a + " is greater than " + b);
  } else if (a < b) {
    console.log(a + " is less than " + b);
  } else {
    console.log(a + " is equal to " + b);
  }
}

let n1 = 10;
let n2 = 20;
compareNumbers(n1, n2);
```

</td>
</table>

### Fibonacci

<table>
<tr> <th>PANIC</th><th>JS</th><tr>
</tr>
<td>

```PANIC
f fibonacci(n):
  a = 0  # Initialize starting values
  b = 1
  l i in [0…n]:  # Loop from 0 to n
    pr(a, end=" ")
    a, b = b, a + b
  r # return

num_terms = 10
fibonacci(num_terms)
```

</td>
<td>

```javascript
unction fibonacci(n) {
    let a = 0, b = 1;
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
