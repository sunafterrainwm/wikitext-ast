import { htmlSpecialChars, HtmlSpecialCharsOption } from '../util';

import { PPNode } from './PPNode';
import { Tree } from './Tree';

export class Text extends PPNode<string> {
	/**
	 * Construct an object using the data from $store[$index]. The rest of the
	 * store array can be accessed via getNextSibling().
	 *
	 * @param array $store
	 * @param int $index
	 */
	public constructor(store: PPNode[], index: number ) {
		super(store, index);
		if (typeof this.value !== "string") {
			throw new Error('PPNode\\Text given object instead of string');
		}
	}

	public toString() {
		return htmlSpecialChars( this.value, HtmlSpecialCharsOption.Compat );
	}

	public getNextSibling() {
		return Tree.factory( this.store, this.index + 1 );
	}

	public getChildren() {
		return false;
	}

	public getFirstChild() {
		return false;
	}

	public getChildrenOfType( $name ) {
		return false;
	}

	public getLength() {
		return false;
	}

	public item( $i ) {
		return false;
	}

	public getName() {
		return '#text';
	}

	public splitArg() {
		throw new Error('PPNode\\Text.splitArg: not supported');
	}

	public splitExt() {
		throw new Error('PPNode\\Text.splitExt: not supported');
	}

	public splitHeading() {
		throw new Error('PPNode\\Text.splitHeading: not supported');
	}
}