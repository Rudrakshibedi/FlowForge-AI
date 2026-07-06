"""MCP tool: Calculator.

Safely evaluates arithmetic expressions using Python's `ast` module
(no `eval`) to avoid arbitrary code execution.
"""
from __future__ import annotations

import ast
import operator

_ALLOWED_OPERATORS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.Pow: operator.pow,
    ast.Mod: operator.mod,
    ast.USub: operator.neg,
    ast.UAdd: operator.pos,
}


def _eval_node(node: ast.AST):
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
        return node.value
    if isinstance(node, ast.BinOp) and type(node.op) in _ALLOWED_OPERATORS:
        return _ALLOWED_OPERATORS[type(node.op)](_eval_node(node.left), _eval_node(node.right))
    if isinstance(node, ast.UnaryOp) and type(node.op) in _ALLOWED_OPERATORS:
        return _ALLOWED_OPERATORS[type(node.op)](_eval_node(node.operand))
    raise ValueError("Unsupported or unsafe expression")


def calculator(expression: str) -> dict:
    try:
        tree = ast.parse(expression, mode="eval")
        result = _eval_node(tree.body)
        return {"success": True, "expression": expression, "result": result}
    except Exception as exc:  # noqa: BLE001
        return {"success": False, "error": f"Invalid expression: {exc}"}
