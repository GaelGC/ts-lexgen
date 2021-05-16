import fs = require('fs');
import { EOF } from '../../src/Automaton';
import { Matcher } from "../../src/Matcher";
import { getBytes, getString, LitteralNode, RegexNode } from "../../src/RegexNodes";
import { context, Lexer } from "./Stage3Lexer";
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

class Stage3 extends Lexer {
    private sent: boolean = false;
    getBytes(): number[] {
        if (this.sent) {
            return [];
        }
        this.sent = true;
        return getBytes(fs.readFileSync("./bootstrap/stage3/stage4.l").toString());
    }
}

const generator = new LexerGenerator();
const stage2 = new Stage3();
var eof = false;

while (!eof) {
    var res = stage2.lex();
    if (res === undefined) {
        console.log("Error");
        process.exit(1);
    } else if (res instanceof EOF) {
        eof = true;
        console.log("EOF");
        break;
    }
    var lexem: [typeof res[0], string] = [res[0], getString(res[1])];
    console.log(`Rule ${lexem[0]} reached with string ${lexem[1].replace(/\n/g, "\\n").replace(/\r/g, "\\r")}`);
}

context.startState("none");
const code = context.generate("../../src/");

fs.writeFileSync("./bootstrap/stage4/Stage4Lexer.ts", code);


