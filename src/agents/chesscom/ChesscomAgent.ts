import { ChessAgentInterface } from "@agents/ChessAgentInterface";
import { AgentState } from "@components/AgentState";
import { ComputerConfigState } from "@components/ComputerConfigState";
import { Square } from "@components/Square";
import { ComputerOptInterface } from "@components/computers/ComputerOptInterface";
import { ElementHandle, Page } from "puppeteer";

export class ChesscomAgent implements ChessAgentInterface {
    private static UNIQUE_PAGES: Set<Page> = new Set<Page>();
    private page: Page;
    private state: AgentState;
    public constructor(page: Page) {
        if (ChesscomAgent.UNIQUE_PAGES.has(page)) {
            throw "Another Chess.com agent has already attached this page";
        }
        this.page = page;
        this.state = AgentState.Idle;
        ChesscomAgent.UNIQUE_PAGES.add(page);
    }
    async move(from: Square, to: Square): Promise<AgentState> {
        throw new Error("Method not implemented.");
    }
    async waitTurn(): Promise<AgentState> {
        throw new Error("Method not implemented.");
    }
    async status(): Promise<AgentState> {
        throw new Error("Method not implemented.");
    }
    async playComputer(computer: ComputerOptInterface): Promise<AgentState> {
        try {
            await this.page.goto("https://www.chess.com/play/computer");
            (await this.page.$("div[id^='placeholder-'] button[aria-label='Close']"))?.click();
            if (await this.page.$("#board-layout-sidebar div.bot-selection-scroll") == null) {
                throw "Version update needed";
            }
            let configState = await computer.selectMe(this.page);
            if (configState != ComputerConfigState.Chosen) {
                throw "Version update needed";
            }
            let playBtn = await this.page.$("#board-layout-sidebar button[title='Play']");
            if (playBtn == null) {
                throw "No play button detected";
            }
            await playBtn.click();

        } catch (error: unknown) {
            return Promise.resolve(AgentState.BrowserPageOutOfReach);
        }
        return Promise.resolve(AgentState.Idle);
    }
    async playRapid(...args: any): Promise<AgentState> {
        throw new Error("Method not implemented.");
    }
    async playBlitz(...args: any): Promise<AgentState> {
        throw new Error("Method not implemented.");
    }
    async playBullet(...args: any): Promise<AgentState> {
        throw new Error("Method not implemented.");
    }
    private checkElement(el: ElementHandle | Element) {
        if (el == null) {
        }
    }
} 