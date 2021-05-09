import { LitteralNode, OptionalNode, OrNode, RangeNode, RegexNode, RepetitionNode, SeqNode, ZeroOrMoreNode } from "../../src/RegexNodes";

const specials = ".?*+|()";
var letters = "";
const nonDot = "\r\n"

for (var c = 0; c < 128; c++) {
    const cs = String.fromCharCode(c);
    if (!nonDot.includes(cs)) {
        letters += cs;
    }
}

const priority: Map<string, number> = new Map([
    ["(", 3],
    ["*", 4],
    ["+", 4],
    ["?", 4],
    [".", 5],
    ["|", 7],
]);

function getPrio(c: string): number {
    if (priority.has(c)) {
        return priority.get(c)!;
    }
    throw Error(`Unknown operation ${c}`);
}

export function pop(nodes: RegexNode[], opStack: string[]) {
    const c = opStack.pop()!;
    if (c === '.') {
        const rhs = nodes.pop()!;
        const lhs = nodes.pop()!;
        nodes.push(new SeqNode(lhs, rhs));
    } else if (c === '?') {
        nodes.push(new OptionalNode(nodes.pop()!));
    } else if (c === '*') {
        nodes.push(new ZeroOrMoreNode(nodes.pop()!));
    } else if (c === '+') {
        nodes.push(new RepetitionNode(nodes.pop()!));
    } else if (c === '|') {
        const rhs = nodes.pop()!;
        const lhs = nodes.pop()!;
        nodes.push(new OrNode(lhs, rhs));
    } else {
        throw Error(`Unknwon operator ${c}`);
    }
}

function push(c: string, node: RegexNode | null, nodes: RegexNode[], opStack: string[]) {
    while (opStack.length !== 0 && opStack[opStack.length - 1] !== '('
        && getPrio(opStack[opStack.length - 1]) <= getPrio(c)) {
        pop(nodes, opStack);
    }
    if (node !== null) {
        nodes.push(node);
    }
    opStack.push(c);
}

export function handleSpecialChar(c: string, nodes: RegexNode[], opStack: string[]) {
    if (c === ')') {
        while (opStack[opStack.length - 1] !== '(') {
            pop(nodes, opStack);
        }
        opStack.pop();
    } else {
        var node: RegexNode | null = null;
        if (c === '.') {
            node = new RangeNode(letters);
        }
        if (c === '|') {
            node = new LitteralNode("");
        }
        push(c, node, nodes, opStack);
    }
}

export function handleChar(c: string, nodes: RegexNode[], opStack: string[]) {
    push('.', new LitteralNode(c), nodes, opStack);
}

export function unEscape(c: string) {
    if (c[1] == 'n') {
        return '\n';
    }
    if (c[1] == 'r') {
        return '\r';
    }
    return c[1];
}