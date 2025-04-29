import { voidType } from "./core.js";

export default function generate(program) {
  const output = [];

  const classes = [];

  const targetName = ((mapping) => {
    return (name) => {
      if (!mapping.has(name)) {
        mapping.set(name, mapping.size + 1);
      }
      return `${name}_${mapping.get(name)}`;
    };
  })(new Map());

  const gen = (node) => generators?.[node?.kind]?.(node) ?? node;

  const generators = {
    Program(x) {
      x.statements.forEach(gen);
    },
    Array(x) {
      return `[${x.elements.map(gen).join(",")}]`;
    },
    ArrayIndexing(x) {
      return `${gen(x.array)}[${gen(x.index)}]`;
    },
    EmptyArray(x) {
      return `[]`;
    },
    VariableDeclaration(x) {
      const decl = x.variable.mutable ? "let" : "const";
      output.push(`${decl} ${gen(x.variable)} = ${gen(x.initializer)};`);
    },
    Variable(x) {
      return targetName(x.name);
    },
    Assignment(x) {
      output.push(`${gen(x.target)} = ${gen(x.source)};`);
    },
    Range(x) {
      let elements = [];
      let current = gen(x.start);
      const end = gen(x.end);
      const value = gen(x.value);
      const op = gen(x.op);
      elements.push(current);
      while (true) {
        let next;
        switch (op) {
          case "-":
            next = current - value;
            break;
          case "+":
            next = current + value;
            break;
          case "*":
            next = current * value;
            break;
          case "/":
            next = current / value;
            break;
          case "**":
            next = current ** value;
            break;
          case "%":
            next = current % value;
            break;
        }
        if ((op === "+" || op === "*" || op === "**") && next > end) break;
        if ((op === "-" || op === "/" || op === "%") && next < end) break;
        elements.push(next);
        if (next === end) {
          break;
        }
        current = next;
      }

      return `[${elements.join(", ")}]`;
    },
    BinaryExpression(x) {
      const op = { "=": "===", "!=": "!==" }[x.op] ?? x.op;
      return `(${gen(x.left)} ${op} ${gen(x.right)})`;
    },
    UnaryExpression(x) {
      const operand = gen(e.operand);
      return `${e.op}(${operand})`;
    },
    IfStatement(x) {
      output.push(`if ${gen(x.test)} {`);
      x.consequent.forEach(gen);
      output.push(`}`);
      if (x.elseif.length > 0) {
        x.elseif.forEach(gen);
      }
      if (x.otherwise.length > 0) {
        gen(x.otherwise[0]);
      }
    },
    ElseIF(x) {
      output.push(`else if ${gen(x.test)} {`);
      x.consequent.forEach(gen);
      output.push(`}`);
    },
    Else(x) {
      output.push(`else {`);
      x.consequent.forEach(gen);
      output.push(`}`);
    },
    WhileStatement(x) {
      output.push(`while ${gen(x.test)} {`);
      x.body.forEach(gen);
      output.push(`}`);
    },
    ForStatement(x) {
      output.push(
        `for (const ${targetName(x.iterator.name)} of ${gen(x.collection)}){`
      );
      x.body.forEach(gen);
      output.push("}");
    },
    BreakStatement(x) {
      output.push("break;");
    },
    FunctionDeclaration(x) {
      output.push(
        `function ${gen(x.fun)}(${x.fun.params.map(gen).join(", ")}) {`
      );
      x.fun.body.forEach(gen);
      output.push("}");
    },
    Function(x) {
      return targetName(x.name);
    },
    Parameter(x) {
      if (x.defaultValue) {
        return `${targetName(x.name)} = ${gen(x.defaultValue)}`;
      }
      return `${targetName(x.name)}`;
    },
    ReturnStatement(x) {
      output.push(`return ${gen(x.expression)};`);
    },
    FunctionCall(x) {
      if (x.callee.name === "print") {
        output.push(`console.log(${x.args.map(gen).join(", ")});`);
        return;
      }
      const isClass = classes.includes(x.callee.name);
      const code = `${gen(x.callee)}(${x.args.map(gen).join(", ")})`;
      const string = isClass ? `new ${code}` : code;

      if (x.callee.type !== voidType) {
        return string;
      }

      output.push(`${string};`);
    },
    ClassDeclaration(x) {
      classes.push(x.name);
      output.push(`class ${targetName(x.name)} {`);
      gen(x.constructor[0]);
      x.methods.forEach(gen);
      output.push(`}`);
    },
    ConstructorCall(x) {
      let args = {};
      x.args.forEach((arg) => {
        args[targetName(arg.name)] = arg.defaultValue;
      });
      const params = Object.keys(args)
        .filter((key) => args[key] == null)
        .join(", ");
      output.push(`constructor(${params}) {`);
      
      Object.keys(args).forEach((param) => {
        output.push(
          `this.${param} = ${args[param] ? gen(args[param]) : param};`
        );
      });
      output.push(`}`);
    },
    MethodCall(x) {
      const args = x.args.map(gen).join(",");
      const obj = gen(x.object);
      const methodName = targetName(x.name);
      output.push(`${obj}.${methodName}(${args})`);
    },
  };

  gen(program);
  return output.join("\n");
}
