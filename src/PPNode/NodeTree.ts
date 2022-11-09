import { htmlSpecialChars, HtmlSpecialCharsOption } from '../util';

import { NodeArray } from './NodeArray';
import { NodeAttr } from './NodeAttr';
import { NodeText } from './NodeText';
import { SiblingPPNode, PPNode, RawPPNodeStore } from './PPNode';

export type AllSiblingPPNode = NodeTree | NodeAttr | NodeText;

export interface SplitArgObj {
	/** PPNode name */
	name: NodeTree;
	/** String index */
	index: string;
	/** PPNode value */
	value: NodeTree;
}

export interface SplitExtObj {
	name: NodeTree;
	attr?: NodeTree;
	inner?: NodeTree;
	close?: NodeTree;
}

export interface SplitHeadingObj {
	i: string;
	level: string;
}

export interface SplitTemplateObj {
	title: PPNode;
	lineStart: string;
	parts: NodeArray;
}

export class NodeTree extends SiblingPPNode {
	public name: string;

	/**
	 * The store array for children of this node. It is "raw" in the sense that
	 * nodes are two-element arrays ("descriptors") rather than PPNode_Hash_*
	 * objects.
	 *
	 * @member array
	 */
	private readonly rawChildren: RawPPNodeStore;

	/**
	 * The offset of the name within descriptors, used in some places for
	 * readability.
	 */
	public static readonly NAME = 0;

	/**
	 * The offset of the child list within descriptors, used in some places for
	 * readability.
	 */
	public static readonly CHILDREN = 1;

	/**
	 * Construct an object using the data from $store[$index]. The rest of the
	 * store array can be accessed via getNextSibling().
	 *
	 * @param {Array} store
	 * @param {number} index
	 */
	public constructor(store: RawPPNodeStore, index: number) {
		super(store, index);
		const value = store[index];
		if (!Array.isArray(value)) {
			throw new Error('PPNode\\Tree given unknown instead of array');
		}
		[this.name, this.rawChildren] = value;
	}

	/**
	 * Construct an appropriate PPNode_Hash_* object with a class that depends
	 * on what is at the relevant store index.
	 *
	 * @param {Array} store
	 * @param {number} index
	 * @return {PPNode|false}
	 */
	public static factory<FORCE = false>(store: RawPPNodeStore, index: number): FORCE extends true ? AllSiblingPPNode : AllSiblingPPNode | false;
	public static factory(store: RawPPNodeStore, index: number): AllSiblingPPNode | false {
		const descriptor = store[index];
		if (descriptor === undefined) {
			return false;
		}

		let $class: new (store: RawPPNodeStore, index: number) => AllSiblingPPNode;

		if (typeof descriptor === 'string') {
			$class = NodeText;
		} else if (Array.isArray(descriptor)) {
			if (descriptor[NodeTree.NAME].startsWith('@')) {
				$class = NodeAttr;
			} else {
				$class = NodeTree;
			}
		} else {
			throw new Error('NodeTree.factory: invalid node descriptor');
		}

		return new $class(store, index);
	}

	/**
	 * Convert a node to XML, for debugging
	 *
	 * @return {string}
	 */
	public override toString(): string {
		let inner = '';
		let attribs = '';
		let node: false | SiblingPPNode = this.getFirstChild();
		while (node !== false) {
			if (node instanceof NodeAttr) {
				attribs += ' ' + node.name + '="' + htmlSpecialChars(node.value, HtmlSpecialCharsOption.Compat) + '"';
			} else {
				inner += node.toString();
			}
			node = node.getNextSibling();
		}
		if (inner === '') {
			return '<' + this.name + attribs + '/>';
		} else {
			return '<' + this.name + attribs + '>' + inner + '</' + this.name + '>';
		}
	}

	/**
	 * Get an array-type node containing the children of this node.
	 * Returns false if this is not a tree node.
	 *
	 * @return {false|PPNode}
	 */
	public getChildren(): NodeArray {
		const children: SiblingPPNode[] = [];
		this.rawChildren.forEach(function (_child, i, rawChildren) {
			children.push(NodeTree.factory<true>(rawChildren, i));
		});
		return new NodeArray(children);
	}

	/**
	 * Get the first child, or false if there is none. Note that this will
	 * return a temporary proxy object: different instances will be returned
	 * if this is called more than once on the same node.
	 *
	 * @return {NodeTree|NodeAttr|NodeText|false}
	 */
	public getFirstChild(): false | NodeTree | NodeAttr | NodeText {
		const children = this.rawChildren[0];
		if (children !== undefined) {
			return NodeTree.factory(this.rawChildren, 0);
		}
		return false;
	}

	/**
	 * Get an array of the children with a given node name
	 *
	 * @param {string} name
	 * @return {NodeArray}
	 */
	public getChildrenOfType(name: string): NodeArray {
		const children: SiblingPPNode[] = [];
		this.rawChildren.forEach(function (child, i, rawChildren) {
			if (Array.isArray(child) && child[NodeTree.NAME] === name) {
				children.push(NodeTree.factory<true>(rawChildren, i));
			}
		});
		return new NodeArray(children);
	}

