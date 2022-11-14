import { ArrayAble } from '../util';

import { AbstractNode } from './AbstractNode';
import type { IParser } from './IParser';
import type { Node } from './Node';
import { NodeCollection } from './NodeCollection';

export interface AttrOptions {
	name: string | Node;
	value: string | Node;
}
export class Attr extends AbstractNode {
	public name: string | Node;
	public value: string | Node;

	public constructor(parser: IParser, rawContent: string, options: AttrOptions) {
		super(parser, rawContent);
		this.name = options.name;
		this.value = options.value;
	}
}

export interface AttrListOptions {
	attrs?: ArrayAble<Attr>;
}
export class AttrList extends AbstractNode {
	public attrList: NodeCollection<Attr>;

	public constructor(parser: IParser, rawContent: string, options: AttrListOptions) {
		super(parser, rawContent);
		this.attrList = new NodeCollection(options.attrs);
	}
}

declare module './Node' {
	export interface NodeMap {
		Attr: Attr;
		AttrList: AttrList;
	}
}
