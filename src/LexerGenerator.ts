import { EOF } from "./Automaton";
import { Matcher } from "./Matcher";
import { render, renderFile } from "ejs";
import fs = require('fs');

export class LexerGenerator {
    constructor() {
    }

    private matchers: Map<string, Matcher> = new Map();
    private currentMatcher: Matcher | undefined = undefined;

    addStateMatcher(stateName: string, matcher: Matcher) {
        if (stateName === "INITIAL") {
            this.currentMatcher = matcher;
        }
        if (this.matchers.has(stateName) === undefined) {
            throw Error(`State ${stateName} is already registered.`);
        }
        this.matchers.set(stateName, matcher);
    }

    public match(str: string | number[], pos: number = 0): undefined | EOF | [string, number[], number] {
        if (this.currentMatcher === undefined) {
            throw Error("Missing INITIAL state");
        }
        return this.currentMatcher.match(str, pos);
    }

    public setState(name: string) {
        if (!this.matchers.has(name)) {
            throw Error(`Unknown ${name} state`);
        }
        this.currentMatcher = this.matchers.get(name);
    }

    public compile(libDir?: string, preamble?: string): string {
        if (libDir === undefined) {
            libDir = "";
        }
        var skeleton = fs.readFileSync("src/skeleton.ts.in").toString();
        var stateNames: string[] = new Array();
        var ruleNames: string[] = new Array();
        var automata: string[] = new Array();
        var resTypes: Set<string> = new Set();
        var codes: [string, [string, string][]][] = new Array();
        for (const stateName of Array.from(this.matchers.keys())) {
            const stateData = this.matchers.get(stateName)!.compile();
            stateNames.push(`"${stateName}"`);
            ruleNames.push(`[${stateData.rules.map(rule => `"${rule.name}"`).join(", ")}]`);
            stateData.rules.forEach(x => resTypes.add(`"${x.name}"`));
            automata.push(stateData.automaton);
            const codeBuf: [string, string][] = stateData.rules.filter(x => x.code !== undefined).map(x => [x.name, x.code!]);
            codes.push([stateName, codeBuf]);
        }
        return render(skeleton, {
            automata: automata.join(", "),
            names: ruleNames.join(", "),
            states: stateNames,
            resTypes: Array.from(resTypes).join(" | "),
            libDir: libDir,
            preamble: preamble === undefined ? "" : preamble,
            codes: codes
        });
    }
}