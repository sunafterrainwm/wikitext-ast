export type ArrayAble<T> = ArrayLike<T> | T[] | readonly T[] | Iterable<T>;

export function pick<O extends object, K extends keyof O>(object: O, keys: K[]): Pick<O, K> {
	const result: Partial<Pick<O, K>> = {};

	for (const key of keys) {
		result[key] = object[key];
	}

	return result as Pick<O, K>;
}

export enum HtmlSpecialCharsOption {
	/* Will convert double-quotes and leave single-quotes alone. */
	Compat,
	/* Will convert both double and single quotes. */
	Quotes,
	/* Will leave both double and single quotes unconverted. */
	NoQuotes
}

export function htmlSpecialChars(text: string, option: HtmlSpecialCharsOption): string {
	const replaceTable: Record<string, string> = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;'
	};

	if (option === HtmlSpecialCharsOption.Quotes) {
		replaceTable['\''] = '&apos;';
	} else if (option === HtmlSpecialCharsOption.NoQuotes) {
		delete replaceTable['"'];
	}
	return text.replace(/[&<>'"]/g, function (char) {
		return replaceTable[char] ?? char;
	});
}
