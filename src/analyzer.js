// The semantic analyzer exports a single function, analyze(match), that
// accepts a grammar match object (the CST) from Ohm and produces the
// internal representation of the program (pretty close to what is usually
// called the AST). This representation also includes entities from the
// standard library, as needed.

import * as core from "./core.js";

class Context {
  // Like most statically-scoped languages, Carlos contexts will contain a
  // map for their locally declared identifiers and a reference to the parent
  // context. The parent of the global context is null. In addition, the
  // context records whether analysis is current within a loop (so we can
  // properly check break statements), and reference to the current function
  // (so we can properly check return statements).
  constructor({
    parent = null,
    locals = new Map(),
    inLoop = false,
    function: f = null,
  }) {
    Object.assign(this, { parent, locals, inLoop, function: f });
  }
  add(name, entity) {
    this.locals.set(name, entity);
  }
  lookup(name) {
    return this.locals.get(name) || this.parent?.lookup(name);
  }
  static root() {
    return new Context({
      locals: new Map(Object.entries(core.standardLibrary)),
    });
  }
  newChildContext(props) {
    return new Context({ ...this, ...props, parent: this, locals: new Map() });
  }
}

export default function analyze(match) {
  // Track the context manually via a simple variable. The initial context
  // contains the mappings from the standard library. Add to this context
  // as necessary. When needing to descent into a new scope, create a new
  // context with the current context as its parent. When leaving a scope,
  // reset this variable to the parent context.
  let context = Context.root();

  // The single gate for error checking. Pass in a condition that must be true.
  // Use errorLocation to give contextual information about the error that will
  // appear: this should be an object whose "at" property is a parse tree node.
  // Ohm's getLineAndColumnMessage will be used to prefix the error message. This
  // allows any semantic analysis errors to be presented to an end user in the
  // same format as Ohm's reporting of syntax errors.
  function must(condition, message, errorLocation) {
    if (!condition) {
      const prefix = errorLocation.at.source.getLineAndColumnMessage();
      throw new Error(`${prefix}${message}`);
    }
  }

  // Next come a number of carefully named utility functions that keep the
  // analysis code clean and readable. Without these utilities, the analysis
  // code would be cluttered with if-statements and error messages. Each of
  // the utilities accept a parameter that should be an object with an "at"
  // property that is a parse tree node. This is used to provide contextual
  // information in the error message.

  function mustNotAlreadyBeDeclared(name, at) {
    must(!context.lookup(name), `Identifier ${name} already declared`, at);
  }

  function mustHaveBeenFound(entity, name, at) {
    must(entity, `Identifier ${name} not declared`, at);
  }

  function mustHaveNumericType(e, at) {
    const expectedTypes = [core.intType, core.floatType];
    must(expectedTypes.includes(e.type), "Expected a number", at);
  }

  function mustHaveNumericOrStringType(e, at) {
    const expectedTypes = [core.intType, core.floatType, core.stringType];
    must(expectedTypes.includes(e.type), "Expected a number or string", at);
  }

  function mustHaveBooleanType(e, at) {
    must(e.type === core.booleanType, "Expected a boolean", at);
  }

  function mustHaveIntegerType(e, at) {
    must(e.type === core.intType, "Expected an integer", at);
  }

  function mustHaveAnArrayType(e, at) {
    must(e.type?.kind === "ArrayType", "Expected an array", at);
  }

  function mustHaveAnOptionalType(e, at) {
    must(e.type?.kind === "OptionalType", "Expected an optional", at);
  }

  function mustHaveAStructType(e, at) {
    must(e.type?.kind === "StructType", "Expected a struct", at);
  }

  function mustHaveAnOptionalStructType(e, at) {
    // Used to check e?.x expressions, e must be an optional struct
    must(
      e.type?.kind === "OptionalType" && e.type.baseType?.kind === "StructType",
      "Expected an optional struct",
      at
    );
  }

  function mustBothHaveTheSameType(e1, e2, at) {
    must(
      equivalent(e1.type, e2.type),
      "Operands do not have the same type",
      at
    );
  }

  function mustAllHaveSameType(expressions, at) {
    // Used to check the elements of an array expression, and the two
    // arms of a conditional expression, among other scenarios.
    must(
      expressions
        .slice(1)
        .every((e) => equivalent(e.type, expressions[0].type)),
      "Not all elements have the same type",
      at
    );
  }

  function mustBeAType(e, at) {
    const isBasicType = /int|float|string|bool|void|any/.test(e);
    const isCompositeType =
      /StructType|FunctionType|ArrayType|OptionalType/.test(e?.kind);
    must(isBasicType || isCompositeType, "Type expected", at);
  }

  function mustBeAnArrayType(t, at) {
    must(t?.kind === "ArrayType", "Must be an array type", at);
  }

  function includesAsField(structType, type) {
    // Whether the struct type has a field of type type, directly or indirectly
    return structType.fields.some(
      (field) =>
        field.type === type ||
        (field.type?.kind === "StructType" && includesAsField(field.type, type))
    );
  }

  function mustNotBeSelfContaining(structType, at) {
    const containsSelf = includesAsField(structType, structType);
    must(!containsSelf, "Struct type must not be self-containing", at);
  }

  function equivalent(t1, t2) {
    return (
      t1 === t2 ||
      (t1?.kind === "OptionalType" &&
        t2?.kind === "OptionalType" &&
        equivalent(t1.baseType, t2.baseType)) ||
      (t1?.kind === "ArrayType" &&
        t2?.kind === "ArrayType" &&
        equivalent(t1.baseType, t2.baseType)) ||
      (t1?.kind === "FunctionType" &&
        t2?.kind === "FunctionType" &&
        equivalent(t1.returnType, t2.returnType) &&
        t1.paramTypes.length === t2.paramTypes.length &&
        t1.paramTypes.every((t, i) => equivalent(t, t2.paramTypes[i])))
    );
  }

  function assignable(fromType, toType) {
    return (
      toType == core.anyType ||
      equivalent(fromType, toType) ||
      (fromType?.kind === "FunctionType" &&
        toType?.kind === "FunctionType" &&
        // covariant in return types
        assignable(fromType.returnType, toType.returnType) &&
        fromType.paramTypes.length === toType.paramTypes.length &&
        // contravariant in parameter types
        toType.paramTypes.every((t, i) =>
          assignable(t, fromType.paramTypes[i])
        ))
    );
  }

  function typeDescription(type) {
    if (typeof type === "string") return type;
    if (type.kind == "StructType") return type.name;
    if (type.kind == "FunctionType") {
      const paramTypes = type.paramTypes.map(typeDescription).join(", ");
      const returnType = typeDescription(type.returnType);
      return `(${paramTypes})->${returnType}`;
    }
    if (type.kind == "ArrayType") return `[${typeDescription(type.baseType)}]`;
    if (type.kind == "OptionalType")
      return `${typeDescription(type.baseType)}?`;
  }

  function mustBeAssignable(e, { toType: type }, at) {
    const source = typeDescription(e.type);
    const target = typeDescription(type);
    const message = `Cannot assign a ${source} to a ${target}`;
    must(assignable(e.type, type), message, at);
  }

  function isMutable(e) {
    return (
      (e?.kind === "Variable" && e?.mutable) ||
      (e?.kind === "SubscriptExpression" && isMutable(e?.array)) ||
      (e?.kind === "MemberExpression" && isMutable(e?.object))
    );
  }

  function mustBeMutable(e, at) {
    must(isMutable(e), `Cannot assign to immutable ${e.name}`, at);
  }

  function mustHaveDistinctFields(type, at) {
    const fieldNames = new Set(type.fields.map((f) => f.name));
    must(fieldNames.size === type.fields.length, "Fields must be distinct", at);
  }

  function mustHaveMember(structType, field, at) {
    must(
      structType.fields.map((f) => f.name).includes(field),
      "No such field",
      at
    );
  }

  function mustBeInLoop(at) {
    must(context.inLoop, "Break can only appear in a loop", at);
  }

  function mustBeInAFunction(at) {
    must(context.function, "Return can only appear in a function", at);
  }

  function mustBeCallable(e, at) {
    const callable =
      e?.kind === "StructType" || e.type?.kind === "FunctionType";
    must(callable, "Call of non-function or non-constructor", at);
  }

  function mustNotReturnAnything(f, at) {
    const returnsNothing = f.type.returnType === core.voidType;
    must(returnsNothing, "Something should be returned", at);
  }

  function mustReturnSomething(f, at) {
    const returnsSomething = f.type.returnType !== core.voidType;
    must(returnsSomething, "Cannot return a value from this function", at);
  }

  function mustBeReturnable(e, { from: f }, at) {
    mustBeAssignable(e, { toType: f.type.returnType }, at);
  }

  function mustHaveCorrectArgumentCount(argCount, paramCount, at) {
    const message = `${paramCount} argument(s) required but ${argCount} passed`;
    must(argCount === paramCount, message, at);
  }

  function mustBeIterable(e, at) {
    //TODO
  }

  // Building the program representation will be done together with semantic
  // analysis and error checking. In Ohm, we do this with a semantics object
  // that has an operation for each relevant rule in the grammar. Since the
  // purpose of analysis is to build the program representation, we will name
  // the operations "rep" for "representation". Most of the rules are straight-
  // forward except for those dealing with function and type declarations,
  // since types and functions need to be dealt with in two steps to allow
  // recursion.
  const builder = match.matcher.grammar.createSemantics().addOperation("rep", {
    Program(statements) {
      return core.program(statements.children.map((s) => s.rep()));
    },

    VarDec(mut, id, _colon, exp) {
      mustNotAlreadyBeDeclared(id.sourceString, { at: id });
      const initializer = exp.rep();
      const mutable = mut.sourceString === "mu";

      console.log(initializer.type);

      const variable = core.variable(
        id.sourceString,
        mutable,
        initializer.type
      );
      context.add(id.sourceString, variable);
      return core.variableDeclaration(variable, initializer);
    },

    IfStmt(ifStmt, elif, otherwise) {
      const ifPart = handleIf(ifStmt);
      function handleIf(node) {
        const condition = node.children[1];
        const block = node.children[2];
        const test = condition.rep();
        mustHaveBooleanType(test, { at: condition });
        context = context.newChildContext();
        const consequent = block.rep();
        context = context.parent;
        return [test, consequent];
      }

      const elifPart = elif.children.map((child) => handleElif(child));
      function handleElif(node) {
        const condition = node.children[1];
        const block = node.children[2];
        const test = condition.rep();
        mustHaveBooleanType(test, { at: condition });
        context = context.newChildContext();
        const consequent = block.rep();
        context = context.parent;
        return core.elifStmt(test, consequent);
      }

      const elsePart = otherwise.children.map((child) => handleElse(child));
      function handleElse(node) {
        if (node.children.length === 3) {
          const block = node.children[1];
          context = context.newChildContext();
          const consequent = block.rep();
          context = context.parent;
          return core.elseStmt(consequent);
        }
      }

      return core.ifStatement(ifPart[0], ifPart[1], elifPart, elsePart);
    },

    Exp_conditional(exp, _q, exp1, colon, exp2) {
      const test = exp.rep();
      mustHaveBooleanType(test, { at: exp });
      const [consequent, otherwise] = [exp1.rep(), exp2.rep()];
      mustBothHaveTheSameType(consequent, otherwise, { at: colon });
      const other = core.elseStmt(otherwise);
      return core.ifStatement(test, consequent, null, other);
    },

    // Exp_conditional(exp, _questionMark, exp1, colon, exp2) {
    //   const test = exp.rep()
    //   mustHaveBooleanType(test, { at: exp })
    //   const [consequent, alternate] = [exp1.rep(), exp2.rep()]
    //   mustBothHaveTheSameType(consequent, alternate, { at: colon })
    //   return core.conditional(test, consequent, alternate, consequent.type)
    // },

    Exp2_test(cond, logic, cond1) {
      const [left, op, right] = [cond.rep(), logic.sourceString, cond1.rep()];
      if (["<", "<=", ">", ">="].includes(op)) {
        mustHaveNumericOrStringType(left, { at: cond });
      }
      mustBothHaveTheSameType(left, right, { at: logic });
      return core.binary(op, left, right, core.booleanType);
    },

    Block(_open, statements, _close) {
      return statements.children.map((s) => s.rep());
    },

    Exp6_id(id) {
      const entity = context.lookup(id.sourceString);
      mustHaveBeenFound(entity, id.sourceString, { at: id });
      return entity;
    },

    Exp1_or(exp, _or, exp1) {
      let left = exp.rep();
      mustHaveBooleanType(left, { at: exp });
      for (let e of exp1.children) {
        let right = e.rep();
        mustHaveBooleanType(right, { at: e });
        left = core.binary("||", left, right, core.booleanType);
      }
      return left;
    },

    // Exp2_or(exp, _ops, exps) {
    //   let left = exp.rep()
    //   mustHaveBooleanType(left, { at: exp })
    //   for (let e of exps.children) {
    //     let right = e.rep()
    //     mustHaveBooleanType(right, { at: e })
    //     left = core.binary("||", left, right, core.booleanType)
    //   }
    //   return left
    // },

    Exp1_and(exp, _and, exp1) {
      let left = exp.rep();
      mustHaveBooleanType(left, { at: exp });
      for (let e of exp1.children) {
        let right = e.rep();
        mustHaveBooleanType(right, { at: e });
        left = core.binary("&&", left, right, core.booleanType);
      }
      return left;
    },

    // Exp2_and(exp, _ops, exps) {
    //   let left = exp.rep()
    //   mustHaveBooleanType(left, { at: exp })
    //   for (let e of exps.children) {
    //     let right = e.rep()
    //     mustHaveBooleanType(right, { at: e })
    //     left = core.binary("&&", left, right, core.booleanType)
    //   }
    //   return left
    // },

    Exp3_add(exp1, addOp, exp2) {
      const [left, op, right] = [exp1.rep(), addOp.sourceString, exp2.rep()];
      if (op === "+") {
        mustHaveNumericOrStringType(left, { at: exp1 });
      } else {
        mustHaveNumericType(left, { at: exp1 });
      }
      mustBothHaveTheSameType(left, right, { at: addOp });
      return core.binary(op, left, right, left.type);
    },

    // Exp6_add(exp1, addOp, exp2) {
    //   const [left, op, right] = [exp1.rep(), addOp.sourceString, exp2.rep()]
    //   if (op === "+") {
    //     mustHaveNumericOrStringType(left, { at: exp1 })
    //   } else {
    //     mustHaveNumericType(left, { at: exp1 })
    //   }
    //   mustBothHaveTheSameType(left, right, { at: addOp })
    //   return core.binary(op, left, right, left.type)
    // },

    Exp4_mul(exp1, mulOp, exp2) {
      const [left, op, right] = [exp1.rep(), mulOp.sourceString, exp2.rep()];
      mustHaveNumericType(left, { at: exp1 });
      // mustBothHaveTheSameType(left, right, { at: mulOp });
      return core.binary(op, left, right, left.type);
    },

    // Exp7_multiply(exp1, mulOp, exp2) {
    //   const [left, op, right] = [exp1.rep(), mulOp.sourceString, exp2.rep()]
    //   mustHaveNumericType(left, { at: exp1 })
    //   mustBothHaveTheSameType(left, right, { at: mulOp })
    //   return core.binary(op, left, right, left.type)
    // },

    Exp5_exp(exp1, powerOp, exp2) {
      const [left, op, right] = [exp1.rep(), powerOp.sourceString, exp2.rep()];
      mustHaveNumericType(left, { at: exp1 });
      mustBothHaveTheSameType(left, right, { at: powerOp });
      return core.binary(op, left, right, left.type);
    },

    Exp5_neg(opSign, exp) {
      const [op, operand] = [opSign.sourceString, exp.rep()];
      if (op === "!") {
        mustHaveBooleanType(exp, { at: exp });
        const type = core.booleanType;
        return core.unary(op, operand, type);
      } else if (op === "-") {
        mustHaveNumericType(operand, { at: exp });
        const type = core.booleanType;
        return core.unary(op, operand, type);
      }
    },

    // Exp8_power(exp1, powerOp, exp2) {
    //   const [left, op, right] = [exp1.rep(), powerOp.sourceString, exp2.rep()]
    //   mustHaveNumericType(left, { at: exp1 })
    //   mustBothHaveTheSameType(left, right, { at: powerOp })
    //   return core.binary(op, left, right, left.type)
    // },

    // Exp8_unary(unaryOp, exp) {
    //   const [op, operand] = [unaryOp.sourceString, exp.rep()]
    //   let type
    //   if (op === "#") {
    //     mustHaveAnArrayType(operand, { at: exp })
    //     type = core.intType
    //   } else if (op === "-") {
    //     mustHaveNumericType(operand, { at: exp })
    //     type = operand.type
    //   } else if (op === "!") {
    //     mustHaveBooleanType(operand, { at: exp })
    //     type = core.booleanType
    //   } else if (op === "some") {
    //     type = core.optionalType(operand.type)
    //   } else if (op === "random") {
    //     mustHaveAnArrayType(operand, { at: exp })
    //     type = operand.type.baseType
    //   }
    //   return core.unary(op, operand, type)
    // },

    Statement_assign(variable, _colon, exp) {
      const source = exp.rep();
      const target = variable.rep();
      mustBeMutable(target, { at: variable });
      mustBeAssignable(source, { toType: target.type }, { at: variable });
      return core.assignment(target, source);
    },

    LoopStmt_for(_l, id, exp, block) {
      const collection = exp.rep();
      mustBeIterable(exp);
      const iterator = core.variable(id.sourceString, false, core.intType);
      context = context.newChildContext({ inLoop: true });
      context.add(id.sourceString, iterator);
      const body = block.rep();
      context.parent;
      return core.forStatement(iterator, collection, body);
    },

    PatternExp_basicFor(_in, value) {
      const typeNode = value.ctorName;
      if (typeNode === "numLit_int") {
        return core.range(BigInt(0), value.rep(), "+", BigInt(1));
      } else if (typeNode === "RangeExp") {
        return value.rep();
      } else if (typeNode === "id") {
        const collection = context.lookup(value.sourceString);
        mustBeIterable(collection);
        return collection;
      }
    },

    RangeExp(_open, range, _comma, sign, number, _close) {
      const [start, end] = [range.children[0].rep(), range.children[2].rep()];

      const num = number.children[0]?.sourceString;

      return core.range(
        start,
        end,
        sign.children[0]?.sourceString,
        num ? BigInt(num) : null
      );
    },

    // LoopStmt_range(_for, id, _in, exp1, op, exp2, block) {
    //   const [low, high] = [exp1.rep(), exp2.rep()]
    //   mustHaveIntegerType(low, { at: exp1 })
    //   mustHaveIntegerType(high, { at: exp2 })
    //   const iterator = core.variable(id.sourceString, false, core.intType)
    //   context = context.newChildContext({ inLoop: true })
    //   context.add(id.sourceString, iterator)
    //   const body = block.rep()
    //   context = context.parent
    //   return core.forRangeStatement(iterator, low, op.sourceString, high, body)
    // },

    FuncDec(_key, id, _open, listParams, _close, _arrow, type, block) {
      mustNotAlreadyBeDeclared(id.sourceString, { at: id });
      const fun = core.func(id.sourceString);
      context.add(id.sourceString, fun);
      context = context.newChildContext({ inLoop: false, function: fun });
      fun.params = listParams.children.map((child) => child.rep());
      const paramTypes = fun.params.map((param) => param.type);

      const returnType =
        type.matchLength > 0 ? type.sourceString : core.voidType;
      fun.type = core.functionType(paramTypes, returnType);
      fun.body = block.rep();
      context = context.parent;

      console.log(core.functionDeclaration(fun));

      return core.functionDeclaration(fun);
    },

    // FunDecl(_fun, id, parameters, _colons, type, block) {
    //   mustNotAlreadyBeDeclared(id.sourceString, { at: id })
    //   // Add immediately so that we can have recursion
    //   const fun = core.fun(id.sourceString)
    //   context.add(id.sourceString, fun)

    //   // Parameters are part of the child context
    //   context = context.newChildContext({ inLoop: false, function: fun })
    //   fun.params = parameters.rep()

    //   // Now that the parameters are known, we compute the function's type.
    //   // This is fine; we did not need the type to analyze the parameters,
    //   // but we do need to set it before analyzing the body.
    //   const paramTypes = fun.params.map(param => param.type)
    //   const returnType = type.children?.[0]?.rep() ?? core.voidType
    //   fun.type = core.functionType(paramTypes, returnType)

    //   // Analyze body while still in child context
    //   fun.body = block.rep()

    //   // Go back up to the outer context before returning
    //   context = context.parent
    //   return core.functionDeclaration(fun)
    // },

    FuncCall_normal(exp, _open, args, _close) {
      const callee = context.lookup(exp.sourceString);
      mustBeCallable(callee, { at: exp });
      const argums = args.children.map((child) => child.rep());
      return core.functionCall(callee, argums);
    },

    FuncCall_intrinsic(id, _open, args, _close) {
      const callee = context.lookup(id.sourceString);
      mustBeCallable(callee, { at: id });
      const argums = args.children.map((child) => child.rep());
      return core.functionCall(callee, argums);
    },

    FuncCall_intrinsicOne(id, arg) {
      const callee = context.lookup(id.sourceString);
      mustBeCallable(callee, { at: id });
      const argum = arg.rep();
      return core.functionCall(callee, argum);
    },

    FuncCall_normalOne(id, arg) {
      const callee = context.lookup(id.sourceString);
      mustBeCallable(callee, { at: id });
      const argum = arg.rep();
      return core.functionCall(callee, argum);
    },

    //need to make sure its already been declared, needs work because theres two cases, 1 is an var, other is a lit
    Param_default(id, _colon, exp) {
      const value = exp.rep();

      {
        mustHaveBeenFound(exp.sourceString, { at: exp }) ||
          mustHaveNumericOrStringType(value, { at: exp });
      }
      mustNotAlreadyBeDeclared(id.sourceString, { at: id });

      const param = core.default_param(id.sourceString, value, value.type);

      context.add(id.sourceString, param);
      return param;
    },

    // Param(id, _colon, type) {
    //   const param = core.variable(id.sourceString, false, type.rep())
    //   mustNotAlreadyBeDeclared(param.name, { at: id })
    //   context.add(param.name, param)
    //   return param
    // },

    Param_typedArg(id, type) {
      return core.param(id.sourceString, type.sourceString);
    },

    // Exp9_call(exp, open, expList, _close) {
    //   const callee = exp.rep();
    //   mustBeCallable(callee, { at: exp });
    //   const exps = expList.asIteration().children;
    //   const targetTypes =
    //     callee?.kind === "StructType"
    //       ? callee.fields.map((f) => f.type)
    //       : callee.type.paramTypes;
    //   mustHaveCorrectArgumentCount(exps.length, targetTypes.length, {
    //     at: open,
    //   });
    //   const args = exps.map((exp, i) => {
    //     const arg = exp.rep();
    //     mustBeAssignable(arg, { toType: targetTypes[i] }, { at: exp });
    //     return arg;
    //   });
    //   return callee?.kind === "StructType"
    //     ? core.constructorCall(callee, args)
    //     : core.functionCall(callee, args);
    // },

    // VarDecl(modifier, id, _eq, exp, _semicolon) {
    //   mustNotAlreadyBeDeclared(id.sourceString, { at: id })
    //   const initializer = exp.rep()
    //   const mutable = modifier.sourceString === "let"
    //   const variable = core.variable(id.sourceString, mutable, initializer.type)
    //   context.add(id.sourceString, variable)
    //   return core.variableDeclaration(variable, initializer)
    // },

    // TypeDecl(_struct, id, _left, fields, _right) {
    //   mustNotAlreadyBeDeclared(id.sourceString, { at: id })
    //   // To allow recursion, enter into context without any fields yet
    //   const type = core.structType(id.sourceString, [])
    //   context.add(id.sourceString, type)
    //   // Now add the types as you parse and analyze. Since we already added
    //   // the struct type itself into the context, we can use it in fields.
    //   type.fields = fields.children.map(field => field.rep())
    //   mustHaveDistinctFields(type, { at: id })
    //   mustNotBeSelfContaining(type, { at: id })
    //   return core.typeDeclaration(type)
    // },

    // Field(id, _colon, type) {
    //   return core.field(id.sourceString, type.rep())
    // },

    // FunDecl(_fun, id, parameters, _colons, type, block) {
    //   mustNotAlreadyBeDeclared(id.sourceString, { at: id })
    //   // Add immediately so that we can have recursion
    //   const fun = core.fun(id.sourceString)
    //   context.add(id.sourceString, fun)

    //   // Parameters are part of the child context
    //   context = context.newChildContext({ inLoop: false, function: fun })
    //   fun.params = parameters.rep()

    //   // Now that the parameters are known, we compute the function's type.
    //   // This is fine; we did not need the type to analyze the parameters,
    //   // but we do need to set it before analyzing the body.
    //   const paramTypes = fun.params.map(param => param.type)
    //   const returnType = type.children?.[0]?.rep() ?? core.voidType
    //   fun.type = core.functionType(paramTypes, returnType)

    //   // Analyze body while still in child context
    //   fun.body = block.rep()

    //   // Go back up to the outer context before returning
    //   context = context.parent
    //   return core.functionDeclaration(fun)
    // },

    // Params(_open, paramList, _close) {
    //   // Returns a list of variable nodes
    //   return paramList.asIteration().children.map(p => p.rep())
    // },

    // Type_optional(baseType, _questionMark) {
    //   return core.optionalType(baseType.rep())
    // },

    // Type_array(_left, baseType, _right) {
    //   return core.arrayType(baseType.rep())
    // },

    // Type_function(_left, types, _right, _arrow, type) {
    //   const paramTypes = types.asIteration().children.map(t => t.rep())
    //   const returnType = type.rep()
    //   return core.functionType(paramTypes, returnType)
    // },

    // Type_id(id) {
    //   const entity = context.lookup(id.sourceString)
    //   mustHaveBeenFound(entity, id.sourceString, { at: id })
    //   mustBeAType(entity, { at: id })
    //   return entity
    // },

    // Statement_bump(exp, operator, _semicolon) {
    //   const variable = exp.rep()
    //   mustHaveIntegerType(variable, { at: exp })
    //   return operator.sourceString === "++"
    //     ? core.increment(variable)
    //     : core.decrement(variable)
    // },

    // Statement_call(call, _semicolon) {
    //   return call.rep()
    // },

    // Statement_break(breakKeyword, _semicolon) {
    //   mustBeInLoop({ at: breakKeyword });
    //   return core.breakStatement;
    // },

    // Statement_return(returnKeyword, exp, _semicolon) {
    //   mustBeInAFunction({ at: returnKeyword });
    //   mustReturnSomething(context.function, { at: returnKeyword });
    //   const returnExpression = exp.rep();
    //   mustBeReturnable(
    //     returnExpression,
    //     { from: context.function },
    //     { at: exp }
    //   );
    //   return core.returnStatement(returnExpression);
    // },

    // Statement_shortreturn(returnKeyword, _semicolon) {
    //   mustBeInAFunction({ at: returnKeyword })
    //   mustNotReturnAnything(context.function, { at: returnKeyword })
    //   return core.shortReturnStatement
    // },

    // LoopStmt_while(_while, exp, block) {
    //   const test = exp.rep()
    //   mustHaveBooleanType(test, { at: exp })
    //   context = context.newChildContext({ inLoop: true })
    //   const body = block.rep()
    //   context = context.parent
    //   return core.whileStatement(test, body)
    // },

    // Exp1_unwrapelse(exp1, elseOp, exp2) {
    //   const [optional, op, alternate] = [exp1.rep(), elseOp.sourceString, exp2.rep()]
    //   mustHaveAnOptionalType(optional, { at: exp1 })
    //   mustBeAssignable(alternate, { toType: optional.type.baseType }, { at: exp2 })
    //   return core.binary(op, optional, alternate, optional.type)
    // },

    // Exp3_bitor(exp, _ops, exps) {
    //   let left = exp.rep()
    //   mustHaveIntegerType(left, { at: exp })
    //   for (let e of exps.children) {
    //     let right = e.rep()
    //     mustHaveIntegerType(right, { at: e })
    //     left = core.binary("|", left, right, core.intType)
    //   }
    //   return left
    // },

    // Exp3_bitxor(exp, xorOps, exps) {
    //   let left = exp.rep()
    //   mustHaveIntegerType(left, { at: exp })
    //   for (let e of exps.children) {
    //     let right = e.rep()
    //     mustHaveIntegerType(right, { at: e })
    //     left = core.binary("^", left, right, core.intType)
    //   }
    //   return left
    // },

    // Exp3_bitand(exp, andOps, exps) {
    //   let left = exp.rep()
    //   mustHaveIntegerType(left, { at: exp })
    //   for (let e of exps.children) {
    //     let right = e.rep()
    //     mustHaveIntegerType(right, { at: e })
    //     left = core.binary("&", left, right, core.intType)
    //   }
    //   return left
    // },

    // Exp4_compare(exp1, relop, exp2) {
    //   const [left, op, right] = [exp1.rep(), relop.sourceString, exp2.rep()]
    //   // == and != can have any operand types as long as they are the same
    //   // But inequality operators can only be applied to numbers and strings
    //   if (["<", "<=", ">", ">="].includes(op)) {
    //     mustHaveNumericOrStringType(left, { at: exp1 })
    //   }
    //   mustBothHaveTheSameType(left, right, { at: relop })
    //   return core.binary(op, left, right, core.booleanType)
    // },

    // Exp9_emptyarray(ty, _open, _close) {
    //   const type = ty.rep()
    //   mustBeAnArrayType(type, { at: ty })
    //   return core.emptyArray(type)
    // },

    // Exp9_arrayexp(_open, args, _close) {
    //   const elements = args.asIteration().children.map(e => e.rep())
    //   mustAllHaveSameType(elements, { at: args })
    //   return core.arrayExpression(elements)
    // },

    // Exp9_emptyopt(_no, type) {
    //   return core.emptyOptional(type.rep())
    // },

    // Exp9_parens(_open, expression, _close) {
    //   return expression.rep()
    // },

    // Exp9_subscript(exp1, _open, exp2, _close) {
    //   const [array, subscript] = [exp1.rep(), exp2.rep()]
    //   mustHaveAnArrayType(array, { at: exp1 })
    //   mustHaveIntegerType(subscript, { at: exp2 })
    //   return core.subscript(array, subscript)
    // },

    // Exp9_member(exp, dot, id) {
    //   const object = exp.rep()
    //   let structType
    //   if (dot.sourceString === "?.") {
    //     mustHaveAnOptionalStructType(object, { at: exp })
    //     structType = object.type.baseType
    //   } else {
    //     mustHaveAStructType(object, { at: exp })
    //     structType = object.type
    //   }
    //   mustHaveMember(structType, id.sourceString, { at: id })
    //   const field = structType.fields.find(f => f.name === id.sourceString)
    //   return core.memberExpression(object, dot.sourceString, field)
    // },

    // Exp9_call(exp, open, expList, _close) {
    //   const callee = exp.rep()
    //   mustBeCallable(callee, { at: exp })
    //   const exps = expList.asIteration().children
    //   const targetTypes =
    //     callee?.kind === "StructType"
    //       ? callee.fields.map(f => f.type)
    //       : callee.type.paramTypes
    //   mustHaveCorrectArgumentCount(exps.length, targetTypes.length, { at: open })
    //   const args = exps.map((exp, i) => {
    //     const arg = exp.rep()
    //     mustBeAssignable(arg, { toType: targetTypes[i] }, { at: exp })
    //     return arg
    //   })
    //   return callee?.kind === "StructType"
    //     ? core.constructorCall(callee, args)
    //     : core.functionCall(callee, args)
    // },

    // Exp9_id(id) {
    //   // When an id appears in an expression, it had better have been declared
    //   const entity = context.lookup(id.sourceString)
    //   mustHaveBeenFound(entity, id.sourceString, { at: id })
    //   return entity
    // },

    numLit_int(_digits) {
      return BigInt(this.sourceString);
    },

    numLit_float(_nums, _dot, _moreNums) {
      return Number(this.sourceString);
    },

    stringLit(_open, _string, _close) {
      return this.sourceString;
    },

    true(_) {
      return true;
    },

    false(_) {
      return false;
    },
  });

  return builder(match).rep();
}
