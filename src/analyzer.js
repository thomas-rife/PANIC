// The semantic analyzer exports a single function, analyze(match), that
// accepts a grammar match object (the CST) from Ohm and produces the
// internal representation of the program (pretty close to what is usually
// called the AST). This representation also includes entities from the
// standard library, as needed.
import * as core from "./core.js";

class Context {
  constructor({
    parent = null,
    locals = new Map(),
    inLoop = false,
    function: f = null,
    class: c = null,
  }) {
    Object.assign(this, { parent, locals, inLoop, function: f, class: c });
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
  let context = Context.root();

  function check(condition, message, errorLocation) {
    if (!condition) {
      const prefix = errorLocation.at.source.getLineAndColumnMessage();
      throw new Error(`${prefix}${message}`);
    }
  }

  function checkNotAlreadyDeclared(id, at) {
    const message = `Already declared ${id}.`;
    check(!context.lookup(id), message, at);
  }

  function checkAllTheSameType(elems, at) {
    let elements = [...elems];
    if (elements.length > 1) {
      const first = elements.splice(0, 1)[0];
      for (let elem of elements) {
        check(
          getType(elem) === getType(first),
          `Must have the same type, got ${elem?.type} expected ${getType(
            first
          )}.`,
          at
        );
      }
    }
  }

  function checkExists(id, name, at) {
    const message = `Unable to find ${name}.`;
    check(id, message, at);
  }

  function checkHasIntegerType(exp, at) {
    const message = "Must have type integer";
    check(getType(exp) === "int", message, at);
  }

  function checkHasBooleanType(exp, at) {
    const message = "Must have type boolean";
    check(getType(exp) === "boolean", message, at);
  }

  function checkHasStringType(exp, at) {
    const message = "Must have type string";
    check(getType(exp) === "string", message, at);
  }

  function checkHasIntOrFloatType(exp, at) {
    const message = "Must have type integer or float";
    check(getType(exp) === "int" || getType(exp) === "float", message, at);
  }

  function checkHasStringOrIntOrFloatType(exp, at) {
    const message = "Must have type string, integer or float";
    check(
      getType(exp) === "int" ||
        getType(exp) === "float" ||
        getType(exp) === "string",
      message,
      at
    );
  }

  function checkHasArrayType(exp, at) {
    const message = "Must have type array";
    const type = getType(exp);
    const arrayType = type.substring(type.length - 2) === "[]";
    check(arrayType, message, at);
  }

  function checkNumIndices(arrayType, numIdx, at) {
    let idxNum = arrayType.length - 2;
    for (let i = 0; i < numIdx; i++) {
      const message = `Unable to index ${numIdx}th dimension of array with type ${arrayType}.`;
      check(arrayType.substring(idxNum, idxNum + 2) === "[]", message, at);
      idxNum -= 2;
    }
  }

  function checkIsMutable(variable, name, at) {
    const message = `${name} is not mutable`;
    check(variable?.mutable || variable?.array?.mutable, message, at);
  }

  function checkIsVariableOrArrayIndex(variable, name, at) {
    const message = `Cannot assign to non-variable ${name}.`;
    check(
      variable.kind === "Variable" || variable.kind === "ArrayIndexing",
      message,
      at
    );
  }

  function checkIfValidAssign(source, target, at) {
    const sourceType = getType(source);
    const message = `Cannot assign type ${sourceType} to ${target}`;
    check(sourceType === target, message, at);
  }

  function checkIsIterable(collection, name, at) {
    const message = `Cannot iterate through ${name}.`;
    let correct =
      ["string", "int"].includes(getType(collection)) ||
      getType(collection).includes("[]");
    check(correct, message, at);
  }

  function checkInLoop(at) {
    const message = "Must be in a loop.";
    check(context.inLoop, message, at);
  }

  function checkValidTypeName(type, at) {
    const message = `Not a valid type ${type}`;
    const trimmedType = type.replace(/\[\]/g, "");
    const rootContext = getRootContext(context);
    const valid = rootContext.locals.get("types").includes(trimmedType);
    check(valid, message, at);
  }

  function getRootContext(context) {
    if (context.parent === null) {
      return context;
    }
    return getRootContext(context.parent);
  }

  function checkIfInFunction(at) {
    const message = "Must be in a function.";
    check(context.function, message, at);
  }

  function checkIfAbleToReturn(func, returnExp, at) {
    const returnType = getType(func);
    if (returnType === core.voidType) {
      const message = "Unable to return a value from a void function.";
      check(!returnExp, message, at);
    } else {
      const returnExpType = getType(returnExp);
      const message = `Unable to return ${returnExpType} from function marked to return ${returnType}.`;
      check(returnType === returnExpType, message, at);
    }
  }

  function checkFunctionArgsMatch(callee, argList, at) {
    if (["printLine", "print"].includes(callee.name)) {
      return;
    }
    const params = structuredClone(callee.params);
    const args = structuredClone(argList);
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
      check(false, message, at);
    }
    if (argLength != maxParams) {
      const remove = maxParams - minParams;
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

  function checkIsCallable(callee, name, at) {
    checkExists(callee, name, at);
    check(callee.kind === "Function", `Cannot call non-function ${name}`, at);
  }

  function getType(exp) {
    return exp?.type;
  }

  function getBaseType(exp) {
    const type = getType(exp);
    if (type === "string" || type === "int") {
      return type;
    } else if (type.substring(type.length - 2) === "[]") {
      return type.replace(/\[\]/, "");
    }
  }

  function checkTypes(params, args, at) {
    for (let i = 0; i < args.length; i++) {
      let param = params[i];
      let arg = args[i];
      if (param.type !== arg.type) {
        const message = `Types do not match, expected ${param.type}, got ${arg.type}`;
        check(false, message, at);
      }
    }
  }

  function checkClassHasMethod(member, methodName, at) {
    const memberType = getType(member);
    const message = `Type ${memberType} does not have method ${methodName}`;
    const classDef = context.lookup(`CLASS_${memberType}`);
    const classMethods = classDef.methods;
    let methodFound = false;
    for (let method of classMethods) {
      if (method.fun.name === methodName) {
        return method.fun;
      }
    }
    check(methodFound, message, at);
  }

  function checkForUniqueNames(params, at) {
    const before = params.length;
    const uniqueNames = new Set();
    for (let param of params) {
      uniqueNames.add(param.id);
    }
    check(before === uniqueNames.size, "Param names must be unique.", at);
  }

  const builder = match.matcher.grammar.createSemantics().addOperation("rep", {
    Program(statements) {
      return core.program(statements.children.map((s) => s.rep()));
    },

    MemberExp(id, _dot, func, _open, exps, _close) {
      const member = context.lookup(id.sourceString);
      checkExists(member, id.sourceString, { at: id });
      const methodName = func.sourceString;
      const method = checkClassHasMethod(member, methodName, { at: func });
      const args = exps.children.map((child) => child.rep());
      checkFunctionArgsMatch(method, args, { at: exps });
      return core.methodCall(methodName, member, args, getType(method));
    },

    ClassDec(_c, id, ClassBlock) {
      const name = id.sourceString;
      checkNotAlreadyDeclared(name, { at: id });
      context = context.newChildContext({ class: name });
      const [constructor, functions] = ClassBlock.rep();
      context = context.parent;
      getRootContext(context).locals.get("types").push(name);
      const classDec = core.classDeclaration(constructor, functions);
      context.add(`CLASS_${name}`, classDec);
      return classDec;
    },

    ClassBlock(_open, construct, funcs, _close) {
      const constructor = [construct.rep()];
      const functions = funcs.children.map((child) => child.rep());
      return [constructor, functions];
    },

    Constructor(_con, _open, params, _close) {
      const parameters = params.children.map((child) => child.rep());
      const constructor = core.constructorCall(parameters);
      const type = context.class;
      const fun = core.func(context.class, parameters, [], type);
      context.parent.add(context.class, fun);
      return constructor;
    },

    ClassParam_default(id, _colon, exp) {
      const value = exp.rep();
      const name = id.sourceString;
      const param = core.param(name, value, value.type);
      context.add(name, param);
      return param;
    },

    ClassParam_typedArg(id, type) {
      checkValidTypeName(type.sourceString, { at: type });
      const name = id.sourceString;
      const param = core.param(name, null, type.sourceString);
      context.add(name, param);
      return param;
    },

    FuncCall_normal(exp, _open, args, _close) {
      const callee = context.lookup(exp.sourceString);
      checkIsCallable(callee, exp.sourceString, { at: exp });
      const argList = args.children.map((child) => child.rep());
      checkFunctionArgsMatch(callee, argList, { at: args });
      const type = getType(callee);
      return core.functionCall(callee, argList, type);
    },

    FuncCall_intrinsic(id, _open, args, _close) {
      const callee = context.lookup(id.sourceString);
      const argList = args.children.map((child) => child.rep());
      const type = getType(callee);
      checkFunctionArgsMatch(callee, argList, { at: args });
      return core.functionCall(callee, argList, type);
    },

    Statement_return(ret, exp) {
      checkIfInFunction({ at: ret });
      const returnExp = exp.children[0]?.rep();
      checkIfAbleToReturn(context.function, returnExp, { at: ret });
      return core.returnStatement(returnExp);
    },

    Param_default(id, _colon, exp) {
      checkExists(id.sourceString, { at: id });
      const value = exp.rep();
      const param = core.param(id.sourceString, value, value.type);
      context.add(id.sourceString, param);
      return param;
    },

    Param_typedArg(id, type) {
      const [name, paramType] = [id.sourceString, type.sourceString];
      checkExists(name, { at: id });
      checkValidTypeName(paramType, { at: type });
      const param = core.param(name, null, paramType);
      context.add(name, param);
      return param;
    },

    FuncDec(_key, id, _open, listParams, _close, _arrow, type, block) {
      checkNotAlreadyDeclared(id.sourceString, { at: id });
      const fun = core.func(id.sourceString);
      context.add(id.sourceString, fun);
      context = context.newChildContext({ inLoop: false, function: fun });
      fun.params = listParams.children.map((child) => child.rep());
      checkForUniqueNames(fun.params, { at: listParams });
      const returnType = type.children[0]?.sourceString ?? core.voidType;
      checkValidTypeName(returnType, { at: type });
      fun.type = returnType;
      fun.body = block.rep();
      context = context.parent;
      return core.functionDeclaration(fun);
    },

    Statement_break(breakStmt) {
      checkInLoop({ at: breakStmt });
      return core.breakStatement;
    },

    LoopStmt_for(_l, id, exp, block) {
      checkNotAlreadyDeclared(id.sourceString, { at: id });
      const collection = exp.rep();
      const iterator = core.variable(
        id.sourceString,
        true,
        getBaseType(collection)
      );
      context = context.newChildContext({ inLoop: true });
      context.add(id.sourceString, iterator);
      const body = block.rep();
      context = context.parent;
      return core.forStatement(iterator, collection, body);
    },

    LoopStmt_while(_l, test, block) {
      const testCond = test.rep();
      context = context.newChildContext({ inLoop: true });
      const body = block.rep();
      context = context.parent;
      return core.whileStatement(testCond, body);
    },

    PatternExp_id(_in, value) {
      const variable = context.lookup(value.sourceString);
      checkExists(variable);
      checkIsIterable(variable, value.sourceString, { at: value });
      return variable;
    },

    PatternExp_literal(_in, literal) {
      const lit = literal.rep();
      checkIsIterable(lit, literal.sourceString, { at: literal });
      return lit;
    },

    RangeExp(_open, range, _comma, sign, number, _close) {
      let start = undefined;
      let end = undefined;
      if (range.children[2]._node.ruleName === "id") {
        end = context.lookup(range.children[2].sourceString);
        checkExists(end, range.children[2].sourceString, {
          at: range.children[2],
        });
      } else {
        end = range.children[2].rep();
      }
      if (range.children[0]._node.ruleName === "id") {
        start = context.lookup(range.children[0].sourceString);
        checkExists(start, range.children[0].sourceString, {
          at: range.children[0],
        });
      } else {
        start = range.children[0].rep();
      }

      const num = number.children[0]?.sourceString;
      const op = sign.children[0]?.sourceString;
      [start, end, num].every((x) => checkHasIntOrFloatType(x, { at: x }));
      let incrementBy = undefined;

      if (num) {
        if (num.includes(".")) {
          incrementBy = Number(num);
        } else {
          incrementBy = BigInt(num);
        }
      } else {
        incrementBy = BigInt(1);
      }
      let type = undefined;
      if (
        getType(incrementBy) === "float" ||
        getType(start) === "float" ||
        getType(end) === "float"
      ) {
        type = `${core.floatType}[]`;
      } else {
        type = `${core.intType}[]`;
      }
      return core.range(start, end, op ? op : "+", incrementBy, type);
    },

    IfStmt(ifStmt, elif, otherwise) {
      const ifPart = handleIf(ifStmt);
      function handleIf(node) {
        const condition = node.children[1];
        const block = node.children[2];
        const test = condition.rep();
        checkHasBooleanType(test, { at: condition });
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
        checkHasBooleanType(test, { at: condition });
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

    VarDec(mut, id, _colon, exp) {
      checkNotAlreadyDeclared(id.sourceString, { at: id });
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
      checkIsVariableOrArrayIndex(target, variable.sourceString, {
        at: variable,
      });
      checkIsMutable(target, variable.sourceString, { at: variable });
      checkIfValidAssign(source, target.type, { at: variable });
      return core.assignment(target, source);
    },

    Exp_conditional(exp, _q, exp1, colon, exp2) {
      const test = exp.rep();
      checkHasBooleanType(test, { at: exp });
      const [consequent, otherwise] = [exp1.rep(), exp2.rep()];
      checkAllTheSameType([consequent, otherwise], { at: colon });
      const other = core.elseStmt(otherwise);
      return core.ifStatement(test, consequent, null, other);
    },

    Exp1_or(exp, _or, exp1) {
      let left = exp.rep();
      checkHasBooleanType(left, { at: exp });
      for (let e of exp1.children) {
        let right = e.rep();
        checkHasBooleanType(right, { at: e });
        left = core.binary("||", left, right, core.booleanType);
      }
      return left;
    },

    Exp1_and(exp, _and, exp1) {
      let left = exp.rep();
      checkHasBooleanType(left, { at: exp });
      for (let e of exp1.children) {
        let right = e.rep();
        checkHasBooleanType(right, { at: e });
        left = core.binary("&&", left, right, core.booleanType);
      }
      return left;
    },

    Exp2_test(cond, logic, cond1) {
      const [left, op, right] = [cond.rep(), logic.sourceString, cond1.rep()];
      if (["<", "<=", ">", ">="].includes(op)) {
        checkHasStringOrIntOrFloatType(left, { at: cond });
      }
      checkAllTheSameType([left, right], { at: logic });
      return core.binary(op, left, right, core.booleanType);
    },

    Exp3_add(exp1, addOp, exp2) {
      const [left, op, right] = [exp1.rep(), addOp.sourceString, exp2.rep()];
      if (op === "+") {
        checkHasStringOrIntOrFloatType(left, { at: exp1 });
      } else {
        checkHasIntOrFloatType(left, { at: exp1 });
      }
      if (getType(left) === "string") {
        checkHasStringType(right, { at: exp2 });
      } else {
        checkHasIntOrFloatType(right, { at: exp2 });
      }
      return core.binary(op, left, right, getType(left));
    },

    Exp4_mul(exp1, mulOp, exp2) {
      const [left, op, right] = [exp1.rep(), mulOp.sourceString, exp2.rep()];
      checkHasStringOrIntOrFloatType(left, { at: exp1 });
      if (getType(left) === "string") {
        checkHasIntegerType(right, { at: exp2 });
      } else {
        checkHasIntOrFloatType(right, { at: exp2 });
      }
      return core.binary(op, left, right, getType(left));
    },

    Exp5_exp(exp1, powerOp, exp2) {
      const [left, op, right] = [exp1.rep(), powerOp.sourceString, exp2.rep()];
      checkHasIntOrFloatType(left, { at: exp1 });
      checkHasIntOrFloatType(right, { at: exp2 });
      return core.binary(op, left, right, getType(left));
    },

    Exp5_unary(opSign, exp) {
      const [op, operand] = [opSign.sourceString, exp.rep()];
      if (op === "!") {
        checkHasBooleanType(operand, { at: exp });
        return core.unary(op, operand, core.booleanType);
      } else if (op === "-") {
        checkHasIntOrFloatType(operand, { at: exp });
        const type = operand.type;
        return core.unary(op, operand, type);
      }
    },

    Exp6_id(id) {
      const entity = context.lookup(id.sourceString);
      checkExists(entity, id.sourceString, { at: id });
      return entity;
    },

    Exp6_indexing(id, index) {
      const array = context.lookup(id.sourceString);
      checkExists(array, id.sourceString, { at: id });
      checkHasArrayType(array, { at: id });
      let indices = index.children.map((child) => child.rep());

      for (let i = 0; i < indices.length; i++) {
        let idx = indices[i];

        if (Array.isArray(idx)) {
          if (Array.isArray(idx[0]) && idx[0].length === 0) {
            idx[0] = 0n;
          }
          if (Array.isArray(idx[1]) && idx[1].length === 0) {
            idx[1] = undefined;
          }
          indices[i] = core.range(idx[0], idx[1], idx[2], idx[3], core.intType);
        }
      }

      checkNumIndices(array.type, indices.length, { at: index });
      let type = array.type;
      for (let slice of indices) {
        if (slice.kind !== "Range") {
          type = type.substring(0, type.length - 2);
        }
      }
      return core.arrayIndex(array, indices, type);
    },

    Exp6_parens(_open, exp, _close) {
      return exp.rep();
    },

    arrayIndex_singleIndex(_open, num, _close) {
      const number = num.rep();
      checkHasIntegerType(number);
      return number;
    },

    arrayIndex_slice(_open, left, _colons, right, _close) {
      let start = left.children.map((child) => child.rep());
      const end = right.children.map((child) => child.rep());
      return [start, end, "+", BigInt(1)];
    },

    ArrayLiteral(_open, exps, _close) {
      const elements = exps.children.map((child) => child.rep());
      checkAllTheSameType(elements, { at: exps });
      const type = `${getType(elements[0])}[]`;
      const array =
        elements.length > 0 ? core.array(elements, type) : core.emptyArray();
      return array;
    },

    Block(_open, statements, _close) {
      return statements.children.map((s) => s.rep());
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
