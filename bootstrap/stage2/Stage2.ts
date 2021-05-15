import fs = require('fs');
import { EOF } from '../../src/Automaton';
import { Matcher } from "../../src/Matcher";
import { getBytes, getString, LitteralNode, RegexNode } from "../../src/RegexNodes";
import { Lexer, ruleNames } from "./Stage2Lexer";
import { LexerGenerator } from "../../src/LexerGenerator";
import { addToRange, handleChar, handleRange, handleSpecialChar, pop, unEscape } from "../helpers/CharacterHandlers";

enum State {
    Initial,
    Stage2,
    NameAcquired,
    StateDeclaration,
    DefinitionOngoing,
    Stage2Code
}

class Stage2 extends Lexer {
    private sent: boolean = false;
    getBytes(): number[] {
        if (this.sent) {
            return [];
        }
        this.sent = true;
        return getBytes(fs.readFileSync("./bootstrap/stage2/stage3.l").toString());
    }
}

const generator = new LexerGenerator();
const stage2 = new Stage2();
var outputLexer = new Matcher();

var curState: State = State.Initial;
var curName = "";
var nodes: RegexNode[] = [new LitteralNode("")];
var opStack: string[] = [];
var stateName = "INITIAL";
var eof = false;
var range = "";
var rangeRevert = false;

var userPreamble = "";

var isCodeBlock = false;
var userCode = "";

const registerRule = (code?: string) => {
    while (opStack.length !== 0) {
        pop(nodes, opStack);
    }
    console.log(`Registering rule ${curName} with content ${nodes[0].toString()}`);
    outputLexer.registerRule(curName, nodes[0], code);
    nodes = [new LitteralNode("")];
    curState = State.Stage2;
}

while (!eof) {
    var res = stage2.lex();
    if (res === undefined) {
        console.log("Error");
        process.exit(1);
    } else if (res instanceof EOF) {
        eof = true;
        break;
    }
    var lexem: [typeof res[0], string] = [res[0], getString(res[1])];
    console.log(`Rule ${lexem[0]} reached with string ${lexem[1]}`);
    switch (curState) {
        case State.Initial: {
            if (lexem[0] === "STAGE1END") {
                stage2.setState("STAGE2");
                curState = State.Stage2;
            } else if (lexem[0] === "STAGE1CODESTART") {
                stage2.setState("STAGE1CODE");
            } else if (lexem[0] === "STAGE1CODEEND") {
                console.log(userPreamble);
                stage2.setState("INITIAL");
            } else if (lexem[0] === "STAGE1CODE") {
                userPreamble += lexem[1];
            }
            break;
        }
        case State.Stage2: {
            console.log(lexem[1]);
            if (lexem[0] !== "NEWLINE" && lexem[0] !== "ID" && lexem[0] !== "STATE") {
                throw Error(`Unexpected ${lexem[0]} at beginning of line.`);
            }
            if (lexem[0] === "ID") {
                curName = lexem[1];
                curState = State.NameAcquired;
            }
            if (lexem[0] === "STATE") {
                curState = State.StateDeclaration;
            }
            break;
        }
        case State.NameAcquired: {
            if (lexem[0] !== "SEPARATOR") {
                throw Error("Expected =>");
            }
            curState = State.DefinitionOngoing;
            break;
        }
        case State.StateDeclaration: {
            if (lexem[0] === "ID") {
                generator.addStateMatcher(stateName, outputLexer);
                stateName = lexem[1];
                outputLexer = new Matcher();
            }
            if (lexem[0] === "NEWLINE") {
                curState = State.Stage2;
            }
            break;
        }
        case State.DefinitionOngoing: {
            var c = lexem[1];
            if (lexem[0] === "CODESTART") {
                isCodeBlock = false;
                stage2.setState("STAGE2CODE");
                curState = State.Stage2Code;
            } else if (lexem[0] === "NEWLINE") {
                registerRule();
            } else if (lexem[0] === "ESCAPE") {
                handleChar(unEscape(c), nodes, opStack);
            } else if (lexem[0] === "SPECIAL") {
                handleSpecialChar(c, nodes, opStack);
            } else if (lexem[0] === "RANGESTARTCHAR") {
                stage2.setState("RANGESTART");
                range = "";
                rangeRevert = false;
            } else if (lexem[0] === "RANGERANGE") {
                range = addToRange(range, lexem[1][0], lexem[1][2]);
                stage2.setState("RANGE");
            } else if (lexem[0] === "RANGENORMAL") {
                range = addToRange(range, lexem[1][0], lexem[1][0]);
                stage2.setState("RANGE");
            } else if (lexem[0] === "RANGEMINUS") {
                range = addToRange(range, "-", "-");
                stage2.setState("RANGE");
            } else if (lexem[0] == "RANGEEXCLUDE") {
                stage2.setState("RANGE");
                rangeRevert = true;
            } else if (lexem[0] === "RANGEESCAPE") {
                const c = unEscape(lexem[1]);
                range = addToRange(range, c, c);
                stage2.setState("RANGE");
            } else if (lexem[0] === "RANGEEND") {
                handleRange(range, rangeRevert, nodes, opStack);
                stage2.setState("STAGE2");
            } else if (lexem[0] === "ID") {
                handleChar(c, nodes, opStack);
            } else if (lexem[0] === "LITTERAL") {
                handleChar(c.slice(1, c.length - 1), nodes, opStack);
            } else {
                throw Error(`Unknown state ${lexem[0]}`);
            }
            break;
        }
        case State.Stage2Code: {
            if (lexem[0] === "STAGE2CODE") {
                userCode += lexem[1];
            } else if (lexem[0] === "NEWLINE") {
                registerRule(userCode);
                curState = State.Stage2;
                stage2.setState("STAGE2");
            }
            break;
        }
    }
}

generator.addStateMatcher(stateName, outputLexer);
const code = generator.compile("../../src/", userPreamble);

fs.writeFileSync("./bootstrap/stage3/Stage3Lexer.ts", code);


