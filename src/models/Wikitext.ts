import { AbstractNode, INode } from './AbstractNode';
import { Document } from './Document';

export type ValidTagName = string;

export abstract class AbstractWikitext extends AbstractNode {
	public constructor(rawContent: string, root: Document) {
		super(rawContent, root);
	}
}

export class UnparsedWikitext extends AbstractWikitext {
}

export class EscapedWikitext extends AbstractWikitext {
	public constructor(parent: INode, root: Document) {
		super(parent.rawContent, root);
	}
}

declare module './Node' {
	export interface NodeMap {
		UnparsedWikitext: UnparsedWikitext;
		EscapedWikitext: EscapedWikitext;
	}
}
