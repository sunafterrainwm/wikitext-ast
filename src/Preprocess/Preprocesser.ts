import assert = require('assert');

import XRegExp = require('xregexp');

import { strspn, strcspn } from '../lib/php';
import { ParsedParseOptions } from '../models/ParseOptions';
import { NodeArray } from '../PPNode/NodeArray';
import { NodeTree } from '../PPNode/NodeTree';
import { mayPointGetText, mayPointPlus, Point } from '../PPNode/PointedNodeText';
import { PPDPart } from '../PPNode/PPDPart';
import { PPDStack } from '../PPNode/PPDStack';
import { PPDStackElement, PPDStackElementOptions } from '../PPNode/PPDStackElement';
import { RawPPNode, RawPPNodeStore } from '../PPNode/PPNode';

import { Rule, rules } from './rule';

export interface PreprocessorOptions {
	/** Transclusion mode */
	forInclusion?: boolean;
	/** Language conversion construct omission */
	disableLangConversion?: boolean;

	disableTemplate?: boolean;

	disableSection?: boolean;

	parsedParseOptions: ParsedParseOptions;
}

export class Preprocessor {
	public constructor(public readonly options: PreprocessorOptions) {

	}

	public static newPartNodeArray(values: Record<string, string>): NodeArray {
		const list: NodeTree[] = [];
		let store: RawPPNodeStore;
		for (const k in values) {
			const val = values[k];
			if (typeof k === 'number') {
				store = [['part', [['name', [['@index', [k]]]], ['value', [String(val)]]]]];
			} else {
				store = [['part', [['name', [String(k)]], '=', ['value', [String(val)]]]]];
			}
			list.push(new NodeTree(store, 0));
		}
		return new NodeArray(list);
	}

	public static addLiteral(accum: RawPPNodeStore, text: string | Point): void {
		let last = accum.pop();
		if (last !== undefined) {
			if (typeof last === 'string' && typeof text === 'string') {
				last += text;
				accum.push(last);
			} else if (last instanceof Point && text instanceof Point && last.end + 1 === text.start) {
				accum.push(new Point(last.text + text.text, last.start));
			} else {
				accum.push(last, text);
			}
		} else {
			accum.push(text);
		}
	}

	public preprocessToObj(text: string): NodeTree {
		return new NodeTree(this.buildDomTreeArrayFromText(text), 0);
	}

