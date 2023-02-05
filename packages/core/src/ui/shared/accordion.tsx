import {
	Accessor,
	Component,
	JSXElement,
	children,
	createContext,
	createSignal,
	splitProps,
	useContext,
} from "solid-js";
import "./accordion.scss";

const AccordionContext = createContext<[Accessor<string>, (val: string) => void]>();

type AccordionItemProps = {
	children: string | JSXElement;
	class?: string;
	id: string;
	label: JSXElement;
	onClick?: (ev: Event) => any;
	[k: string]: unknown;
};

export const AccordionItem: Component<AccordionItemProps> = (props) => {
	const [{ class: className, id, label, onClick }, rest] = splitProps(props, [
		"class",
		"label",
		"id",
		"onClick",
	]);

	const [selected, setSelected] = useContext(AccordionContext);

	const labelElement = (
		<button
			{...rest}
			class={`accordion-toggle${className ? ` ${className}` : ""}`}
			onClick={(ev) => {
				setSelected(id);
				if (onClick) onClick(ev);
			}}
		>
			{label}
		</button>
	);

	const child = children(() => (
		<div class={`accordion-item${selected() === id ? " selected" : ""}`}>
			{props.children}
		</div>
	));

	return (
		<>
			{labelElement}
			{child}
		</>
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
