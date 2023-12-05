import { AgentState } from "@components/AgentState";
import { Square } from "@components/Square";
import { ComputerOptInterface } from "@components/computers/ComputerOptInterface";

export interface ChessAgentInterface {
    move(from: Square, to: Square): Promise<AgentState>;
    waitTurn(): Promise<AgentState>;
    status(): Promise<AgentState>;
    
    playComputer(computer: ComputerOptInterface): Promise<AgentState>;
    playRapid(...args: any): Promise<AgentState>;
    playBlitz(...args: any): Promise<AgentState>;
    playBullet(...args: any): Promise<AgentState>;
}