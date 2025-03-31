export const booleanType = "boolean";
export const intType = "int";
export const floatType = "float";
export const stringType = "string";
export const voidType = "void";
export const anyType = "any";

export const standardLibrary = Object.freeze({
  types: [booleanType, intType, floatType, stringType, voidType, anyType],
  print: func("print", undefined, undefined, voidType),
  p: func("print", undefined, undefined, voidType),
  pl: func("printLine", undefined, undefined, voidType),
});

String.prototype.type = stringType;
Number.prototype.type = floatType;
BigInt.prototype.type = intType;
Boolean.prototype.type = booleanType;

export function program(statements) {
  return { kind: "Program", statements };
}

export function array(elements, type) {
  return {
    kind: "Array",
    elements,
    type: type,
  };
}

export function arrayIndex(array, index, type) {
  return { kind: "ArrayIndexing", array, index, type: type };
}

export function emptyArray() {
  return { kind: "EmptyArray", type: anyType };
}

export function variableDeclaration(variable, initializer) {
  return { kind: "VariableDeclaration", variable, initializer };
}

export function variable(name, mutable, type) {
  return { kind: "Variable", name, mutable, type };
}
export function assignment(target, source) {
  return { kind: "Assignment", target, source };
}

export function range(start, end, op, value, type) {
  return { kind: "Range", start, end, op, value, type };
}

export function unary(op, operand, type) {
  return { kind: "UnaryExpression", op, operand, type };
}

export function binary(op, left, right, type) {
  return { kind: "BinaryExpression", op, left, right, type };
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

export const breakStatement = { kind: "BreakStatement" };

export function functionDeclaration(fun) {
  return { kind: "FunctionDeclaration", fun };
}

export function func(name, params, body, type) {
  return {
    kind: "Function",
    name,
    params,
    body,
    type,
  };
}

export function param(id, defaultValue, type) {
  return { kind: "Parameter", id, defaultValue, type };
}

export function returnStatement(expression) {
  return { kind: "ReturnStatement", expression };
}

export function functionCall(callee, args, type) {
  return { kind: "FunctionCall", callee, args, type };
}

export function classDeclaration(constructor, methods) {
  return { kind: "ClassDeclaration", constructor, methods };
}

export function constructorCall(args) {
  return { kind: "ConstructorCall", args };
}

export function methodCall(methodName, object, args, type) {
  return { kind: "MethodCall", methodName, object, args, type };
}
