import { htmlSpecialChars, HtmlSpecialCharsOption } from '../util';

import { SiblingPPNode, RawPPNodeStore } from './PPNode';

export class NodeText extends SiblingPPNode {
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
		const value = store[index];
		if (typeof value !== 'string') {
			throw new Error('PPNode\\NodeText given ' + (typeof value) + ' instead of string');
		}
		this.value = value;
	}

	public override toString(): string {
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (globalThis.process?.env?.VERBOSE) {
			return '<text>' + htmlSpecialChars(this.value, HtmlSpecialCharsOption.Compat) + '</text>';
		}
		return htmlSpecialChars(this.value, HtmlSpecialCharsOption.Compat);
	}

	public override getName(): '#text' {
		return '#text' as const;
	}
}
