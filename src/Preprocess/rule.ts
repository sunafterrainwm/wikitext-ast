export type Rule = typeof rules[keyof typeof rules];

export const rules = {
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
			2: undefined
		},
		min: 2,
		max: 2
	},
	'-{': {
		end: '}-',
		names: {
			2: undefined
		},
		min: 2,
		max: 2
	}
} as const;
