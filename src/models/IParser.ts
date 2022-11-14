import { buildInNoEscapeExtensionTags } from '../ExtensionTags';
import { ArrayAble } from '../util';

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

const buildInExtensionTags: string[] = ['nowiki', 'pre'];

export function normalParseOptions(rawOptions: ParseOptions): ParsedParseOptions {
	const options: ParsedParseOptions = {
		extraExtensionTags: new Map<string, ExtensionTagOptions>(),
		strict: !!rawOptions.strict
	};

	if (rawOptions.extraExtensionTags) {
		Array.from(rawOptions.extraExtensionTags).concat(buildInExtensionTags).map(function (item) {
			return (typeof item === 'string'
				? {
					name: item.toLowerCase(),
					options: {
						isEscapeTag: !buildInNoEscapeExtensionTags.includes(item)
					}
				}
				: {
					name: item.name.toLowerCase(),
					options: item.options
				}) as ExtensionTag;
		}).forEach(function ({ name: tagName, options: tOptions }) {
			if (!tagName.match(/^[a-z-]+$/) || ['includeonly', 'noinclude', 'onlyinclude'].includes(tagName)) {
				throw new Error('Bad tagName: ' + JSON.stringify(tagName));
			}
			if (
				options.extraExtensionTags.has(tagName) &&
				!isExtensionTagOptionsSame(tOptions, options.extraExtensionTags.get(tagName))
			) {
				throw new Error('Duplicate extension tag with difference option: ' + JSON.stringify(tagName));
			}
			options.extraExtensionTags.set(tagName, tOptions);
		});
	}

	return options;
}

export interface IParser {
	options: ParsedParseOptions;
}
