import { ChessAgentInterface } from "@agents/ChessAgentInterface";
import { AgentState } from "@components/AgentState";
import { ComputerConfigState } from "@components/ComputerConfigState";
import { PlayState } from "@components/PlayState";
import { Square } from "@components/Square";
import { ComputerOptInterface } from "@components/computers/ComputerOptInterface";
import { ResolveType } from "@misc/Util";
import { Board, State } from "@misc/chesscom/ChesscomGame";
import { ElementHandle, Page } from "puppeteer";

declare global {
    var chesscom_translations: any;
}
export class ChesscomAgent implements ChessAgentInterface {
    private static UNIQUE_PAGES: Set<Page> = new Set<Page>();
    private page: Page;
    private state: AgentState;
    private playing: PlayState;
    private asBlack: boolean | undefined;
    public constructor(page: Page) {
        if (ChesscomAgent.UNIQUE_PAGES.has(page)) {
            throw "Another Chess.com agent has already attached this page";
        }
        this.page = page;
        this.state = AgentState.Idle;
        this.playing = PlayState.NotPlaying;
        this.asBlack = undefined;
        ChesscomAgent.UNIQUE_PAGES.add(page);
    }
    
    private async resolveBoardSquare(board: ElementHandle, square: Square): Promise<[number, number]> {
        let fileIdx = square.file + 1, rankIdx = square.rank + 1;
        if (this.asBlack) {
            fileIdx = 8 - fileIdx + 1;
        } else {
            rankIdx = 8 - rankIdx + 1;
        }
        try {
            return await board.evaluate((board, fileIdx, rankIdx) : [number, number] => {
                let rect = board.getClientRects()[0];
                let pieceSample = board.querySelector(".piece");
                if (pieceSample == null) {
                    throw `Cannot find targeted piece: ${square.notation}`;
                }
                let squareLength = pieceSample.clientWidth;
                let half = squareLength / 2;
                return [rect.x+(squareLength * fileIdx) - half, rect.y+(squareLength * rankIdx) - half];
            }, fileIdx, rankIdx);
        } catch (err: any) {
            this.state = AgentState.BrowserPageOutOfReach;
            throw err;
        }
    }
    private async isBoardFlip() {

    }
    async move(from: Square, to: Square): Promise<AgentState> {
        let board: ElementHandle<Element> | null = null;
        try {
            board = await this.page.$("wc-chess-board");
            if (board == null) {
                this.state = AgentState.BrowserPageOutOfReach;
                throw "Board not found";
            }
            let asBlack = "black" == (await this.blackOrWhite);
            let bgSqr = await this.resolveBoardSquare(board, from); // TODO handle black/white state
            let enSqr = await this.resolveBoardSquare(board, to);
            await this.page.evaluate((board, bgSqr, enSqr) => new Promise<void>((resolve, reject)=>{
                let timeoutId = setTimeout(() => {
                    throw "Agent making a move times out";
                }, 5200);
                let dragbegin = new PointerEvent('pointerdown', { clientX: bgSqr[0], clientY: bgSqr[1], bubbles:true});
                let dragend = new PointerEvent('pointerup', { clientX: enSqr[0], clientY: enSqr[1], bubbles:true});
                board.dispatchEvent(dragbegin);
                board.dispatchEvent(dragend);

                // TODO handle waiting turn and make sure move is taken

                clearTimeout(timeoutId);
                resolve();
            }), board, bgSqr, enSqr);
        } catch (err: any) {
            throw [err, (this.state = AgentState.MovedIllegal)] as [any, AgentState]; // TODO handle better illegal move
        } finally {
            await board?.dispose();
        }
        return (this.state = AgentState.MovedWaitingTurn)
    }
    async waitTurn(): Promise<AgentState> {
        throw new Error("Method not implemented.");
    }
    get status(): AgentState {
        return this.state;
    }
    get playingState(): PlayState {
        return this.playing;
    }
    get blackOrWhite(): "black" | "white" {
        if (this.asBlack === undefined) {
            throw "Agent piece color is not defined";
        }
        return this.asBlack ? "black" : "white";
    }
    private async evaluateBlackOrWhite(): Promise<void> {
        this.asBlack = await this.executeOnBoardElem((board: Element | any) => {
            return 2 == (board.state.playingAs as number);
        });
    }
    private async executeOnBoardElem<T>(promise: (board: Element | Board, ...args: any) => T, ...evalArgs: any): Promise<T> {
        let board: ElementHandle<Element> | null = null;
        try {
            board = await this.page.$("wc-chess-board");
            if (null == board) {
                throw "Board not found";
            }
            return await board.evaluate(promise, evalArgs);
        } catch (err) {
            this.state = AgentState.BrowserPageOutOfReach;
            throw err;
        } finally {
            await board?.dispose();
        }
    }
    private async isPlaying(): Promise<boolean> {
        return await this.executeOnBoardElem(ChesscomAgent.evalPlaying);
    }
    private static async evalPlaying(board: ElementHandle<Element> | any): Promise<boolean> {
        const resignLabel: string = (chesscom_translations.messages)["Resign"] as string ?? "Resign";
        const checkObserve = (resolve: ResolveType<void>, mut: MutationRecord[], timeoutId: NodeJS.Timeout, ob: MutationObserver) => {
            if (mut.filter((m)=>m.addedNodes).length > 0 && document.querySelector(`#board-layout-sidebar button[aria-label='${resignLabel}']`)) {    
                clearTimeout(timeoutId);
                ob.disconnect();
                resolve();
            }
        }
        await new Promise<void>((resolve, reject) => {
            let timeoutId = setTimeout(() => {
                reject("Playing cannot be ensured: timed out");
            }, 10200);
            var observer = new MutationObserver((mut,ob)=>checkObserve(resolve, mut, timeoutId, ob));
            let node = document.querySelector("#board-layout-sidebar button.resign-button-component");
            node = node ?? ((): Element | null => {
                return document.querySelector(`#board-layout-sidebar button[aria-label='${resignLabel}']`);
            })();
            if (null == node) {
                let panel = document.querySelector("#board-layout-sidebar") ?? reject("Board not found");
                observer.observe(panel!, { childList: true });
            } else {
                debugger;
                resolve();
                clearTimeout(timeoutId);
            }
        });
        let state = board.state;
        return state.playingAs !== undefined && !state.isGameOver;
    }
    private async ensurePlaying(): Promise<void> {
        try {
            if (!await this.isPlaying()) {
                this.state = AgentState.IdleIllegalPlay;
                throw "Agent is not detected to be playing";
            }
        } catch (err) {
            this.state = AgentState.BrowserPageOutOfReach;
            throw err;
        }
    }
    async playComputer(computer: ComputerOptInterface): Promise<AgentState> {
        try {
            await this.page.goto("https://www.chess.com/play/computer");
            
            await this.page.$("div[id^='placeholder-'] button[aria-label='Close']").then(async (btn) => {
                await btn?.click();
                await btn?.dispose();
            });
            await this.page.evaluate(() => new Promise<void>((resolve)=>{
                let timeoutId = setTimeout(() => {
                    throw "Asserting modal popup times out";
                }, 10200);
                var x = new MutationObserver(function (mut, ob) {
                    if (mut[0].removedNodes) {
                        clearTimeout(timeoutId);
                        ob.disconnect();
                        resolve();
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
            await this.page.$("div[id^='placeholder-'] div.ui_modal-component").then((modal)=> {
                modal?.dispose();
                if (null != modal)
                    throw "Cannot close modal";
            });
            await this.page.$("#board-layout-sidebar div.bot-selection-scroll").then((selection)=> {
                selection?.dispose();
                if (null == selection)
                    throw "Cannot find bot selection";
            });
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
                        ob.disconnect();
                        resolve();
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
            await playBtn.dispose();
            await this.ensurePlaying();
            await this.evaluateBlackOrWhite();
        } catch (error: any) {
            let state = AgentState.BrowserPageOutOfReach;
            if ((<any>Object).values(AgentState).includes(error)) {
                state = error as AgentState;
            }
            throw ([error, (this.state = state)] as [unknown, AgentState]);
        }
        this.playing = PlayState.AgainstComputer;
        return (this.state = AgentState.TakingTurn);
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
    async playClassical(...args: any): Promise<AgentState> {
        throw new Error("Method not implemented.");
    }
} 