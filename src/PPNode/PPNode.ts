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
export abstract class PPNode<T> {
	public value: T;
	
	public constructor(public store: PPNode[], public index: number) {
		this.value = store[index];
	}

	/**
	 * Get an array-type node containing the children of this node.
	 * Returns false if this is not a tree node.
	 *
	 * @return false|PPNode
	 */
	public abstract getChildren(): PPNode | false;

	/**
	 * Get the first child of a tree node. False if there isn't one.
	 *
	 * @return false|PPNode
	 */
	public abstract getFirstChild(): false | PPNode;

	/**
	 * Get the next sibling of any node. False if there isn't one
	 *
	 * @return false|PPNode
	 */
	public abstract getNextSibling(): false | PPNode;

	/**
	 * Get all children of this tree node which have a given name.
	 * Returns an array-type node, or false if this is not a tree node.
	 *
	 * @param {string} $type
	 * @return false|PPNode
	 */
	public abstract getChildrenOfType($type: string): false | PPNode;

	/**
	 * Returns the length of the array, or false if this is not an array-type node
	 */
	public abstract getLength(): number | false;

	/**
	 * Returns an item of an array-type node
	 *
	 * @param int $i
	 * @return bool|PPNode
	 */
	public abstract item($i: number): boolean | PPNode;

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

	/**
	 * Split a "<part>" node into an associative array containing:
	 *    name          PPNode name
	 *    index         String index
	 *    value         PPNode value
	 *
	 * @return array
	 */
	public abstract splitArg(): string[];

	/**
	 * Split an "<ext>" node into an associative array containing name, attr, inner and close
	 * All values in the resulting array are PPNodes. Inner and close are optional.
	 *
	 * @return array
	 */
	public abstract splitExt(): string[];

	/**
	 * Split an "<h>" node
	 *
	 * @return array
	 */
	public abstract splitHeading(): string[];
}
