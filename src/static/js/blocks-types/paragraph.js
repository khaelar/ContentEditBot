import Block from "../block.js";
import { build } from "../util.js";

const defaultProps = {
    text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."
}

export default class ParagraphBlock extends Block {
    static name = "Paragraph";
    static typeName = "paragraph";

    constructor(props) {
        super(props || defaultProps);
    }

    buildContent(contentWrapper) {
        const paragraphElement = build("p", contentWrapper);
        paragraphElement.textContent = this.props.text;
    }

    buildSettings(settingsWrapper) {
        settingsWrapper.textContent = "You just opened settings";
    }
}