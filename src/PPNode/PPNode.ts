import type { Point } from './PointedNodeText';

/**
 * There are three types of nodes:
 *     Tree nodes, which have a name and contain other nodes as children
 *     Array nodes, which also contain other nodes but aren't considered part of a tree
 *     Leaf nodes, which contain the actual data
 *
 * This interface provides access to the tree structure and to the contents of array nodes,
 * but it does not provide access to the internal structure of leaf nodes. Access to leaf
 * data is provided via two means:
 *     PPFrame::expand(), which provides expanded text
 *     The PPNode::split*() functions, which provide metadata about certain types of tree node
 *
 */
export abstract class PPNode {
	/**
	 * Get the name of this node. The following names are defined here:
	 *
	 *    h             A heading node.
	 *    template      A double-brace node.
	 *    tplarg        A triple-brace node.
	 *    title         The first argument to a template or tplarg node.
	 *    part          Subsequent arguments to a template or tplarg node.
	 *    #nodelist     An array-type node
	 *
	 * The subclass may define various other names for tree and leaf nodes.
	 *
	 * @return string
	 */
	public abstract getName(): string;

	public abstract toString(): string;
}

export abstract class SiblingPPNode extends PPNode {
	public constructor(public store: RawPPNodeStore, public index: number) {
		super();
	}

	/**
	 * Get the next sibling of any node. False if there isn't one.
	 * Note that this will return a temporary proxy object:
	 * different instances will be returned
	 * if this is called more than once on the same node.
	 *
	 * @return {false|PPNode}
	 */
	public getNextSibling(): false | SiblingPPNode {
		// This function is defined in NodeTree.ts
		// because if importing NodeTree from NodeTree.ts to define this function,
		// the circular reference will break something.
		return false;
	}
}

export type RawPPNode = string | Point | [ string, RawPPNodeStore ];

export type RawPPNodeStore = RawPPNode[];
