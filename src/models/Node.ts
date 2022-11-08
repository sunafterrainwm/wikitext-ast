import type { INode, IHiddenNode, IParentNode } from './AbstractNode';
import { NodeCollection } from './NodeCollection';

export function isParentNode(node: Node): node is ParentNode {
	return 'children' in node && node.children instanceof NodeCollection;
}

export function isHiddenNode(node: Node): node is HiddenNode {
	return 'isHidden' in node && node.isHidden;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface NodeMap {
	// TODO
}

export type Node = Extract<NodeMap[ keyof NodeMap ], INode>;
export type ParentNode = Extract<Node, IParentNode>;
export type HiddenNode = Extract<Node, IHiddenNode>;
