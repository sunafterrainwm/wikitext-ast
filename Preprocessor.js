/* eslint-disable */
// @ts-ignore
//
// Preprocessor using PHP arrays
//
// This program is free software; you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation; either version 2 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License along
// with this program; if not, write to the Free Software Foundation, Inc.,
// 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301, USA.
// http://www.gnu.org/copyleft/gpl.html
//
// @file
// @ingroup Parser
//
//
// Differences from DOM schema:
// attribute nodes are children
// "<h>" nodes that aren't at the top are replaced with <possible-h>
//
// Nodes are stored in a recursive array data structure. A node store is an
// array where each element may be either a scalar (representing a text node)
// or a "descriptor", which is a two-element array where the first element is
// the node name and the second element is the node store for the children.
//
// Attributes are represented as children that have a node name starting with
// "@", and a single text node child.
//
// @todo: Consider replacing descriptor arrays with objects of a new class.
// Benchmark and measure resulting memory impact.
//
// @ingroup Parser
//
// phpcs:ignore Squiz.Classes.ValidClassName.NotCamelCaps
// Cache format version

// @var int|bool Min wikitext size for which to cache DOM tree

//
// @see Preprocessor::__construct()
// @param Parser $parser
// @param WANObjectCache|null $wanCache
// @param array $options Additional options include:
// - cacheThreshold: min text size for which to cache DOMs. [Default: false]
//

//
// @return PPFrame_Hash
//

//
// @param array $args
// @return PPCustomFrame_Hash
//

//
// @param array $values
// @return PPNode_Hash_Array
//

//
// @param string $text Wikitext
// @param int $flags Bit field of Preprocessor::DOM_* flags
// @return array JSON-serializable document object model array
//
class Preprocessor_Hash extends Preprocessor {
	static CACHE_VERSION = 3;
	constructor(parser, wanCache = undefined, options = {}) {
		super(parser, wanCache, options);
		this.cacheThreshold = options.cacheThreshold || false;
	}

	newFrame() {
		return new PPFrame_Hash(this);
	}

	newCustomFrame(args) {
		return new PPCustomFrame_Hash(this, args);
	}

	newPartNodeArray(values) {
		const list = [];
		for (const k in values) {
			const val = values[k];
			if (typeof k === 'number') {
				var store = [['part', [['name', [['@index', [k]]]], ['value', [strval(val)]]]]];
			} else {
				store = [['part', [['name', [strval(k)]], '=', ['value', [strval(val)]]]]];
			}
			list.push(new PPNode_Hash_Tree(store, 0));
		}
		return new PPNode_Hash_Array(list);
	}

	preprocessToObj(text, flags = 0) {
		if (this.disableLangConversion)
		// Language conversions are globally disabled; implicitly set flag
		{
			flags |= Preprocessor_Hash.DOM_LANG_CONVERSION_DISABLED;
		}
		if (this.cacheThreshold !== false && text.length >= this.cacheThreshold && (flags & Preprocessor_Hash.DOM_UNCACHED) != Preprocessor_Hash.DOM_UNCACHED) {
			var domTreeArray = this.wanCache.getWithSetCallback(this.wanCache.makeKey('preprocess-hash', sha1(text), flags), this.wanCache.TTL_DAY, () => {
				return this.buildDomTreeArrayFromText(text, flags);
			}, {
				version: Preprocessor_Hash.CACHE_VERSION
			});
		} else {
			domTreeArray = this.buildDomTreeArrayFromText(text, flags);
		}
		return new PPNode_Hash_Tree(domTreeArray, 0);
	}

	buildDomTreeArrayFromText(text, flags)
	// Use "A" modifier (anchored) instead of "^", because ^ doesn't work with an offset

	// Input pointer, starts out pointing to a pseudo-newline before the start
	// Current accumulator. See the doc comment for Preprocessor_Hash for the format.
	// True to find equals signs in arguments
	// True to take notice of pipe characters

	// True if $i is inside a possible heading
	// True if there are no more greater-than (>) signs right of $i
	// Map of tag name => true if there are no more closing tags of given type right of $i
	// True to ignore all input up to the next <onlyinclude>
	// Do a line-start run without outputting an LF character

	// Output any remaining unclosed brackets

