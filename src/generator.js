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
      x.statements.forEach((x) => {
        output.push(gen(x));
      });
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
      return `let ${gen(x.variable)} = ${gen(x.initializer)};`;
    },
    Variable(x) {
      return targetName(x.name);
    },
    Assignment(x) {
      return `${gen(x.target)} = ${gen(x.source)};`;
    },
    Range(x) {
      let elements = [];
      let current = gen(x.start);
      const end = gen(x.end);
      const value = gen(x.value);
      const op = gen(x.op);

      switch (op) {
        case "+":
          while (current <= end) {
            elements.push(current);
            current += value;
          }
          break;
        case "-":
          while (current >= end) {
            elements.push(current);
            current -= value;
          }
          break;
        case "*":
          if (value > 1) {
            while (current <= end) {
              elements.push(current);
              current *= value;
            }
          } else {
            while (current >= end) {
              elements.push(current);
              current *= value;
            }
          }
          break;
        case "**":
          if (value > 1) {
            while (current <= end) {
              elements.push(current);
              current **= value;
            }
          } else {
            while (current >= end) {
              elements.push(current);
              current **= value;
            }
          }
          break;
        case "/":
          if (value > 1) {
            while (current >= end) {
              elements.push(current);
              current /= value;
            }
          } else {
            while (current <= end) {
              elements.push(current);
              current /= value;
            }
          }
          break;
      }

      return `[${elements.join(", ")}]`;
    },
    BinaryExpression(x) {
      const op = { "=": "===", "!=": "!==" }[x.op] ?? x.op;
      return `(${gen(x.left)} ${op} ${gen(x.right)})`;
    },
    UnaryExpression(x) {
      const operand = gen(x.operand);
      return `${x.op}(${operand})`;
    },
    IfStatement(x) {
      let code = `if ${gen(x.test)} {\n`;
      x.consequent.map((x) => (code += "  " + gen(x)));
      code += `\n}`;
      if (x.elseif.length > 0) {
        x.elseif.map((x) => (code += "\n" + gen(x)));
      }
      if (x.otherwise.length > 0) {
        code += "\n" + gen(x.otherwise[0]);
      }
      return code;
    },
    ElseIF(x) {
      let code = `else if ${gen(x.test)} {\n`;
      x.consequent.map((x) => (code += "  " + gen(x)));
      code += `\n}`;
      return code;
    },
    Else(x) {
      let code = `else {\n`;
      x.consequent.map((x) => (code += "  " + gen(x)));
      code += `\n}`;
      return code;
    },

    WhileStatement(x) {
      let code = `while ${gen(x.test)} {\n`;
      x.body.map((x) => (code += "  " + gen(x) + "\n"));
      code += `\n}`;
      return code;
    },
    ForStatement(x) {
      let code = "";
      if (x.collection.kind === "Range") {
        const start = gen(x.collection.start);
        const end = gen(x.collection.end);
        const op = x.collection.op;
        const value = gen(x.collection.value);
        const test = ["-", "%", "/"].includes(op) ? `>=` : `<=`;
        const i = targetName(x.iterator.name);
        code += `for (let ${i} = ${start}; ${i} ${test} ${end}; ${i} ${op}= ${value}) {\n`;
      } else {
        const i = targetName(x.iterator.name);
        code = `for (let ${i} = 1; ${i} <= ${gen(x.collection)}; ${i}++) {\n`;
      }
      x.body.map((x) => (code += "  " + gen(x) + "\n"));
      code += "}\n";
      return code;
    },
    BreakStatement(_) {
      return "break;";
    },
    FunctionDeclaration(x) {
      let code = `function ${gen(x.fun)}(${x.fun.params.map(gen).join(", ")}) {\n`;
      x.fun.body.map((x) => (code += gen(x)) + "\n");
      code += "\n}\n";
      return code;
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
      const exp = gen(x.expression);
      return `return${exp === undefined ? "" : ` ${exp}`};`;
    },
    FunctionCall(x) {
      if (x.callee.name === "print") {
        return `console.log(${x.args.map(gen).join(", ")});`;
      }
      const isClass = classes.includes(x.callee.name);
      const code = `${gen(x.callee)}(${x.args.map(gen).join(", ")})`;
      const string = isClass ? `new ${code}` : code;
      return `${string}`;
    },
    ClassDeclaration(x) {
      classes.push(x.name);
      let con_args = [];
      x.constructor.forEach((x) => {
        x.args.forEach((y) => con_args.push(y.name));
      });
      let code = `class ${targetName(x.name)} {\n`;
      code += gen(x.constructor[0]);
      let methods = [];
      x.methods.map((x) => methods.push(gen(x)));
      methods.forEach((x) => {
        let trimmed = x.replace("function ", "") + "\n";
        for (const word of con_args) {
          trimmed = trimmed.replace(word, "this." + word);
          code += trimmed;
        }
      });
      code += `\n}`;
      return code;
    },
    ConstructorCall(x) {
      let args = {};
      let code = "";
      x.args.forEach((arg) => {
        args[targetName(arg.name)] = arg.defaultValue;
      });
      const params = Object.keys(args)
        .filter((key) => args[key] == null)
        .join(", ");
      code += `  constructor(${params}) {\n`;

      Object.keys(args).forEach((param) => {
        code += `    this.${param} = ${args[param] ? gen(args[param]) : param};\n`;
      });
      code += `  }\n`;
      return code;
    },
    MethodCall(x) {
      const args = x.args.map(gen).join(",");
      const obj = gen(x.object);
      const methodName = targetName(x.name);
      return `${obj}.${methodName}(${args})`;
    },
  };

  gen(program);
  return output.join("\n");
}
