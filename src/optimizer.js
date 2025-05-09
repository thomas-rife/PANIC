import * as core from "./core.js";

export default function optimize(node) {
  return optimizers?.[node.kind]?.(node) ?? node;
}

const isZero = (n) => n === 0 || n === 0n;
const isOne = (n) => n === 1 || n === 1n;

const optimizers = {
  Program(p) {
    p.statements = p.statements.flatMap(optimize);
    return p;
  },
  Range(x) {
    switch (x.op) {
      case "+":
        if (x.start > x.end) {
          return [];
        }
        break;
      case "-":
        if (x.start < x.end) {
          return [];
        }
        break;
      case "*":
        if (x.value > 1 && x.start > x.end) {
          return [];
        } else if (x.value < 1 && x.start < x.end) {
          return [];
        } else if (x.value === 1) {
          return x.start;
        } else if (x.value === 0) {
          return [];
        }
        break;
      case "**":
        if (x.value > 1 && x.start > x.end) {
          return [];
        } else if (x.value < 1 && x.start < x.end) {
          return [];
        } else if (x.value === 1) {
          return x.start;
        } else if (x.value === 0) {
          return [];
        }
        break;
      case "/":
        if (x.value > 1 && x.start < x.end) {
          return [];
        } else if (x.value < 1 && x.start > x.end) {
          return [];
        } else if (x.value === 1) {
          return x.start;
        } else if (x.value === 0) {
          return [];
        }
        break;
    }
    return x;
  },
  Array(x) {
    x.elements = x.elements.map(optimize);
    return x;
  },
  ArrayIndexing(x) {
    x.array = optimize(x.array);
    x.index = optimize(x.index);
    return x;
  },
  VariableDeclaration(x) {
    x.variable = optimize(x.variable);
    x.initializer = optimize(x.initializer);
    return x;
  },
  Assignment(x) {
    x.source = optimize(x.source);
    x.target = optimize(x.target);
    if (x.source === x.target) {
      return [];
    }
    return x;
  },
  UnaryExpression(x) {
    x.op = optimize(x.op);
    x.operand = optimize(x.operand);
    if (x.operand.constructor === Number) if (x.op === "-") return -x.operand;
    return x;
  },
  BinaryExpression(x) {
    x.op = optimize(x.op);
    x.left = optimize(x.left);
    x.right = optimize(x.right);
    if (x.op === "&&") {
      // Optimize boolean constants in && and ||
      if (x.left === true) return x.right;
      if (x.right === true) return x.left;
    } else if (x.op === "||") {
      if (x.left === false) return x.right;
      if (x.right === false) return x.left;
    } else if ([Number, BigInt].includes(x.left.constructor)) {
      // Numeric constant folding when left operand is constant
      if ([Number, BigInt].includes(x.right.constructor)) {
        if (x.op === "+") return x.left + x.right;
        if (x.op === "-") return x.left - x.right;
        if (x.op === "*") return x.left * x.right;
        if (x.op === "/") return x.left / x.right;
        if (x.op === "**") return x.left ** x.right;
        if (x.op === "<") return x.left < x.right;
        if (x.op === "<=") return x.left <= x.right;
        if (x.op === "=") return x.left === x.right;
        if (x.op === "!=") return x.left !== x.right;
        if (x.op === ">=") return x.left >= x.right;
        if (x.op === ">") return x.left > x.right;
      }
      if (isZero(x.left) && x.op === "+") return x.right;
      if (isOne(x.left) && x.op === "*") return x.right;
      if (isZero(x.left) && x.op === "-") {
        return core.unary("-", x.right);
      }
      if (isOne(x.left) && x.op === "**") return x.left;
      if (isZero(x.left) && ["*", "/"].includes(x.op)) return x.left;
    } else if ([Number, BigInt].includes(x.right.constructor)) {
      // Numeric constant folding when right operand is constant
      if (["+", "-"].includes(x.op) && isZero(x.right)) return x.left;
      if (["*", "/"].includes(x.op) && isOne(x.right)) return x.left;
      if (x.op === "*" && isZero(x.right)) return x.right;
      if (x.op === "**" && isZero(x.right)) return 1;
    }
    return x;
  },
  IfStatement(x) {
    x.test = optimize(x.test);
    x.consequent = x.consequent.map(optimize);
    x.elseif = x.elseif.map(optimize);
    x.otherwise = x.otherwise.map(optimize);

    if (x.test === true) {
      return x.consequent;
    } else if (x.test === false) {
      //  no if else part
      if (Array.isArray(x.elseif) && x.elseif.length === 0) {
        // make sure there is an else part
        if (Array.isArray(x.otherwise) && x.otherwise.length > 0) {
          return x.otherwise[0].consequent;
        }
        return [];
      }
      //check for a true in the else if part //check if all else if are false
      else {
        if (x.elseif.every((elem) => elem.test === false)) {
          if (Array.isArray(x.otherwise) && x.otherwise.length > 0) {
            return x.otherwise[0].consequent;
          }
          return [];
        } else {
          console.log("yuhh correct structure");
          for (const elem of x.elseif) {
            if (elem.test === true) {
              return elem.consequent;
            }
          }
        }
      }
    }
    return x;
  },
  ElseIF(x) {
    x.consequent = x.consequent.flatMap(optimize);
    return x;
  },
  Else(x) {
    x.consequent = x.consequent.flatMap(optimize);
    return x;
  },
  WhileStatement(x) {
    x.test = optimize(x.test);
    if (x.test === false) {
      return [];
    }
    x.body = x.body.flatMap(optimize);
    return x;
  },
  ForStatement(x) {
    x.iterator = optimize(x.iterator);
    x.collection = optimize(x.collection);
    if (Array.isArray(x.collection) && x.collection.length === 0) {
      return [];
    }
    x.body = x.body.flatMap(optimize);
    return x;
  },
  FunctionDeclaration(x) {
    x.fun = optimize(x.fun);
    return x;
  },
  Function(x) {
    if (x.body) x.body = x.body.flatMap(optimize);
    return x;
  },
  ReturnStatement(x) {
    if (x.expression) x.expression = optimize(x.expression);
    return x;
  },
  BreakStatement(x) {
    return x;
  },
  FunctionCall(x) {
    // x.callee = optimize(x.callee); //creates infinite loop with recursive calls
    x.args = x.args.map(optimize);
    return x;
  },
  ClassDeclaration(x) {},
  ConstructorCall(x) {
    x.callee = optimize(x.callee);
    x.args = x.args.map(optimize);
    return x;
  },
  MethodCall(x) {
    x.object = optimize(x.object);
    x.args = x.args.map(optimize);
    return x;
  },
};
