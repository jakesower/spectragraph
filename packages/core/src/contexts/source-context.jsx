import { createContext, createEffect, useContext } from "solid-js";
import { createStore } from "solid-js/store";

const SourceContext = createContext();

export function SourceProvider(props) {
	const stored = localStorage.getItem("sources");
	const init = stored ? JSON.parse(stored) : {};
	const [sources, setSources] = createStore(init);

	createEffect(() => {
		localStorage.setItem("sources", JSON.stringify(sources));
	});

	// const [sources, setSources] = createStore({});
	// const value = [
	// 	sources,
	// 	{
	// 		setSource: (id, data) => {
	// 			console.log("got", id, data);
	// 			setSources((cur) => ({ ...cur, [id]: data }));
	// 		},
	// 		moo: () => {},
	// 	},
	// ];

	// eslint-disable-next-line max-len
	return (
		<SourceContext.Provider value={[sources, setSources]}>
			{props.children}
		</SourceContext.Provider>
	);
}

export function useSources() {
	return useContext(SourceContext);
}
