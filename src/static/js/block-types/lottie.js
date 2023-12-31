import Block from "../block.js";
import { build, buildButton } from "../util.js";

export default class LottieBlock extends Block {
	static name = "Lottie Animation";
	static typeName = "lottie";

	constructor(...args) {
		super(...args);

		this.defaultFile = "/lottie/day-night.json";
	}

	getDefaultProps() {
		return {
			animationData: null
		}
	}

	buildContent() {
		this.blockElement.classList.add("lottie");
		this.animationElement = build("div.animation", this.blockElement);
	}

	buildSettings() {
		this.settingsElement.classList.add("lottie");

		this.previewElement = build("div.preview", this.settingsElement);
		this.previewElement.addEventListener("click", () =>
			this.fileInput.click());

		const hintElement = build("div.hintAddin", this.settingsElement);
		hintElement.textContent =
			"Click on the preview to upload another file";

		this.fileInput = build("input", this.settingsElement);
		this.fileInput.classList.add("fileInput");
		this.fileInput.type = "file";
		this.fileInput.accept = ".json";
		this.fileInput.multiple = false;

		const updatePreview = async () => {
			const animationData = JSON.parse(await this.readFileInput()) ||
				this.props.animationData;

			const animationConfig = this.getAnimationConfig(animationData);
			animationConfig.container = this.previewElement;
			this.previewAnimation?.destroy?.();
			this.previewAnimation = lottie.loadAnimation(animationConfig);
		}

		this.fileInput.addEventListener("change", updatePreview);
		updatePreview();
	}

	async readSettings() {
		const animationData = JSON.parse(await this.readFileInput()) ||
			this.props.animationData;
		return { animationData };
	}

	async applyProps(props) {
		this.props = props;

		const animationConfig = this.getAnimationConfig(
			this.props.animationData);
		animationConfig.container = this.animationElement;
		this.animation?.destroy?.();
		this.animation = lottie.loadAnimation(animationConfig);
	}

	readFileInput() {
		return new Promise((resolve, reject) => {
			if (!this.fileInput.files.length) {
				resolve(null);
				return;
			};

			const reader = new FileReader();
			reader.onload = e => resolve(e.target.result);
			reader.onerror = e => reject(e.target.error);

			reader.readAsText(this.fileInput.files[0]);
		});
	}

	getAnimationConfig(animationData) {
		// repeated logic encapsulation
		// composes config for lottie.loadAnimation

		const animationConfig = {
			renderer: "svg",
			loop: true,
			autoplay: true,
		}

		if (animationData)
			animationConfig.animationData = animationData;
		else
			animationConfig.path = this.defaultFile;

		return animationConfig;
	}
}