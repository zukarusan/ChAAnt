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
    private static COLLECT_MAX = 3;
    private totalCollects = 0;
    private moveAddition: Promise<void> = Promise.resolve();
    private moveCommit: Promise<void> = Promise.resolve();
    private intervalMoveId: NodeJS.Timeout | null = null;

    // TODO: Set random timer interval with a move function in it
    public constructor(agent: IChessAgent) {
        this.agent = agent;
        this.moveCollection = new Map();
        if (agent instanceof ChesscomAgent) {
            agent.addOnMove(this.clearCommit.bind(this)); // add on moves
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
                return valid;
            }
        } else {
            throw `Undefined collective move for agent ${typeof agent}`
        }
    }
    private async commitMove() {
        this.moveCommit = (async () => {
            if (PlayState.NotPlaying == this.agent.playingState) {
                this.clearCommit();
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
            this.clearCommit();
        })();
        await this.moveCommit;
    }
    private async setTimeoutMove() {
        this.intervalMoveId = setTimeout(this.commitMove.bind(this), this.randomTime());
    }
    public async addMove(moveNotation: string) {
        let size = this.moveCollection.size;
        await this.moveAddition;
        await this.moveCommit;
        if (this.moveCollection.size < size) {
            return; // Late submit to add move
        }
        this.moveAddition = (async () => {
            if (PlayState.NotPlaying == this.agent.playingState) {
                this.clearCommit();
                return;
            }
            let move = moveNotation.trim().toLowerCase();
            if (await this.evalMove(move)) {
                let freq = this.moveCollection.get(move) ?? 0;
                freq += 1;
                this.totalCollects += 1;
                this.moveCollection.set(move, freq);
            }
            // first collective add, set the timeout 
            if (null == this.intervalMoveId) {
                await this.setTimeoutMove();
            }
            if (null != this.intervalMoveId && this.totalCollects >= CollectiveMove.COLLECT_MAX) {
                clearTimeout(this.intervalMoveId);
                await this.moveCommit;
                await this.commitMove();
            }
        })();
    }
    private async clearCommit() {
        this.moveCollection.clear();
        if (this.intervalMoveId != null) {
            clearTimeout(this.intervalMoveId);
        }
        this.intervalMoveId = null;
        this.totalCollects = 0;
    }

    randomTime() {
        return Math.floor(Math.random() * (CollectiveMove.MAX - CollectiveMove.MIN + 1) + CollectiveMove.MIN);
    }
    
}