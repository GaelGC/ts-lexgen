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
    constructor(idxGen: Sequence) {
        this.idx = idxGen.get();
        this.outputs = new Array();
    }
    private idx: number;
    private outputs: NFATransitions[];
    public addTransition(dest: NFANode, char: number | null) {
        this.outputs.push(new NFATransitions(dest, char));
    }

    private _toString(visited: NFANode[]): string {
        if (visited.includes(this)) {
            return "";
        }
        visited.push(this);
        var str = "";
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
}