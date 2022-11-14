import { AbstractNode, IParentNode } from './AbstractNode';
import { IParser } from './IParser';
import { Node } from './Node';
import { NodeCollection } from './NodeCollection';
import { UnparsedWikitext } from './Wikitext';

export class Document extends AbstractNode implements IParentNode<Node> {
	public children: NodeCollection;
	public get hasChildren(): boolean {
		return !!this.children.length;
	}

	public constructor(parser: IParser, rawContent: string) {
		super(parser, rawContent);
		this.children = new NodeCollection();
		if (rawContent !== '') {
			this.children.push(new UnparsedWikitext(parser, rawContent));
		}
	}

	protected _waring: string[] = [];
	public get waring(): string[] {
		return this._waring.slice();
	}
}

declare module './Node' {
	export interface NodeMap {
		Document: Document;
	}
}
