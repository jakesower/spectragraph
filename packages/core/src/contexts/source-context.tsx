import { createContext, createEffect, useContext } from "solid-js";
import { createStore, SetStoreFunction } from "solid-js/store";

export type Record = { [k: string]: string | number | boolean | null };
export type Source = { data: Record[] };
export type SourceMap = { [k: string]: Source };

const SourceContext = createContext<[SourceMap, SetStoreFunction<SourceMap>]>();

export function SourceProvider(props) {
	const stored = localStorage.getItem("sources");
	const init = stored ? JSON.parse(stored) : {};
	const [sources, setSources] = createStore<SourceMap>(init);

	createEffect(() => {
		localStorage.setItem("sources", JSON.stringify(sources));
	});

	return (
		<SourceContext.Provider value={[sources, setSources]}>
			{props.children}
		</SourceContext.Provider>
	);
}

export function useSources() {
	return useContext(SourceContext);
}
