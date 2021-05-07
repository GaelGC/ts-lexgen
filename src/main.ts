//import { Matcher } from "./Matcher.txt";
import { EOF } from "./Automaton";
import { Matcher } from "./Matcher";
import { getBytes, LitteralNode, MainNode, OrNode, RangeNode, RepetitionNode, SeqNode, ZeroOrMoreNode } from "./RegexNodes";

export class Sequence {
    private idx: number = 0;
    public get(): number {
        return this.idx++;
    }
}

const matcher = new Matcher();
const idStart = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_";
const numbers = "0123456789";
const hexNumbers = numbers + "abcdef";

matcher.registerRule("identifier", new SeqNode(new RangeNode(idStart),
                                               new ZeroOrMoreNode(new RangeNode(idStart + numbers))));
matcher.registerRule("space", new RepetitionNode(new RangeNode(" \t")));
matcher.registerRule("number", new RepetitionNode(new RangeNode(numbers)));
matcher.registerRule("hex_num", new SeqNode(new LitteralNode("0x"),
                                            new RepetitionNode(new RangeNode(hexNumbers))));
matcher.compile();

var str = "a 0x123468975abedfdd 1234  fde";
const regex = /^(([a-zA-Z_][a-zA-Z_0-9]*)|([ \t]+)|([0-9]+)|(0x[0-9]+))+$/;

var pos = 0;
var bytes = getBytes(str);
while (true) {
    const res = matcher.match(bytes, pos);
    if (res === undefined) {
        console.log("Error");
        break;
    } else if (res instanceof EOF) {
        console.log("EOF");
        break;
    } else {
        console.log(`Rule ${res[0]} matched with text ${res[1]}`);
        pos = res[2];
    }
}