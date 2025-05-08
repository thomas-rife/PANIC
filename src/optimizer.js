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
          return x.value;
        }
        break;
      case "/":
        if (x.value > 1 && x.start < x.end) {
          return [];
        } else if (x.value < 1 && x.start > x.end) {
          return [];
        } else if ((x.value = 1)) {
          return x.value;
        } else if ((x.value = 0)) {
          return [];
        }
        break;
      default:
        return x;
    }
    return x;
  },
  Array(x) {
    console.log("here");
    x.elements = x.elements.map(optimize);
    console.log("wtf", x.elements);
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
    x.consequent = optimize(x.consequent);
    x.elseif = optimize(x.elseif);
    x.otherwise = optimize(x.otherwise);

    if (x.test === true) {
      return x.consequent;
    } else if (x.test === false) {
      console.log("what");
      console.log(x);
      if (
        (Array.isArray(x.elseif[0]?.consequent) &&
          x.elseif[0]?.consequent.length === 0) ||
        (Array.isArray(x.elseif) && x.elseif.length === 0)
      ) {
        console.log(":the");
        return x.otherwise[0].consequent; //this needs work not correct
      }
    }
  },
  ElseIF(x) {
    console.log(x);
  },
  Else(x) {
    console.log("this is being called");
    x.consequent = optimize(x.consequent);
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
  },
  ReturnStatement(x) {
    if (x.expression) x.expression = optimize(x.expression);
  },
  BreakStatement(x) {
    return x;
  },
  FunctionCall(x) {
    x.callee = optimize(x.callee);
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
    return x;
    //why no optimize args
  },
};
