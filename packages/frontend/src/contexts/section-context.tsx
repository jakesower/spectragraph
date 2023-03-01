import { Accessor, Setter, createContext, createSignal, useContext } from "solid-js";
import { Section } from "../types";

const sections: Section[] = ["import", "remix"];
const SectionContext = createContext<[Accessor<Section>, Setter<Section>]>();

export function SectionProvider(props) {
	const [section, setSection] = createSignal<Section>(sections[0]);

	return (
		<SectionContext.Provider value={[section, setSection]}>
			{props.children}
		</SectionContext.Provider>
	);
}

export function useSection() {
	return useContext(SectionContext);
}
