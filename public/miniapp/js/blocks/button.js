import { build } from "../util.js";

export default class Button {
    constructor(props) {
        this.props = props;
        this.element = null;
    }

    build(blockElement) {
        const element = build("button", blockElement);
        element.textContent = this.props.text;
        this.element = element;
    }
}