import { IChessAgent } from "@agents/IChessAgent";
import { ChesscomAgent } from "@agents/chesscom/ChesscomAgent";
import { AgentState } from "@components/AgentState";

export class CollectiveMove {
    private agent: IChessAgent;
    private moveCollection: string[]
    private evalMove: (move:string)=>Promise<boolean>;

    // TODO: Set random timer interval with a move function in it
    public constructor(agent: IChessAgent) {
        this.agent = agent;
        this.moveCollection = [];
        if (agent instanceof ChesscomAgent) {
            agent.addOnMove(this.onMoved); // add on moves
            this.evalMove = async (move:string): Promise<boolean> =>{
                let valid = false;
                await (this.agent as ChesscomAgent).evalMove(move).then((res)=>{
                    valid = res.from !== undefined && res.to !== undefined;
                }).catch((err)=>{
                    if (this.agent.status == AgentState.BrowserPageOutOfReach) {
                        throw "Can't eval move, agent lost contact with browser"
                    }
                    valid = false;
                });
                return valid
            }
        } else {
            throw `Undefined collective move for agent ${typeof agent}`
        }
    }
    public async addMove(moveNotation: string) {
        if (await this.evalMove(moveNotation)) {
            this.moveCollection.push(moveNotation.trim());
        }
    }
    public async onMoved() {
        this.moveCollection.length = 0;
    }
    
}