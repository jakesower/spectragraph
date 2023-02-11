import {
	Accessor,
	Component,
	JSXElement,
	Setter,
	createContext,
	createSignal,
	splitProps,
	useContext,
} from "solid-js";
import "./accordion.scss";

const AccordionContext = createContext<[Accessor<string>, Setter<string>]>();

type AccordionItemProps = {
	children: JSXElement;
	class?: string;
	id: string;
	label: JSXElement;
	onClick?: (ev: Event) => any;
	[k: string]: unknown;
};

export const AccordionItem: Component<AccordionItemProps> = (props) => {
	const [local, rest] = splitProps(props, [
		"children",
		"class",
		"label",
		"id",
		"onClick",
	]);

	const [selected, setSelected] = useContext(AccordionContext);

	const labelElement = (
		<button {...rest} class="accordion-toggle" onClick={() => setSelected(local.id)}>
			{local.label}
		</button>
	);

	return (
		<div
			{...rest}
			class={`accordion-item${selected() === local.id ? " selected" : ""}${
				local.class ? ` ${local.class}` : ""
			}`}
		>
			{labelElement}
			{selected() && local.children}
		</div>
	);
};

type Props = {
	children: JSXElement[];
	selected: Accessor<string>;
	setSelected: Setter<string>;
};

export const Accordion: Component<Props> = (props) => {
	// const [selected, setSelected] = createSignal<string | null>("import");

	return (
		<AccordionContext.Provider value={[props.selected, props.setSelected]}>
			<div class="accordion">{props.children}</div>
		</AccordionContext.Provider>
	);
};
