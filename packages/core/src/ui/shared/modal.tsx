import { Component, JSX, splitProps } from "solid-js";
import { Portal } from "solid-js/web";
import "./modal.scss";

type ModalProps = JSX.InputHTMLAttributes<HTMLDivElement> & {
	title: string;
	onClose: () => void;
};
export const Modal: Component<ModalProps> = (props) => {
	const [local, rest] = splitProps(props, ["children", "class", "onClose", "title"]);

	return (
		<Portal>
			<div class={`modal ${local.class ?? ""}`.trim()}>
				<div class="modal-background" />
				<div class="modal-body" {...rest}>
					<header>
						<h1>{local.title}</h1>
						<button
							type="button"
							class="close-modal-button unadorned"
							onClick={local.onClose}
						>
							✕
						</button>
					</header>
					{local.children}
				</div>
			</div>
		</Portal>
	);
};
