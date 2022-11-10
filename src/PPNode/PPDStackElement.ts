import { PPDPart } from './PPDPart';
import { RawPPNodeStore } from './PPNode';

export interface PPDStackElementOptions {
	/**
	 * Opening character (\n for heading)
	 */
	open: string;

	/**
	 * Matching closing character
	 */
	close: string;

	/**
	 * Saved prefix that may affect later processing,
	 *  e.g. to differentiate `-{{{{` and `{{{{` after later seeing `}}}`.
	 */
	savedPrefix?: string;

	/**
	 * Start offset of this element in the source wikitext
	 */
	startPos?: number;

	/**
	 * Number of opening characters found (number of "=" for heading)
	 */
	count: number;

	/**
	 * Array of PPDPart objects describing pipe-separated parts.
	 */
	parts?: PPDPart[];

	/**
	 * True if the open char appeared at the start of the input line.
	 * Not set for headings.
	 */
	lineStart?: boolean;
}

export interface PPDStackFlags {
	findPipe: boolean;
	findEquals: boolean;
	inHeading: boolean;
}

export class PPDStackElement implements PPDStackElementOptions {
	/**
	 * Opening character (\n for heading)
	 */
	public open!: string;

	/**
	 * Matching closing character
	 */
	public close!: string;

	/**
	 * Saved prefix that may affect later processing,
	 *  e.g. to differentiate `-{{{{` and `{{{{` after later seeing `}}}`.
	 */
	public savedPrefix = '';

	/**
	 * Start offset of this element in the source wikitext
	 */
	public startPos!: number;

	/**
	 * Number of opening characters found (number of "=" for heading)
	 */
	public count!: number;

	/**
	 * Array of PPDPart objects describing pipe-separated parts.
	 */
	public parts: PPDPart[];

	/**
	 * True if the open char appeared at the start of the input line.
	 *  Not set for headings.
	 */
	public lineStart = false;

	public static PartClass = PPDPart;

	public constructor(data: PPDStackElementOptions) {
		this.parts = [new PPDStackElement.PartClass()];

		Object.assign(this, data);
	}

	private _getLastPartAccum(): PPDPart | null {
		const value = this.parts.pop();
		if (value) {
			this.parts.push(value);
			return value;
		}
		return null;
	}

	public getAccum(): RawPPNodeStore {
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		return this._getLastPartAccum()!.out;
	}

	public addPart(s = ''): void {
		this.parts.push(new PPDStackElement.PartClass(s));
	}

	public getCurrentPart(): PPDPart {
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		return this._getLastPartAccum()!;
	}

	/**
	 * @return {Object}
	 */
	public getFlags(): PPDStackFlags {
		const partCount = this.parts.length;
		const findPipe = this.open !== '\n' && this.open !== '[';
		return {
			findPipe,
			findEquals: findPipe && partCount > 1 && !this.getCurrentPart().eqpos,
			inHeading: this.open === '\n'
		};
	}

	/**
	 * Get the accumulator that would result if the close is not found.
	 *
	 * @param {number | false} openingCount
	 * @return {Array}
	 */
	public breakSyntax(openingCount: number | false = false): RawPPNodeStore {
		let accum: RawPPNodeStore;
		if (this.open === '\n') {
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			accum = [this.savedPrefix, ...this.parts[0]!.out];
		} else {
			if (openingCount === false) {
				openingCount = this.count;
			}
			let s = this.open.slice(0, -1);
			s += this.open.slice(-1).repeat(openingCount - s.length);
			accum = [this.savedPrefix + s];
			let lastIndex = 0;
			let first = true;
			for (const part of this.parts) {
				if (first) {
					first = false;
				} else if (typeof accum[lastIndex] === 'string') {
					(accum[lastIndex] as string) += '|';
				} else {
					accum[++lastIndex] = '|';
				}

				for (const node of part.out) {
					if (typeof node === 'string' && typeof accum[lastIndex] === 'string') {
						(accum[lastIndex] as string) += node;
					} else {
						accum[++lastIndex] = node;
					}
				}
			}
		}
		return accum;
	}
}
