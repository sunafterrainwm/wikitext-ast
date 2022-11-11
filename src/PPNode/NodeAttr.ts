import { htmlSpecialChars, HtmlSpecialCharsOption } from '../util';

import { NodeTree } from './NodeTree';
import { SiblingPPNode, RawPPNodeStore } from './PPNode';

export class NodeAttr extends SiblingPPNode {
	public name: string;
	public value: string;

	/**
	 * Construct an object using the data from $store[$index]. The rest of the
	 * store array can be accessed via getNextSibling().
	 *
	 * @param {Array} store
	 * @param {number} index
	 */
	public constructor(store: RawPPNodeStore, index: number) {
		super(store, index);
		const descriptor = store[index];
		if (descriptor === undefined || !Array.isArray(descriptor) || !descriptor[NodeTree.NAME].startsWith('@')) {
			throw new Error('PPNode\\NodeAttr#constructor: invalid name in attribute descriptor');
		}
		this.name = descriptor[NodeTree.NAME].slice(1);
		this.value = descriptor[NodeTree.CHILDREN][0] as string;
	}

	public override toString(): string {
		return '<@' + this.name + '>' + htmlSpecialChars(this.value, HtmlSpecialCharsOption.Compat) + '<@' + this.name + '>';
	}

	public override getName(): string {
		return this.name;
	}
}
