// The semantic analyzer exports a single function, analyze(match), that
// accepts a grammar match object (the CST) from Ohm and produces the
// internal representation of the program (pretty close to what is usually
// called the AST). This representation also includes entities from the
// standard library, as needed.

import { error } from "node:console";
import * as core from "./core.js";
import { kMaxLength } from "node:buffer";

class Context {
  // Like most statically-scoped languages, Panic contexts will contain a
  // map for their locally declared identifiers and a reference to the parent
  // context. The parent of the global context is null. In addition, the
  // context records whether analysis is current within a loop (so we can
  // properly check break statements), and reference to the current function
  // (so we can properly check return statements).
  constructor({
    parent = null,
    locals = new Map(),
    inLoop = false,
    inClass = false,
    function: f = null,
  }) {
    Object.assign(this, { parent, locals, inLoop, inClass, function: f });
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

  printContext() {
    console.log("parent: ", this.parent);
    console.log("locals: ", this.locals);
    console.log("inloop: ", this.inLoop);
    console.log("inClass: ", this.inClass);
    console.log("function; ", this.f);
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
      e.type?.kind === "FunctionType" || e.type?.kind === "ConstructorType";
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

  function mustHaveCorrectArgsAndTypes(params, args, at) {
    const maxParams = params.length;
    let minParams = 0;
    const argLength = args.length;
    for (let param of params) {
      if (param["defaultValue"] === null) {
        minParams++;
      }
    }
    if (argLength < minParams || argLength > maxParams) {
      const message =
        minParams === maxParams
          ? `Expected ${maxParams} arguments, but ${argLength} parameters were passed`
          : `Expected between ${minParams} and ${maxParams} arguments, but ${argLength} parameters were passed`;
      must(false, message, at);
    }

    if (argLength != maxParams) {
      const remove =
        maxParams - (argLength > minParams ? maxParams - argLength : minParams);
      let correctParams = params;

      for (let i = 0; i < remove; i++) {
        for (let j = correctParams.length - 1; j >= 0; j--) {
          if (params[j]["defaultValue"] !== null) {
            correctParams.splice(j, 1);
            break;
          }
        }
      }

      checkTypes(correctParams, args, at);
    } else {
      checkTypes(params, args, at);
    }
  }
  function checkTypes(params, args, at) {
    for (let i = 0; i < args.length; i++) {
      let param = params[i];
      let arg = args[i];
      if (param.type !== arg.type) {
        const message = `Type mismatch: expected ${param.type}, got ${arg.type}`;
        must(false, message, at);
      }
    }
  }

  function mustBeValidType() {}
  function mustHaveLiteralType() {}
  function mustBeIterable(e, at) {}

  function mustBeAbleToIndex(collection, at) {
    const canIndex =
      collection.type === "string" || collection.type?.kind === "ArrayType";
    const message = `Unable to index ${collection.type}`;
    must(canIndex, message, at);
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

    FuncDec(_key, id, _open, listParams, _close, _arrow, type, block) {
      mustNotAlreadyBeDeclared(id.sourceString, { at: id });
      const fun = core.func(id.sourceString);
      context.add(id.sourceString, fun);
      context = context.newChildContext({ inLoop: false, function: fun });
      fun.params = listParams.children.map((child) => child.rep());
      const paramTypes = fun.params.map((param) => param.type);
      const returnType =
        type.matchLength > 0 ? type.sourceString : core.voidType;
      fun.type = core.functionType(paramTypes, returnType, context.inClass);
      fun.body = block.rep();
      context = context.parent;
      return core.functionDeclaration(fun);
    },

    FuncCall_normal(exp, _open, args, _close) {
      const callee = context.lookup(exp.sourceString);

      console.log(context);
      console.log(callee);

      mustBeCallable(callee, { at: exp });
      const argums = args.children.map((child) => child.rep());
      mustHaveCorrectArgsAndTypes(
        structuredClone(callee["params"]),
        structuredClone(argums),
        { at: args }
      );
      return core.functionCall(callee, argums);
    },

    FuncCall_intrinsic(id, _open, args, _close) {
      const callee = context.lookup(id.sourceString);
      mustBeCallable(callee, { at: id });
      const argums = args.children.map((child) => child.rep());
      return core.functionCall(callee, argums);
    },

    Param_default(id, _colon, exp) {
      mustNotAlreadyBeDeclared(id.sourceString, { at: id });
      const value = exp.rep();
      {
        mustHaveBeenFound(exp.sourceString, { at: exp }) ||
          mustHaveLiteralType(value, { at: exp });
      }
      const param = core.param(id.sourceString, value, value.type);
      context.add(id.sourceString, param);
      return param;
    },

    Param_typedArg(id, type) {
      mustNotAlreadyBeDeclared(id.sourceString, { at: id });
      mustBeValidType(type.sourceString, { at: type });
      const param = core.param(id.sourceString, null, type.sourceString);
      context.add(id.sourceString, param);
      return param;
    },

    ClassDec(_c, id, ClassBlock) {
      const name = id.sourceString;
      mustNotAlreadyBeDeclared(name, { at: id });
      context = context.newChildContext({ inClass: name });
      const [constructor, functions] = ClassBlock.rep();
      context = context.parent;
      return core.classDeclaration(constructor, functions);
    },

    ClassBlock(_open, construct, funs, _close) {
      const constructor = construct.children.map((child) => child.rep());
      const functs = funs.children.map((child) => child.rep());
      return [constructor, functs];
    },

    Constructor(_con, _open, params, _close) {
      const parameters = params.children.map((child) => child.rep());
      const constructor = core.constructorCall(parameters);
      const paramTypes = parameters.map((param) => param.type);
      const type = core.functionType(paramTypes, core.anyType, true);
      const fun = core.func(context.inClass, parameters, [], type);
      context.parent.add(context.inClass, fun);
      return constructor;
    },

    ClassParam_default(id, _colon, exp) {
      const value = exp.rep();
      mustHaveLiteralType(value, { at: exp });
      const name = id.sourceString;
      const param = core.param(name, value, value.type);
      context.add(name, param);
      return param;
    },

    ClassParam_typedArg(id, type) {
      mustBeValidType(type.sourceString, { at: type });
      const name = id.sourceString;
      const param = core.param(name, null, type.sourceString);
      context.add(name, param);
      return param;
    },

    MemberExp(id, _dot, func, _open, exps, _close) {
      let arg = [context.lookup(id)];
      const args = exps.children.map((child) => child.rep());
      arg.push(...args);

      b = core.functionCall(func, arg);
    },

    VarDec(mut, id, _colon, exp) {
      mustNotAlreadyBeDeclared(id.sourceString, { at: id });
      const initializer = exp.rep();
      const mutable = mut.sourceString === "mu";
      const variable = core.variable(
        id.sourceString,
        mutable,
        initializer.type
      );
      context.add(id.sourceString, variable);
      return core.variableDeclaration(variable, initializer);
    },

    Statement_assign(variable, _colon, exp) {
      const source = exp.rep();
      const target = variable.rep();
      mustBeMutable(target, { at: variable });
      mustBeAssignable(source, { toType: target.type }, { at: variable });
      return core.assignment(target, source);
    },

    Statement_break(breakKeyword) {
      mustBeInLoop({ at: breakKeyword });
      return core.breakStatement;
    },

    Statement_return(ret, exp) {
      mustBeInAFunction({ at: ret });
      // mustReturnSomething(context.function, { at: ret });
      const returnExp = exp.rep();
      // mustBeReturnable(returnExp, { from: context.function }, { at: exp });
      return core.returnStatement(returnExp);
    },

    LoopStmt_for(_l, id, exp, block) {
      const collection = exp.rep();
      mustBeIterable(exp, { at: exp });
      const iterator = core.variable(id.sourceString, false, core.intType);
      context = context.newChildContext({ inLoop: true });
      context.add(id.sourceString, iterator);
      const body = block.rep();
      context.parent;
      return core.forStatement(iterator, collection, body);
    },

    LoopStmt_while(_l, test, block) {
      const testCond = test.rep();
      context = context.newChildContext({ inLoop: true });
      const body = block.rep();
      context = context.parent;
      return core.whileStatement(testCond, body);
    },

    PatternExp_basicFor(_in, value) {
      //integer types need to be fixed
      const typeNode = value.ctorName;
      if (typeNode === "numLit_int") {
        return core.range(BigInt(0), value.rep(), "+", BigInt(1));
      } else if (typeNode === "RangeExp") {
        return value.rep();
      } else if (typeNode === "id") {
        const collection = context.lookup(value.sourceString);
        mustBeIterable(collection, { at: value });
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
        if (node.children.length === 2) {
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

    Exp2_test(cond, logic, cond1) {
      const [left, op, right] = [cond.rep(), logic.sourceString, cond1.rep()];
      if (["<", "<=", ">", ">="].includes(op)) {
        mustHaveNumericOrStringType(left, { at: cond });
      }
      mustBothHaveTheSameType(left, right, { at: logic });
      return core.binary(op, left, right, core.booleanType);
    },

    Exp3_add(exp1, addOp, exp2) {
      const [left, op, right] = [exp1.rep(), addOp.sourceString, exp2.rep()];
      if (op === "+") {
        mustHaveNumericOrStringType(left, { at: exp1 });
      } else {
        mustHaveNumericType(left, { at: exp1 });
      }
      mustHaveNumericOrStringType(right, { at: exp2 });
      return core.binary(op, left, right, left.type);
    },

    Exp4_mul(exp1, mulOp, exp2) {
      const [left, op, right] = [exp1.rep(), mulOp.sourceString, exp2.rep()];
      mustHaveNumericType(left, { at: exp1 });
      mustHaveNumericType(right, { at: exp2 });
      return core.binary(op, left, right, left.type);
    },

    Exp5_exp(exp1, powerOp, exp2) {
      const [left, op, right] = [exp1.rep(), powerOp.sourceString, exp2.rep()];
      mustHaveNumericType(left, { at: exp1 });
      mustHaveNumericType(right, { at: exp2 });
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
        const type = operand.type;
        return core.unary(op, operand, type);
      }
    },

    Exp6_id(id) {
      const entity = context.lookup(id.sourceString);
      mustHaveBeenFound(entity, id.sourceString, { at: id });
      return entity;
    },

    Exp6_indexing(id, i) {
      const array = context.lookup(id.sourceString);
      const index = i.children.map((child) => child.rep());
      mustBeAbleToIndex(array, { at: id });
      return core.arrayIndex(array, index);
    },

    Exp6_parens(_open, exp, _close) {
      return exp.rep();
    },

    arrayIndex_singleIndex(_open, num, _close) {
      return BigInt(num.sourceString);
    },

    arrayIndex_multipleElems(_open, left, _colons, right, _close) {
      return core.range(left.rep(), right.rep(), "+", BigInt(1));
    },

    Block(_open, statements, _close) {
      return statements.children.map((s) => s.rep());
    },

    ArrayLiteral(_open, exps, _close) {
      const elements = exps.children.map((child) => child.rep());
      return core.arrayExpression(elements);
    },

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
