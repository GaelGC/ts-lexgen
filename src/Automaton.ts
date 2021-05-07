import { Sequence } from "./main";
import { getBytes } from "./RegexNodes";

export class EOF {
    private useless: undefined;
}

export interface AutomatonNode {
    neighbors(): AutomatonNode[];
    transitions(): AutomatonTransition[];
    out(): number | undefined;
    idx(): number;
    toString(): string;
    setOut(ruleIdx: number);
}

export interface MutableAutomatonNode extends AutomatonNode {
    addTransition(dest: MutableAutomatonNode, char: number | null);
    removeTransition(transition: AutomatonTransition);
    neighbors(): MutableAutomatonNode[];
    mutableTransitions(): MutableAutomatonTransition[];
}

class AutomatonTransition {
    constructor(dest: MutableAutomatonNode, char: number | null) {
        this._char = char;
        this._dest = dest;
    }

    protected _dest: MutableAutomatonNode;
    public get dest(): AutomatonNode {
        return this._dest;
    }

    protected _char: number | null;
    public get char(): number | null {
        return this._char;
    }
};

class MutableAutomatonTransition extends AutomatonTransition {
    constructor(dest: MutableAutomatonNode, char: number | null) {
        super(dest, char)
    }

    public get dest(): MutableAutomatonNode {
        return this._dest;
    }
};

export class AutomatonNodeBase implements AutomatonNode, MutableAutomatonNode {
    constructor(idxGen?: Sequence, ruleIdx?: number) {
        if (idxGen !== undefined) {
            this.nodeIdx = idxGen.get();
        } else {
            this.nodeIdx = 0;
        }

        this.outputs = new Array();
        this.ruleIdx = ruleIdx;
    }

    nodeIdx: number;
    outputs: MutableAutomatonTransition[];
    ruleIdx: number | undefined;

    idx(): number {
        return this.nodeIdx;
    }

    out(): number | undefined {
        return this.ruleIdx;
    }

    transitions(): AutomatonTransition[] {
        return this.mutableTransitions();
    }

    mutableTransitions(): MutableAutomatonTransition[] {
        return this.outputs.map(x => x);
    }

    setOut(ruleIdx: number) {
        this.ruleIdx = ruleIdx;
    }

    neighbors(): MutableAutomatonNode[] {
        var neighbors: MutableAutomatonNode[] = new Array();
        for (const edge of this.outputs) {
            const neighbor = edge.dest;
            if (neighbors.includes(neighbor)) {
                continue;
            }
            neighbors.push(neighbor);
        }
        return neighbors;
    }

    public addTransition(dest: MutableAutomatonNode, char: number | null) {
        this.outputs.push(new MutableAutomatonTransition(dest, char));
    }

    removeTransition(transition: MutableAutomatonTransition) {
        const idx = this.outputs.indexOf(transition);
        if (idx == -1) {
            throw Error("Tried to remove a nonexisting transition");
        }
        this.outputs.splice(idx, 1);
    }

    toString(): string {
        var str = `${this.nodeIdx} [shape="${this.ruleIdx !== undefined ? "doublecircle" : "circle"}"]`;
        for (const neighbor of this.neighbors()) {
            const transitions = this.transitions().filter(x => x.dest === neighbor)!;
            var chars = "";
            for (const transition of transitions) {
                chars += transition.char === null ? "ϵ" : String.fromCharCode(transition.char);
            }
            str += `${this.nodeIdx} -> ${neighbor.idx()} [label=\"${chars}\"]\n`;
        }
        return str;
    }
}

export interface Automaton {
    nodes(): AutomatonNode[];
    toString(): string;
};

export interface ENFA extends Automaton {
    getNFA(): NFA;
}
export interface NFA extends Automaton {
    getDFA(): DFA;
}
export interface DFA extends Automaton {
    match(str: string | number[], curPos?: number): [number, number] | undefined | EOF;
}

class AutomatonBase implements Automaton {
    constructor(idxGen: Sequence, node: AutomatonNodeBase) {
        this.entry = node;
        this.idxGen = idxGen;
    }

    public entry: AutomatonNodeBase;
    public idxGen: Sequence;

    public nodes(): MutableAutomatonNode[] {
        const nodes = new Array<MutableAutomatonNode>();
        nodes.push(this.entry);
        var idx = 0;
        while (idx !== nodes.length) {
            const node = nodes[idx];
            for (const neighbor of node.neighbors()) {
                if (!nodes.includes(neighbor)) {
                    nodes.push(neighbor);
                }
            }
            idx++;
        }
        return nodes;
    }

    protected static clone(idxGen: Sequence, entry: AutomatonNode): AutomatonNodeBase {
        const nodeList: Array<AutomatonNode> = [entry];
        const mapTranslation = new Array<[AutomatonNode, AutomatonNodeBase]>();
        const newEntry = new AutomatonNodeBase(idxGen, entry.out())
        mapTranslation.push([entry, newEntry]);

        var idx = 0;
        while (idx !== nodeList.length) {
            const srcNode = nodeList[idx];
            const copyNode = mapTranslation.find(x => x[0] === srcNode)![1];
            for (const transition of srcNode.transitions()) {
                if (!nodeList.includes(transition.dest)) {
                    const newNode = new AutomatonNodeBase(idxGen, transition.dest.out());
                    nodeList.push(transition.dest);
                    mapTranslation.push([transition.dest, newNode]);
                }
                copyNode.addTransition(
                    mapTranslation.find(x => x[0] == transition.dest)![1],
                    transition.char
                );
            }
            idx++;
        }
        return newEntry;
    }

