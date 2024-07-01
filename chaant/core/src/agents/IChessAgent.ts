import { AgentState } from "@chaant/core/src/components/AgentState";
import { PlayState } from "@chaant/core/src/components/PlayState";
import { Square } from "@chaant/core/src/components/Square";
import { IComputerOption } from "@chaant/core/src/components/computers/IComputerOption";
import { PieceNotation } from "@chaant/core/src/misc/Util";

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