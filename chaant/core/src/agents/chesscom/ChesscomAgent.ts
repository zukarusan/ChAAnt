import { IChessAgent } from "@chaant/core/src/agents/IChessAgent";
import { AgentState } from "@chaant/core/src/components/AgentState";
import { ComputerConfigState } from "@chaant/core/src/components/ComputerConfigState";
import { PlayState } from "@chaant/core/src/components/PlayState";
import { Square } from "@chaant/core/src/components/Square";
import { IComputerOption } from "@chaant/core/src/components/computers/IComputerOption";
import { PieceNotation, ResolveType, notationMoveRegex} from "@chaant/core/src/misc/Util";
import { Browser, ElementHandle, Page } from "puppeteer";

declare global {
    var chesscom_translations: any;
    function getRandomHalf(min: number, max: number): Promise<number>;
}
export class ChesscomAgent implements IChessAgent {
    private static UNIQUE_PAGES: Set<Page> = new Set<Page>();
    private page: Page;
    private state: AgentState;
    private playing: PlayState;
    private asBlack?: boolean;
    private agentMoveNumber?: number;
    private gameOverHandler: ()=> void;
    private onMoves: (()=>Promise<void>)[];
    private static castles = {"o-o": { "white": ["e1", "g1"], "black": ["e8", "g8"] }, "o-o-o": { "white": ["e1", "c1"], "black": ["e8", "c8"] }}
    public constructor(page: Page) {
        if (ChesscomAgent.UNIQUE_PAGES.has(page)) {
            throw "Another Chess.com agent has already attached this page";
        }
        this.page = page;
        this.state = AgentState.Idle;
        this.playing = PlayState.NotPlaying;
        this.asBlack = undefined;
        ChesscomAgent.UNIQUE_PAGES.add(page);
        this.gameOverHandler = ()=> {};
        this.initAsync();
        this.onMoves = [];
    }
    set onGameOver(handler: () => void) {
        this.gameOverHandler = handler;
    }
    private async initAsync() {
        await this.page.exposeFunction("getRandomHalf", (max:number, min:number)=> {
            return Math.random() * (max - min) + min;
        });
    }
    private async resolveBoardSquare(board: ElementHandle, square: Square): Promise<[number, number]> {
        let fileIdx = square.file + 1, rankIdx = square.rank + 1;
        if (this.asBlack) {
            fileIdx = 8 - fileIdx + 1;
        } else {
            rankIdx = 8 - rankIdx + 1;
        }
        try {
            return await board.evaluate(async (board, fileIdx, rankIdx) : Promise<[number, number]> => {
                let rect = board.getClientRects()[0];
                let pieceSample = board.querySelector(".piece");
                if (pieceSample == null) {
                    throw `Cannot find targeted piece: ${square.notation}`;
                }
                let squareLength = pieceSample.clientWidth;
                let halfX = squareLength * await getRandomHalf(0.1, 0.9);
                let halfY = squareLength * await getRandomHalf(0.1, 0.9);
                return [rect.x+(squareLength * fileIdx) - halfX, rect.y+(squareLength * rankIdx) - halfY];
            }, fileIdx, rankIdx);
        } catch (err: any) {
            this.state = AgentState.BrowserPageOutOfReach;
            throw err;
        }
    }
    public addOnMove(onmove: ()=>Promise<void>){
        this.onMoves.push(onmove);
    }
    public removeOnMove(handler: ()=>Promise<void>) {
        let idx = this.onMoves.indexOf(handler);
        if (idx > -1) {
            this.onMoves.splice(idx, 1);
        }
    }
    async move(moveNotation: string): Promise<AgentState> {
        const { from: from, to: to, promoteTo: promoteTo} = await this.evalMove(moveNotation);
        const state = await this.moveBySquare(from, to, promoteTo);
        if (AgentState.MovedWaitingTurn == state) {
            this.onMoves.forEach(async (listener)=>{
                await listener();
            });
        }
        return state;
    }
    public async moveBySquare(from: Square, to: Square, promoteTo: PieceNotation | undefined = undefined): Promise<AgentState> {
        if (PlayState.NotPlaying == this.playing) {
            throw "Agent is not playing";
        }
        if (AgentState.TakingTurn != this.state) {
            await this.waitTurn().then((state)=> {
                if (state != AgentState.TakingTurn) {
                    throw `Agent could not making move. State: ${state}`;
                }
            });
        }
        // ugly code, it throws error. but f it
        await this.tryMoveBySquare(from, to, false, promoteTo);
        this.agentMoveNumber! += 2;
        return (this.state = AgentState.MovedWaitingTurn);
    }
    private async tryMoveBySquare(from: Square, to: Square, reloaded: boolean, promoteTo?: PieceNotation): Promise<void> {
        let board: ElementHandle<Element> | null = null;
        try {
            board = await this.page.$("wc-chess-board");
            if (board == null) {
                this.state = AgentState.BrowserPageOutOfReach;
                throw "Board not found";
            }
            let bgSqr = await this.resolveBoardSquare(board, from);
            let enSqr = await this.resolveBoardSquare(board, to);
            let extraTimeout = 0;
            if (promoteTo !== undefined) {
                extraTimeout = 1000;
            }
            let movePromise = board.evaluate((board: Element | any, bgSqr, enSqr, moveNumber, extraTimeout) => new Promise<void>((resolve, reject)=>{
                let dragbegin = new PointerEvent('pointerdown', { clientX: bgSqr[0], clientY: bgSqr[1], bubbles:true});
                let dragend = new PointerEvent('pointerup', { clientX: enSqr[0], clientY: enSqr[1], bubbles:true});
                const removeListener = (handler: ()=>void) => {
                    let idx = (board.game.listeners as Array<Object>).indexOf(handler);
                    if (idx > -1) {
                        (board.game.listeners as Array<Object>).splice(idx, 1);
                    }
                }
                let timeoutId = setTimeout(() => {
                    if (board.game.getLastMove().moveNumber >= moveNumber) {
                        return resolve();
                    }
                    return reject(-1);
                }, 5000+extraTimeout);
                const handler = (): boolean => {
                    if (board.game.getLastMove().moveNumber >= moveNumber) {
                        clearTimeout(timeoutId);
                        removeListener(handler);
                        resolve();
                        return true;
                    }
                    return false;
                }
                board.game.listeners.push({
                    type: "Move",
                    handler: handler
                });
                board.dispatchEvent(dragbegin);
                board.dispatchEvent(dragend);
            }), bgSqr, enSqr, this.agentMoveNumber!, extraTimeout);
            if (promoteTo !== undefined) {
                await this.page.waitForSelector(`div[class*=promotion] > .w${promoteTo}`).then(async (piece)=> {
                    await piece?.click();
                });
            }
            await movePromise;
        } catch (err: any) {
            if (-1 == err && !reloaded) {
                await this.page.reload();
                await this.page.waitForNavigation();
                // Recursive
                return await this.tryMoveBySquare(from, to, true, promoteTo);
            } else if (-1 == err) {
                err = "Agent making a move times out";
            }
            throw [err, (this.state = AgentState.MovedIllegal)] as [any, AgentState]; // TODO handle better illegal move
        } finally {
            await board?.dispose();
        }
    }
    public async evalMove(move: string): Promise<{"from": Square, "to": Square, "promoteTo": PieceNotation | undefined}> {
        let piece: PieceNotation;
        let to: string;
        let from: string;
        let promoteTo: PieceNotation | undefined;
        let sanitizedMove = move.trim().replace(/\s*/, "");
        let isPawnPromoting: boolean;
        if (AgentState.TakingTurn != this.state) {
            await this.waitTurn().then((state)=> {
                if (state != AgentState.TakingTurn) {
                    throw `Agent could not making move. State: ${state}`;
                }
            });
        }
        try {
            let rMove = notationMoveRegex.exec(sanitizedMove);
            if (null == rMove) {
                throw rMove;
            }
            sanitizedMove = rMove[0].toLowerCase();
            if (sanitizedMove.startsWith("o-o")) {
                const castle: "o-o-o" | "o-o" = sanitizedMove.split("-").length >= 3 ? "o-o-o" : "o-o";
                const squares = ChesscomAgent.castles[castle][this.blackOrWhite];
                return {
                    "from": Square.square(squares[0]),
                    "to": Square.square(squares[1]),
                    "promoteTo": undefined
                }
            }
            piece = (rMove[1]?.toLowerCase() ?? PieceNotation.Pawn) as PieceNotation;
            from = rMove[2]?.toLowerCase();
            to = rMove[3]?.toLowerCase() ?? rMove[4]?.toLowerCase();
            isPawnPromoting = (rMove[4] !== undefined);
            promoteTo = (rMove[5]?.toLowerCase()) as PieceNotation | undefined;
        } catch(err) {
            throw `Invalid chess notation move: ${move}`;
        }
        try {
            let squares = await this.executeOnBoardElem((board, piece: PieceNotation, from: string, to: string): [string, string]=>{
                type Piece = {type: string, color: 1 | 2, promoted: boolean, square: string};
                let pieces: Array<Piece> = Object.values(board.game.getPieces().getCollection());
                let legalPieces: Array<Piece> = [];
                let agentColor: 1 | 2 | undefined | null = board.game.getPlayingAs();
                if (!agentColor) {
                    throw "Could not determine whether playing as black or white";
                }
                pieces.forEach((pc)=>{
                    let legalMvsPc: Array<string> = board.game.getLegalMovesForSquare(pc.square)
                    if (pc.type == piece && legalMvsPc.includes(to) && pc.color == agentColor) {
                        legalPieces.push(pc);
                    }
                });
                const assertLegal = (onMany: ()=>void)=> {
                    if (0 == legalPieces.length) {
                        throw 1;
                    }
                    if (1 < legalPieces.length) {
                        onMany();
                    }
                }
                assertLegal(()=>{
                    legalPieces = legalPieces.filter((pc)=>pc.square.includes(from));
                    assertLegal(()=>{
                        throw 2;
                    });
                });
                return [legalPieces[0].square, to];
            }, piece, from, to);
            var fromSqr = Square.square(squares[0]);
            var toSqr = Square.square(squares[1]);
            isPawnPromoting ||= (PieceNotation.Pawn == piece && '8' == toSqr.rankNotation); 
            if (isPawnPromoting && undefined === promoteTo) {
                throw "Promotion piece must be specified";
            }
            return {
                "from": fromSqr,
                "to": toSqr,
                "promoteTo": promoteTo
            }
        } catch(err) {
            if (1 == err) {
                err = `No piece correspond to the move ${move}`
            } else if (2 == err) {
                err = `Ambigous move: ${move}`
            } else {
                this.state = AgentState.BrowserPageOutOfReach;
            }
            throw err;
        }
    }
    async waitTurn(): Promise<AgentState> {
        if (PlayState.NotPlaying == this.playing) {
            throw "Agent is not playing";
        }
        let board: ElementHandle<Element> | null = null;
        try {
            board = await this.page.$("wc-chess-board");
            if (board == null) {
                this.state = AgentState.BrowserPageOutOfReach;
                throw "Board not found";
            }
            await board.evaluate((board: Element | any, moveNumber) => new Promise<void>((resolve, reject)=>{
                if ((board.game.getLastMove()?.moveNumber ?? -1) + 1 >= moveNumber) {
                    board.game.chaantGameOver = undefined;
                    return resolve();
                }
                board.game.chaantGameOver = () => {
                    reject("GAMEOVER");
                };
                const handler = ():boolean => {
                    if ((board.game.getLastMove()?.moveNumber ?? -1) + 1 >= moveNumber) {
                        if (timeoutElem) 
                            clearTimeout(timeoutElem);
                        if (timeoutTurning)
                            clearTimeout(timeoutTurning);
                        removeListener(handler);
                        resolve();
                        board.game.chaantGameOver = undefined;
                        return true;
                    }
                    return false;
                }
                board.game.listeners.push({
                    type: "Move",
                    handler: handler
                });
                const removeListener = (handler: ()=>void) => {
                    let idx = (board.game.listeners as Array<Object>).indexOf(handler);
                    if (idx > -1) {
                        (board.game.listeners as Array<Object>).splice(idx, 1);
                    }
                }
                const MINUTE = 1000 * 60;
                let timeoutTurning = setTimeout(() => {
                    reject("Waiting for turn times out");
                    // TODO Resign the game / ensure if still playing
                }, 4 * MINUTE);
                let timeoutElem = setTimeout(()=> {
                    if ((board.game.getLastMove()?.moveNumber ?? -1) + 1 >= moveNumber) {
                        clearTimeout(timeoutTurning);
                        board.game.chaantGameOver = undefined;
                        return resolve();
                    }
                }, 5000);
                handler();
                
            }), this.agentMoveNumber!);
        } catch (err) {
            if (err == "GAMEOVER") {
                return (this.state = AgentState.Idle);
            }
            throw [err, (this.state = AgentState.BrowserPageOutOfReach)] as [any, AgentState];
        } finally {
            await board?.dispose();
        }
        return (this.state = AgentState.TakingTurn);
    }
    async premove(): Promise<void> {
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
    get lastMove(): Promise<string> {
        return this.fetchMoves().then((moves)=>{
            return moves.length > 0 ? moves[moves.length-1].toLowerCase() : "";
        });
    }
    get agentLastMove(): Promise<string> {
        return this.fetchMoves().then((moves)=>{
            let last = moves.length-1;
            if ((this.blackOrWhite == "black" && last % 2 == 0) || (this.blackOrWhite == "white" && last % 2 == 1))
                last -= 1;
            return last >= 0 ? moves[last].toLowerCase() : "";
        });
    }
    private async fetchMoves(): Promise<Array<string>> {
        return await this.executeOnBoardElem((board)=>{
            let game = board.game;
            let history: Array<string> | null | undefined = game.getHistorySANs();
            if (history && history.length >= 0) {
                return history;
            }
            return [];
        });
    }
    public async isGuest(): Promise<boolean> {
        if (!this.page.url().includes("chess.com")) {
            throw "Page is not on chess.com";
        }
        await this.page.waitForSelector('div[data-nav-top]');
        return await this.page.evaluate((): boolean => {
            return null != document.querySelector("a.login");
        })
    }
    private async evaluateBlackOrWhite(): Promise<void> {
        this.asBlack = await this.executeOnBoardElem((board: Element | any) => {
            return 2 == (board.state.playingAs as number) || 2 == board.game.getPlayingAs();
        });
        Promise.resolve();
    }
    private async executeOnBoardElem<T>(promise: (board: Element | any, ...args: any) => T, ...evalArgs: any): Promise<T> {
        let board: ElementHandle<Element> | null = null;
        try {
            await this.page.waitForSelector("wc-chess-board");
            board = await this.page.$("wc-chess-board");
            if (null == board) {
                throw "Board not found";
            }
            return await board.evaluate(promise, ...evalArgs);
        } catch (err) {
            this.state = AgentState.BrowserPageOutOfReach;
            throw err;
        } finally {
            await board?.dispose();
        }
    }
    private async isPlaying(): Promise<boolean> {
        let [resignLabel, abortLabel] = await this.executeOnBoardElem(()=> 
            [(chesscom_translations.messages)["Resign"] as string ?? "Resign", 
                (chesscom_translations.messages)["Abort"] as string ?? "Abort"]
        );
        return null != await this.page.waitForSelector(`#board-layout-sidebar button[aria-label='${resignLabel}'],button[aria-label='${abortLabel}']`)
    }
    private static async evalPlaying(board: ElementHandle<Element> | any): Promise<boolean> {
        const resignLabel: string = (chesscom_translations.messages)["Resign"] as string ?? "Resign";
        const abortLabel: string = (chesscom_translations.messages)["Abort"] as string ?? "Abort";
        const checkObserve = (resolve: ResolveType<void>, mut: MutationRecord[], timeoutId: NodeJS.Timeout, ob: MutationObserver) => {
            if (mut.filter((m)=>m.addedNodes).length > 0 && document.querySelector(`#board-layout-sidebar button[aria-label='${resignLabel}'],button[aria-label='${abortLabel}']`)) {    
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
                return document.querySelector(`#board-layout-sidebar button[aria-label='${resignLabel}'],button[aria-label='${abortLabel}']`);
            })();
            if (null == node) {
                let panel = document.querySelector("#board-layout-sidebar") ?? reject("Can't eval playing. Resign label not detected");
                panel && observer.observe(panel, { childList: true });
            } else {
                resolve();
                clearTimeout(timeoutId);
            }
        });
        let state = board.state;
        return state.playingAs !== undefined && !state.isGameOver;
    }
    private async listenForGameOver(): Promise<void> {
        await this.page.waitForSelector("wc-chess-board");
        return await this.page.evaluate(()=>new Promise<void>((resolve, reject)=>{
            let board:any = document.querySelector("wc-chess-board");
            if (null == board) {
                reject("Chess board is not found");
            }
            let game = board.game;
            let handler = function() {
                if (undefined === game.getPlayingAs()) {
                    let idx = (board.game.listeners as Array<Object>).indexOf(handler);
                    if (idx > -1) {
                        (board.game.listeners as Array<Object>).splice(idx, 1);
                    }
                    console.info("ChAAnt: Game Over");
                    resolve();
                }
            };
            game.listeners.unshift({
                type: "ModeChanged", handler: handler
            });
        })).then(async ()=>{
            try {
                let board = await this.page.waitForSelector("wc-chess-board");
                await board?.evaluate((board: any)=>{
                    if (board.game.chaantGameOver !== undefined && typeof board.game.chaantGameOver === 'function') {
                        board.game.chaantGameOver();
                    }
                });
            } catch(err) {

            }
            this.playing = PlayState.NotPlaying;
            this.state = AgentState.Idle;
            this.gameOverHandler();
        }).catch(async (err)=>{
            let boardExist = null != await this.page.$("wc-chess-board");
            if (PlayState.NotPlaying != this.playing && this.page.url().includes("chess.com") && boardExist)  {
                await this.listenForGameOver();
            } else {
                this.state = AgentState.BrowserPageOutOfReach;
            }
        });
    }
    private async ensurePlaying(): Promise<void> {
        try {
            await this.page.waitForSelector("#board-layout-sidebar");
            if (!await this.isPlaying()) {
                this.state = AgentState.IdleIllegalPlay;
                throw "Agent is not detected to be playing";
            }
        } catch (err) {
            this.state = AgentState.BrowserPageOutOfReach;
            throw err;
        }
    }
    public async getTranslation(key: string): Promise<string> {
        return await this.page.evaluate((key)=>{
            return chesscom_translations[key] ?? key;
        }, key);
    }
    private async searchElement(xpath: string, regex: RegExp): Promise<ElementHandle<Element> | null>  {
        let rs = await this.page.$$(xpath);
        let element = null;
        for (let el of rs) {
            let text = await el.evaluate((node, regex) => {
                return (node as HTMLElement).innerText;
            }, regex);
            if (text != null && text !== undefined && regex.test(text)) {
                element = el;
                break;
            }
        }
        return element;
    }
    private async selectTimeControl(timeControl: string) {
        let minTitle = await this.page.evaluate(()=>{
            return chesscom_translations.messages.min as string ?? "min";
        });
        const minSelector = `::-p-xpath(//button[contains(., '${minTitle}')])`;
        await this.page.waitForSelector(minSelector).catch(()=>{
            throw "No time control available";
        });
        let timeCombo = await this.searchElement(minSelector, new RegExp(`${minTitle}\\s*$`));
        if (timeCombo == null) {
            throw "No time control available";
        }
        await timeCombo.click();
        const timeControlSelector = `::-p-xpath(//button[contains(., '${timeControl}')])`;
        await this.page.waitForSelector(timeControlSelector);
        let rs = await this.searchElement(timeControlSelector, new RegExp(`^\\s*${timeControl}\\s*$`));
        rs?.click();
        // await (await this.page.$(`button[data-cy='${timeControl}']`))?.click();
    }
    private async playOnline(executeConfig: (...args: any)=>Promise<void>, ...args: any) {
        try {
            await this.page.goto("https://www.chess.com/play/online");
            await this.page.waitForFunction(()=> chesscom_translations !== undefined && chesscom_translations !== null);
            let playTitle = await this.page.evaluate(()=>{
                return chesscom_translations.messages.Play as string ?? "Play";
            });
            const playSelector = `::-p-xpath(//button[contains(., '${playTitle}')])`;
            await this.page.waitForSelector(playSelector).catch((e)=>{
                throw "Play button not found";
            });
            await executeConfig(...args).catch(e => {
                throw `Time control button not found. ${e}`
            });
            let playBtn = await this.searchElement(playSelector, new RegExp(`\\s*${playTitle}\\s*$`));
            if (playBtn == null) {
                throw "No play button detected";
            }
            await playBtn.click();
            if (await this.isGuest()) {
                this.page.waitForSelector("#guest-button").then(btn=> {
                    btn?.click();
                }).catch(e=>{
                    console.log("Guest button not found, ignoring...");
                });
            }
            await playBtn.dispose();
            await this.ensurePlaying();
            await this.evaluateBlackOrWhite();
            this.listenForGameOver();
        } catch (error: any) {
            let state = AgentState.BrowserPageOutOfReach;
            if ((<any>Object).values(AgentState).includes(error)) {
                state = error as AgentState;
            }
            throw ([error, (this.state = state)] as [unknown, AgentState]);
        }
        this.agentMoveNumber = this.asBlack! ? 1 : 0;
        this.playing = PlayState.AgainstComputer;
        return (this.state = this.asBlack! ? AgentState.FirstWaitingTurn : AgentState.TakingTurn);
    }
    public async playComputer(computer: IComputerOption, playAsBlack: boolean): Promise<AgentState> {
        try {
            await this.page.goto("https://www.chess.com/play/computer");

            await this.page.$$("button[aria-label='Close']").then((buttons) => buttons.forEach(async (btn)=>{
                await btn?.click();
                await btn?.dispose();
            }));
            await this.page.evaluate(() => new Promise<void>((resolve)=>{
                let timeoutId = setTimeout(() => {
                    throw "Asserting modal popup times out";
                }, 10000);
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
            await this.page.$("div[id^='placeholder-'] div.ui_modal-component").then(async (modal)=> {
                await modal?.dispose();
                if (null != modal)
                    throw "Cannot close modal";
            });
            await this.page.waitForSelector('#board-layout-sidebar div.bot-selection-scroll');
            await this.page.$("#board-layout-sidebar div.bot-selection-scroll").then(async (selection)=> {
                if (null == selection)
                    throw "Cannot find bot selection";
                await selection.evaluate((sel)=>{
                    let sh = Number.MAX_SAFE_INTEGER;
                    while (sh > sel.scrollHeight) {
                        sh = sel.scrollHeight;
                        sel.scrollBy(0, 100);
                    }
                });
                await selection?.dispose();
            });
            let configState = await computer.selectMe(this.page, playAsBlack);
            if (configState != ComputerConfigState.Chosen) {
                throw "Bot was not selected";
            }
            let playTitle = await this.page.evaluate(() => new Promise<string>((resolve)=>{
                let timeoutId = setTimeout(() => {
                    throw "Finding play button times out";
                }, 10200);
                let playTitle = chesscom_translations.messages.Play as string ?? "Play";
                var x = new MutationObserver(function (_mut, ob) {
                    if (document.querySelector(`#board-layout-sidebar button[title='${playTitle}']`)) {
                        clearTimeout(timeoutId);
                        ob.disconnect();
                        resolve(playTitle);
                    }
                });
                let btn = document.querySelector(`#board-layout-sidebar button[title='${playTitle}']`);
                if (btn == null) {
                    let node = document.querySelector("#board-layout-sidebar");
                    if (node != null)  {
                        x.observe(node , { childList: true });
                    } else {
                        throw "Play button not found";
                    }
                } else {
                    clearTimeout(timeoutId);
                    resolve(playTitle);
                }
            }));
            let playBtn = await this.page.$(`#board-layout-sidebar button[title='${playTitle}']`);
            if (playBtn == null) {
                throw "No play button detected";
            }
            await playBtn.click();
            await playBtn.dispose();
            await this.ensurePlaying();
            await this.evaluateBlackOrWhite();
            this.listenForGameOver();
        } catch (error: any) {
            let state = AgentState.BrowserPageOutOfReach;
            if ((<any>Object).values(AgentState).includes(error)) {
                state = error as AgentState;
            }
            throw ([error, (this.state = state)] as [unknown, AgentState]);
        }
        this.agentMoveNumber = this.asBlack! ? 1 : 0;
        this.playing = PlayState.AgainstComputer;
        return (this.state = AgentState.TakingTurn);
    }
    public async playRapid(...args: any): Promise<AgentState> {
        return await this.playOnline(async (...args) => {
            await this.selectTimeControl(`10 ${await this.getTranslation("min")}`);
        }, ...args);
    }
    public async playBlitz(...args: any): Promise<AgentState> {
        return await this.playOnline(async (...args) => {
            await this.selectTimeControl(`5 ${await this.getTranslation("min")}`);
        }, ...args);
    }
    public async playBullet(...args: any): Promise<AgentState> {
        return await this.playOnline(async (...args) => {
            await this.selectTimeControl("1 | 1");
        }, ...args);
    }
    public async playClassical(...args: any): Promise<AgentState> {
        return await this.playOnline(async (...args) => {
            await this.selectTimeControl(`30 ${await this.getTranslation("min")}`);
        }, ...args);
    }
    public async dispose(): Promise<void> {
        const page = this.page
        ChesscomAgent.UNIQUE_PAGES.delete(this.page);
        await page.close();
        delete this.asBlack;
        delete this.agentMoveNumber;
    }
}