	/**
	 * Get the raw child array. For internal use.
	 *
	 * @return {Array}
	 */
	public getRawChildren(): RawPPNodeStore {
		return this.rawChildren;
	}

	public override getName(): string {
		return this.name;
	}

	/**
	 * Split a "<part>" node into an associative array containing:
	 *  - name          PPNode name
	 *  - index         String index
	 *  - value         PPNode value
	 *
	 * @throws MWException
	 * @return {Object}
	 */
	public splitArg(): SplitArgObj {
		return NodeTree.splitRawArg(this.rawChildren);
	}

	/**
	 * Like splitArg() but for a raw child array. For internal use only.
	 *
	 * @param {Array} children
	 * @return {Object}
	 */
	public static splitRawArg(children: RawPPNodeStore): SplitArgObj {
		const bits: Partial<SplitArgObj> = {};

		children.forEach(function (child, i) {
			if (!Array.isArray(child)) {
				return;
			}

			if (child[NodeTree.NAME] === 'name') {
				bits.name = new NodeTree(children, i);
				if (child[NodeTree.CHILDREN][0]?.[NodeTree.NAME] === '@index') {
					// @ts-expect-error TS2322
					bits.index = child[NodeTree.CHILDREN][0]?.[NodeTree.CHILDREN][0];
				}
			} else if (child[NodeTree.NAME] === 'value') {
				bits.value = new NodeTree(children, i);
			}
		});

		if (!bits.name) {
			throw new Error('Invalid brace node passed to NodeTree.splitRawArg');
		}
		if (!bits.index) {
			bits.index = '';
		}
		return bits as SplitArgObj;
	}

	/**
	 * Split an "<ext>" node into an associative array containing name, attr, inner and close
	 * All values in the resulting array are PPNodes. Inner and close are optional.
	 *
	 * @return {Object}
	 */
	public splitExt(): SplitExtObj {
		return NodeTree.splitRawExt(this.rawChildren);
	}

	/**
	 * Like splitExt() but for a raw child array. For internal use only.
	 *
	 * @param {Array} children
	 * @return {Object}
	 */
	public static splitRawExt(children: RawPPNodeStore): SplitExtObj {
		const bits: Partial<SplitExtObj> = {};

		children.forEach(function (child, i) {
			if (!Array.isArray(child)) {
				return;
			}

			switch (child[NodeTree.NAME]) {
				case 'name':
					bits.name = new NodeTree(children, i);
					break;
				case 'attr':
					bits.attr = new NodeTree(children, i);
					break;
				case 'inner':
					bits.inner = new NodeTree(children, i);
					break;
				case 'close':
					bits.close = new NodeTree(children, i);
					break;
			}
		});

		if (!bits.name) {
			throw new Error('Invalid ext node passed to NodeTree.splitRawExt');
		}
		return bits as SplitExtObj;
	}

	/**
	 * Split an "<h>" node
	 *
	 * @return {Object}
	 */
	public splitHeading(): SplitHeadingObj {
		if (this.name !== 'h') {
			throw new Error('Invalid h node passed to NodeTree#splitHeading');
		}
		return NodeTree.splitRawHeading(this.rawChildren);
	}

	/**
	 * Like splitHeading() but for a raw child array. For internal use only.
	 *
	 * @param {Array} children
	 * @return {Object}
	 */
	public static splitRawHeading(children: RawPPNodeStore): SplitHeadingObj {
		const bits: Partial<SplitHeadingObj> = {};

		children.forEach(function (child, i) {
			if (!Array.isArray(child)) {
				return;
			}

			switch (child[NodeTree.NAME]) {
				case '@i':
					bits.i = child[NodeTree.CHILDREN][0] as string;
					break;
				case 'attr':
					bits.level = child[NodeTree.CHILDREN][0] as string;
			}
		});
		if (!bits.i) {
			throw new Error('Invalid h node passed to NodeTree.splitRawHeading');
		}
		return bits as SplitHeadingObj;
	}

	/**
	 * Split a "<template>" or "<tplarg>" node
	 *
	 * @return {Object}
	 */
	public splitTemplate(): SplitTemplateObj {
		return NodeTree.splitRawTemplate(this.rawChildren);
	}

	/**
	 * Like splitTemplate() but for a raw child array. For internal use only.
	 *
	 * @param {Array} children
	 * @return {Object}
	 */
	public static splitRawTemplate(children: RawPPNodeStore): SplitTemplateObj {
		const parts: NodeTree[] = [];
		const bits: Partial<SplitTemplateObj> = {
			lineStart: ''
		};
		children.forEach(function (child, i) {
			if (!Array.isArray(child)) {
				return;
			}

			switch (child[NodeTree.NAME]) {
				case 'title':
					bits.title = new NodeTree(children, i);
					break;
				case 'part':
					parts.push(new NodeTree(children, i));
					break;
				case '@lineStart':
					bits.lineStart = '1';
					break;
			}
		});
		if (!bits.title) {
			throw new Error('Invalid node passed to NodeTree.splitRawTemplate');
		}
		bits.parts = new NodeArray(parts);
		return bits as SplitTemplateObj;
	}
}
