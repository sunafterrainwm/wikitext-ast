import { AbstractNode, INode } from './AbstractNode';
import { IParser } from './IParser';

export type ValidTagName = string;

export abstract class AbstractWikitext extends AbstractNode {
	public constructor(parser: IParser, rawContent: string) {
		super(parser, rawContent);
	}
}

export class UnparsedWikitext extends AbstractWikitext {
}

export class EscapedWikitext extends AbstractWikitext {
	public constructor(parent: INode, parser: IParser) {
		super(parser, parent.rawContent);
	}
}

declare module './Node' {
	export interface NodeMap {
		UnparsedWikitext: UnparsedWikitext;
		EscapedWikitext: EscapedWikitext;
	}
}
