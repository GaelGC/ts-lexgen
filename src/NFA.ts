import { Sequence } from "./main";

class NFATransitions {
    constructor(dest: NFANodeImpl, char: number | null) {
        this._char = char;
        this._dest = dest;
    }

    private _dest: NFANodeImpl;
    public get dest(): NFANodeImpl {
        return this._dest;
    }

    private _char: number | null;
    public get char(): number | null {
        return this._char;
    }
};

class NFANodeImpl {
    constructor(idxGen: Sequence, out: boolean = false) {
        this.idx = idxGen.get();
        this.outputs = new Array();
        this.out = out;
    }
    idx: number;
    outputs: NFATransitions[];
    out: boolean;
    public addTransition(dest: NFANodeImpl, char: number | null) {
        this.outputs.push(new NFATransitions(dest, char));
    }

    private _toString(visited: NFANodeImpl[]): string {
        if (visited.includes(this)) {
            return "";
        }
        visited.push(this);
        var str = `${this.idx} [shape="${this.out ? "doublecircle" : "circle"}"]`;
        for (const next of this.outputs) {
            str += `${this.idx} -> ${next.dest.idx} [label=\"${next.char !== null ? String.fromCharCode(next.char) : 'ϵ'}\"]\n`;
        }
        for (const next of this.outputs) {
            str += next.dest._toString(visited);
        }
        return str;
    }
    public toString(): string {
        return this._toString(new Array())
    }

    public _remove_empty() {
        const get_empties = () => this.outputs.filter(x => x.char === null);
        var empties = get_empties();

        while (empties.length !== 0) {
            for (const empty of empties) {
                const index = this.outputs.indexOf(empty);
                this.outputs.splice(index, 1);
                const dest = empty.dest;
                if (dest.out) {
                    this.out = true;
                }
                for (const dest_dest of dest.outputs) {
                    if (this.outputs.find(x => x.char == dest_dest.char && x.dest == dest_dest.dest) === undefined) {
                        this.outputs.push(new NFATransitions(dest_dest.dest, dest_dest.char));
                    }
                    empty.dest._remove_empty();
                }
            }
            empties = get_empties();
        }
    }
    public fill_nodes(arr: NFANodeImpl[]) {
        if (arr.includes(this)) {
            return;
        }
        arr.push(this);
        for (const edge of this.outputs) {
            edge.dest.fill_nodes(arr);
        }
    }
    public remove_empty() {
        var nodes: NFANodeImpl[] = new Array();
        this.fill_nodes(nodes);
        for (const node of nodes) {
            node._remove_empty();
        }
    }
}

export class NFANode {
    constructor(idxGen: Sequence, out: boolean = false) {
        this.node = new NFANodeImpl(idxGen, out);
    }
    public setOut() {
        this.node.out = true;
    }
    public addTransition(dest: NFANode, char: number | null) {
        this.node.addTransition(dest.node, char);
    }
    node: NFANodeImpl;
}

export class NFARoot {
    entry: NFANodeImpl;

    constructor(node: NFANode) {
        this.entry = node.node;
    }
    public remove_empty() {
        this.entry.remove_empty();
    }
    public toString(): string {
        return this.entry.toString();
    }
}