import { Sequence } from "./main";

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

export class NFANode {
    constructor(idxGen: Sequence, out: boolean = false) {
        this.idx = idxGen.get();
        this.outputs = new Array();
        this.out = out;
    }
    idx: number;
    outputs: NFATransitions[];
    out: boolean;
    public addTransition(dest: NFANode, char: number | null) {
        this.outputs.push(new NFATransitions(dest, char));
    }

    private _toString(visited: NFANode[]): string {
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
    public fill_nodes(arr: NFANode[]) {
        if (arr.includes(this)) {
            return;
        }
        arr.push(this);
        for (const edge of this.outputs) {
            edge.dest.fill_nodes(arr);
        }
    }
    public remove_empty() {
        var nodes: NFANode[] = new Array();
        this.fill_nodes(nodes);
        for (const node of nodes) {
            node._remove_empty();
        }
    }
}