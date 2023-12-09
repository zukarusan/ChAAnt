import { ChessAgentInterface } from "@agents/ChessAgentInterface";
import { AgentState } from "@components/AgentState";
import { ComputerConfigState } from "@components/ComputerConfigState";
import { PlayState } from "@components/PlayState";
import { Square } from "@components/Square";
import { ComputerOptInterface } from "@components/computers/ComputerOptInterface";
import { ElementHandle, Page } from "puppeteer";

export class ChesscomAgent implements ChessAgentInterface {
    private static UNIQUE_PAGES: Set<Page> = new Set<Page>();
    private page: Page;
    private state: AgentState;
    private playing: PlayState;
    public constructor(page: Page) {
        if (ChesscomAgent.UNIQUE_PAGES.has(page)) {
            throw "Another Chess.com agent has already attached this page";
        }
        this.page = page;
        this.state = AgentState.Idle;
        this.playing = PlayState.NotPlaying;
        ChesscomAgent.UNIQUE_PAGES.add(page);
    }
    
    private static reverseClientBoardIndexing(fileOrRankIndex: number): number {
        return 8 - fileOrRankIndex + 1;
    }
    private static async resolveBoardSquare(board: ElementHandle, square: Square, asBlack = false): Promise<[number, number]> {
        let fileIdx = square.file, rankIdx = square.rank;
        if (asBlack) {
            fileIdx = ChesscomAgent.reverseClientBoardIndexing(fileIdx);
        } else {
            rankIdx = ChesscomAgent.reverseClientBoardIndexing(rankIdx);
        }
        let rect = await board.evaluate((board) => board.getClientRects()[0], board);
        let pieceSample = await board.evaluate((board) => board.querySelector(".piece"), board);
        if (pieceSample == null) {
            return Promise.reject(`Cannot find targeted piece: ${square.notation}`);
        }
        let squareLength = pieceSample.clientWidth;
        let half = squareLength / 2;
        
        return Promise.resolve([rect.x+(squareLength * fileIdx) - half, rect.y+(squareLength * rankIdx) - half]);
    }
    async move(from: Square, to: Square): Promise<AgentState> {
        try {
            let board: ElementHandle<Element> | null = null; 
            if (this.playing == PlayState.AgainstComputer) {
                board = await this.page.$('#board-play-computer');
            }
            if (board == null) {
                throw "Board not found";
            }
            let bgSqr = await ChesscomAgent.resolveBoardSquare(board, from, false); // TODO handle black/white state
            let enSqr = await ChesscomAgent.resolveBoardSquare(board, to, false);
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
} 