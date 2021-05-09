// This file is part of the bootstrapping.
// Especially, it is the first step of the lexer generator's bootstrap.
// As such, its lexer should not be generated, but instead parsed by hand.
// Syntax of the lexed files:
// name1=>Regex
// >state
// name1=>Regex

import fs = require('fs');
import { EOF } from "../../src/Automaton";
import { Matcher } from "../../src/Matcher";
import { LexerGenerator } from "../../src/LexerGenerator";
import { getBytes, getString, LitteralNode, OptionalNode, OrNode, RangeNode, RegexNode, RepetitionNode, SeqNode, ZeroOrMoreNode } from "../../src/RegexNodes";

const matcher = new Matcher();
const special = "\\\n\r.?()|*+=>";
var letters = "";
for (var x = 0; x < 128; x++) {
    const str = getString([x]);
    if (!special.includes(str)) {
        letters += str;
    }
}
const separator = "=>";

matcher.registerRule("escape", new SeqNode(new LitteralNode("\\"), new RangeNode(letters + special)));
matcher.registerRule("separator", new LitteralNode(separator));
matcher.registerRule("newline", new SeqNode(new OptionalNode(new LitteralNode("\r")), new LitteralNode("\n")));
matcher.registerRule("normal", new RepetitionNode(new RangeNode(letters)));
matcher.registerRule("equal", new LitteralNode("="));
matcher.registerRule("special", new RangeNode(special));

const outputLexer = new Matcher();
enum State {
    Initial,
    NameAcquired,
    DefinitionOngoing
};
var curState: State = State.Initial;
var curName = "";
var nodes: RegexNode[] = [new LitteralNode("")];
var opStack: string[] = [];
const applyOp = (op) => {
    if (op === "|") {
        const right = nodes.pop()!;
        const left = nodes.pop()!;
        nodes.push(new OrNode(left, right));
    } else if (op === '(') {
        opStack.push(' ');
    } else if (op === ' ') {
        const right = nodes.pop()!;
        const left = nodes.pop()!;
        nodes.push(new SeqNode(left, right));
    }
}

var pos = 0;
var bytes = getBytes(fs.readFileSync("./bootstrap/stage2/stage2.l").toString());
var eof = false;
while (!eof) {
    var res = matcher.match(bytes, pos);
    if (res === undefined) {
        console.log("Error");
        break;
    } else if (res instanceof EOF) {
        eof = true;
        res = ["newline", getBytes("\n"), 0];
    }
    switch (curState) {
        case State.Initial: {
            if (res[0] !== "newline" && res[0] !== "normal") {
                throw Error(`Unexpected ${res[0]} at beginning of line.`);
            }
            if (res[0] === "normal") {
                curName = getString(res[1])
                curState = State.NameAcquired;
            }
            break;
        }
        case State.NameAcquired: {
            if (res[0] !== "separator") {
                throw Error("Expected =>");
            }
            curState = State.DefinitionOngoing;
            break;
        }
        case State.DefinitionOngoing: {
            if (res[0] === "newline") {
                while (nodes.length !== 1) {
                    applyOp(opStack.pop());
                }
                console.log(`Registering rule ${curName} with content ${nodes[0].toString()}`);
                outputLexer.registerRule(curName, nodes[0]);
                nodes = [new LitteralNode("")];
                curState = State.Initial;
            } else if (res[0] === "normal" || res[0] === "equal" || res[0] == "separator") {
                nodes.push(new SeqNode(nodes.pop()!, new LitteralNode(getString(res[1]))));
            } else if (res[0] === "escape") {
                if (getString(res[1]) === "\\r") {
                    nodes.push(new SeqNode(nodes.pop()!, new LitteralNode("\r")));
                } else if (getString(res[1]) === "\\n") {
                    nodes.push(new SeqNode(nodes.pop()!, new LitteralNode("\n")));
                } else {
                    nodes.push(new SeqNode(nodes.pop()!, new LitteralNode(getString(res[1])[1])));
                }
            } else {
                if (getString(res[1]) === '.') {
                    nodes.push(new SeqNode(nodes.pop()!, new RangeNode(letters)));
                } else if (getString(res[1]) === '?') {
                    nodes.push(new OptionalNode(nodes.pop()!));
                } else if (getString(res[1]) === '*') {
                    nodes.push(new ZeroOrMoreNode(nodes.pop()!));
                } else if (getString(res[1]) === '+') {
                    nodes.push(new RepetitionNode(nodes.pop()!));
                } else if (getString(res[1]) === '=' || getString(res[1]) === '>') {
                    nodes.push(new SeqNode(nodes.pop()!, new LitteralNode(getString(res[1]))));
                } else if (getString(res[1]) === '|') {
                    nodes.push(new LitteralNode(""));
                    opStack.push('|');
                } else if (getString(res[1]) === '(') {
                    nodes.push(new LitteralNode(""));
                    opStack.push('(');
                } else if (getString(res[1]) === ')') {
                    var op = opStack.pop();
                    while (op !== '(' && op !== undefined) {
                        applyOp(op);
                        op = opStack.pop();
                    }
                    if(op === '(') {
                        applyOp(op);
                    } else {
                        throw new Error("parentheses mismatch");
                    }
                }
            }
            break;
        }
    }
    pos = res[2];
}

const generator = new LexerGenerator();
generator.addStateMatcher("INITIAL", outputLexer);
const code = generator.compile("../../src/");

fs.writeFileSync("./bootstrap/stage2/Stage2Lexer.ts", code);