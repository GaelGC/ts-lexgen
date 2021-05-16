import { EOF } from "../../src/Automaton";
import { Matcher } from "../../src/Matcher";
import { LexerGenerator } from "../../src/LexerGenerator";
import { handleChar, handleRange, handleSpecialChar, pop, unEscape } from "../helpers/CharacterHandlers";
import { getBytes, getString, LitteralNode, OptionalNode, OrNode, RangeNode, RegexNode, RepetitionNode, SeqNode, ZeroOrMoreNode } from "../../src/RegexNodes";

export class GeneratorContext {
    generator = new LexerGenerator();
    curLexer = new Matcher();
    preamble = "";
    ruleCode = "";

    addPreambleCode(preamble: string) {
        this.preamble += preamble;
    }

    name: string = "";
    state = "INITIAL";
    nodes: RegexNode[] = [new LitteralNode("")];
    opStack: string[] = [];
    empty = false;

    startRule(name: string) {
        this.name = name;
        this.nodes = [new LitteralNode("")];
        this.opStack = [];
        this.empty = true;
        this.ruleCode = "";
    }
    addNormalChar(c: string) {
        this.empty = false;
        handleChar(c, this.nodes, this.opStack);
    }
    specialChar(c: string) {
        this.empty = false;
        handleSpecialChar(c, this.nodes, this.opStack);
    }
    addEscapedChar(c: string) {
        this.empty = false;
        handleChar(unEscape(c), this.nodes, this.opStack);
    }
    addRange(range: string, reverse = false) {
        this.empty = false;
        handleRange(range, reverse, this.nodes, this.opStack);
    }
    startState(name: string) {
        this.generator.addStateMatcher(this.state, this.curLexer);
        this.curLexer = new Matcher();
        this.state = name;
    }
    addCode(code: string) {
        this.ruleCode += code;
    }
    endRule() {
        while (this.opStack.length !== 0) {
            pop(this.nodes, this.opStack);
        }
        console.log(`Registering rule ${this.name} with content ${this.nodes[0].toString()}`);
        this.curLexer.registerRule(this.name, this.nodes[0], this.ruleCode);
        this.nodes = [new LitteralNode("")];
    }
    generate(libdir: string): string {
        return this.generator.compile(libdir, this.preamble);
    }
};
