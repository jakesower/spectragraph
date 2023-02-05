import {
	Accessor,
	Component,
	JSXElement,
	ValidComponent,
	children,
	createContext,
	createSignal,
	splitProps,
	useContext,
} from "solid-js";
import "./accordion.scss";
import { Dynamic } from "solid-js/web";

const AccordionContext = createContext<[Accessor<string>, (val: string) => void]>();

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
		<button
			{...rest}
			class="accordion-toggle"
			// class={`accordion-toggle${local.class ? ` ${local.class}` : ""}`}
			onClick={(ev) => {
				setSelected(local.id);
				if (local.onClick) local.onClick(ev);
			}}
		>
			{local.label}
		</button>
	);

	const child = children(() => (
		<div class={`accordion-item${selected() === local.id ? " selected" : ""}`}>
			{props.children}
		</div>

		// <Dynamic
		// 	component="div"
		// 	class={`accordion-item${selected() === id ? " selected" : ""}`}
		// >
		// 	hyuck
		// </Dynamic>

		// <div class={`accordion-item${selected() === id ? " selected" : ""}`}
	));

	return (
		<div
			{...rest}
			class={`accordion-item${selected() === local.id ? " selected" : ""}${
				local.class ? ` ${local.class}` : ""
			}`}
		>
			{labelElement}
			{local.children}
		</div>
	);
};

type Props = {
	children: JSXElement[];
};

export const Accordion: Component<Props> = (props) => {
	const [selected, setSelected] = createSignal<string | null>("import");

	return (
		<AccordionContext.Provider
			value={[
				selected,
				(nextIdx) => {
					setSelected(() => nextIdx);
				},
			]}
		>
			<div class="accordion">{props.children}</div>
		</AccordionContext.Provider>
	);
};
