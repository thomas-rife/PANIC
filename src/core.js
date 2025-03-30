export function program(statements) {
  return { kind: "Program", statements };
}

export function variableDeclaration(variable, initializer) {
  return { kind: "VariableDeclaration", variable, initializer };
}

export function variable(name, mutable, type) {
  return { kind: "Variable", name, mutable, type };
}

export const booleanType = "boolean";
export const intType = "int";
export const floatType = "float";
export const stringType = "string";
export const voidType = "void";
export const anyType = "any";
export const objectType = "object";

export function intrinsicFunction(name, type) {
  return { kind: "Function", name, type, intrinsic: true };
}

export function functionDeclaration(fun) {
  return { kind: "FunctionDeclaration", fun };
}

export function func(name, params, body, type) {
  return { kind: "Function", name, params, body, type };
}

export function arrayType(baseType) {
  return { kind: "ArrayType", baseType };
}

export function functionType(paramTypes, returnType, classMethod = false) {
  return { kind: "FunctionType", paramTypes, returnType, classMethod };
}

export function param(id, defaultValue, type) {
  return { kind: "Parameter", id, defaultValue, type };
}

export function assignment(target, source) {
  return { kind: "Assignment", target, source };
}

export const breakStatement = { kind: "BreakStatement" };

export function returnStatement(expression) {
  return { kind: "ReturnStatement", expression };
}

export function ifStatement(test, consequent, elseif, otherwise) {
  return { kind: "IfStatement", test, consequent, elseif, otherwise };
}

export function elifStmt(test, consequent) {
  return { kind: "ElseIF", test, consequent };
}

export function elseStmt(consequent) {
  return { kind: "Else", consequent };
}

export function whileStatement(test, body) {
  return { kind: "WhileStatement", test, body };
}

export function forStatement(iterator, collection, body) {
  return { kind: "ForStatement", iterator, collection, body };
}

export function binary(op, left, right, type) {
  return { kind: "BinaryExpression", op, left, right, type };
}

export function unary(op, operand, type) {
  return { kind: "UnaryExpression", op, operand, type };
}

export function range(start, end, op, value) {
  return { kind: "Range", start, end, op, value, type: start.type };
}

export function arrayExpression(elements) {
  return {
    kind: "ArrayExpression",
    elements,
    type: arrayType(elements[0].type),
  };
}

export function emptyArray(type) {
  return { kind: "EmptyArray", type };
}

export function arrayIndex(array, index) {
  return { kind: "ArrayIndexing", array, index, type: array.type };
}

export function memberExpression(object, op, field) {
  return { kind: "MemberExpression", object, op, field, type: field.type };
}

export function functionCall(callee, args) {
  if (callee.intrinsic) {
    if (callee.type.returnType === voidType) {
      return {
        kind: callee.name.replace(/^\p{L}/u, (c) => c.toUpperCase()),
        args,
      };
    } else if (callee.type.paramTypes.length === 1) {
      return unary(callee.name, args[0], callee.type.returnType);
    } else {
      return binary(callee.name, args[0], args[1], callee.type.returnType);
    }
  }
  return { kind: "FunctionCall", callee, args, type: callee.type.returnType };
}

export function classDeclaration(constructor, methods) {
  return { kind: "ClassDeclaration", constructor, methods };
}

export function constructorCall(args) {
  return { kind: "ConstructorCall", args };
}

// These local constants are used to simplify the standard library definitions.
const floatToFloatType = functionType([floatType], floatType);
const floatFloatToFloatType = functionType([floatType, floatType], floatType);
const stringToIntsType = functionType([stringType], arrayType(intType));
const anyToVoidType = functionType([anyType], voidType);

export const standardLibrary = Object.freeze({
  int: intType,
  float: floatType,
  boolean: booleanType,
  string: stringType,
  void: voidType,
  any: anyType,
  object: objectType,
  print: intrinsicFunction("print", anyToVoidType),
  p: intrinsicFunction("print", anyToVoidType),
  pl: intrinsicFunction("printLine", anyToVoidType),

  // sqrt: intrinsicFunction("sqrt", floatToFloatType),
  // sin: intrinsicFunction("sin", floatToFloatType),
  // cos: intrinsicFunction("cos", floatToFloatType),
  // exp: intrinsicFunction("exp", floatToFloatType),
  // ln: intrinsicFunction("ln", floatToFloatType),
  // hypot: intrinsicFunction("hypot", floatFloatToFloatType),
  // bytes: intrinsicFunction("bytes", stringToIntsType),
  // codepoints: intrinsicFunction("codepoints", stringToIntsType),
});

// We want every expression to have a type property. But we aren't creating
// special entities for numbers, strings, and booleans; instead, we are
// just using JavaScript values for those. Fortunately we can monkey patch
// the JS classes for these to give us what we want.
String.prototype.type = stringType;
Number.prototype.type = floatType;
BigInt.prototype.type = intType;
Boolean.prototype.type = booleanType;
