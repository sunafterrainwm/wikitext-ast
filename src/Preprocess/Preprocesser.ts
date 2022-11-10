import assert = require('assert');

import XRegExp = require('xregexp');

import { strspn, strcspn } from '../lib/php';
import { ParsedParseOptions } from '../models/ParseOptions';
import { NodeArray } from '../PPNode/NodeArray';
import { NodeTree } from '../PPNode/NodeTree';
import { PPDPart } from '../PPNode/PPDPart';
import { PPDStack } from '../PPNode/PPDStack';
import { PPDStackElement, PPDStackElementOptions } from '../PPNode/PPDStackElement';
import { RawPPNode, RawPPNodeStore } from '../PPNode/PPNode';

import { Rule, RuleKey, rules } from './rule';

export interface PreprocessorOptions {
	/** Transclusion mode flag for Preprocessor::preprocessToObj() */
	forInclusion?: boolean;
	/** Language conversion construct omission flag for Preprocessor::preprocessToObj() */
	langConversionDisabled?: boolean;

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

	public static addLiteral(accum: RawPPNodeStore, text: string): void {
		console.log('literal add: ' + text);
		let last = accum.pop();
		if (last !== undefined) {
			if (typeof last === 'string') {
				last += text;
				accum.push(last);
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

	protected buildDomTreeArrayFromText(text: string): RawPPNodeStore {
		const { forInclusion, langConversionDisabled } = this.options;
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
		const elementsRegex = XRegExp('(' + xmlishRegex + ')(?:\\s|\\/>|>)|(!--)', 'yi');
		const stack = new PPDStack();
		let searchBase = '[{<\n';
		if (!langConversionDisabled) {
			searchBase += '-';
		}
		const revText = text.split('').reverse().join('');
		const lengthText = text.length;
		let i = 0;
		let accum = stack.getAccum();
		let findEquals = false;
		let findPipe = false;
		let headingIndex = 1;
		let inHeading = false;
		let noMoreGT = false;
		const noMoreClosingTag: Record<string, true> = {};
		let findOnlyinclude = enableOnlyinclude;
		let fakeLineStart = true;
		let found: string;
		let curChar: string;
		let currentClosing: string;
		let startPos: number;
		let tagEndPos: number;
		let attrEnd: number;
		let close: string | undefined;
		let matches: XRegExp.ExecArray | null;
		let inner: string | undefined;
		let attr: string;
		let piece: PPDStackElement | PPDStackElementOptions;
		let wsLength: number;
		let part: PPDPart;
		let count: number;
		let element: RawPPNodeStore;
		let curLen: number;
		let rule: Rule;
		let matchingCount: number;
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		while (true) {
			// Ignore all input up to the next <onlyinclude>

			// past-the-end
			if (findOnlyinclude) {
				startPos = text.indexOf('<onlyinclude>', i);
				if (startPos === -1) {
					accum.push(['ignore', [text.slice(i)]]);
					break;
				}
				const tagEndPos = startPos + '<onlyinclude>'.length;
				accum.push(['ignore', [text.slice(i, tagEndPos)]]);
				i = tagEndPos;
				findOnlyinclude = false;
			}
			if (fakeLineStart) {
				found = 'line-start';
				curChar = '';

			// Find next opening brace, closing brace or pipe
			// Output literal section, advance input counter
			} else {
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
				// First equals will be for the template
				if (findEquals) {
					search += '=';
				}
				const literalLength = strcspn(text, search, i);
				if (literalLength > 0) {
					Preprocessor.addLiteral(accum, text.slice(i, i + literalLength));
					i += literalLength;
				}
				if (i >= lengthText) {
					// Do a past-the-end run to finish off the heading
					if (currentClosing === '\n') {
						curChar = '';
						found = 'line-end';
						// All done
					} else {
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
						rule = rules[curChar as keyof typeof rules];
					} else if (curChar in rules) {
						found = 'open';
						rule = rules[curChar as keyof typeof rules];
					// Some versions of PHP have a strcspn which stops on
					// null characters; ignore these and continue.
					// We also may get '-' and '}' characters here which
					// don't match -{ or $currentClosing.  Add these to
					// output and continue.
					} else {
						if (curChar === '-' || curChar === '}') {
							Preprocessor.addLiteral(accum, curChar);
						}
						++i;
						continue;
					}
				}
			}
			// Handle </onlyinclude>

			// Find end of tag

			// <includeonly> and <noinclude> just become <ignore> tags
			if (found === 'angle') {
				if (enableOnlyinclude && text.slice(i).startsWith('</onlyinclude>')) {
					findOnlyinclude = true;
					continue;
				}
				// Element name missing or not listed
				matches = XRegExp.exec(text, elementsRegex, i + 1);
				if (!matches) {
					Preprocessor.addLiteral(accum, '<');
					++i;
					continue;
				}
				// To avoid leaving blank lines, when a sequence of
				// space-separated comments is both preceded and followed by
				// a newline (ignoring spaces), then
				// trim leading and trailing spaces and the trailing newline.
				// Find the end
				if (matches[2] === '!--') {
					let endPos = text.indexOf('-->', i + 4);
					// Unclosed comment in input, runs to end
					if (endPos === -1) {
						accum.push(['comment', [text.slice(i)]]);
						i = lengthText;

					// Search backwards for leading whitespace
					// Search forwards for trailing whitespace
					// $wsEnd will be the position of the last space (or the '>' if there's none)
					// Keep looking forward as long as we're finding more
					// comments.
					// Eat the line if possible
					// TODO: This could theoretically be done if $wsStart == 0, i.e. for comments at
					// the overall start. That's not how Sanitizer::removeHTMLcomments() did it, but
					// it's a possible beneficial b/c break.
					} else {
						const wsStart = i ? i - strspn(revText, ' \t', lengthText - i) : 0;
						let wsEnd: number = endPos + 2 + (strspn(text, ' \t', endPos + 3));
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
						// Remove leading whitespace from the end of the accumulator
						// Do a line-start run next time to look for headings after the comment
						if (wsStart > 0 && text.charAt(wsStart - 1) === '\n' && text.charAt(wsEnd + 1) === '\n') {
							wsLength = i - wsStart;
							let temp = accum.pop();
							if (temp !== undefined) {
								if (
									wsLength > 0 &&
									typeof temp === 'string' &&
									strspn(temp, ' \t', -wsLength) === wsLength
								) {
									temp = temp.slice(0, -wsLength);
								}
								accum.push(temp);
							}

							comments.forEach(function (com) {
								startPos = com[0];
								endPos = com[1] + 1;
								accum.push(['comment', [text.slice(startPos, endPos)]]);
							});
							fakeLineStart = true;
						// No line to eat, just take the comment itself
						} else {
							startPos = i;
							endPos += 2;
						}
						if (stack.top !== false) {
							part = stack.top.getCurrentPart();
							if (part.commentEnd !== wsStart - 1) {
								part.visualEnd = wsStart;
							}
							part.commentEnd = endPos;
						}
						i = endPos + 1;
						// @ts-expect-error TS2454
						accum.push(['comment', [text.slice(startPos, endPos - startPos)]]);
					}
					continue;
				}
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				const name = matches[1]!;
				const lowerName = name.toLowerCase();
				const attrStart = i + name.length + 1;
				tagEndPos = noMoreGT ? -1 : text.indexOf('>', attrStart);
				// Infinite backtrack
				// Disable tag search to prevent worst-case O(N^2) performance
				if (tagEndPos === -1) {
					noMoreGT = true;
					Preprocessor.addLiteral(accum, '<');
					++i;
					continue;
				}
				if (ignoredTags.includes(lowerName)) {
					accum.push(['ignore', [text.slice(i, tagEndPos + 1)]]);
					i = tagEndPos + 1;
					continue;
				}
				const tagStartPos = i;
				// Short end tag
				if (text[tagEndPos - 1] === '/') {
					attrEnd = tagEndPos - 1;
					inner = undefined;
					i = tagEndPos + 1;
					close = undefined;
				// Find closing tag
				} else {
					attrEnd = tagEndPos;
					const tmpRegExp = XRegExp('<\\/' + XRegExp.escape(name) + '\\s*>', 'gi');
					matches = XRegExp.exec(text, tmpRegExp, tagEndPos + 1);
					if (!noMoreClosingTag[name] && matches) {
						inner = text.slice(tagEndPos + 1, (tmpRegExp.lastIndex - 1) - 1);
						i = (tmpRegExp.lastIndex - 1) + String(matches[0]).length;
						close = matches[0];
					// No end tag
					} else {
						// Let it run out to the end of the text.
						if (xmlishAllowMissingEndTag.includes(name)) {
							inner = text.slice(tagEndPos + 1);
							i = lengthText;
							close = undefined;
						// Don't match the tag, treat opening tag as literal and resume parsing.
						// Cache results, otherwise we have O(N^2) performance for input like <foo><foo><foo>...
						} else {
							i = tagEndPos + 1;
							console.log('hi1.');
							Preprocessor.addLiteral(accum, text.slice(tagStartPos, tagEndPos + 1));
							noMoreClosingTag[name] = true;
							continue;
						}
					}
				}
				if (ignoredElements.includes(lowerName)) {
					accum.push(['ignore', [text.slice(tagStartPos, i)]]);
					continue;
				}
				if (attrEnd <= attrStart) {
					attr = '';
				// Note that the attr element contains the whitespace between name and attribute,
				// this is necessary for precise reconstruction during pre-save transform.
				} else {
					attr = text.slice(attrStart, attrEnd);
				}
				const children: RawPPNodeStore = [['name', [name]], ['attr', [attr]]];
				if (inner !== undefined) {
					children.push(['inner', [inner]]);
				}
				if (close !== undefined) {
					children.push(['close', [close]]);
				}
				accum.push(['ext', children]);
			// Is this the start of a heading?
			// Line break belongs before the heading element in any case
			// Examine upto 6 characters
			} else if (found === 'line-start') {
				if (fakeLineStart) {
					fakeLineStart = false;
				} else {
					console.log('hi3.');
					Preprocessor.addLiteral(accum, curChar);
					i++;
				}
				const count = strspn(text, '=', i, Math.min(text.length, 6));
				// DWIM: This looks kind of like a name/value separator.
				// Let's let the equals handler have it and break the potential
				// heading. This is heuristic, but AFAICT the methods for
				// completely correct disambiguation are very complex.
				if (count === 1 && findEquals) {
					// ignore
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
			// A heading must be open, otherwise \n wouldn't have been in the search list
			// FIXME: Don't use assert()
			// Search back through the input to see if it has a proper close.
			// Do this using the reversed string since the other solutions
			// (end anchor, etc.) are inefficient.
			// Unwind the stack
			// Note that we do NOT increment the input pointer.
			// This is because the closing linebreak could be the opening linebreak of
			// another heading. Infinite loops are avoided because the next iteration MUST
			// hit the heading open case above, which unconditionally increments the
			// input pointer.
			} else if (found === 'line-end') {
				piece = (stack.top as PPDStackElement);
				assert(piece.open === '\n');
				part = (piece as PPDStackElement).getCurrentPart();
				wsLength = strspn(revText, ' \t', lengthText - i);
				let searchStart = i - wsLength;
				// Comment found at line end
				// Search for equals signs before the comment
				if (searchStart - 1 === part.commentEnd) {
					// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
					searchStart = part.visualEnd!;
					searchStart -= strspn(revText, ' \t', lengthText - searchStart);
				}
				count = piece.count;
				const equalsLength = strspn(revText, '=', lengthText - searchStart);
				if (equalsLength > 0) {
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
					// Normal match, output <h>
					if (count > 0) {
						element = [['possible-h', ([['@level', [String(count)]], ['@i', [String(headingIndex++)]]] as RawPPNodeStore).concat(accum)]];
					// Single equals sign on its own line, count=0
					} else {
						element = accum;
					}
				// No match, no <h>, just pass down the inner text
				} else {
					element = accum;
				}
				stack.pop();
				accum = stack.getAccum();
				({ findEquals, findPipe, inHeading } = stack.getFlags());
				accum.push(...element);
			// count opening brace characters
			} else if (found === 'open') {
				curLen = curChar.length;
				count = curLen > 1 ? strspn(text, curChar.charAt(curLen - 1), i + 1) + 1 : strspn(text, curChar, i);
				let savedPrefix = '';
				const lineStart = i > 0 && text[i - 1] === '\n';
				// -{ => {{ transition because rightmost wins
				if (curChar === '-{' && count > curLen) {
					savedPrefix = '-';
					i++;
					curChar = '{';
					count--;
					rule = rules[curChar as '-{'];
				}
				// Add it to the stack
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				if (count >= rule!.min) {
					piece = {
						open: curChar,
						// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
						close: rule!.end,
						savedPrefix,
						count,
						lineStart
					};
					stack.push(piece);
					accum = stack.getAccum();
					({ findEquals, findPipe, inHeading } = stack.getFlags());
				// Add literal brace(s)
				} else if (savedPrefix || count) {
					console.log('hi4.');
					Preprocessor.addLiteral(accum, savedPrefix + curChar.repeat(count));
				} else {
					console.log('curChar: ' + String(curChar) + ', text+: ' + String(text.slice(i - 2, i + 10)) + ', savedPrefix: ' + String(savedPrefix) + ', count: ' + String(count));
				}
				i += count;

			// lets check if there are enough characters for closing brace
			// check for maximum matching characters (if there are 5 closing
			// characters, we will probably need only 3 - depending on the rules)
			// Advance input pointer
			// Unwind the stack
			// Re-add the old stack element if it still has unmatched opening characters remaining
			} else if (found === 'close') {
				piece = stack.top as PPDStackElement;
				let maxCount = piece.count;
				// don't try to match closing '-' as a '}'
				if (piece.close === '}-' && curChar === '}') {
					maxCount--;
				}
				curLen = curChar.length;
				count = curLen > 1 ? curLen : strspn(text, curChar, i, maxCount);
				rule = rules[piece.open as RuleKey];
				// The specified maximum exists in the callback array, unless the caller
				// has made an error
				if (count > rule.max) {
					matchingCount = rule.max;
				// Count is less than the maximum
				// Skip any gaps in the callback array to find the true largest match
				// Need to use array_key_exists not isset because the callback can be null
				} else {
					matchingCount = count;
					while (matchingCount > 0 && rule.names[matchingCount] === undefined) {
						--matchingCount;
					}
				}
				// No matching element found in callback array
				// Output a literal closing brace and continue
				if (matchingCount <= 0) {
					console.log('text+: ' + text.slice(i - 2, i + 10) + ', curChar: ' + curChar + ', maxCount: ' + String(maxCount));
					Preprocessor.addLiteral(accum, text.slice(i, count + i));
					i += count;
					continue;
				}
				const name = rule.names[matchingCount];
				// No element, just literal text
				if (name === null) {
					element = (piece as PPDStackElement).breakSyntax(matchingCount);
					Preprocessor.addLiteral(element, text.slice(i, i + matchingCount));
				// Create XML element
				// The invocation is at the start of the line if lineStart is set in
				// the stack, and all opening brackets are used up.
				} else if (name) {
					const parts = (piece as PPDStackElement).parts;
					// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
					const titleAccum = parts[0]!.out;
					delete parts[0];
					const children: RawPPNodeStore = [];
					if (maxCount === matchingCount && !!piece.lineStart && (piece as PPDStackElement).savedPrefix.length === 0) {
						children.push(['@lineStart', ['1']]);
					}
					const titleNode: RawPPNode = ['title', titleAccum];
					children.push(titleNode);
					let argIndex = 1;
					for (const part of Object.values(parts)) {
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
				i += matchingCount;
				stack.pop();
				accum = stack.getAccum();
				// do we still qualify for any callback with remaining count?
				if (matchingCount < piece.count) {
					piece.parts = [new PPDPart()];
					piece.count -= matchingCount;
					const min = rules[piece.open as RuleKey].min;
					if (piece.count >= min) {
						stack.push(piece);
						accum = stack.getAccum();
					} else if (piece.count === 1 && piece.open === '{' && piece.savedPrefix === '-') {
						piece.savedPrefix = '';
						piece.open = '-{';
						piece.count = 2;
						piece.close = rules[piece.open as RuleKey].end;
						stack.push(piece);
						accum = stack.getAccum();
					} else {
						let s = piece.open.slice(0, 0);
						s += piece.open.slice(-1).repeat(piece.count - s.length);
						Preprocessor.addLiteral(accum, (piece as PPDStackElement).savedPrefix + s);
					}
				} else if (piece.savedPrefix !== '') {
					Preprocessor.addLiteral(accum, (piece as PPDStackElement).savedPrefix);
				}
				({ findEquals, findPipe, inHeading } = stack.getFlags());
				// @ts-expect-error TS2454
				accum.push(...element);
			// shortcut for getFlags()
			} else if (found === 'pipe') {
				findEquals = true;
				stack.addPart();
				accum = stack.getAccum();
				++i;
			// shortcut for getFlags()
			} else if (found === 'equals') {
				findEquals = false;
				accum.push(['equals', ['=']]);
				(stack.getCurrentPart() as PPDPart).eqpos = accum.length - 1;
				++i;
			}
		}
		for (const piece of stack.stack) {
			stack.rootAccum.push(...piece.breakSyntax());
		}
		for (const node of Object.values(stack.rootAccum)) {
			if (Array.isArray(node) && node[NodeTree.NAME] === 'possible-h') {
				node[NodeTree.NAME] = 'h';
			}
		}
		return [['root', stack.rootAccum]];
	}
}
