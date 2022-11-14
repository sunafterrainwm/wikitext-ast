import { ArrayAble, pick } from '../util';

import type { IParentNode } from './AbstractNode';
import { AttrList } from './Attr';
import type { IParser } from './IParser';
import type { Node } from './Node';
import { NodeCollection } from './NodeCollection';
import { AttrAbleTag, ForceAddEndTag, PartialEndTag, PartialStartTag } from './Tag';

export const allowHtmlTagNames = [
	'abbr', 'b', 'bdi', 'cite', 'code', 'dd', 'dfn', 'dt', 'em', 'i', 'kbd', 'mark',
	'rp', 'rt', 'ruby', 's', 'samp', 'section', 'small', 'strong', 'sub', 'sup', 'u',
	'var', 'wbr', 'data', 'div', 'dl', 'font', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
	'hr', 'li', 'del', 'ins', 'ol', 'p', 'pre', 'blockquote', 'q', 'source', 'span',
	'caption', 'th', 'td', 'table', 'time', 'tr', 'ul'
];

export function isAllowHtmlTag(tagName: string): boolean {
	return allowHtmlTagNames.includes(tagName);
}

export interface HtmlTagOptions {
	startTag: PartialStartTag;
	endTag?: PartialEndTag | undefined;
	attrList?: AttrList | undefined;
	children?: ArrayAble<Node> | undefined;
}
export class HtmlTag extends AttrAbleTag implements IParentNode<Node> {
	public children: NodeCollection;
	public get hasChildren(): boolean {
		return !!this.children.length;
	}

	public startTag: PartialStartTag;
	public endTag: PartialEndTag;

	public constructor(parser: IParser, rawContent: string, options: HtmlTagOptions) {
		const { rawTagName, tagName } = options.startTag;
		super(
			parser, rawContent, {
				rawTagName,
				...pick(options, ['attrList'])
			}
		);
		this.startTag = options.startTag;
		if (options.endTag) {
			if (options.endTag.tagName !== tagName) {
				throw new Error('TagName of startTag (' + JSON.stringify(tagName) + ') and endTag (' + JSON.stringify(options.endTag.tagName) + ') must be match.');
			}
			this.endTag = options.endTag;
		} else {
			this.endTag = new ForceAddEndTag(tagName, parser);
		}
		if (!isAllowHtmlTag(tagName)) {
			throw new Error(JSON.stringify(tagName) + 'is\'t a allowed html tag.');
		}

		this.children = new NodeCollection(options.children);
	}
}

declare module './Node' {
	export interface NodeMap {
		HtmlTag: HtmlTag;
	}
}
