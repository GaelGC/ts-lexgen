import { Sequence } from "./main";
import { EOF, NFANode, NFARoot } from "./NFA";
import { getBytes, RegexNode } from "./RegexNodes";

class Rule {
    constructor(name: string, nodeEntry: NFANode, nodeExit: NFANode, idx: number) {
        this.name = name;
        this.idx = idx;
        this.node = nodeEntry;
        nodeExit.setOut(idx);
    }

    name: string;
    idx: number;
    node: NFANode;
}

export class Matcher {
    rules: Rule[];
    root: NFARoot | undefined;

    constructor () {
        this.rules = new Array();
        this.root = undefined;
    }

    public registerRule(name: string, node: RegexNode) {
        var nfaNode: [NFANode, NFANode];
        nfaNode = node.getNFA(new Sequence());
        this.rules.push(new Rule(name, nfaNode[0], nfaNode[1], this.rules.length));
    }

    public compile() {
        this.root = new NFARoot(new Sequence(), ...this.rules.map(x => x.node));
        console.log(this.root!.toString());
        console.log("\n\n\n");
        this.root.remove_empty();
        console.log(this.root!.toString());
        console.log("\n\n\n");
        this.root.determinise();
        console.log(this.root!.toString());
        console.log("\n\n\n");
    }

    public match(str: string) {
        const bytes = getBytes(str);
        if (this.root === undefined) {
            this.compile();
        }
        var curPos = 0;
        var res: undefined | EOF | [number, number];
        while (true) {
            res = this.root!.match(bytes, curPos);
            if (res === undefined) {
                console.log("Error");
                break;
            }
            if (res instanceof EOF) {
                console.log("EOF");
                break;
            }
            console.log(this.rules[res[0]].name);
            curPos = res[1];
        }
    }
}