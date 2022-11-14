import type { ArrayAble } from '../util';

import { AbstractNode, IHiddenNode } from './AbstractNode';
import { AttrList } from './Attr';
import { makeExtensionTag } from './ExtensionTag';
import { HtmlTag, isAllowHtmlTag } from './HtmlTag';
import type { IParser } from './IParser';
import type { Node } from './Node';
import { NodeCollection } from './NodeCollection';
import { EscapedWikitext } from './Wikitext';

export type ValidTagName = string;

export function getRegularTagName(tagName: string): ValidTagName {
	return tagName.trim().toLowerCase(); // TODO
}

export interface TagOptions {
	rawTagName: string;
}
export abstract class AbstractTag extends AbstractNode {
	public rawTagName: string;

	public constructor(parser: IParser, rawContent: string, options: TagOptions) {
		super(parser, rawContent);
		this.rawTagName = options.rawTagName;
	}

	public get tagName(): ValidTagName {
		return getRegularTagName(this.rawTagName);
	}
}

export interface AttrAbleTagOptions extends TagOptions {
	attrList?: AttrList | undefined;
}
export abstract class AttrAbleTag extends AbstractTag {
	public attrList: AttrList;

	public constructor(parser: IParser, rawContent: string, options: AttrAbleTagOptions) {
		super(parser, rawContent, options);

		this.attrList = options.attrList ?? new AttrList(parser, '', {});
	}

	public get rawAttrList(): string {
		return this.attrList.rawContent;
	}
}

export class PartialStartTag extends AttrAbleTag {
}

export class PartialEndTag extends AbstractTag {
}

export class SelfCloseTag extends AttrAbleTag {
}

export class ForceAddEndTag extends PartialEndTag {
	public constructor(tagName: string, parser: IParser) {
		super(parser, '', { rawTagName: tagName });
	}
}

export class DeleteAbleEndTag extends PartialEndTag implements IHiddenNode {
	public readonly isHidden = true as const;

	public constructor(base: PartialEndTag);
	public constructor(parser: IParser, rawContent: string, options: TagOptions);
	public constructor(parser: IParser | PartialEndTag, rawContent?: string, options?: TagOptions) {
		let pRawContent: string, pParser: IParser, pOptions: TagOptions;
		if (parser instanceof PartialEndTag || rawContent === undefined) {
			pParser = (parser as PartialEndTag).parser;
			pRawContent = (parser as PartialEndTag).rawContent;
			pOptions = options ?? (parser as PartialEndTag);
		} else {
			pParser = parser;
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			pRawContent = rawContent!;
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			pOptions = options!;
		}
		super(pParser, pRawContent, pOptions);
	}
}

export function mergeTag(
	parser: IParser,
	startTag: PartialStartTag,
	endTag?: PartialEndTag,
	attrList?: AttrList,
	children?: ArrayAble<Node>
): NodeCollection {
	const { tagName } = startTag;
	if (endTag && endTag.tagName !== tagName) {
		throw new Error('TagName of startTag (' + JSON.stringify(tagName) + ') and endTag (' + JSON.stringify(endTag.tagName) + ') must be match.');
	}

	const rawContent = startTag.rawContent + new NodeCollection(children).toString() + (endTag?.rawContent ?? '');

	const collect = new NodeCollection();
	if (endTag && parser.options.extraExtensionTags.has(tagName)) {
		// tagName is a valid extension tag name
		// and endTag is exist.
		// Building a Extension tag
		collect.push(makeExtensionTag(parser, rawContent, { startTag, endTag, attrList, children }));
	} else if (isAllowHtmlTag(tagName)) {
		// tagName is a valid html tag name
		// Building a Html tag
		collect.push(new HtmlTag(parser, rawContent, { startTag, endTag, attrList, children }));
	} else {
		// Isn't valid.
		// escape and ignore those tag.
		collect.push(new EscapedWikitext(startTag, parser));
		if (children) {
			collect.concatInto(children);
		}
		if (endTag) {
			collect.push(new EscapedWikitext(endTag, parser));
		}
	}
	return collect;
}

declare module './Node' {
	export interface NodeMap {
		PartialStartTag: PartialStartTag;
		PartialEndTag: PartialEndTag;
		SelfCloseTag: SelfCloseTag;
		ForceAddEndTag: ForceAddEndTag;
		DeleteAbleEndTag: DeleteAbleEndTag;
	}
}
