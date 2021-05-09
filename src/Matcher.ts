import { Automaton, AutomatonNode, NFA, ENFA, DFA, EOF, EpsilonNFAAutomaton } from "./Automaton";
import { getBytes, RegexNode, Sequence } from "./RegexNodes";

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
    root: DFA | undefined = undefined;
    enfa: ENFA | undefined = undefined;
    nfa: NFA | undefined = undefined;

    constructor() {
        this.rules = new Array();
    }

    public registerRule(name: string, node: RegexNode) {
        var nfaNode: [AutomatonNode, AutomatonNode];
        nfaNode = node.getNFA(new Sequence());
        this.rules.push(new Rule(name, nfaNode[0], nfaNode[1], this.rules.length));
    }

    public compile(): { rules: string, automaton: string } {
        const enfa = new EpsilonNFAAutomaton(new Sequence(), ...this.rules.map(x => x.node));
        const nfa = enfa.getNFA();
        this.root = nfa.getDFA();
        return {
            rules: this.rules.map(rule => `"${rule.name}"`).join(", "),
            automaton: this.root.getTables()
        }
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