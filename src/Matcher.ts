import { Automaton, AutomatonNode, DFA, EOF, EpsilonNFAAutomaton } from "./Automaton";
import { getBytes, RegexNode, Sequence } from "./RegexNodes";
import { render, renderFile } from "template-file";
import fs = require('fs');

class Rule {
    constructor(name: string, nodeEntry: AutomatonNode, nodeExit: AutomatonNode, idx: number) {
        this.name = name;
        this.idx = idx;
        this.node = nodeEntry;
        nodeExit.setOut(idx);
    }

    name: string;
    idx: number;
    node: AutomatonNode;
}

export class Matcher {
    rules: Rule[];
    root: DFA | undefined;

    constructor() {
        this.rules = new Array();
        this.root = undefined;
    }

    public registerRule(name: string, node: RegexNode) {
        var nfaNode: [AutomatonNode, AutomatonNode];
        nfaNode = node.getNFA(new Sequence());
        this.rules.push(new Rule(name, nfaNode[0], nfaNode[1], this.rules.length));
    }

    public compile(libDir?: string): string {
        if (libDir === undefined) {
            libDir = "";
        }
        const enfa = new EpsilonNFAAutomaton(new Sequence(), ...this.rules.map(x => x.node));
        console.log(enfa.toString());
        console.log("\n\n\n");
        const nfa = enfa.getNFA();
        console.log(nfa.toString());
        console.log("\n\n\n");
        this.root = nfa.getDFA();
        console.log(this.root.toString());
        console.log("\n\n\n");
        console.log(this.root.get_tables());
        console.log("\n\n\n");
        var skeleton = fs.readFileSync("src/skeleton.ts.in").toString();
        return render(skeleton, {automaton: this.root.get_tables(), libDir: libDir});
    }
    public match(str: string | number[], pos: number = 0): undefined | EOF | [string, number[], number] {
        if (typeof str === "string") {
            const bytes = getBytes(str);
            return this.match(bytes, pos);
        }
        if (this.root === undefined) {
            this.compile();
        }

        const res = this.root!.match(str, pos);
        if (res instanceof EOF || res === undefined) {
            return res;
        }
        return [this.rules[res[0]].name, str.slice(pos, res[1]), res[1]]
    }
}