	/**
	 * @param {string} text Wikitext
	 * @return {Array} JSON-serializable document object model array
	 */
	protected buildDomTreeArrayFromText(text: string): RawPPNodeStore {
		const { forInclusion, disableLangConversion, disableSection } = this.options;
		const xmlishElements = [...this.options.parsedParseOptions.extraExtensionTags.keys()];
		const xmlishAllowMissingEndTag = ['includeonly', 'noinclude', 'onlyinclude'];
		let enableOnlyinclude = false;
		let ignoredTags: string[];
		let ignoredElements: string[];
		if (forInclusion) {
			ignoredTags = ['includeonly', '/includeonly'];
			ignoredElements = ['noinclude'];
			xmlishElements.push('noinclude');
			if (text.includes('<onlyinclude>') && text.includes('</onlyinclude>')) {
				enableOnlyinclude = true;
			}
		} else {
			ignoredTags = ['noinclude', '/noinclude', 'onlyinclude', '/onlyinclude'];
			ignoredElements = ['includeonly'];
			xmlishElements.push('includeonly');
		}
		const xmlishRegex = xmlishElements.concat(ignoredTags).join('|');
		// Use "y" modifier (sticky, same as "A" anchored modifier in pcre) instead of "^", because ^ doesn't work with an offset
		const elementsRegex = XRegExp('(' + xmlishRegex + ')(?:\\s|\\/>|>)|(!--)', 'iy');
		const stack = new PPDStack();
		let searchBase = '[{<\n';
		if (!disableLangConversion) {
			searchBase += '-';
		}

		// For fast reverse searches
		const revText = text.split('').reverse().join('');
		const lengthText = text.length;
		// Map of tag name => true if there are no more closing tags of given type right of $i
		const noMoreClosingTag: Record<string, true> = {};
		// Current accumulator.
		let accum = stack.getAccum();
		// Do a line-start run without outputting an LF character
		let fakeLineStart = true;
		// True to find equals signs in arguments
		let findEquals = false;
		// True to ignore all input up to the next <onlyinclude>
		let findOnlyinclude = enableOnlyinclude;
		// True to take notice of pipe characters
		let findPipe = false;
		let headingIndex = 1;
		// Input pointer, starts out pointing to a pseudo-newline before the start
		let i = 0;
		// True if $i is inside a possible heading
		let inHeading = false;
		// True if there are no more greater-than (>) signs right of $i
		let noMoreGT = false;

		let attr: string | Point;
		let attrEnd: number;
		let close: Point | string | undefined;
		let count: number;
		let curChar: string;
		let curLen: number;
		let currentClosing: string;
		let element: RawPPNodeStore;
		let found: string;
		let inner: Point | string | undefined;
		let matches: XRegExp.ExecArray | null;
		let matchingCount: number;
		let part: PPDPart;
		let piece: PPDStackElement | PPDStackElementOptions;
		let rule: Rule | undefined;
		let startPos: number;
		let tagEndPos: number;
		let wsLength: number;

		while (true) {
			if (findOnlyinclude) {
				// Ignore all input up to the next <onlyinclude>
				startPos = text.indexOf('<onlyinclude>', i);
				if (startPos === -1) {
					// Ignored section runs to the end
					accum.push(['ignore', [Point.fromSlice(text, i)]]);
					break;
				}
				const tagEndPos = startPos + '<onlyinclude>'.length;
				accum.push(['ignore', [Point.fromSlice(text, i, tagEndPos)]]);
				i = tagEndPos;
				findOnlyinclude = false;
			}
			if (fakeLineStart) {
				found = 'line-start';
				curChar = '';
			} else {
				// Find next opening brace, closing brace or pipe
				let search = searchBase;
				if (stack.top === false) {
					currentClosing = '';
				} else {
					currentClosing = stack.top.close;
					search += currentClosing;
				}
				if (findPipe) {
					search += '|';
				}
				if (findEquals) {
					// First equals will be for the template
					search += '=';
				}
				rule = undefined;
				if (i < text.length) {
					// Output literal section, advance input counter
					const literalLength = strcspn(text, search, i);
					if (literalLength > 0) {
						Preprocessor.addLiteral(accum, Point.fromSlice(text, i, i + literalLength));
						i += literalLength;
					}
				}
				if (i >= lengthText) {
					if (currentClosing === '\n') {
						// Do a past-the-end run to finish off the heading
						curChar = '';
						found = 'line-end';
					} else {
						// All done
						break;
					}
				} else {
					let curTwoChar: string;
					curChar = curTwoChar = text.charAt(i);
					if (i + 1 < lengthText) {
						curTwoChar += text.charAt(i + 1);
					}
					if (curChar === '|') {
						found = 'pipe';
					} else if (curChar === '=') {
						found = 'equals';
					} else if (curChar === '<') {
						found = 'angle';
					} else if (curChar === '\n') {
						if (inHeading) {
							found = 'line-end';
						} else {
							found = 'line-start';
						}
					} else if (curTwoChar === currentClosing) {
						found = 'close';
						curChar = curTwoChar;
					} else if (curChar === currentClosing) {
						found = 'close';
					} else if (curTwoChar in rules) {
						curChar = curTwoChar;
						found = 'open';
						// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
						rule = rules[curChar]!;
					} else if (curChar in rules) {
						found = 'open';
						// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
						rule = rules[curChar]!;
					} else {
						// We may get '-' and '}' characters here which
						// don't match -{ or $currentClosing.  Add these to
						// output and continue.
						if (curChar === '-' || curChar === '}') {
							Preprocessor.addLiteral(accum, new Point(curChar, i));
						}
						++i;
						continue;
					}
				}
			}

			if (found === 'angle') {
				// Handle </onlyinclude>
				if (enableOnlyinclude && text.slice(i).startsWith('</onlyinclude>')) {
					findOnlyinclude = true;
					continue;
				}

				// Determine element name
				matches = XRegExp.exec(text, elementsRegex, i + 1);
				if (!matches) {
				// Element name missing or not listed
					Preprocessor.addLiteral(accum, new Point('<', i));
					++i;
					continue;
				}
				// Handle comments
				if (matches[2] === '!--') {
					// To avoid leaving blank lines, when a sequence of
					// space-separated comments is both preceded and followed by
					// a newline (ignoring spaces), then
					// trim leading and trailing spaces and the trailing newline.

					// Find the end
					let endPos = text.indexOf('-->', i + 4);
					if (endPos === -1) {
						// Unclosed comment in input, runs to end
						accum.push(['comment', [Point.fromSlice(text, i)]]);
						i = lengthText;
					} else {
						// Search backwards for leading whitespace
						const wsStart = i ? i - strspn(revText, ' \t', lengthText - i) : 0;

						// Search forwards for trailing whitespace
						// $wsEnd will be the position of the last space (or the '>' if there's none)
						let wsEnd: number = endPos + 2 + (strspn(text, ' \t', endPos + 3));

						// Keep looking forward as long as we're finding more
						// comments.
						const comments: Array<[number, number]> = [[wsStart, wsEnd]];
						while (text.slice(wsEnd + 1, wsEnd + 5) === '<!--') {
							let c = text.indexOf('-->', wsEnd + 4);
							if (c === -1) {
								break;
							}
							c = c + 2 + (strspn(text, ' \t', c + 3));
							comments.push([wsEnd + 1, c]);
							wsEnd = c;
						}

						// Eat the line if possible
						// TODO: This could theoretically be done if $wsStart == 0, i.e. for comments at
						// the overall start. That's not how Sanitizer::removeHTMLcomments() did it, but
						// it's a possible beneficial b/c break.
						if (wsStart > 0 && text.charAt(wsStart - 1) === '\n' && text.charAt(wsEnd + 1) === '\n') {
							// Remove leading whitespace from the end of the accumulator
							wsLength = i - wsStart;
							let temp = accum.pop();
							if (temp !== undefined) {
								if (
									wsLength > 0 &&
									(typeof temp === 'string' || temp instanceof Point) &&
									strspn(mayPointGetText(temp), ' \t', -wsLength) === wsLength
								) {
									temp = temp.slice(0, -wsLength);
								}
								accum.push(temp);
							}

							// Dump all but the last comment to the accumulator
							comments.forEach(function (com) {
								startPos = com[0];
								endPos = com[1] + 1;
								accum.push(['comment', [Point.fromSlice(text, startPos, endPos)]]);
							});
							fakeLineStart = true;
						} else {
							// No line to eat, just take the comment itself
							startPos = i;
							endPos += 2;
						}
						if (stack.top !== false) {
							part = stack.top.getCurrentPart();
							if (part.commentEnd !== wsStart - 1) {
								part.visualEnd = wsStart;
							}
							// Else comments abutting, no change in visual end
							part.commentEnd = endPos;
						}
						i = endPos + 1;
						// @ts-expect-error TS2454
						accum.push(['comment', [Point.fromSlice(text, startPos, endPos)]]);
					}
					continue;
				}
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				const name = matches[1]!;
				const lowerName = name.toLowerCase();
				const attrStart = i + name.length + 1;
				tagEndPos = noMoreGT ? -1 : text.indexOf('>', attrStart);

				// Find end of tag
				if (tagEndPos === -1) {
					// Infinite backtrack
					// Disable tag search to prevent worst-case O(N^2) performance
					noMoreGT = true;
					Preprocessor.addLiteral(accum, new Point('<', i));
					++i;
					continue;
				}

				// Handle ignored tags
				if (ignoredTags.includes(lowerName)) {
					accum.push(['ignore', [Point.fromSlice(text, i, tagEndPos + 1)]]);
					i = tagEndPos + 1;
					continue;
				}

				const tagStartPos = i;
				if (text[tagEndPos - 1] === '/') {
					// Short end tag
					attrEnd = tagEndPos - 1;
					inner = undefined;
					i = tagEndPos + 1;
					close = undefined;
				} else {
					attrEnd = tagEndPos;

					// Find closing tag
					const tmpRegExp = XRegExp('<\\/' + XRegExp.escape(name) + '\\s*>', 'gi');
					matches = XRegExp.exec(text, tmpRegExp, tagEndPos + 1);
					if (!noMoreClosingTag[name] && matches) {
						inner = Point.fromSlice(text, tagEndPos + 1, tmpRegExp.lastIndex - String(matches[0]).length);
						i = tmpRegExp.lastIndex;
						close = new Point(String(matches[0]), tmpRegExp.lastIndex - String(matches[0]).length);
					} else {
						// No end tag
						if (xmlishAllowMissingEndTag.includes(name)) {
							// Let it run out to the end of the text.
							inner = Point.fromSlice(text, tagEndPos + 1);
							i = lengthText;
							close = undefined;
						} else {
							// Don't match the tag, treat opening tag as literal and resume parsing.
							i = tagEndPos + 1;
							Preprocessor.addLiteral(accum, Point.fromSlice(text, tagStartPos, tagEndPos + 1));
							// Cache results, otherwise we have O(N^2) performance for input like <foo><foo><foo>...
							noMoreClosingTag[name] = true;
							continue;
						}
					}
				}

				// <includeonly> and <noinclude> just become <ignore> tags
				if (ignoredElements.includes(lowerName)) {
					accum.push(['ignore', [Point.fromSlice(text, tagStartPos, i)]]);
					continue;
				}
				if (attrEnd <= attrStart) {
					attr = '';
				// Note that the attr element contains the whitespace between name and attribute,
				// this is necessary for precise reconstruction during pre-save transform.
				} else {
					attr = Point.fromSlice(text, attrStart, attrEnd);
				}
				const children: RawPPNodeStore = [['name', [name]], ['attr', [attr]]];
				if (inner !== undefined) {
					children.push(['inner', [inner]]);
				}
				if (close !== undefined) {
					children.push(['close', [close]]);
				}
				accum.push(['ext', children]);
			} else if (found === 'line-start') {
				// Is this the start of a heading?
				// Line break belongs before the heading element in any case
				if (fakeLineStart) {
					fakeLineStart = false;
				} else {
					Preprocessor.addLiteral(accum, new Point(curChar, i));
					i++;
				}

				// Examine upto 6 characters
				count = strspn(text, '=', i, Math.min(text.length, 6));
				if (!disableSection) {
					if (count === 1 && findEquals) {
						// DWIM: This looks kind of like a name/value separator.
						// Let's let the equals handler have it and break the potential
						// heading. This is heuristic, but AFAICT the methods for
						// completely correct disambiguation are very complex.
					} else if (count > 0) {
						piece = {
							open: '\n',
							close: '\n',
							parts: [new PPDPart('='.repeat(count))],
							startPos: i,
							count
						};
						stack.push(piece);
						accum = stack.getAccum();
						({ findEquals, findPipe, inHeading } = stack.getFlags());
						i += count;
					}
				}
			} else if (found === 'line-end') {
				piece = (stack.top as PPDStackElement);
				// A heading must be open, otherwise \n wouldn't have been in the search list
				// FIXME: Don't use assert()
				assert(mayPointGetText(piece.open) === '\n');
				part = (piece as PPDStackElement).getCurrentPart();
				// Search back through the input to see if it has a proper close.
				// Do this using the reversed string since the other solutions
				// (end anchor, etc.) are inefficient.
				wsLength = strspn(revText, ' \t', lengthText - i);
				let searchStart = i - wsLength;
				if (searchStart - 1 === part.commentEnd) {
					// Comment found at line end
					// Search for equals signs before the comment
					// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
					searchStart = part.visualEnd!;
					searchStart -= strspn(revText, ' \t', lengthText - searchStart);
				}
				count = piece.count;
				const equalsLength = strspn(revText, '=', lengthText - searchStart);
				if (!disableSection && equalsLength > 0) {
					// This is just a single string of equals signs on its own line
					// Replicate the doHeadings behavior /={count}(.+)={count}/
					// First find out how many equals signs there really are (don't stop at 6)
					if (searchStart - equalsLength === piece.startPos) {
						count = equalsLength;
						if (count < 3) {
							count = 0;
						} else {
							count = Math.min(6, Math.round((count - 1) / 2));
						}
					} else {
						count = Math.min(equalsLength, count);
					}
					if (count > 0) {
						// Normal match, output <h>
						element = [['possible-h', ([['@level', [String(count)]], ['@i', [String(headingIndex++)]]] as RawPPNodeStore).concat(accum)]];
					} else {
						// Single equals sign on its own line, count=0
						element = accum;
					}
				} else {
					// No match, no <h>, just pass down the inner text
					element = accum;
				}

				// Unwind the stack
				stack.pop();
				accum = stack.getAccum();
				({ findEquals, findPipe, inHeading } = stack.getFlags());

				// Append the result to the enclosing accumulator
				accum.push(...element);

				// Note that we do NOT increment the input pointer.
				// This is because the closing linebreak could be the opening linebreak of
				// another heading. Infinite loops are avoided because the next iteration MUST
				// hit the heading open case above, which unconditionally increments the
				// input pointer.
			} else if (found === 'open') {
				// count opening brace characters
				curLen = curChar.length;
				count = curLen > 1
					// allow the final character to repeat
					? strspn(text, curChar.charAt(curLen - 1), i + 1) + 1
					: strspn(text, curChar, i);

				let savedPrefix = '';
				const lineStart = i > 0 && text.charAt(i - 1) === '\n';

				if (curChar === '-{' && count > curLen) {
				// -{ => {{ transition because rightmost wins
					savedPrefix = '-';
					i++;
					curChar = '{';
					count--;
					// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
					rule = rules[curChar]!;
				}

				// we need to add to stack only if opening brace count is enough for one of the rules
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				if (count >= rule!.min) {
					// Add it to the stack
					piece = {
						open: curChar,
						// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
						close: rule!.end,
						savedPrefix: savedPrefix.length ? new Point(savedPrefix, i - savedPrefix.length) : savedPrefix,
						count,
						lineStart
					};
					stack.push(piece);
					accum = stack.getAccum();
					({ findEquals, findPipe, inHeading } = stack.getFlags());
				} else if (savedPrefix || count) {
					// Add literal brace(s)
					Preprocessor.addLiteral(accum, new Point(savedPrefix + curChar.repeat(count), i - savedPrefix.length));
				}
				i += count;
			} else if (found === 'close') {
				piece = stack.top as PPDStackElement;

				// lets check if there are enough characters for closing brace
				let maxCount = piece.count;
				// don't try to match closing '-' as a '}'
				if (piece.close === '}-' && curChar === '}') {
					maxCount--;
				}
				curLen = curChar.length;
				count = curLen > 1 ? curLen : strspn(text, curChar, i, maxCount);

				// check for maximum matching characters (if there are 5 closing
				// characters, we will probably need only 3 - depending on the rules)
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				rule = rules[mayPointGetText(piece.open)]!;
				if (count > rule.max) {
					// The specified maximum exists in the callback array, unless the caller
					// has made an error
					matchingCount = rule.max;
				} else {
					// Count is less than the maximum
					// Skip any gaps in the callback array to find the true largest match
					// Need to use Object.hasOwnProperty (array_key_exists) not isset because the callback can be null
					matchingCount = count;
					while (
						matchingCount > 0 &&
						(
							!Object.hasOwnProperty.call(rule.names, matchingCount) ||
							rule.names[matchingCount] === undefined
						)
					) {
						--matchingCount;
					}
				}

				if (matchingCount <= 0) {
					// No matching element found in callback array
					// Output a literal closing brace and continue
					Preprocessor.addLiteral(accum, Point.fromSlice(text, i, count + i));
					i += count;
					continue;
				}

				const name = rule.names[matchingCount];
				if (name === null) {
					// No element, just literal text
					element = (piece as PPDStackElement).breakSyntax(matchingCount);
					Preprocessor.addLiteral(element, Point.fromSlice(text, i, i + matchingCount));
				} else if (name) {
					// Create XML element
					const parts = (piece as PPDStackElement).parts;
					// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
					const titleAccum = parts[0]!.out;
					parts.splice(0, 1);
					const children: RawPPNodeStore = [];

					// The invocation is at the start of the line if lineStart is set in
					// the stack, and all opening brackets are used up.
					if (maxCount === matchingCount && !!piece.lineStart && mayPointGetText((piece as PPDStackElement).savedPrefix).length === 0) {
						children.push(['@lineStart', ['1']]);
					}

					const titleNode: RawPPNode = ['title', titleAccum];
					children.push(titleNode);
					let argIndex = 1;
					for (const part of parts) {
						if (part.eqpos !== undefined) {
							// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
							const equalsNode: RawPPNode = part.out[part.eqpos]!;
							const nameNode: RawPPNode = ['name', part.out.slice(0, part.eqpos)];
							const valueNode: RawPPNode = ['value', part.out.slice(part.eqpos + 1)];
							const partNode: RawPPNode = ['part', [nameNode, equalsNode, valueNode]];
							children.push(partNode);
						} else {
							const nameNode: RawPPNode = ['name', [['@index', [String(argIndex++)]]]];
							const valueNode: RawPPNode = ['value', part.out];
							const partNode: RawPPNode = ['part', [nameNode, valueNode]];
							children.push(partNode);
						}
					}

					element = [[name, children]];
				}

				// Advance input pointer
				i += matchingCount;

				// Unwind the stack
				stack.pop();
				accum = stack.getAccum();

				// Re-add the old stack element if it still has unmatched opening characters remaining
				if (matchingCount < piece.count) {
					piece.parts = [new PPDPart()];
					piece.count -= matchingCount;
					// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
					const min = rules[mayPointGetText(piece.open)]!.min;
					// do we still qualify for any callback with remaining count?
					if (piece.count >= min) {
						stack.push(piece);
						accum = stack.getAccum();
					} else if (piece.count === 1 && piece.open === '{' && piece.savedPrefix === '-') {
						piece.savedPrefix = '';
						piece.open = '-{';
						piece.count = 2;
						// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
						piece.close = rules[piece.open]!.end;
						stack.push(piece);
						accum = stack.getAccum();
					} else {
						let s = piece.open.slice(0, -1);
						s = mayPointPlus(s, mayPointGetText(piece.open).slice(-1).repeat(piece.count - s.length));
						Preprocessor.addLiteral(accum, mayPointPlus(mayPointGetText((piece as PPDStackElement).savedPrefix), s));
					}
				} else if (piece.savedPrefix !== '') {
					Preprocessor.addLiteral(accum, (piece as PPDStackElement).savedPrefix);
				}
				({ findEquals, findPipe, inHeading } = stack.getFlags());
				// Add XML element to the enclosing accumulator
				// @ts-expect-error TS2454
				accum.push(...element);
			} else if (found === 'pipe') {
				findEquals = true; // shortcut for getFlags()
				stack.addPart();
				accum = stack.getAccum();
				++i;
			} else if (found === 'equals') {
				findEquals = false; // shortcut for getFlags()
				accum.push(['equals', ['=']]);
				(stack.getCurrentPart() as PPDPart).eqpos = accum.length - 1;
				++i;
			}
		}
		// Output any remaining unclosed brackets
		for (const piece of stack.stack) {
			stack.rootAccum.push(...piece.breakSyntax());
		}
		// Enable top-level headings
		if (!disableSection) {
			for (const node of stack.rootAccum) {
				if (Array.isArray(node) && node[NodeTree.NAME] === 'possible-h') {
					node[NodeTree.NAME] = 'h';
				}
			}
		}
		return [['root', stack.rootAccum]];
	}
}
