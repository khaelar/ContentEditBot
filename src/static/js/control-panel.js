import { blockRegistry } from "./block-registry.js";
import { build, buildButton, sleep, switchActiveChild } from "./util.js";

export class ControlPanel {
    constructor(app) {
        this.app = app;
        this.activeMode = null;
        this.activeMenu = null;
    }

    setMode(modeName) {
        if (this.activeMode === modeName) return;

        this.activeMode = modeName;
        this.panelElement.classList.toggle("active", this.activeMode);

        switchActiveChild(this.modesContainer, this.activeMode ?
            `:scope>.${this.activeMode}Mode` : null);
    }

    toggleMenu(menuName = null) {
        if (this.activeMenu === menuName)
            this.activeMenu = null;
        else
            this.activeMenu = menuName;


        this.menusContainer.classList.toggle("active", this.activeMenu);
        switchActiveChild(this.menusContainer, this.activeMenu ?
            `:scope>.${this.activeMenu}` : null);
    }

    setup() {
        this.build();
    }

    build() {
        this.panelElement = build("div.controlPanel");
        this.buildMenus();
        this.buildMessages();
        this.buildModes();
    }

    buildMenus() {
        this.menusContainer = build("div.menus", this.panelElement);
        this.buildBlockCatalog();
        this.buildPageMenu();

        this.menusContainer.addEventListener("click", event => {
            if (event.target === this.menusContainer) {
                this.toggleMenu(null);
            }
        })
    }

    buildBlockCatalog() {
        const blockCatalogElement = build("div.menu.blockCatalog",
            this.menusContainer);
        for (const [typeName, blockClass] of blockRegistry.getAllTypes()) {
            // block objects are needed only to produce elements
            // and can be disposed afterwards
            const block = new blockClass(null, true, true);
            block.setup();
            block.blockElement.dataset.typeName = typeName;
            block.blockElement.classList.add("preview");
            blockCatalogElement.append(block.blockElement);
        }

        this.blockCatalogSortable = new Sortable(blockCatalogElement, {
            group: {
                name: "editablePage",
                pull: "clone",
                put: false
            },
            animation: 150,
            delay: 300,
            delayOnTouchOnly: true,
            onStart: () => this.toggleMenu("blockCatalog"),
            onEnd: () => this.app.router.curActivity.save(),
        });
    }

    buildPageMenu() {
        const menuElement = build("div.menu.pageMenu", this.menusContainer);

        const onClick = async () => {
            this.toggleMenu();
            const pageLink = this.app.router.curActivity.getLink();

            navigator.clipboard.writeText(pageLink)
                .then(() => this.showMessage("Page Link Copied!"))
                .catch(() => this.showMessage("Unable to copy link", true));
        };
        buildButton(".copyLink.noTgStyle", "Copy Link", menuElement, onClick);
    }

    buildMessages() {
        this.messagesContainer = build("div.messages", this.panelElement);
    }

    buildModes() {
        this.modesContainer = build("div.modes", this.panelElement);

        this.setupPageEditMode();
        this.setupBlockEditorMode();
        this.setupBlockDragMode();
        this.setupPageMode();
        this.setupHomeSelectMode();
        this.setupHomeMode();
    }

    setupHomeMode() {
        const modeElement = build("div.homeMode", this.modesContainer);

        const newPageButton = buildButton(".newPage", "New Page",
            modeElement, async () => {
                newPageButton.disabled = true;
                await this.app.createNewPage();
                newPageButton.disabled = false;
            });
    }

    setupBlockDragMode() {
        const modeElement = build("div.blockDragMode", this.modesContainer);
        const deleteAreaElement = build("div.deleteArea", modeElement);
        const deleteAnimElement = build("div.animation", deleteAreaElement);
        const receiverElement = build("div.receiver", deleteAreaElement);

        this.blockDeleteAnimation = lottie.loadAnimation({
            container: deleteAnimElement,
            renderer: "svg",
            loop: false,
            autoplay: false,
            path: "/lottie/delete.json",
        });

        const handleDragEvent = event => {
            const dragActive = event.type === "dragenter";
            deleteAreaElement.classList.toggle("active", dragActive);
            dragActive ? this.blockDeleteAnimation.goToAndPlay(0, true) :
                this.blockDeleteAnimation.goToAndStop(0, true)
        }

        const eventTypes = ["dragenter", "dragend", "dragleave", "drop"];
        eventTypes.map(eventType =>
            receiverElement.addEventListener(eventType, handleDragEvent));

        this.blockDeleteSortable = new Sortable(receiverElement, {
            group: "editablePage",
            delay: 300,
            delayOnTouchOnly: true,
            onAdd: event => event.item.remove()
        });
    }

    setupBlockEditorMode() {
        const modeElement = build("div.blockEditorMode", this.modesContainer);

        buildButton(".apply", "Apply", modeElement, () => {
            // current activity is guaranteed to be BlockEditor
            const applied = this.app.router.curActivity.apply();
            // false means block can't apply the settings
            if (applied === false) return;

            this.app.goBack();

            // after returning back curActivity is PageActivity
            // saving edited block in the database
            this.app.router.curActivity.save();
        });
    }

    setupPageMode() {
        const modeElement = build("div.pageMode", this.modesContainer);

        buildButton(".pageMenu", "Page Menu", modeElement, () =>
            this.toggleMenu("pageMenu"));
    }

    setupPageEditMode() {
        const modeElement = build("div.pageEditMode", this.modesContainer);

        buildButton(".pageMenu", "Page Menu", modeElement, () =>
            this.toggleMenu("pageMenu"));
        buildButton(".newBlock", "New Block", modeElement, () =>
            this.toggleMenu("blockCatalog"));
    }

    setupHomeSelectMode() {
        const modeElement = build("div.homeSelectMode", this.modesContainer);

        const deletePageButton = buildButton(".danger.deletePage",
            "Delete Selected", modeElement, async () => {
                deletePageButton.disabled = true;
                await this.app.home.deleteSelectedPages();
                deletePageButton.disabled = false;
            });
    }

    // TODO: something
    async showMessage(text, error = false, time = 3000) {
        const messageElement = build("div.message", this.messagesContainer);
        if (error) messageElement.classList.add("error");
        const messageContentWrapper = build("span.content", messageElement);
        messageContentWrapper.textContent = text;

        await sleep(time);
        messageElement.classList.add("hidden");

        messageElement.addEventListener("transitionend", () =>
            messageElement.remove());
    }
}