import { AbstractNode, IParentNode } from './AbstractNode';
import { Node } from './Node';
import { NodeCollection } from './NodeCollection';
import { normalParseOptions, ParsedParseOptions, ParseOptions } from './ParseOptions';
import { UnparsedWikitext } from './Wikitext';

export class Document extends AbstractNode<true> implements IParentNode<Node> {
	public children: NodeCollection;
	public get hasChildren(): boolean {
		return !!this.children.length;
	}

	public readonly options: ParsedParseOptions;

	public constructor(rawContent: string, protected readonly rawOptions: ParseOptions) {
		super(rawContent, undefined);
		this.options = normalParseOptions(rawOptions);
		this.children = new NodeCollection();
		if (rawContent !== '') {
			this.children.push(new UnparsedWikitext(rawContent, this));
		}
	}

	protected _waring: string[] = [];
	public get waring(): string[] {
		return this._waring.slice();
	}

	public mayThrowError(error: Error): void {
		// This method will call when preparing this.options
		// so this.options might be "undefined" in sometime
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (this.options?.strict ?? !!this.rawOptions.strict) {
			throw error;
		}
		this._waring.push(error.message);
	}
}

declare module './Node' {
	export interface NodeMap {
		Document: Document;
	}
}
