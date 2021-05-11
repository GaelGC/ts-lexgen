import { Sequence } from "./RegexNodes";

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
    sortTransitions(): void;
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

    sortTransitions() {
        this.outputs.sort(x => x.char === null ? -1 : x.char);
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
                const handleSpecials = (str: string): string => {
                    str = str.replace(/\n/g, "\\n");
                    str = str.replace(/\r/g, "\\r");
                    str = str.replace(/\\/g, "\\\\");
                    return str;
                }
                chars += transition.char === null ? "ϵ" : handleSpecials(String.fromCharCode(transition.char));
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
    getTables(): string;
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
        const newNodes: MutableAutomatonNode[] = new Array();
        const oldNodes: Set<AutomatonNode>[] = new Array();
        const findNode = (nodes: Set<AutomatonNode>): MutableAutomatonNode => {
            for (var elemIdx = 0; elemIdx < oldNodes.length; elemIdx++) {
                const node = newNodes[elemIdx];
                const sourceNodes = oldNodes[elemIdx];

                var equal = true;
                if (sourceNodes.size !== nodes.size) {
                    equal = false;
                }
                for (const sourceNode of Array.from(sourceNodes.keys())) {
                    if (!nodes.has(sourceNode)) {
                        equal = false;
                    }
                }
                if (equal) {
                    return node;
                }
            }

            var minOut = Number.MAX_VALUE;
            for (const node of Array.from(nodes.keys())) {
                const out = node.out();
                if (out !== undefined && out < minOut) {
                    minOut = out;
                }
            }
            const newNode = new AutomatonNodeBase(this.idxGen, minOut === Number.MAX_VALUE ? undefined : minOut);
            newNodes.push(newNode);
            oldNodes.push(nodes);
            return newNode;
        }
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
                const destinations = new Set<AutomatonNode>();
                value.forEach(transition => destinations.add(transition.dest));
                const newState = findNode(destinations);
                for (const nextPossibleState of value) {
                    node.removeTransition(nextPossibleState);
                    for (const nextPossibleStateTransition of nextPossibleState.dest.mutableTransitions()) {
                        newState.addTransition(nextPossibleStateTransition.dest, nextPossibleStateTransition.char);
                    }
                }
                node.addTransition(newState, value[0].char);
            }
        }
        this.minimise();
        console.log(this.toString());
    }

    private minimise() {
        const nodes = this.nodes();
        const nodeIdxs = new Map<AutomatonNode, number>();
        {
            var nbNodes = 0;
            for (const node of nodes) {
                nodeIdxs.set(node, nbNodes++);
                node.sortTransitions();
            }
        }
        var equal: number[][] = new Array();
        for (var idx = 0; idx < nbNodes; idx++) {
            var init: number[] = new Array();
            for (var idx2 = 0; idx2 < nbNodes; idx2++) {
                init.push(0);
            }
            equal.push(init);
        }
        for (var idxA = 0; idxA < nodes.length; idxA++) {
            for (var idxB = 0; idxB < idxA; idxB++) {
                const nodeA = nodes[idxA];
                const nodeB = nodes[idxB];
                if (nodeA.out() !== nodeB.out()) {
                    equal[idxA][idxB] = -1;
                }
            }
        }
        var changed = false;
        do {
            changed = false;
            for (var idxA = 0; idxA < nodes.length; idxA++) {
                for (var idxB = 0; idxB < idxA; idxB++) {
                    if (equal[idxA][idxB] !== 0) {
                        continue;
                    }
                    const nodeA = nodes[idxA];
                    const nodeB = nodes[idxB];
                    const transitionsA = nodeA.transitions();
                    const transitionsB = nodeB.transitions();
                    if (transitionsA.length !== transitionsB.length) {
                        equal[idxA][idxB] = -1;
                        changed = true;
                        continue;
                    }
                    for (var transIdx = 0; transIdx < transitionsA.length; transIdx++) {
                        const transitionA = transitionsA[transIdx];
                        const transitionB = transitionsB[transIdx];
                        if (transitionA.char !== transitionB.char ||
                            equal[nodeIdxs.get(transitionA.dest)!][nodeIdxs.get(transitionB.dest)!] !== 0) {
                            equal[idxA][idxB] = -1;
                            changed = true;
                            continue;
                        }
                    }
                }
            }
        } while (changed);
        const nodeMap = new Map<MutableAutomatonNode, MutableAutomatonNode>();
        var newNodes = new Array<MutableAutomatonNode>();
        nodeMap.set(nodes[0], nodes[0]);
        newNodes.push(nodes[0]);
        for (var idxA = 1; idxA < nodes.length; idxA++) {
            var origNode = nodes[idxA];
            var otherNode = nodes[idxA];
            for (var idxB = 0; idxB < idxA; idxB++) {
                if (equal[idxA][idxB] === 0) {
                    otherNode = newNodes[idxB];
                }
            }
            newNodes.push(otherNode);
            nodeMap.set(origNode, otherNode);
        }
        for (const node of nodes) {
            const transitions = node.mutableTransitions();
            for (const transition of transitions) {
                const newNode = nodeMap.get(transition.dest);
                if (newNode !== transition.dest) {
                    node.removeTransition(transition);
                    node.addTransition(newNode!, transition.char);
                }
            }
        }
    }

    public match(str: number[], curPos: number = 0): [number, number] | undefined | EOF {
        if (curPos == str.length) {
            return new EOF();
        }
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

    getTables(): string {
        var nodes: AutomatonNode[] = this.nodes();
        var nextState: number[][] = new Array();
        var accept: number[] = new Array();
        for (const node of nodes) {
            nextState.push(new Array());
            var arr = nextState[nextState.length - 1];
            // Initialize with the "no exit" value.
            for (var c = 0; c < 256; c++) {
                arr.push(nodes.length);
            }
            for (const transition of node.transitions()) {
                arr[transition.char!] = nodes.indexOf(transition.dest);
            }
            accept.push(node.out() === undefined ? -1 : node.out()!);
        }
        var str = 'new AutomatonData([';
        str += nextState.map(state => '[' + state.join(", ") + ']').join(",\n");
        str += ']';
        str += ', ';
        str += '[';
        str += accept.join(", ")
        str += ']';
        str += ", new Map())";
        return str;
    }
}