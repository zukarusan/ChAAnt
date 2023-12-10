import { AgentState } from "@components/AgentState";
import { PlayState } from "@components/PlayState";
import { Square } from "@components/Square";
import { ComputerOptInterface } from "@components/computers/ComputerOptInterface";

export interface ChessAgentInterface {
    move(from: Square, to: Square): Promise<AgentState>;
    waitTurn(): Promise<AgentState>;
    get status(): AgentState;
    get playingState(): PlayState;
    get blackOrWhite(): "black" | "white";
    
    playComputer(computer: ComputerOptInterface): Promise<AgentState>;
    playRapid(...args: any): Promise<AgentState>;
    playBlitz(...args: any): Promise<AgentState>;
    playBullet(...args: any): Promise<AgentState>;
    playClassical(...args: any): Promise<AgentState>;
}