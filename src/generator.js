import { voidType } from "./core.js";

export default function generate(program) {
  const output = [];

  const targetName = ((mapping) => {
    return (entity) => {
      if (!mapping.has(entity)) {
        mapping.set(entity, mapping.size + 1);
      }
      return `${entity.name}_${mapping.get(entity)}`;
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
      output.push(`let ${gen(x.variable)} = ${gen(x.initializer)};`);
    },
    Variable(x) {
      return targetName(x);
    },
    Assignment(x) {
      output.push(`${gen(x.target)} = ${gen(x.source)};`);
    },
    Range(x) {},
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
    ForStatement(x) {},
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
      return targetName(x);
    },
    Parameter(x) {
      // the issue is with id, but should be name and should use targetName
      if (x.defaultValue) {
        return `${x.id} = ${gen(x.defaultValue)}`;
      }
      return `${x.id}`;
    },
    ReturnStatement(x) {
      output.push(`return ${gen(x.expression)};`);
    },
    FunctionCall(x) {
      const targetCode = `${gen(x.callee)}(${x.args.map(gen).join(", ")})`;
      // I'm not sure that this is correct tbh
      //if callee is a class then need to add new
      if (x.callee.type !== voidType) {
        return targetCode;
      }
      output.push(`${targetCode};`);
    },
    ClassDeclaration(x) {
      //need to have name here
      output.push(`class `);
      gen(x.constructor[0]);
    },
    ConstructorCall(x) {
      console.log("here", x.args);
      let args = {};
      x.args.forEach((arg) => {
        args[arg.id] = arg.defaultValue;
      });
      output.push(
        `constructor (${Object.keys(args)
          .filter((key) => args[key] == null)
          .join(", ")}) {`
      );
      Object.keys(args).forEach((param) => {
        output.push(
          `this.${param} = ${args[param] ? gen(args[param]) : param}`
        );
      });
      output.push(`}`);
    },
    MethodCall(x) {},
  };

  gen(program);
  return output.join("\n");
}
