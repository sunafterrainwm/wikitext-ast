import { htmlSpecialChars, HtmlSpecialCharsOption } from '../util';

import { NodeText } from './NodeText';
import { RawPPNodeStore } from './PPNode';

export class Point {
	public constructor(
		public readonly text: string,
		public readonly start: number = 0
	) {
	}

	public static fromSlice(rawText: string, start = 0, end: number = rawText.length - 1): Point {
		return new this(rawText.slice(start, end), start);
	}

	public get end(): number {
		return this.start + this.text.length;
	}

	public get length(): number {
		return this.text.length;
	}

	public toString(): string {
		return this.text;
	}

	/**
	 * Returns a section of a string.
	 *
	 * @param {number} [start] The index to the beginning of the specified portion of stringObj.
	 * @param {number} [end] The index to the end of the specified portion of stringObj. The substring includes the characters up to, but not including, the character indicated by end.
	 * If this value is not specified, the substring continues to the end of stringObj.
	 *
	 * @return {Point}
	 */
	public slice(start = 0, end: number = this.text.length - 1): Point {
		return Point.fromSlice(this.text, start, end);
	}

	public plus(addText: string): Point {
		return new Point(this.text + addText, this.start);
	}
}

export class PointedNodeText extends NodeText {
	public readonly start: number;
	public readonly end: number;

	/**
	 * Construct an object using the data from $store[$index]. The rest of the
	 * store array can be accessed via getNextSibling().
	 *
	 * @param {Array} store
	 * @param {number} index
	 */
	public constructor(store: RawPPNodeStore, index: number) {
		const value = store[index];
		if (!(value instanceof Point)) {
			throw new Error('PPNode\\PointedNodeText given ' + (typeof value) + ' instead of Point');
		}
		store[index] = value.text;
		super(store, index);
		({ start: this.start, end: this.end } = value);
	}

	public override toString(): string {
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (globalThis.process?.env?.VERBOSE) {
			return '<text start="' + String(this.start) + '" end="' + String(this.end) + '">' + htmlSpecialChars(this.value, HtmlSpecialCharsOption.Compat) + '</text>';
		}
		return super.toString();
	}
}

export function mayPointGetText(text: string | Point): string {
	return typeof text === 'string' ? text : text.text;
}

export function mayPointPlus<T extends string | Point>(text: T, addText: string | Point): T {
	return typeof text === 'string' ? text + mayPointGetText(addText) as T : text.plus(mayPointGetText(addText)) as T;
}
