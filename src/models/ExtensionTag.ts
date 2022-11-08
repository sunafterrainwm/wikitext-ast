import { ArrayAble, pick } from '../util';

import { IParentNode } from './AbstractNode';
import { AttrList } from './Attr';
import { Document } from './Document';
import { Node } from './Node';
import { NodeCollection } from './NodeCollection';
import { AttrAbleTag, PartialEndTag, PartialStartTag } from './Tag';
import { EscapedWikitext } from './Wikitext';

export interface ExtensionTagOptions {
	startTag: PartialStartTag;
	endTag: PartialEndTag;
	attrList?: AttrList | undefined;
	children?: ArrayAble<Node> | undefined;
}
export abstract class AbstractExtensionTag extends AttrAbleTag implements IParentNode<Node> {
	public children: NodeCollection;
	public get hasChildren(): boolean {
		return !!this.children.length;
	}

	public startTag: PartialStartTag;
	public endTag: PartialEndTag;

	public constructor(rawContent: string, root: Document, options: ExtensionTagOptions) {
		super(
			rawContent, root, {
				rawTagName: options.startTag.rawTagName,
				...pick(options, ['attrList'])
			}
		);
		this.startTag = options.startTag;
		this.endTag = options.endTag;
		this.children = new NodeCollection(options.children);
	}
}

export class NormalExtensionTag extends AbstractExtensionTag {
}

export class EscapedExtensionTag extends AbstractExtensionTag implements IParentNode<EscapedWikitext> {
	public override children!: NodeCollection<EscapedWikitext>;

	public constructor(rawContent: string, root: Document, options: ExtensionTagOptions) {
		super(rawContent, root, {
			...options,
			children: Array.from(options.children ?? []).map(function (node) {
				return new EscapedWikitext(node, root);
			})
		});
	}
}

export function makeExtensionTag(rawContent: string, root: Document, options: ExtensionTagOptions): AbstractExtensionTag {
	const { tagName } = options.startTag;
	if (options.endTag.tagName !== tagName) {
		throw new Error('TagName of startTag (' + JSON.stringify(tagName) + ') and endTag (' + JSON.stringify(options.endTag.tagName) + ') must be match.');
	}

	if (!root.options.extraExtensionTags.has(tagName)) {
		throw new Error('ExtensionTag ' + JSON.stringify(tagName) + ' isn\'t exist.');
	}

	if (root.options.extraExtensionTags.get(tagName)?.isEscapeTag) {
		return new EscapedExtensionTag(rawContent, root, options);
	} else {
		return new NormalExtensionTag(rawContent, root, options);
	}
}

declare module './Node' {
	export interface NodeMap {
		NormalExtensionTag: NormalExtensionTag;
		EscapedExtensionTag: EscapedExtensionTag;
	}
}
