import { AutomatonNode, AutomatonNodeBase, MutableAutomatonNode } from "./Automaton";

export class Sequence {
    private idx: number = 0;
    public get(): number {
        return this.idx++;
    }
}

export interface RegexNode {
    toString(): string;
    getNFA(idxGen: Sequence): [MutableAutomatonNode, MutableAutomatonNode];
}

export function getBytes(s: string): number[] {
    s = unescape(encodeURIComponent(s));
    var bytes: number[] = Array();
    for (var pos = 0; pos < s.length; pos++) {
        var code = s.charCodeAt(pos);
        do {
            bytes.push(code & 0xff);
            code = (code / 256) | 0;
        } while (code !== 0);
    }
    return bytes;
}

export function getString(s: number[]): string {
    var encodedString = "";
    for (const c of s) {
        encodedString += String.fromCharCode(c);
    }
    return decodeURIComponent(escape(encodedString));
}

export class LitteralNode implements RegexNode {
    constructor(content: string) {
        this._val = content;
    }

    private _val: string;
    public get val(): string {
        return this._val;
    }

    public toString(): string {
        // Warning: \ should be the first value.
        const escapes = "\\+?*()|[].";
        var res = this.val;
        for (const escape of escapes) {
            res = res.split(escape).join('\\' + escape);
        }
        res = res.replace(/\r/g, "\\r");
        res = res.replace(/\n/g, "\\n");
        return res;
    }
    
    public getNFA(idxGen: Sequence): [MutableAutomatonNode, MutableAutomatonNode] {
        const bytes = getBytes(this.val);
        const firstNode = new AutomatonNodeBase(idxGen);
        var lastNode = firstNode;
        for (const c of bytes) {
            var newNode = new AutomatonNodeBase(idxGen);
            lastNode.addTransition(newNode, c);
            lastNode = newNode;
        }
        return [firstNode, lastNode];
    }
}

export class OrNode implements RegexNode {
    constructor(...nodes: RegexNode[]) {
        this.nodes = nodes;
    }

    protected nodes: RegexNode[];

    public toString(): string {
        return "(" + this.nodes.map(x => x.toString()).join("|") + ")";
    }

    public getNFA(idxGen: Sequence): [MutableAutomatonNode, MutableAutomatonNode] {
        const firstNode = new AutomatonNodeBase(idxGen);
        const lastNode = new AutomatonNodeBase(idxGen);
        for (const node of this.nodes) {
            const [entry, end] = node.getNFA(idxGen);
            firstNode.addTransition(entry, null);
            end.addTransition(lastNode, null);
        }
        return [firstNode, lastNode];
    }
}

export class OptionalNode implements RegexNode {
    constructor(node: RegexNode) {
        this.node =node;
    }

    private node: RegexNode;

    getNFA(idxGen: Sequence): [MutableAutomatonNode, MutableAutomatonNode] {
        const firstNode = new AutomatonNodeBase(idxGen);
        const otherNode = this.node.getNFA(idxGen);
        firstNode.addTransition(otherNode[0], null);
        firstNode.addTransition(otherNode[1], null);
        return [firstNode, otherNode[1]];
    }

    public toString(): string {
        return "(" + this.node.toString() + ")?";
    }
}

export class SeqNode implements RegexNode {
    constructor(...nodes: RegexNode[]) {
        this.nodes = nodes;
    }

    private nodes: RegexNode[];

    public toString(): string {
        return "(" + this.nodes.map(x => x.toString()).join("") + ")";
    }

    public getNFA(idxGen: Sequence): [MutableAutomatonNode, MutableAutomatonNode] {
        const firstNode = new AutomatonNodeBase(idxGen);
        var lastNode: MutableAutomatonNode = firstNode;
        for (const node of this.nodes) {
            var [entry, exit] = node.getNFA(idxGen);
            lastNode.addTransition(entry, null);
            lastNode = exit;
        }
        return [firstNode, lastNode];
    }
}

export class RepetitionNode implements RegexNode {
    constructor(node: RegexNode) {
        this.node = node;
    }

    private node: RegexNode;

    public toString(): string {
        return "(" + this.node.toString() + ")+";
    }

    public getNFA(idxGen: Sequence): [MutableAutomatonNode, MutableAutomatonNode] {
        const [entry, exit] = this.node.getNFA(idxGen);
        exit.addTransition(entry, null);
        return [entry, exit];
    }
}

export class ZeroOrMoreNode implements RegexNode {
    constructor(node: RegexNode) {
        this.node = new OptionalNode(new RepetitionNode(node));
    }

    private node: RegexNode;

    getNFA(idxGen: Sequence): [MutableAutomatonNode, MutableAutomatonNode] {
        return this.node.getNFA(idxGen);
    }
    public toString(): string {
        return '(' + this.node.toString() + ')?';
    }
}

export class RangeNode implements RegexNode {
    constructor(vals: string) {
        this.entryNode = new AutomatonNodeBase();
        this.exitNode = new AutomatonNodeBase();
        for (const c of vals) {
            const bytes = getBytes(c);
            if (bytes.length === 1) {
                this.entryNode.addTransition(this.exitNode, bytes[0]);
            } else {
                var prevNode = this.entryNode;
                for (const byte of bytes) {
                    const node = new AutomatonNodeBase();
                    prevNode.addTransition(node, byte);
                    prevNode = node;
                }
                prevNode.addTransition(this.exitNode, null);
            }
        }
        this.vals = vals;
    }

    entryNode: AutomatonNodeBase;
    exitNode: AutomatonNodeBase;
    vals: string;

    toString(): string {
        // TODO: Handle special cases
        return `[${Array.from(this.vals).join()}]`;
    }
    getNFA(idxGen: Sequence): [MutableAutomatonNode, MutableAutomatonNode] {
        return [this.entryNode, this.exitNode];
    }

}

export class MainNode implements RegexNode {
    constructor(node: RegexNode) {
        this.node = node;
    }

    private node: RegexNode;

    getRootNFA(idxGen: Sequence): MutableAutomatonNode {
        const nfa = this.node.getNFA(idxGen);
        nfa[1].setOut(0);
        return nfa[0];
    }
    public toString(): string {
        return this.node.toString();
    }
    getNFA(idxGen: Sequence): [MutableAutomatonNode, MutableAutomatonNode] {
        throw new Error("getRootNFA should be called here instead");
    }
}