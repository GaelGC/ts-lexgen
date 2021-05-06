import { Sequence } from "./main";
import { getBytes } from "./RegexNodes";

export class EOF {
    private useless: undefined;
}

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
    constructor(idxGen: Sequence, ruleIdx?: number) {
        this.idx = idxGen.get();
        this.outputs = new Array();
        this.ruleIdx = ruleIdx;
    }
    idx: number;
    outputs: NFATransitions[];
    ruleIdx: number | undefined;
    public addTransition(dest: NFANodeImpl, char: number | null) {
        this.outputs.push(new NFATransitions(dest, char));
    }

    private _toString(visited: NFANodeImpl[]): string {
        if (visited.includes(this)) {
            return "";
        }
        visited.push(this);
        var str = `${this.idx} [shape="${this.ruleIdx !== undefined ? "doublecircle" : "circle"}"]`;
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
                if (dest.ruleIdx !== undefined) {
                    if (this.ruleIdx === undefined || dest.ruleIdx < this.ruleIdx) {
                        this.ruleIdx = dest.ruleIdx;
                    }
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

    public isDeterministicNode(): boolean {
        var transitions: Number[] = new Array();
        for (const transition of this.outputs) {
            if (transition.char === null) {
                return false;
            }
            if (transitions.includes(transition.char)) {
                return false;
            }
            transitions.push(transition.char);
        }
        return true;
    }

    public isDFA(visited: NFANodeImpl[]): boolean {
        if (visited.includes(this)) {
            return true;
        }
        visited.push(this);
        if (!this.isDeterministicNode()) {
            return false;
        }
        var nextStages: NFANodeImpl[] = new Array();
        for (const transition of this.outputs) {
            if (!nextStages.includes(transition.dest)) {
                nextStages.push(transition.dest);
            }
        }
        for (const nextStage of nextStages) {
            if (!nextStage.isDFA(visited)) {
                return false;
            }
        }
        return true;
    }
    getNondeterministicNode(visited: NFANodeImpl[]): NFANodeImpl | null {
        if (visited.includes(this)) {
            return null;
        }
        visited.push(this);
        if (!this.isDeterministicNode()) {
            return this;
        }
        for (const transition of this.outputs) {
            const nondeterministicNode = transition.dest.getNondeterministicNode(visited);
            if (nondeterministicNode !== null) {
                return nondeterministicNode;
            }
        }
        return null;
    }
}

export class NFANode {
    constructor(idxGen: Sequence) {
        this.node = new NFANodeImpl(idxGen);
    }
    public setOut(ruleIdx: number) {
        this.node.ruleIdx = ruleIdx;
    }
    public addTransition(dest: NFANode, char: number | null) {
        this.node.addTransition(dest.node, char);
    }
    node: NFANodeImpl;
}

export class NFARoot {
    private entry: NFANodeImpl;
    private dfa = false;
    private idxGen: Sequence;

    constructor(idxGen: Sequence, ...nodes: NFANode[]) {
        const entry = new NFANode(idxGen);
        for (const node of nodes) {
            entry.addTransition(node, null);
        }
        this.entry = entry.node;
        this.idxGen = idxGen;
    }
    public remove_empty() {
        this.entry.remove_empty();
    }
    public toString(): string {
        return this.entry.toString();
    }
    public isDFA(): boolean {
        if (!this.dfa) {
            this.dfa = this.entry.isDFA(new Array());
        }
        return this.dfa;
    }
    public determinise() {
        while (!this.isDFA()) {
            const node = this.entry.getNondeterministicNode(new Array())!;
            var transitions = new Map<number, NFATransitions[]>();
            for (const transition of node.outputs) {
                if (transition.char === null) {
                    throw Error("Should not be called on an automata with spontaneous transitions");
                }
                if (!transitions.has(transition.char)) {
                    transitions.set(transition.char, new Array());
                }
                transitions.get(transition.char)!.push(transition);
            }
            var transitionIterator = Array.from(transitions.entries());

            for (const curTransition of transitionIterator) {
                const [key, value] = curTransition;
                if (value.length === 1) {
                    continue;
                }
                const newState = new NFANodeImpl(this.idxGen);
                for (const nextPossibleState of value) {
                    for (const nextPossibleStateTransition of nextPossibleState.dest.outputs) {
                        newState.addTransition(nextPossibleStateTransition.dest, nextPossibleStateTransition.char);
                    }
                    if (nextPossibleState.dest.ruleIdx !== undefined &&
                        (newState.ruleIdx === undefined || newState.ruleIdx > nextPossibleState.dest.ruleIdx)) {
                        newState.ruleIdx = nextPossibleState.dest.ruleIdx;
                    }
                    node.outputs.splice(node.outputs.indexOf(nextPossibleState), 1);
                }
                node.addTransition(newState, curTransition[0]);
            }
        }
    }

    public match(str: string | number[], curPos: number = 0): [number, number] | undefined | EOF {
        if (typeof str == "string") {
            const bytes = getBytes(str);
            return this.match(bytes)
        }
        if (curPos == str.length) {
            return new EOF();
        }
        this.determinise();
        var curNode = this.entry;
        var lastRuleMatch: number | undefined = undefined;
        var lastRuleMatchIdx: number = 0;
        for (var pos = curPos; pos < str.length; pos++) {
            const edge = curNode.outputs.find(x => x.char == str[pos]);
            if (edge === undefined) {
                break;
            }
            curNode = edge.dest;
            if (curNode.ruleIdx !== undefined) {
                lastRuleMatch = curNode.ruleIdx;
                lastRuleMatchIdx = pos;
            }
        }
        if (lastRuleMatch === undefined) {
            return undefined;
        }
        return [lastRuleMatch, lastRuleMatchIdx + 1];
    }
}