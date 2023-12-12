import { AgentState } from "@components/AgentState";
import { PlayState } from "@components/PlayState";
import { Square } from "@components/Square";
import { ComputerOptInterface } from "@components/computers/ComputerOptInterface";
import { PieceNotation } from "@misc/Util";

export interface ChessAgentInterface {
    move(moveNotation: string): Promise<AgentState>;
    waitTurn(): Promise<AgentState>;
    premove(): Promise<void>;
    get status(): AgentState;
    get playingState(): PlayState;
    get blackOrWhite(): "black" | "white";
    get lastMove(): Promise<string>;
    
    playComputer(computer: ComputerOptInterface): Promise<AgentState>;
    playRapid(...args: any): Promise<AgentState>;
    playBlitz(...args: any): Promise<AgentState>;
    playBullet(...args: any): Promise<AgentState>;
    playClassical(...args: any): Promise<AgentState>;

    dispose(): Promise<void>;
}