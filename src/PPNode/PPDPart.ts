export class PPDPart {
	/**
	 * Output accumulator
	 */
	public out: string[];

	/**
	 * Index of equals sign, if found
	 */
	public eqpos: number | undefined;

	public commentEnd: number | undefined;

	public visualEnd: number | undefined;

	public constructor(out = '') {
		this.out = [];

		if (out !== '') {
			this.out.push(out);
		}
	}
}
