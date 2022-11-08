import type { ArrayAble } from '../util';

import { INode } from './AbstractNode';
import type { Node } from './Node';

export class NodeCollection<N extends INode = Node> extends Array<N> {
	public constructor(items?: ArrayAble<N>) {
		super();
		if (items) {
			this.push(...Array.from(items));
		}
	}

	public item(index: number): N | null {
		return this[index] ?? null;
	}

	public concatInto(...items: Array<ArrayAble<N> | NodeCollection<N>>): this {
		for (const item of items) {
			this.push(...Array.from(item));
		}
		return this;
	}

	public override toString(): string {
		return super.map(function (node) {
			return node.rawContent;
		}).join('');
	}
}
