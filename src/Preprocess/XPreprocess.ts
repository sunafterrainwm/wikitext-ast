/* eslint no-bitwise: ["error", { "allow": [ "|", "&" ] } ] */

import XRegExp from 'xregexp';

import { strcspn } from '../lib/php';
import { allowHtmlTagNames } from '../models/HtmlTag';
import { IParser } from '../models/IParser';
import { NodeCollection } from '../models/NodeCollection';
import { UnparsedWikitext } from '../models/Wikitext';

export enum TokenizeFlags {
	None = 0,
	Inclusion = 1,

	DisableSection = 2,
	DisableTemplate = 4,
	DisableEscapedExtensionTag = 8,
	DisableExtensionTag = 16,
	DisableInclusionTag = 32,
	DisableAllTag = 64,
	DisableExtraLink = 128,
}

function getStartTagRegExp(tagNames: string[]): RegExp {
	return XRegExp('(' + tagNames.join('|') + ')(?:\\s|\\/>|>)', 'iy');
}

export function splitByTag(parser: IParser, text: string, startPos: number, tagNames: string[]): NodeCollection {
	const elementsRegex = getStartTagRegExp(tagNames);

	if (!text.match(elementsRegex)) {
		return new NodeCollection([new UnparsedWikitext(parser, text)]);
	}

	const collection = new NodeCollection();

	const i = 0;

	while (true) {
		const literalLength = strcspn(text, '<', i);

		if (!literalLength) {
			break;
		}
	}

	return collection;
}

export function mergeTag(collection: NodeCollection) {
}

export function tokenize(parser: IParser, text: string, rawPos = 0, flags: TokenizeFlags = TokenizeFlags.None): NodeCollection {
	const collection = new NodeCollection();

	const htmlTags = allowHtmlTagNames;
	const extTags = [...parser.options.extraExtensionTags.keys()];
	const xmlishAllowMissingEndTag = ['includeonly', 'noinclude', 'onlyinclude'];
	if (!(flags & TokenizeFlags.DisableInclusionTag)) {
		extTags.push('includeonly', 'noinclude', 'onlyinclude');
	}

	if (flags & TokenizeFlags.DisableExtensionTag) {
		const elementsRegex = getStartTagRegExp(
			extTags.filter(function (tag) {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				return !parser.options.extraExtensionTags.has(tag) || parser.options.extraExtensionTags.get(tag)!.isEscapeTag;
			})
		);
	}

	return collection;
}
