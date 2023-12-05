import { ChessAgentInterface } from "@agents/ChessAgentInterface";
import { AgentState } from "@components/AgentState";
import { Square } from "@components/Square";
import { ComputerOptInterface } from "@components/computers/ComputerOptInterface";
import { Page } from "puppeteer";

class ChesscomAgent implements ChessAgentInterface {
    private static UNIQUE_PAGES: Set<Page> = new Set<Page>();
    private page: Page;
    public constructor(page: Page) {
        if (ChesscomAgent.UNIQUE_PAGES.has(page)) {
            throw "Another Chess.com agent has already attached this page";
        }
        this.page = page;
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
        throw new Error("Method not implemented.");
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