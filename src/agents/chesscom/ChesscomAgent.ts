import { ChessAgentInterface } from "@agents/ChessAgentInterface";
import { AgentState } from "@components/AgentState";
import { ComputerConfigState } from "@components/ComputerConfigState";
import { PlayState } from "@components/PlayState";
import { Square } from "@components/Square";
import { ComputerOptInterface } from "@components/computers/ComputerOptInterface";
import { Board, Game, State } from "@misc/chesscom/ChesscomGame";
import { ElementHandle, Page } from "puppeteer";

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
            return Promise.resolve(await board.evaluate((board, fileIdx, rankIdx) : [number, number] => {
                let rect = board.getClientRects()[0];
                let pieceSample = board.querySelector(".piece");
                if (pieceSample == null) {
                    throw `Cannot find targeted piece: ${square.notation}`;
                }
                let squareLength = pieceSample.clientWidth;
                let half = squareLength / 2;
                return [rect.x+(squareLength * fileIdx) - half, rect.y+(squareLength * rankIdx) - half];
            }, fileIdx, rankIdx));
        } catch (err: any) {
            return Promise.reject(err);
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
            return Promise.reject([err, (this.state = AgentState.MovedIllegal)] as [any, AgentState]); // TODO handle better illegal move
        } finally {
            await board?.dispose();
        }
        return Promise.resolve((this.state = AgentState.MovedWaitingTurn))
    }
    async waitTurn(): Promise<AgentState> {
        throw new Error("Method not implemented.");
    }
    get status(): Promise<AgentState> {
        return Promise.resolve(this.state);
    }
    get playingState(): Promise<PlayState> {
        return Promise.resolve(this.playing);
    }
    get blackOrWhite(): Promise<"black" | "white"> {
        if (this.asBlack === undefined) {
            throw "Agent piece color is not defined";
        }
        return Promise.resolve(this.asBlack ? "black" : "white");
    }
    private async evaluateBlackOrWhite(): Promise<void> {
        let board = await this.page.$("wc-chess-board");
        if (null == board) {
            this.state = AgentState.BrowserPageOutOfReach;
            return Promise.reject("Board not found");
        }
        try {
            this.asBlack = await board.evaluate((board: Element | any) => {
                return 2 == ((board.state as State).playingAs as number);
            });
        } catch (err) {
            return Promise.reject(`Cannot determine whether playing as black or white. Reason: ${err}`);
        } finally {
            await board.dispose();
        }
        return Promise.resolve();
    }
    private async ensurePlaying(): Promise<void> {
        let board: ElementHandle<Element> | null = null;
        try {
            board = await this.page.$("wc-chess-board");
            if (null == board) {
                throw "Board not found";
            }
            let playing = await board.evaluate((board: Element | any) => {
                debugger
                let state = board.state;
                return state.playingAs !== undefined && state.playingAs != null && !state.isGameOver;
            })
            if (playing) {
                return Promise.resolve();
            }
            this.state = AgentState.IdleIllegalPlay;
            return Promise.reject("Agent is not detected to be playing");
        } catch (err) {
            this.state = AgentState.BrowserPageOutOfReach;
            return Promise.reject(err);
        } finally {
            await board?.dispose();
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
            await playBtn.dispose();
            await this.ensurePlaying();
            await this.evaluateBlackOrWhite();
        } catch (error: unknown) {
            let state = AgentState.BrowserPageOutOfReach;
            if ((<any>AgentState).values(AgentState).includes(error)) {
                state = error as AgentState;
            }
            return Promise.reject(([error, (this.state = state)] as [unknown, AgentState]));
        }
        this.playing = PlayState.AgainstComputer;
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
    async playClassical(...args: any): Promise<AgentState> {
        throw new Error("Method not implemented.");
    }
} 