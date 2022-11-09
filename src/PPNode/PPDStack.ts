import { PPDPart } from './PPDPart';
import { PPDStackElement, PPDStackFlags } from './PPDStackElement';
import { RawPPNodeStore } from './PPNode';

/**
 * Stack class to help Preprocessor::preprocessToObj()
 */
export class PPDStack {
	public stack: PPDStackElement[] = [];
	public rootAccum: RawPPNodeStore = [];
	public accum: RawPPNodeStore = this.rootAccum;

	public top: PPDStackElement | false = false;
	public static readonly ElementClass = PPDStackElement;

	public static $false = false;

	public count(): number {
		return this.stack.length;
	}

	public getAccum(): RawPPNodeStore {
		return this.accum;
	}

	/**
	 * @return {false|PPDPart}
	 */
	public getCurrentPart(): PPDPart | false {
		if (this.top === false) {
			return false;
		} else {
			return this.top.getCurrentPart();
		}
	}

	private _getLastStackAccum(): PPDStackElement | false {
		const value = this.stack.pop();
		if (value) {
			this.stack.push(value);
			return value;
		}
		return false;
	}

	public push(data: PPDStackElement | ConstructorParameters<typeof PPDStackElement>[0]): void {
		const $class = PPDStack.ElementClass;
		if (data instanceof $class) {
			this.stack.push(data);
		} else {
			return this.push(new $class(data));
		}
		this.top = this._getLastStackAccum();
		this.accum = (this.top as PPDStackElement).getAccum();
	}

	public pop(): PPDStackElement {
		if (this.stack.length === 0) {
			throw new Error('PPDStack#pop: no elements remaining');
		}

		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const temp = this.stack.pop()!;

		if (this.stack.length) {
			this.top = this._getLastStackAccum();
			this.accum = (this.top as PPDStackElement).getAccum();
		} else {
			this.top = false;
			this.accum = this.rootAccum;
		}

		return temp;
	}

	public addPart(s = ''): void {
		(this.top as PPDStackElement).addPart(s);
		this.accum = (this.top as PPDStackElement).getAccum();
	}

	/**
	 * @return {Object}
	 */
	public getFlags(): PPDStackFlags {
		if (this.stack.length === 0) {
			return {
				findEquals: false,
				findPipe: false,
				inHeading: false
			};
		} else {
			return (this.top as PPDStackElement).getFlags();
		}
	}
}
