import { IParser } from './IParser';
import type { NodeCollection } from './NodeCollection';

export abstract class AbstractNode {
	public constructor(protected _parser: IParser, protected _rawContent: string) {
	}

	public get parser(): IParser {
		return this._parser;
	}

	public get rawContent(): string {
		return this._rawContent;
	}

	public toString(): string {
		return this._rawContent;
	}
}

export interface INode extends AbstractNode { }

export interface IParentNode<N extends INode = AbstractNode> {
	children: NodeCollection<N>;
	get hasChildren(): boolean;
}

export interface IHiddenNode {
	isHidden: true;
}
