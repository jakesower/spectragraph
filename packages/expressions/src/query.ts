export type Subquery = {
	id?: string;
	properties: {
		[k: string]: Subquery;
	};
};

export type Query = Subquery & {
	type: string;
};