    public toString(): string {
        var str = "";
        for (const node of this.nodes()) {
            str += node.toString();
        }
        return str;
    }
}

export class EpsilonNFAAutomaton extends AutomatonBase implements ENFA {
    constructor(idxGen: Sequence, ...nodes: AutomatonNode[]) {
        const entry = new AutomatonNodeBase(idxGen);
        for (const node of nodes) {
            entry.addTransition(AutomatonBase.clone(idxGen, node), null);
        }
        super(idxGen, entry);
    }

    public getNFA(): NFAAutomaton {
        return new NFAAutomaton(this.idxGen, this.entry);
    }
}

export class NFAAutomaton extends AutomatonBase implements NFA {
    constructor(idxGen: Sequence, node: AutomatonNode) {
        super(idxGen, AutomatonBase.clone(idxGen, node));
        this.removeEpsilonTransitions();
    }

    private getEpsilonTransitions(node: MutableAutomatonNode): MutableAutomatonTransition[] {
        return node.mutableTransitions().filter(x => x.char === null);
    }

    private removeEpsilonTransitions() {
        for (const node of this.nodes()) {
            var epsilons = this.getEpsilonTransitions(node);
            while (epsilons.length !== 0) {
                for (const epsilon of epsilons) {
                    node.removeTransition(epsilon);
                    if (epsilon.dest.out() !== undefined) {
                        if (node.out() === undefined || epsilon.dest.out()! < node.out()!) {
                            node.setOut(epsilon.dest.out()!);
                        }
                    }
                    for (const newTransition of epsilon.dest.mutableTransitions()) {
                        node.addTransition(newTransition.dest, newTransition.char);
                    }
                }
                epsilons = this.getEpsilonTransitions(node);
            }
        }
        for (const node of this.nodes()) {
            const transitionMap = new Map<number, MutableAutomatonNode[]>();
            for (const transition of node.mutableTransitions()) {
                if (!transitionMap.has(transition.char!)) {
                    transitionMap.set(transition.char!, new Array());
                }
                const neighbors = transitionMap.get(transition.char!);
                if (neighbors!.includes(transition.dest)) {
                    node.removeTransition(transition);
                } else {
                    neighbors!.push(transition.dest);
                }
            }
        }
    }

    public getDFA(): DFAAutomaton {
        return new DFAAutomaton(this.idxGen, this);
    }
}

export class DFAAutomaton extends AutomatonBase implements DFA {
    constructor(idxGen: Sequence, source: NFAAutomaton) {
        super(idxGen, AutomatonBase.clone(idxGen, source.entry));
        this.determinise();
    }

    private getNonDeterministicNode(): MutableAutomatonNode | undefined {
        const nodes = this.nodes();
        for (const node of nodes) {
            const transitionChars: number[] = new Array();
            for (const transition of node.transitions()) {
                const c = transition.char;
                if (transitionChars.includes(c!)) {
                    return node;
                }
                transitionChars.push(c!);
            }
        }
        return undefined;
    }


    private isDFA(): boolean {
        return this.getNonDeterministicNode() == undefined;
    }

    private determinise() {
        while (!this.isDFA()) {
            const node = this.getNonDeterministicNode()!;
            var transitions = new Map<number, MutableAutomatonTransition[]>();
            for (const transition of node.mutableTransitions()) {
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
                const newState = new AutomatonNodeBase(this.idxGen);
                for (const nextPossibleState of value) {
                    for (const nextPossibleStateTransition of nextPossibleState.dest.mutableTransitions()) {
                        newState.addTransition(nextPossibleStateTransition.dest, nextPossibleStateTransition.char);
                    }
                    if (nextPossibleState.dest.out() !== undefined &&
                        (newState.ruleIdx === undefined || newState.ruleIdx > nextPossibleState.dest.out()!)) {
                        newState.ruleIdx = nextPossibleState.dest.out();
                    }
                    node.removeTransition(nextPossibleState);
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
        var curNode: AutomatonNode = this.entry;
        var lastRuleMatch: number | undefined = undefined;
        var lastRuleMatchIdx: number = 0;
        for (var pos = curPos; pos < str.length; pos++) {
            const edge = curNode.transitions().find(x => x.char == str[pos]);
            if (edge === undefined) {
                break;
            }
            curNode = edge.dest;
            if (curNode.out() !== undefined) {
                lastRuleMatch = curNode.out();
                lastRuleMatchIdx = pos;
            }
        }
        if (lastRuleMatch === undefined) {
            return undefined;
        }
        return [lastRuleMatch, lastRuleMatchIdx + 1];
    }
}