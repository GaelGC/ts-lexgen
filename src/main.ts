import { Matcher } from "./Matcher";
import { LitteralNode, MainNode, OrNode, RangeNode, RepetitionNode, SeqNode, ZeroOrMoreNode } from "./RegexNodes";

export class Sequence {
    private idx: number = 0;
    public get(): number {
        return this.idx++;
    }
}

const matcher = new Matcher();
const idStart = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_";
const numbers = "0123456789";
const hexNumbers = numbers ;//+ "abcdef";
matcher.registerRule("identifier", new SeqNode(new RangeNode(idStart),
                                               new ZeroOrMoreNode(new RangeNode(idStart + numbers))))
matcher.registerRule("space", new RepetitionNode(new RangeNode(" \t")));
matcher.registerRule("number", new RepetitionNode(new RangeNode(numbers)));
matcher.registerRule("hex_num", new SeqNode(new LitteralNode("0x"),
                                            new RepetitionNode(new LitteralNode(hexNumbers))));
matcher.match("a 0x123468975abedfdd 1234  fde");