import { Square } from "@components/Square";
import { ComputerOptInterface } from "@components/computers/ComputerOptInterface";

export interface ChessAgentInterface {
    move(from: Square, to: Square): Promise<Enumerator>;
    waitTurn(): Promise<Enumerator>;
    status(): Promise<Enumerator>;
    
    playComputer(computer: ComputerOptInterface): Promise<Enumerator>;
    playRapid(...args: any): Promise<Enumerator>;
    playBlitz(...args: any): Promise<Enumerator>;
    playBullet(...args: any): Promise<Enumerator>;
}