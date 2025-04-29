import * as core from "./core.js"

export default function optimize(node) {
  return optimizers?.[node.kind]?.(node) ?? node;
}

const optimizers = {
  Program(p) {
    p.statements = p.statements.flatMap(optimize)
    return p
  },
  VariableDeclaration(d) {
    d.variable = optimize(d.variable)
    d.initializer = optimize(d.initializer)
    return d
  },

  TypeDeclaration(d) {
    d.type = optimize(d.type)
    return d
  },
  FunctionDeclaration(d) {
    d.fun = optimize(d.fun)
    return d
  },

}
