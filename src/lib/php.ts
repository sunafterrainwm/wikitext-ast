/**
 * Finds the length of the initial segment of a string consisting entirely of characters contained within a given mask.
 *
 * @param {string} string
 * @param {string} mask
 * @param {number} [offset]
 * @param {number} [length]
 * @return {number}
 */
export function strspn(string: string, mask: string, offset = 0, length = string.length): number {
	if (offset < 0) {
		offset += string.length;
	}
	if (length < 0) {
		length += string.length - offset;
	}
	if (offset < 0 || length <= 0 || offset >= string.length) {
		return -1;
	}

	for (let i = offset; i <= Math.min(string.length, offset + length); i++) {
		if (!mask.includes(string.charAt(i))) {
			return i - offset;
		}
	}

	return Math.min(string.length, offset + length) - offset;
}

/**
 * Find length of initial segment not matching mask
 *
 * @param {string} string
 * @param {string} mask
 * @param {number} [offset]
 * @param {number} [length]
 * @return {number}
 */
export function strcspn(string: string, mask: string, offset = 0, length = string.length): number {
	if (offset < 0) {
		offset += string.length;
	}
	if (length < 0) {
		length += string.length - offset;
	}
	if (offset < 0 || length <= 0 || offset >= string.length) {
		return string.length;
	}

	let result = 0;
	for (let i = offset; i < Math.min(string.length, offset + length); i++, result++) {
		if (mask.includes(string.charAt(i))) {
			break;
		}
	}
	return result;
}
