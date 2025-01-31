# PANIC

![alt text](docs/logo.png)

## Introduction

- As college students, we don't have a ton of time to complete every assignment. Some of the languages we use require complex syntax and deep knowledge of documentation. When trying to complete something quickly, it's difficult to finish when simple spelling errors or syntax errors are preventing you from turing in your assignment. PANIC is meant to be quick, fast and efficient language so that if you have waited until the last minute to complete a coding assignment, you can quickly write, debug and run so that you finish on time. The shorthand abbreviations combined with the full words allows users to be as verbose as they want, while simultaniously allowing them to script very efficiently.

## List of Features

  - We wanted to target students, and people who want to focus on programming and not syntactic sugar that many languages like to use. There are very shorthand, single letter ways to write common statements, including declaring functions as `f`, return being `r` and so on.
  - We wanted the language to focus on scripting speed above all, abbreviations and easy shortcuts are going to make this language quick to write and fast to debug.
  - We took inspiration from Python's use of indentation to avoid the use of brackets, something we find to be unnecessary. While we do encourage the use of shorthand notation, we will also allow multiple spellings of each keyword, such as `pr` and `print` both functioning the same. If you scripted something in the shorthand notation and wanted to publish it to make it more readable, you could expand out your keywords and it would function the same.
  - We loved how Swift handled range in loops and wanted to do so something similar. We settled on the `...` operator to show the range of a loop. 

## Example Programs

### Example 1: Factorial With Tail Recursion

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

### Example 2: Hello World

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

### Example 3: Comparison function

<table>
<tr> <th>PANIC</th><th>JS</th><tr>
</tr>
<td>

```PANIC
f compare_numbers(a, b):  # function definition
  if a > b:
    p a, "is greater than", b
  elif a < b:
    p a, "is less than", b
  r a == b: p a, "is equal to", b

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

### Example 4: Fibonacci

<table>
<tr> <th>PANIC</th><th>JS</th><tr>
</tr>
<td>

```PANIC
f fibonacci(n):
  a = 0  # Initialize starting values
  b = 1
  l i in [0…n]:  # Loop from 0 to n
    p a, end=" "
    a, b = b, a + b
  r # return

num_terms = 10
fibonacci(num_terms)
```

</td>
<td>

```javascript
function fibonacci(n) {
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

### Example 5: Factorials

<table>
<tr> <th>PANIC</th><th>JS</th><tr>
</tr>
<td>

```PANIC
f factorial(n):
  if n = 0
      r 1
  r n*factorial n-1

  p factorial 5
```
</td>
<td>

```javascript
function factorial(n) {
  if (n === 0 || n === 1) {
    return 1;
  }
  return n*factorial(n-1);
}

console.log(factorial(5));
```
</td>
</table>

### Example 6: Recursive looping

<table>
<tr> <th>PANIC</th><th>JS</th><tr>
</tr>
<td>

```PANIC
l i in [1...5]
  l j in i
    p "*" end=" "
      pl
```
</td>
<td>

```javascript
for (let i = 1; i < 4; i++) {
  let row = "";
  for (let j=1; j<4; j++){
    row += (i*j) = " ";
  }
  console.log(row.trim());
}
```
</td>
</table>