	// Enable top-level headings
	{
		const forInclusion = flags & Preprocessor_Hash.DOM_FOR_INCLUSION;
		const langConversionDisabled = flags & Preprocessor_Hash.DOM_LANG_CONVERSION_DISABLED
		const xmlishElements = this.parser.getStripList()
		const xmlishAllowMissingEndTag = ['includeonly', 'noinclude', 'onlyinclude']
		let enableOnlyinclude = false;
		if (forInclusion) {
			var ignoredTags = ['includeonly', '/includeonly'];
			var ignoredElements = ['noinclude'];
			xmlishElements.push('noinclude');
			if (strpos(text, '<onlyinclude>') !== false && strpos(text, '</onlyinclude>') !== false) {
				enableOnlyinclude = true;
			}
		} else {
			ignoredTags = ['noinclude', '/noinclude', 'onlyinclude', '/onlyinclude'];
			ignoredElements = ['includeonly'];
			xmlishElements.push('includeonly');
		}
		const xmlishRegex = array_merge(xmlishElements, ignoredTags).join('|');
		const elementsRegex = `~(${xmlishRegex})(?:\\s|\\/>|>)|(!--)~iA`
		const stack = new PPDStack_Hash()
		let searchBase = '[{<\n'
		if (!langConversionDisabled) {
			searchBase += '-'
		}
		const revText = strrev(text);
		const lengthText = text.length
		let i = 0;
		let accum = stack.getAccum();
		let findEquals = false;
		let findPipe = false;
		let headingIndex = 1;
		let inHeading = false;
		let noMoreGT = false;
		const noMoreClosingTag = [];
		let findOnlyinclude = enableOnlyinclude;
		let fakeLineStart = true;
		while (true) {
			if (findOnlyinclude)
			// Ignore all input up to the next <onlyinclude>

			// past-the-end
			{
				var startPos = strpos(text, '<onlyinclude>', i);
				if (startPos === false)
				// Ignored section runs to the end
				{
					accum.push(['ignore', [text.slice(i)]]);
					break
				}
				var tagEndPos = startPos + '<onlyinclude>'.length;
				accum.push(['ignore', [text.substr(i, tagEndPos - i)]]);
				i = tagEndPos;
				findOnlyinclude = false;
			}
			if (fakeLineStart) {
				var found = 'line-start'
				var curChar = ''
			} else
			// Find next opening brace, closing brace or pipe

			// Output literal section, advance input counter
			{
				let search = searchBase;
				if (stack.top === false) {
					var currentClosing = ''
				} else {
					currentClosing = stack.top.close;
					search += currentClosing;
				}
				if (findPipe) {
					search += '|'
				}
				if (findEquals)
				// First equals will be for the template
				{
					search += '='
				}
				var rule = undefined;
				const literalLength = strcspn(text, search, i)
				if (literalLength > 0) {
					Preprocessor_Hash.addLiteral(accum, text.substr(i, literalLength));
					i += literalLength;
				}
				if (i >= lengthText) {
					if (currentClosing == '\n')
					// Do a past-the-end run to finish off the heading
					{
						curChar = ''
						found = 'line-end'
					} else
					// All done
					{
						break;
					}
				} else {
					var curTwoChar;
					curChar = curTwoChar = text[i];
					if (i + 1 < lengthText) {
						curTwoChar += text[i + 1];
					}
					if (curChar == '|') {
						found = 'pipe'
					} else if (curChar == '=') {
						found = 'equals'
					} else if (curChar == '<') {
						found = 'angle'
					} else if (curChar == '\n') {
						if (inHeading) {
							found = 'line-end'
						} else {
							found = 'line-start'
						}
					} else if (curTwoChar == currentClosing) {
						found = 'close'
						curChar = curTwoChar;
					} else if (curChar == currentClosing) {
						found = 'close'
					} else if (undefined !== this.rules[curTwoChar]) {
						curChar = curTwoChar;
						found = 'open'
						rule = this.rules[curChar];
					} else if (undefined !== this.rules[curChar]) {
						found = 'open'
						rule = this.rules[curChar];
					} else
					// Some versions of PHP have a strcspn which stops on
					// null characters; ignore these and continue.
					// We also may get '-' and '}' characters here which
					// don't match -{ or $currentClosing.  Add these to
					// output and continue.
					{
						if (curChar == '-' || curChar == '}') {
							Preprocessor_Hash.addLiteral(accum, curChar);
						}
						++i;
						continue
					}
				}
			}
			if (found == 'angle')
			// Handle </onlyinclude>

			// Find end of tag

			// <includeonly> and <noinclude> just become <ignore> tags
			{
				const matches = false;
				if (enableOnlyinclude && str_starts_with(text.slice(i), '</onlyinclude>')) {
					findOnlyinclude = true;
					continue
				}
				if (!preg_match(elementsRegex, text, matches, 0, i + 1))
				// Element name missing or not listed
				{
					Preprocessor_Hash.addLiteral(accum, '<');
					++i
					continue
				}
				if (undefined !== matches[2] && matches[2] == '!--')
				// To avoid leaving blank lines, when a sequence of
				// space-separated comments is both preceded and followed by
				// a newline (ignoring spaces), then
				// trim leading and trailing spaces and the trailing newline.
				// Find the end
				{
					let endPos = strpos(text, '-->', i + 4);
					if (endPos === false)
					// Unclosed comment in input, runs to end
					{
						var inner = text.slice(i);
						accum.push(['comment', [inner]]);
						i = lengthText;
					} else
					// Search backwards for leading whitespace

					// Search forwards for trailing whitespace
					// $wsEnd will be the position of the last space (or the '>' if there's none)

					// Keep looking forward as long as we're finding more
					// comments.

					// Eat the line if possible
					// TODO: This could theoretically be done if $wsStart == 0, i.e. for comments at
					// the overall start. That's not how Sanitizer::removeHTMLcomments() did it, but
					// it's a possible beneficial b/c break.
					{
						const wsStart = i ? i - strspn(revText, ' \t', lengthText - i) : 0;
						let wsEnd = endPos + 2 + strspn(text, ' \t', endPos + 3);
						const comments = [[wsStart, wsEnd]]
						while (text.substr(wsEnd + 1, 4) == '<!--') {
							let c = strpos(text, '-->', wsEnd + 4);
							if (c === false) {
								break;
							}
							c = c + 2 + strspn(text, ' \t', c + 3);
							comments.push([wsEnd + 1, c]);
							wsEnd = c;
						}
						if (wsStart > 0 && text.slice(wsStart - 1, wsStart - 1 + 1) == '\n' && text.substr(wsEnd + 1, 1) == '\n')
						// Remove leading whitespace from the end of the accumulator

						// Do a line-start run next time to look for headings after the comment
						{
							var wsLength = i - wsStart;
							const endIndex = count(accum) - 1
							if (wsLength > 0 && endIndex >= 0 && typeof accum[endIndex] === 'string' && strspn(accum[endIndex], ' \t', -wsLength) === wsLength) {
								accum[endIndex] = accum[endIndex].slice(0, NaN);
							}
							for (const j in comments) {
								const com = comments[j];
								startPos = com[0];
								endPos = com[1] + 1;
								if (j == count(comments) - 1) {
									break;
								}
								inner = text.substr(startPos, endPos - startPos);
								accum.push(['comment', [inner]]);
							}
							fakeLineStart = true;
						} else
						// No line to eat, just take the comment itself
						{
							startPos = i;
							endPos += 2;
						}
						if (stack.top) {
							var part = stack.top.getCurrentPart();
							if (!(undefined !== part.commentEnd && part.commentEnd == wsStart - 1)) {
								part.visualEnd = wsStart;
							}
							part.commentEnd = endPos;
						}
						i = endPos + 1;
						inner = text.substr(startPos, endPos - startPos + 1);
						accum.push(['comment', [inner]]);
					}
					continue;
				}
				var name = matches[1];
				const lowerName = name.toLowerCase()
				const attrStart = i + name.length + 1
				tagEndPos = noMoreGT ? false : strpos(text, '>', attrStart);
				if (tagEndPos === false)
				// Infinite backtrack
				// Disable tag search to prevent worst-case O(N^2) performance
				{
					noMoreGT = true;
					Preprocessor_Hash.addLiteral(accum, '<');
					++i
					continue
				}
				if (ignoredTags.includes(lowerName)) {
					accum.push(['ignore', [text.substr(i, tagEndPos - i + 1)]]);
					i = tagEndPos + 1;
					continue
				}
				const tagStartPos = i;
				if (text[tagEndPos - 1] == '/')
				// Short end tag
				{
					var attrEnd = tagEndPos - 1;
					inner = undefined;
					i = tagEndPos + 1;
					var close = undefined;
				} else
				// Find closing tag
				{
					attrEnd = tagEndPos;
					if (!(undefined !== noMoreClosingTag[name]) && preg_match('/<\\/' + preg_quote(name, '/') + '\\s*>/i', text, matches, PREG_OFFSET_CAPTURE, tagEndPos + 1)) {
						inner = text.substr(tagEndPos + 1, matches[0][1] - tagEndPos - 1);
						i = matches[0][1] + matches[0][0].length;
						close = matches[0][0];
					} else
					// No end tag
					{
						if (xmlishAllowMissingEndTag.includes(name))
						// Let it run out to the end of the text.
						{
							inner = text.slice(tagEndPos + 1);
							i = lengthText;
							close = undefined;
						} else
						// Don't match the tag, treat opening tag as literal and resume parsing.

						// Cache results, otherwise we have O(N^2) performance for input like <foo><foo><foo>...
						{
							i = tagEndPos + 1;
							Preprocessor_Hash.addLiteral(accum, text.substr(tagStartPos, tagEndPos + 1 - tagStartPos));
							noMoreClosingTag[name] = true;
							continue
						}
					}
				}
				if (ignoredElements.includes(lowerName)) {
					accum.push(['ignore', [text.substr(tagStartPos, i - tagStartPos)]]);
					continue
				}
				if (attrEnd <= attrStart) {
					var attr = ''
				} else
				// Note that the attr element contains the whitespace between name and attribute,
				// this is necessary for precise reconstruction during pre-save transform.
				{
					attr = text.substr(attrStart, attrEnd - attrStart);
				}
				var children = [['name', [name]], ['attr', [attr]]];
				if (inner !== undefined) {
					children.push(['inner', [inner]]);
				}
				if (close !== undefined) {
					children.push(['close', [close]]);
				}
				accum.push(['ext', children]);
			} else if (found == 'line-start')
			// Is this the start of a heading?
			// Line break belongs before the heading element in any case

			// Examine upto 6 characters
			{
				if (fakeLineStart) {
					fakeLineStart = false;
				} else {
					Preprocessor_Hash.addLiteral(accum, curChar);
					i++
				}
				var count = strspn(text, '=', i, min(text.length, 6));
				if (count == 1 && findEquals)
				// DWIM: This looks kind of like a name/value separator.
				// Let's let the equals handler have it and break the potential
				// heading. This is heuristic, but AFAICT the methods for
				// completely correct disambiguation are very complex.
				{} else if (count > 0) {
					var piece = {
						open: '\n',
						close: '\n',
						parts: [new PPDPart_Hash(str_repeat('=', count))],
						startPos: i,
						count
					};
					stack.push(piece);
					accum = stack.getAccum();
					var stackFlags = stack.getFlags();
					if (undefined !== stackFlags.findEquals) {
						findEquals = stackFlags.findEquals;
					}
					if (undefined !== stackFlags.findPipe) {
						findPipe = stackFlags.findPipe;
					}
					if (undefined !== stackFlags.inHeading) {
						inHeading = stackFlags.inHeading;
					}
					i += count;
				}
			} else if (found == 'line-end')
			// A heading must be open, otherwise \n wouldn't have been in the search list
			// FIXME: Don't use assert()
			// phpcs:ignore MediaWiki.Usage.ForbiddenFunctions.assert

			// Search back through the input to see if it has a proper close.
			// Do this using the reversed string since the other solutions
			// (end anchor, etc.) are inefficient.

			// Unwind the stack

			// Note that we do NOT increment the input pointer.
			// This is because the closing linebreak could be the opening linebreak of
			// another heading. Infinite loops are avoided because the next iteration MUST
			// hit the heading open case above, which unconditionally increments the
			// input pointer.
			{
				piece = stack.top;
				assert(piece.open === '\n');
				part = piece.getCurrentPart();
				wsLength = strspn(revText, ' \t', lengthText - i);
				let searchStart = i - wsLength;
				if (undefined !== part.commentEnd && searchStart - 1 == part.commentEnd)
				// Comment found at line end
				// Search for equals signs before the comment
				{
					searchStart = part.visualEnd;
					searchStart -= strspn(revText, ' \t', lengthText - searchStart);
				}
				count = piece.count;
				const equalsLength = strspn(revText, '=', lengthText - searchStart)
				if (equalsLength > 0) {
					if (searchStart - equalsLength == piece.startPos)
					// This is just a single string of equals signs on its own line
					// Replicate the doHeadings behavior /={count}(.+)={count}/
					// First find out how many equals signs there really are (don't stop at 6)
					{
						count = equalsLength;
						if (count < 3) {
							count = 0;
						} else {
							count = min(6, Math.round((count - 1) / 2));
						}
					} else {
						count = min(equalsLength, count);
					}
					if (count > 0)
					// Normal match, output <h>
					{
						var element = [['possible-h', array_merge([['@level', [count]], ['@i', [headingIndex++]]], accum)]];
					} else
					// Single equals sign on its own line, count=0
					{
						element = accum;
					}
				} else
				// No match, no <h>, just pass down the inner text
				{
					element = accum;
				}
				stack.pop();
				accum = stack.getAccum();
				stackFlags = stack.getFlags();
				if (undefined !== stackFlags.findEquals) {
					findEquals = stackFlags.findEquals;
				}
				if (undefined !== stackFlags.findPipe) {
					findPipe = stackFlags.findPipe;
				}
				if (undefined !== stackFlags.inHeading) {
					inHeading = stackFlags.inHeading;
				}
				accum.splice(count(accum), 0, element);
			} else if (found == 'open')
			// count opening brace characters
			{
				var curLen = curChar.length;
				count = curLen > 1 ? strspn(text, curChar[curLen - 1], i + 1) + 1 : strspn(text, curChar, i);
				let savedPrefix = ''
				const lineStart = i > 0 && text[i - 1] == '\n'
				if (curChar === '-{' && count > curLen)
				// -{ => {{ transition because rightmost wins
				{
					savedPrefix = '-'
					i++;
					curChar = '{'
					count--;
					rule = this.rules[curChar];
				}
				if (count >= rule.min)
				// Add it to the stack
				{
					piece = {
						open: curChar,
						close: rule.end,
						savedPrefix,
						count,
						lineStart
					};
					stack.push(piece);
					accum = stack.getAccum();
					stackFlags = stack.getFlags();
					if (undefined !== stackFlags.findEquals) {
						findEquals = stackFlags.findEquals;
					}
					if (undefined !== stackFlags.findPipe) {
						findPipe = stackFlags.findPipe;
					}
					if (undefined !== stackFlags.inHeading) {
						inHeading = stackFlags.inHeading;
					}
				} else
				// Add literal brace(s)
				{
					Preprocessor_Hash.addLiteral(accum, savedPrefix + str_repeat(curChar, count));
				}
				i += count;
			} else if (found == 'close')
			// @var PPDStackElement_Hash $piece

			// lets check if there are enough characters for closing brace

			// check for maximum matching characters (if there are 5 closing
			// characters, we will probably need only 3 - depending on the rules)

			// Advance input pointer

			// Unwind the stack

			// Re-add the old stack element if it still has unmatched opening characters remaining
			{
				piece = stack.top;
				'@phan-var PPDStackElement_Hash $piece'
				let maxCount = piece.count;
				if (piece.close === '}-' && curChar === '}')
				// don't try to match closing '-' as a '}'
				{
					maxCount--;
				}
				curLen = curChar.length;
				count = curLen > 1 ? curLen : strspn(text, curChar, i, maxCount);
				rule = this.rules[piece.open];
				if (count > rule.max)
				// The specified maximum exists in the callback array, unless the caller
				// has made an error
				{
					var matchingCount = rule.max;
				} else
				// Count is less than the maximum
				// Skip any gaps in the callback array to find the true largest match
				// Need to use array_key_exists not isset because the callback can be null
				{
					matchingCount = count;
					while (matchingCount > 0 && !(matchingCount in rule.names)) {
						--matchingCount;
					}
				}
				if (matchingCount <= 0)
				// No matching element found in callback array
				// Output a literal closing brace and continue
				{
					var endText = text.substr(i, count);
					Preprocessor_Hash.addLiteral(accum, endText);
					i += count;
					continue
				}
				name = rule.names[matchingCount];
				if (name === undefined)
				// No element, just literal text
				{
					endText = text.substr(i, matchingCount);
					element = piece.breakSyntax(matchingCount);
					Preprocessor_Hash.addLiteral(element, endText);
				} else
				// Create XML element

				// The invocation is at the start of the line if lineStart is set in
				// the stack, and all opening brackets are used up.
				{
					const parts = piece.parts;
					const titleAccum = parts[0].out
					delete parts[0];
					children = []
					if (maxCount == matchingCount && !!piece.lineStart && piece.savedPrefix.length == 0) {
						children.push(['@lineStart', [1]]);
					}
					const titleNode = ['title', titleAccum];
					children.push(titleNode);
					let argIndex = 1;
					for (var part of Object.values(parts)) {
						if (undefined !== part.eqpos) {
							const equalsNode = part.out[part.eqpos];
							var nameNode = ['name', part.out.slice(0, part.eqpos)];
							var valueNode = ['value', part.out.slice(part.eqpos + 1)];
							var partNode = ['part', [nameNode, equalsNode, valueNode]];
							children.push(partNode);
						} else {
							nameNode = ['name', [['@index', [argIndex++]]]];
							valueNode = ['value', part.out];
							partNode = ['part', [nameNode, valueNode]];
							children.push(partNode);
						}
					}
					element = [[name, children]];
				}
				i += matchingCount;
				stack.pop();
				accum = stack.getAccum();
				if (matchingCount < piece.count)
				// do we still qualify for any callback with remaining count?
				{
					piece.parts = [new PPDPart_Hash()];
					piece.count -= matchingCount;
					var min = this.rules[piece.open].min;
					if (piece.count >= min) {
						stack.push(piece);
						accum = stack.getAccum();
					} else if (piece.count == 1 && piece.open === '{' && piece.savedPrefix === '-') {
						piece.savedPrefix = ''
						piece.open = '-{'
						piece.count = 2;
						piece.close = this.rules[piece.open].end;
						stack.push(piece);
						accum = stack.getAccum();
					} else {
						let s = piece.open.slice(0, 0);
						s += str_repeat(piece.open.slice(-1), piece.count - s.length);
						Preprocessor_Hash.addLiteral(accum, piece.savedPrefix + s);
					}
				} else if (piece.savedPrefix !== '') {
					Preprocessor_Hash.addLiteral(accum, piece.savedPrefix);
				}
				stackFlags = stack.getFlags();
				if (undefined !== stackFlags.findEquals) {
					findEquals = stackFlags.findEquals;
				}
				if (undefined !== stackFlags.findPipe) {
					findPipe = stackFlags.findPipe;
				}
				if (undefined !== stackFlags.inHeading) {
					inHeading = stackFlags.inHeading;
				}
				accum.splice(count(accum), 0, element);
			} else if (found == 'pipe')
			// shortcut for getFlags()
			{
				findEquals = true;
				stack.addPart();
				accum = stack.getAccum();
				++i
			} else if (found == 'equals')
			// shortcut for getFlags()
			{
				findEquals = false;
				accum.push(['equals', ['=']]);
				stack.getCurrentPart().eqpos = count(accum) - 1;
				++i
			}
		}
		for (var piece of Object.values(stack.stack)) {
			stack.rootAccum.splice(count(stack.rootAccum), 0, piece.breakSyntax());
		}
		for (const node of Object.values(stack.rootAccum)) {
			if (Array.isArray(node) && node[PPNode_Hash_Tree.NAME] === 'possible-h') {
				node[PPNode_Hash_Tree.NAME] = 'h'
			}
		}
		return [['root', stack.rootAccum]];
	}

	static addLiteral(accum, text) {
		const n = accum.length;
		if (n && typeof accum[n - 1] === 'string') {
			accum[n - 1] += text;
		} else {
			accum.push(text);
		}
	}
}
