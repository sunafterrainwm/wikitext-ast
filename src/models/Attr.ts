import { ArrayAble } from '../util';

import { AbstractNode } from './AbstractNode';
import { Document } from './Document';
import type { Node } from './Node';
import { NodeCollection } from './NodeCollection';

export interface AttrOptions {
	name: string | Node;
	value: string | Node;
}
export class Attr extends AbstractNode {
	public name: string | Node;
	public value: string | Node;

	public constructor(rawContent: string, root: Document, options: AttrOptions) {
		super(rawContent, root);
		this.name = options.name;
		this.value = options.value;
	}
}

export interface AttrListOptions {
	attrs?: ArrayAble<Attr>;
}
export class AttrList extends AbstractNode {
	public attrList: NodeCollection<Attr>;

	public constructor(rawContent: string, root: Document, options: AttrListOptions) {
		super(rawContent, root);
		this.attrList = new NodeCollection(options.attrs);
	}
}

declare module './Node' {
	export interface NodeMap {
		Attr: Attr;
		AttrList: AttrList;
	}
}
