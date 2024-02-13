import { IChessAgent } from '@agents/IChessAgent';
import { ChesscomAgent } from '@agents/chesscom/ChesscomAgent';
import { PlayState } from '@components/PlayState';
import fastify from 'fastify'
import puppeteer from 'puppeteer';

const server = fastify();

type ChessPlatform = 'CHESSCOM' | 'LICHESS';
interface INewAgentQuery {
    platform: ChessPlatform;
}
  
interface IAgentHeaders {
    'H-CHESS-AGENT-ID': string;
}

interface IReply {
200: { agentId?: string };
302: { url: string };
'4xx': { error: string };
}

const agents: Map<string, IChessAgent> = new Map();
const { v4: uuidv4 } = require('uuid');


const createNewAgent = async (platform: ChessPlatform): Promise<IChessAgent> => {
    const browser = await puppeteer.launch({
		headless: false,
		defaultViewport: null,
		protocolTimeout: 0,
		args: ['--start-maximized']
	});
    const page = (await browser.pages())[0];
    if ("CHESSCOM" == platform) {
        return new ChesscomAgent(page);
    } else if ("LICHESS" == platform) {
        await browser.close();
        throw "Undefined agent";
    }
    await browser.close();
    throw `Unknown agent plate${platform}`;
} 

server.post<{
    Querystring: INewAgentQuery,
    Headers: IAgentHeaders,
    Reply: IReply
  }>('/newagent', async(request, reply)=> {
    const { platform } = request.query;
    let agent: IChessAgent | null = null;
    if (undefined === platform) {
        reply.code(400).send({error: "Unknown agent"});
        return;
    }
    try {
        agent = await createNewAgent(platform);
    } catch (err) {
        let errMsg: string = "Unhandled error occurred";
        if (typeof err === "string") {
            errMsg = err;
        }
        reply.code(400).send({error: errMsg});
    }
    if (null == agent) {
        reply.code(400).send({error: "Unknown agent"});
        return;
    }
    const agentID: string = uuidv4();
    agents.set(agentID, agent!);
    reply.code(200).send({ agentId: agentID });
});

server.post

server.listen({ port: 8123 }, (err, address) => {
    if (err) {
        console.error(err)
        process.exit(1)
    }
    console.log(`Server listening at ${address}`)
})