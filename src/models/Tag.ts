import type { ArrayAble } from '../util';

import { AbstractNode, IHiddenNode, nullNode } from './AbstractNode';
import { AttrList } from './Attr';
import type { Document } from './Document';
import { makeExtensionTag } from './ExtensionTag';
import { HtmlTag, isAllowHtmlTag } from './HtmlTag';
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

	public constructor(rawContent: string, root: Document, options: TagOptions) {
		super(rawContent, root);
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

	public constructor(rawContent: string, root: Document, options: AttrAbleTagOptions) {
		super(rawContent, root, options);

		this.attrList = options.attrList ?? new AttrList('', root, {});
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
	public constructor(tagName: string, root: Document) {
		super('', root, { rawTagName: tagName });
	}
}

export class DeleteAbleEndTag extends PartialEndTag implements IHiddenNode {
	public readonly isHidden = true as const;

	public constructor(base: PartialEndTag);
	public constructor(rawContent: string, root: Document, options: TagOptions);
	public constructor(rawContent: string | PartialEndTag, root?: Document, options?: TagOptions) {
		let pRawContent: string, pRoot: Document, pOptions: TagOptions;
		if (typeof rawContent === 'string') {
			pRawContent = rawContent;
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			pRoot = root!;
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			pOptions = options!;
		} else {
			pRawContent = rawContent.rawContent;
			pRoot = root ?? rawContent.root;
			pOptions = options ?? rawContent;
		}
		super(pRawContent, pRoot, pOptions);
	}
}

export function mergeTag(
	root: Document,
	startTag: PartialStartTag,
	endTag?: PartialEndTag,
	attrList?: AttrList,
	children?: ArrayAble<Node>
): NodeCollection {
	const { tagName } = startTag;
	if (endTag && endTag.tagName !== tagName) {
		throw new Error('TagName of startTag (' + JSON.stringify(tagName) + ') and endTag (' + JSON.stringify(endTag.tagName) + ') must be match.');
	}

	const rawContent = startTag.rawContent + new NodeCollection(children).toString() + (endTag ?? nullNode).rawContent;

	const collect = new NodeCollection();
	if (endTag && root.options.extraExtensionTags.has(tagName)) {
		// tagName is a valid extension tag name
		// and endTag is exist.
		// Building a Extension tag
		collect.push(makeExtensionTag(rawContent, root, { startTag, endTag, attrList, children }));
	} else if (isAllowHtmlTag(tagName)) {
		// tagName is a valid html tag name
		// Building a Html tag
		collect.push(new HtmlTag(rawContent, root, { startTag, endTag, attrList, children }));
	} else {
		// Isn't valid.
		// escape and ignore those tag.
		collect.push(new EscapedWikitext(startTag, root));
		if (children) {
			collect.concatInto(children);
		}
		if (endTag) {
			collect.push(new EscapedWikitext(endTag, root));
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
