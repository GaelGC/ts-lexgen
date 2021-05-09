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
import { handleChar, handleSpecialChar, pop, unEscape } from "../helpers/CharacterHandlers";
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
matcher.registerRule("state", new LitteralNode(">"));
matcher.registerRule("special", new RangeNode(special));

var outputLexer = new Matcher();
enum State {
    Initial,
    NameAcquired,
    StateDeclaration,
    DefinitionOngoing
};
var curState: State = State.Initial;
var curName = "";
var nodes: RegexNode[] = [new LitteralNode("")];
var opStack: string[] = [];
var stateName = "INITIAL";
const generator = new LexerGenerator();
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
            console.log(getString(res[1]));
            if (res[0] !== "newline" && res[0] !== "normal" && res[0] !== "state") {
                throw Error(`Unexpected ${res[0]} at beginning of line.`);
            }
            if (res[0] === "normal") {
                curName = getString(res[1])
                curState = State.NameAcquired;
            }
            if (res[0] === "state") {
                curState = State.StateDeclaration;
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
        case State.StateDeclaration: {
            if (res[0] === "normal") {
                generator.addStateMatcher(stateName, outputLexer);
                stateName = getString(res[1]);
                outputLexer = new Matcher();
            }
            if (res[0] === "newline") {
                curState = State.Initial;
            }
            break;
        }
        case State.DefinitionOngoing: {
            var c = getString(res[1]);
            if (res[0] === "escape") {
                c = unEscape(c);
            }
            if (res[0] === "special") {
                handleSpecialChar(c, nodes, opStack);
            } else if (res[0] === "newline") {
                while (opStack.length !== 0) {
                    pop(nodes, opStack);
                }
                console.log(`Registering rule ${curName} with content ${nodes[0].toString()}`);
                outputLexer.registerRule(curName, nodes[0]);
                nodes = [new LitteralNode("")];
                curState = State.Initial;
            } else {
                handleChar(c, nodes, opStack);
            }
            break;
        }
    }
    pos = res[2];
}

generator.addStateMatcher(stateName, outputLexer);
const code = generator.compile("../../src/");

fs.writeFileSync("./bootstrap/stage2/Stage2Lexer.ts", code);