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
            
            await this.page.$("div[id^='placeholder-'] button[aria-label='Close']").then(async (btn) => {
                await btn?.click();
            });
            await this.page.evaluate(() => new Promise<void>((resolve)=>{
                let timeoutId = setTimeout(() => {
                    throw "Asserting modal popup times out";
                }, 10200);
                var x = new MutationObserver(function (mut, ob) {
                    if (mut[0].removedNodes) {
                        clearTimeout(timeoutId);
                        resolve();
                        ob.disconnect();
                    }
                });
                let node = document.querySelector("div[id^='placeholder-']");
                if (node != null) {
                    x.observe(node , { childList: true });
                } else {
                    clearTimeout(timeoutId);
                    resolve();
                }
            }));
            if ((await this.page.$("div[id^='placeholder-'] div.ui_modal-component"))) {
                throw "Cannot close modal";
            }
            if (await this.page.$("#board-layout-sidebar div.bot-selection-scroll") == null) {
                throw "Cannot find bot selection";
            }
            let configState = await computer.selectMe(this.page);
            if (configState != ComputerConfigState.Chosen) {
                throw "Bot was not selected";
            }
            
            await this.page.evaluate(() => new Promise<void>((resolve)=>{
                let timeoutId = setTimeout(() => {
                    throw "Finding play button times out";
                }, 10200);
                var x = new MutationObserver(function (_mut, ob) {
                    if (document.querySelector("#board-layout-sidebar button[title='Play']")) {
                        clearTimeout(timeoutId);
                        resolve();
                        ob.disconnect();
                    }
                });
                let btn = document.querySelector("#board-layout-sidebar button[title='Play']");
                if (btn == null) {
                    let node = document.querySelector("#board-layout-sidebar");
                    if (node != null)  {
                        x.observe(node , { childList: true });
                    } else {
                        throw "Play button not found";
                    }
                } else {
                    clearTimeout(timeoutId);
                    resolve();
                }
            }));
            let playBtn = await this.page.$("#board-layout-sidebar button[title='Play']");
            if (playBtn == null) {
                throw "No play button detected";
            }
            await playBtn.click();
        } catch (error: unknown) {
            return Promise.reject(([error, (this.state = AgentState.BrowserPageOutOfReach)] as [unknown, AgentState]));
        }
        return Promise.resolve((this.state = AgentState.TakingTurn));
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
} 