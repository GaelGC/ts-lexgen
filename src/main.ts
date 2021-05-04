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
}

const seq = new Sequence();
const node = new OrNode(seq, new SeqNode(seq, new LitteralNode(seq, "a|+"),
                                              new LitteralNode(seq, "fef")),
                             new LitteralNode(seq, "b"));
console.log(node.toString());