import { ArrayAble, pick } from '../util';

import { IParentNode } from './AbstractNode';
import { AttrList } from './Attr';
import type { IParser } from './IParser';
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

	public constructor(parser: IParser, rawContent: string, options: ExtensionTagOptions) {
		super(
			parser, rawContent, {
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

	public constructor(parser: IParser, rawContent: string, options: ExtensionTagOptions) {
		super(parser, rawContent, {
			...options,
			children: Array.from(options.children ?? []).map(function (node) {
				return new EscapedWikitext(node, parser);
			})
		});
	}
}

export function makeExtensionTag(parser: IParser, rawContent: string, options: ExtensionTagOptions): AbstractExtensionTag {
	const { tagName } = options.startTag;
	if (options.endTag.tagName !== tagName) {
		throw new Error('TagName of startTag (' + JSON.stringify(tagName) + ') and endTag (' + JSON.stringify(options.endTag.tagName) + ') must be match.');
	}

	if (!parser.options.extraExtensionTags.has(tagName)) {
		throw new Error('ExtensionTag ' + JSON.stringify(tagName) + ' isn\'t exist.');
	}

	if (parser.options.extraExtensionTags.get(tagName)?.isEscapeTag) {
		return new EscapedExtensionTag(parser, rawContent, options);
	} else {
		return new NormalExtensionTag(parser, rawContent, options);
	}
}

declare module './Node' {
	export interface NodeMap {
		NormalExtensionTag: NormalExtensionTag;
		EscapedExtensionTag: EscapedExtensionTag;
	}
}
