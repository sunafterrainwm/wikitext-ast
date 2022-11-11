export interface Rule {
	end: string;
	names: Record<number, string | null>;
	min: number;
	max: number;
}

export const rules: Record<string, Rule> = {
	'{': {
		end: '}',
		names: {
			2: 'template',
			3: 'tplarg'
		},
		min: 2,
		max: 3
	},
	'[': {
		end: ']',
		names: {
			2: null
		},
		min: 2,
		max: 2
	},
	'-{': {
		end: '}-',
		names: {
			2: null
		},
		min: 2,
		max: 2
	}
};
