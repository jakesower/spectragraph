import {
	Component,
	JSX,
	children,
	createSignal,
	For,
	createEffect,
	mergeProps,
} from "solid-js";
import "../shared.scss";
import "./tabs.scss";

type TabProps = {
	label: JSX.Element;
	children: JSX.Element;
};
export const Tab = (props: TabProps): any => {
	const resolved = children(() => props.children);
	return mergeProps(props, {
		children: <div class="tab-content">{resolved}</div>,
		label: <div class="tab-label">{props.label}</div>,
	});
};

type TabsProps = {
	children: any;
};
export const Tabs: Component<TabsProps> = (props) => {
	const [selected, setSelected] = createSignal(0);

	const resolved = children(() => props.children).toArray();

	const labels = resolved.map((child) => (child as any).label);
	const bodies = resolved.map((child) => (child as any).children);

	createEffect(() => {
		resolved.forEach((child: any, idx) => {
			const childBody = child.children;
			const childLabel = child.label;

			childLabel.setAttribute?.(
				"class",
				selected() === idx ? "tab-label selected" : "tab-label unselected",
			);

			childBody.setAttribute?.(
				"class",
				selected() === idx ? "tab-content selected" : "tab-content unselected",
			) ?? "";
		});
	});

	return (
		<div class="tabs">
			<ul class="tab-labels standard">
				<For each={labels}>
					{(label, idx) => (
						<button
							type="button"
							class="unadorned"
							onClick={() => setSelected(idx)}
							role="listitem"
						>
							{label}
						</button>
					)}
				</For>
			</ul>
			{bodies}
		</div>
	);

	return <div>{labels}</div>;
};
