import { LitteralNode, MainNode, OneOrMoreNode, OrNode, SeqNode } from "./RegexNodes";

export class Sequence {
    private idx: number = 0;
    public get(): number {
        return this.idx++;
    }
}

const _node = new MainNode(new SeqNode(new OrNode(new SeqNode(new LitteralNode("a"),
                                                              new LitteralNode("b")),
                                       new OneOrMoreNode(new LitteralNode("c"))),
                                       new LitteralNode("c")));
console.log(_node.toString());
const nfa = _node.getRootNFA(new Sequence());
console.log(nfa.toString());
nfa.remove_empty();
console.log();
console.log();
console.log();
console.log(nfa.toString());