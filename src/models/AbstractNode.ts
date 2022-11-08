import type { Document } from './Document';
import type { NodeCollection } from './NodeCollection';

export abstract class AbstractNode<ISRoot = false> {
	public constructor(protected _rawContent: string, protected _root: ISRoot extends true ? undefined : Document) {
	}

	public get root(): ISRoot extends true ? undefined : Document {
		return this._root;
	}

	public get rawContent(): string {
		return this._rawContent;
	}

	public toString(): string {
		return this._rawContent;
	}
}

export interface INode extends AbstractNode<boolean> { }

export interface IParentNode<N extends INode = AbstractNode> {
	children: NodeCollection<N>;
	get hasChildren(): boolean;
}

export interface IHiddenNode {
	isHidden: true;
}

class NullNode extends AbstractNode<true> {
	public constructor() {
		super('', undefined);
	}
}

export const nullNode = new NullNode();
