import { LitteralNode, OneOrMoreNode, OrNode, SeqNode } from "./RegexNodes";

export class Sequence {
    private idx: number = 0;
    public get(): number {
        return this.idx++;
    }
}

const _node = new OrNode(new SeqNode(new LitteralNode("a|+"),
                                     new LitteralNode("fef")),
                         new OneOrMoreNode(new LitteralNode("b")));
console.log(_node.toString());
const nfa = _node.getNFA(new Sequence());
console.log(nfa.toString());