import { PPNode, SiblingPPNode } from './PPNode';

export class NodeArray extends PPNode {
	public constructor(public value: SiblingPPNode[]) {
		super();
	}

	public override toString(): string {
		return this.value.map(function (node) {
			return node.toString();
		}).join('');
	}

	/**
	 * Returns the length of the array, or false if this is not an array-type node
	 *
	 * @return {number}
	 */
	public getLength(): number {
		return this.value.length;
	}

	/**
	 * Returns an item of an array-type node
	 *
	 * @param {number} index
	 * @return {null|PPNode}
	 */
	public item(index: number): PPNode | null {
		return this.value[index] ?? null;
	}

	public override getName(): string {
		return '#nodelist';
	}
}
