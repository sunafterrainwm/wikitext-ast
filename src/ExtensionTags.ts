export interface ExtensionTag {
	name: string;
	options: ExtensionTagOptions;
}

export interface ExtensionTagOptions {
	isEscapeTag?: boolean;
}

export function isExtensionTagOptionsSame(a: ExtensionTagOptions, b?: ExtensionTagOptions): boolean {
	return b
		? a === b ||
			a.isEscapeTag === b.isEscapeTag
		: false;
}

export const buildInNoEscapeExtensionTags: string[] = [
	'ref',
	'references',
	'poem',
	'section'
];
