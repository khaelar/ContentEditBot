import { callAPI, hexToRGBA, sleep } from "./util.js";
import { PageActivity, HomeActivity, NotFoundActivity, ErrorActivity, BlockEditorActivity } from "./activities.js";
import { ControlPanel } from "./control-panel.js";
import ActivityRouter from "./activity-router.js";

class App {
    constructor() {
        this.dragActive = false;
    }

    setup() {
        this.build();

        // calculating highlight color based on user app theme
        const textColor = window.Telegram.WebApp.themeParams.text_color;
        this.appElement.style.setProperty("--highlight-color",
            hexToRGBA(textColor, .1));

        window.Telegram.WebApp.BackButton.onClick(() => this.goBack());

        this.router.addCallback("activityChange", () => {
            const backBtn = window.Telegram.WebApp.BackButton
            this.router.stack.length > 1 ?
                backBtn.show() : backBtn.hide();

            this.updateControlPanel()
        });

        const handleDrag = event => {
            if (event.type === "dragstart") {
                if (event.target.classList.contains("block")) {
                    this.setDragActive(true);
                }
            } else {
                this.setDragActive(false);
            }
        }

        this.appElement.addEventListener("dragstart", handleDrag);
        this.appElement.addEventListener("dragend", handleDrag);
        this.appElement.addEventListener("drop", handleDrag);
    }

    build() {
        this.appElement = build("div");
        this.appElement.id = "app";

        this.controlPanel = new ControlPanel(this);
        this.controlPanel.setup();
        this.appElement.append(this.controlPanel.panelElement);

        this.router = new ActivityRouter();
        this.router.setup();
        this.appElement.append(this.router.activitiesContainer);
    }

    async getActivityFromResp(pageResp) {
        // reusable logic for constructing activity based on backend response
        if (pageResp.status == 404) return new NotFoundActivity();
        if (!pageResp.ok) return new ErrorActivity();

        const pageData = (await pageResp.json()).result;
        return new PageActivity(pageData);
    }

    connectHomeActivity(activity) {
        // only one home activity can be in the stack,
        this.home = activity;
        this.home.addCallback("pageOpen", pageId =>
            this.openPage(pageId));
        this.home.addCallback("selectionChange", () =>
            this.updateControlPanel());
    }

    async openPage(pageId, appearInstantly) {
        if (pageId) {
            const pageResp = await callAPI("GET", `pages/${pageId}`);
            const activity = await this.getActivityFromResp(pageResp);
            this.router.pushActivity(activity, appearInstantly);

            activity.addCallback("blockEdit", block => {
                this.router.pushActivity(new BlockEditorActivity(block));
            });

            return;
        }

        const userPagesResp = await callAPI("GET", "pages/my");
        const userPages = (await userPagesResp.json()).result;
        const page = new HomeActivity(userPages);
        this.router.pushActivity(page, appearInstantly);
        this.connectHomeActivity(page);

        if (!userPages.length) {
            // if user got 0 pages, automatically showing the onboarding page
            this.createNewPage(true, true);
        }
    }

    async createNewPage(onboarding = false, appearInstantly = false) {
        const pageResp = await callAPI("POST", "pages", { onboarding });
        const activity = await this.getActivityFromResp(pageResp);
        this.router.pushActivity(activity, appearInstantly);

        // TODO: deduplicate
        activity.addCallback("blockEdit", block => {
            this.router.pushActivity(new BlockEditorActivity(block));
        });

        // rendering item behind the scenes after the new page appear animated
        await sleep(200);
        this.home.addNewPage(activity.initData);
    }

    goBack() {
        if (this.controlPanel.activeMenu) {
            this.controlPanel.toggleMenu(null);
            return;
        }

        this.router.popActivity();
    }

    updateControlPanel() {
        let controlPanelMode = null;
        const curActivity = this.router.curActivity;

        if (curActivity.constructor == HomeActivity) {
            controlPanelMode = curActivity.selectMode ? "homeSelect" : "home";
        } else if (curActivity.constructor == PageActivity) {
            controlPanelMode = "page";
            if (curActivity.editable) controlPanelMode = "pageEdit";
            if (this.dragActive) controlPanelMode = "blockDrag";
        } else if (curActivity.constructor == BlockEditorActivity) {
            controlPanelMode = "blockEditor";
        }

        this.controlPanel.setMode(controlPanelMode);
    }

    setDragActive(isActive) {
        this.dragActive = isActive;
        this.updateControlPanel();
    }
}

(function () {
    const pageParams = new URLSearchParams(document.location.search);
    const startPage = pageParams.get("tgWebAppStartParam")

    window.app = new App(appRoot);
    window.app.setup();
    document.body.append(window.app.appElement);
    window.app.openPage(startPage, true);
})();