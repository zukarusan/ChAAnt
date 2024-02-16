import { IChessAgent } from "@agents/IChessAgent";
import { ChesscomAgent } from "@agents/chesscom/ChesscomAgent";
import { AgentState } from "@components/AgentState";
import { PlayState } from "@components/PlayState";

export class CollectiveMove {
    private agent: IChessAgent;
    private moveCollection: Map<string, number>;
    private evalMove: (move:string)=>Promise<boolean>;
    private static MIN = 5000; 
    private static MAX = 10000; 
    private moveAddition: Promise<void> = Promise.resolve();
    private intervalMoveId: NodeJS.Timeout = setTimeout(()=>{},0);

    // TODO: Set random timer interval with a move function in it
    public constructor(agent: IChessAgent) {
        this.agent = agent;
        this.moveCollection = new Map();
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
    private async setIntervalMove() {
        this.intervalMoveId = setInterval(async ()=> {
            if (PlayState.NotPlaying == this.agent.playingState) {
                return;
            }
            await this.agent.waitTurn();
            await this.moveAddition;
            let move: string | undefined = undefined;
            let freq: number = 0;
            this.moveCollection.forEach((val,key)=>{
                if (val > freq) {
                    freq = val;
                    move = key;
                }
            });
            if (move !== undefined) {
                await this.agent.move(move);
            }
        }, this.randomTime());
    }
    public async addMove(moveNotation: string) {
        await this.moveAddition;
        this.moveAddition = (async () => {
            if (PlayState.NotPlaying == this.agent.playingState) {
                this.moveCollection.clear();
                clearInterval(this.intervalMoveId);
                return;
            }
            if (null == this.intervalMoveId || undefined === this.intervalMoveId) {
                await this.setIntervalMove();
            }
            let move = moveNotation.trim().toLowerCase();
            if (await this.evalMove(move)) {
                let freq = this.moveCollection.get(move) ?? 0;
                freq += 1;
                this.moveCollection.set(move, freq);
            }
        })();
    }
    private async onMoved() {
        this.moveCollection.clear();
    }

    randomTime() {
        return Math.floor(Math.random() * (CollectiveMove.MAX - CollectiveMove.MIN + 1) + CollectiveMove.MIN);
    }
    
}