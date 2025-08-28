import { mapValues } from "es-toolkit";

export function buildAttribute(attrSchema, curValue) {
	const defaultedValue = curValue === undefined ? attrSchema.default : curValue;

	if (attrSchema.type === "object" && typeof defaultedValue === "object") {
		const mergedDefaultedValue = {
			...mapValues(attrSchema.properties ?? {}, () => undefined),
			...(attrSchema.default ?? {}),
			...defaultedValue,
		};

		return mapValues(mergedDefaultedValue, (val, key) => {
			if (key in (attrSchema.properties ?? {})) {
				return buildAttribute(attrSchema.properties[key], val);
			}

			const patternPropKey = Object.keys(
				attrSchema.patternProperties ?? {},
			).find((ppKey) => new RegExp(ppKey).test(key));
			if (patternPropKey) {
				return buildAttribute(
					attrSchema.patternProperties[patternPropKey],
					val,
				);
			}

			if (typeof attrSchema.additionalProperties === "object") {
				return buildAttribute(attrSchema.additionalProperties, val);
			}

			return val;
		});
	}

	if (attrSchema.type === "array" && Array.isArray(defaultedValue)) {
		return defaultedValue.map((item) =>
			buildAttribute(attrSchema.items ?? {}, item),
		);
	}

	return defaultedValue;
}
