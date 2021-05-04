class Sequence {
    private idx: number = 0;
    public get(): number {
        return this.idx++;
    }
}

abstract class RegexNode {
    constructor(idxGen: Sequence) {
        this._idx = idxGen.get();
    }

    private _idx: number;
    public get idx(): number {
        return this._idx;
    }

    public abstract toString(): string;
    public abstract getNFA(idxGen: Sequence): [NFANode, NFANode];
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

class LitteralNode extends RegexNode {
    constructor(idxGen: Sequence, content: string) {
        super(idxGen);
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
        return res;
    }
    
    public getNFA(idxGen: Sequence): [NFANode, NFANode] {
        const bytes = getBytes(this.val);
        const firstNode = new NFANode(idxGen);
        var lastNode = firstNode;
        for (const c of bytes) {
            console.log(this.val, c);
            var newNode = new NFANode(idxGen);
            lastNode.addTransition(newNode, c);
            lastNode = newNode;
        }
        return [firstNode, lastNode];
    }
}

class OrNode extends RegexNode {
    constructor(idxGen: Sequence, ...nodes: RegexNode[]) {
        super(idxGen);
        this.nodes = nodes;
    }

    private nodes: RegexNode[];

    public toString(): string {
        return "(" + this.nodes.join("|") + ")";
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

class SeqNode extends RegexNode {
    constructor(idxGen: Sequence, ...nodes: RegexNode[]) {
        super(idxGen);
        this.nodes = nodes;
    }

    private nodes: RegexNode[];

    public toString(): string {
        return "(" + this.nodes.join("") + ")";
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

class NFATransitions {
    constructor(dest: NFANode, char: number | null) {
        this._char = char;
        this._dest = dest;
    }

    private _dest: NFANode;
    public get dest(): NFANode {
        return this._dest;
    }

    private _char: number | null;
    public get char(): number | null {
        return this._char;
    }
};

class NFANode {
    constructor(idxGen: Sequence) {
        this.idx = idxGen.get();
        this.outputs = new Array();
    }
    private idx: number;
    private outputs: NFATransitions[];
    public addTransition(dest: NFANode, char: number | null) {
        this.outputs.push(new NFATransitions(dest, char));
    }

    public toString(): string {
        var str = "";
        for (const next of this.outputs) {
            str += `${this.idx} -> ${next.dest.idx} [label=\"${next.char !== null ? String.fromCharCode(next.char) : 'ϵ'}\"]\n`;
        }
        for (const next of this.outputs) {
            str += next.dest.toString();
        }
        return str;
    }
}

const seq = new Sequence();
const node = new OrNode(seq, new SeqNode(seq, new LitteralNode(seq, "a|+"),
    new LitteralNode(seq, "fef")),
    new LitteralNode(seq, "b"));
console.log(node.toString());
const nfa = node.getNFA(new Sequence());
console.log(nfa.toString());