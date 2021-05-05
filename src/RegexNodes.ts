import { Sequence } from "./main";
import { NFANode } from "./NFA";

export interface RegexNode {
    toString(): string;
    getNFA(idxGen: Sequence): [NFANode, NFANode];
}

function getBytes(s: string) {
    var bytes: number[] = Array();
    for (var pos = 0; pos < s.length; pos++) {
        const code = s.charCodeAt(pos);
        bytes.push(code & 0xff);
        bytes.push((code / 256) | 0);
    }
    return bytes;
}

export class LitteralNode implements RegexNode {
    constructor(content: string) {
        this._val = content;
        if (content.length === 0) {
            throw Error("Litteral nodes could not be empties");
        }
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
        return res;
    }
    
    public getNFA(idxGen: Sequence): [NFANode, NFANode] {
        const bytes = getBytes(this.val);
        const firstNode = new NFANode(idxGen);
        var lastNode = firstNode;
        for (const c of bytes) {
            var newNode = new NFANode(idxGen);
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

    public getNFA(idxGen: Sequence): [NFANode, NFANode] {
        const firstNode = new NFANode(idxGen);
        const lastNode = new NFANode(idxGen);
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

    getNFA(idxGen: Sequence): [NFANode, NFANode] {
        const firstNode = new NFANode(idxGen);
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

    public getNFA(idxGen: Sequence): [NFANode, NFANode] {
        const firstNode = new NFANode(idxGen);
        var lastNode = firstNode;
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

    public getNFA(idxGen: Sequence): [NFANode, NFANode] {
        const [entry, exit] = this.node.getNFA(idxGen);
        exit.addTransition(entry, null);
        return [entry, exit];
    }
}

export class OneOrMoreNode implements RegexNode {
    constructor(node: RegexNode) {
        this.node = new OptionalNode(new RepetitionNode(node));
    }

    private node: RegexNode;

    getNFA(idxGen: Sequence): [NFANode, NFANode] {
        return this.node.getNFA(idxGen);
    }
    public toString(): string {
        return this.node.toString();
    }
}

export class MainNode implements RegexNode {
    constructor(node: RegexNode) {
        this.node = node;
    }

    private node: RegexNode;

    getNFA(idxGen: Sequence): [NFANode, NFANode] {
        const nfa = this.node.getNFA(idxGen);
        nfa[1].out = true;
        return nfa;
    }
    public toString(): string {
        return this.node.toString();
    }
}