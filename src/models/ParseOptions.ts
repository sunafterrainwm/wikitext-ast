import { ArrayAble } from '../util';

import { Document } from './Document';

export interface ExtensionTag {
	name: string;
	options: ExtensionTagOptions;
}

export interface ExtensionTagOptions {
	isEscapeTag?: boolean;
}

export interface ParseOptions {
	strict?: boolean;
	extraExtensionTags?: ArrayAble<string | ExtensionTag>;
}

export interface ParsedParseOptions {
	strict: boolean;
	extraExtensionTags: Map<string, ExtensionTagOptions>;
}

export function isExtensionTagOptionsSame(a: ExtensionTagOptions, b?: ExtensionTagOptions): boolean {
	return b
		? a === b ||
			a.isEscapeTag === b.isEscapeTag
		: false;
}

const buildInExtensionTags: Record<string, ExtensionTagOptions> = {
	nowiki: {
		isEscapeTag: true
	},
	pre: {
		isEscapeTag: true
	}
};

export function normalParseOptions(root: Document, rawOptions: ParseOptions): ParsedParseOptions {
	const options: ParsedParseOptions = {
		extraExtensionTags: new Map<string, ExtensionTagOptions>(Object.entries(buildInExtensionTags)),
		strict: !!rawOptions.strict
	};

	if (rawOptions.extraExtensionTags) {
		Array.from(rawOptions.extraExtensionTags).map(function (item) {
			// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
			return typeof item === 'string' ? { name: item, options: {} } as ExtensionTag : item;
		}).forEach(function ({ name: tagName, options: tOptions }) {
			if (
				options.extraExtensionTags.has(tagName) &&
				!isExtensionTagOptionsSame(tOptions, options.extraExtensionTags.get(tagName))
			) {
				root.mayThrowError(new Error('Duplicate extension tag with difference option: ' + JSON.stringify(tagName)));
				return;
			}
			options.extraExtensionTags.set(tagName, tOptions);
		});
	}

	return options;
}
