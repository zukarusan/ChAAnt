import { AgentState } from "@components/AgentState";
import { PlayState } from "@components/PlayState";
import { Square } from "@components/Square";
import { IComputerOption } from "@components/computers/IComputerOption";
import { PieceNotation } from "@misc/Util";

export interface IChessAgent {
    move(moveNotation: string): Promise<AgentState>;
    waitTurn(): Promise<AgentState>;
    premove(): Promise<void>;
    get status(): AgentState;
    get playingState(): PlayState;
    get blackOrWhite(): "black" | "white";
    get lastMove(): Promise<string>;
    get agentLastMove(): Promise<string>;

    set onGameOver(handler: ()=> void);
    
    playComputer(computer: IComputerOption, asBlack: boolean): Promise<AgentState>;
    playRapid(...args: any): Promise<AgentState>;
    playBlitz(...args: any): Promise<AgentState>;
    playBullet(...args: any): Promise<AgentState>;
    playClassical(...args: any): Promise<AgentState>;

    dispose(): Promise<void>;
}