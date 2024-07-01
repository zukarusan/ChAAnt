import { IChessAgent } from '@chaant/core/src/agents/IChessAgent';
import { ChesscomAgent } from '@chaant/core/src/agents/chesscom/ChesscomAgent';
import { CollectiveMove } from '@chaant/core/src/misc/CollectiveMove';
import fastify, { FastifyReply, FastifyRequest, HookHandlerDoneFunction } from 'fastify'
import puppeteer from 'puppeteer';

const runServer = () => {
    const server = fastify();
    
    type ChessPlatform = 'chesscom' | 'lichess';
    interface INewAgentQuery {
        platform: ChessPlatform;
    }
    
    interface IAgentHeaders {
        'x-chaant-agent-id': string;
    }
    
    interface IReply {
        200: { agentId?: string };
        302: { url: string };
        '4xx': { error: string };
    }
    
    const agents: Map<string, IChessAgent> = new Map();
    const collectiveMoves: Map<string, CollectiveMove> = new Map();
    const { v4: uuidv4 } = require('uuid');
    const launchNewBrowserPage = async () => {
        const browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
            protocolTimeout: 0,
            args: ['--start-maximized']
        });
        return (await browser.pages())[0];
    }
    const createNewAgent = async (platform: ChessPlatform): Promise<IChessAgent> => {
        if ("chesscom" == platform) {
            return new ChesscomAgent((await launchNewBrowserPage()));
        } else if ("lichess" == platform) {
            throw "Undefined agent";
        }
        throw `Unknown platform ${platform}`;
    } 
    const validateAgentHeader = (request: FastifyRequest<{
        Headers: IAgentHeaders
    }>, reply: FastifyReply) => {
        const agentId = request.headers['x-chaant-agent-id'];
        if (agentId === undefined || null == agentId) {
            reply.code(400).send("Agent Id is not defined");
        }
        if ((agents.get(agentId)) === undefined) {
            reply.code(400).send("Agent is not found");
        }
    }
    server.post<{
        Querystring: INewAgentQuery,
        Reply: IReply
    }>('/newagent', {
        preValidation: (request, _reply, done) => {
            const { platform } = request.query
            if (undefined === platform) {
                return done(new Error("Unknown platform"));
            }
            done();
        }
    },
    async(request, reply)=> {
        const { platform } = request.query;
        let agent: IChessAgent;
        try {
            agent = await createNewAgent(platform);
        } catch (err) {
            let errMsg: string = "Unhandled error occurred";
            if (typeof err === "string") {
                errMsg = err;
            }
            reply.code(400).send({error: errMsg});
            return;
        }
        const agentID: string = uuidv4();
        agents.set(agentID, agent);
        collectiveMoves.set(agentID, new CollectiveMove(agent));
        reply.code(200).send({ agentId: agentID });
    });

    server.post<{
        Querystring: {versus: 'computer' | 'online', botName?: string, as?: 'white' | 'black'},
        Headers: IAgentHeaders,
        Reply: IReply
    }>('/play', {
        preValidation: (request, reply, done) => {
            const { versus } = request.query;
            validateAgentHeader(request, reply);
            if (undefined === versus || null == versus)  {
                reply.code(400).send({error: "Opponent is not specified"});
            }
            done();
        }
    }, async(request, reply)=> {
        const { versus, botName, as } = request.query;
        const agentId = request.headers['x-chaant-agent-id'];
        let agent: IChessAgent;
        try {
            agent = agents.get(agentId)!;
            if ("online" == versus) {
                await agent.playRapid();
            } else if ("computer" == versus) {
                throw "Undefined state";
            }
        } catch (err) {
            let errMsg: string = "Unhandled error occurred";
            if (typeof err === "string") {
                errMsg = err;
            }
            reply.code(400).send({error: errMsg});
        }
        reply.code(200).send();
    });

    server.post<{
        Querystring: {move: string},
        Headers: IAgentHeaders,
        Reply: IReply
    }>('/move', {
        preValidation: (request, reply, done)=> {
            validateAgentHeader(request, reply);
            done();
        }
    }, async(request, reply)=> {
        const { move } = request.query;
        const agentId = request.headers['x-chaant-agent-id'];
        let agent: IChessAgent;
        try {
            agent = agents.get(agentId)!;
            await agent.waitTurn();
            await agent.move(move);
        } catch (err) {
            let errMsg: string = "Unhandled error occurred";
            if (typeof err === "string") {
                errMsg = err;
            }
            reply.code(400).send({error: errMsg});
        }
        reply.code(200).send();
    });
    server.delete<{
        Headers: IAgentHeaders,
        Reply: IReply
    }>('/closeagent', {
        preValidation: (request, reply, done)=> {
            validateAgentHeader(request, reply);
            done();
        }
    }, async(request, reply)=> {
        const agentId = request.headers['x-chaant-agent-id'];
        let agent: IChessAgent;
        try {
            agent = agents.get(agentId)!;
            await agent.dispose();
        } catch (err) {
            let errMsg: string = "Unhandled error occurred";
            if (typeof err === "string") {
                errMsg = err;
            }
            reply.code(400).send({error: errMsg});
        }
        reply.code(200).send();
    });
    server.post<{
        Querystring: {move: string},
        Headers: IAgentHeaders,
        Reply: IReply
    }>('/moveCollective', {
        preValidation: (request, reply, done)=> {
            validateAgentHeader(request, reply);
            done();
        }
    }, async(request, reply)=> {
        const { move } = request.query;
        const agentId = request.headers['x-chaant-agent-id'];
        let agent: IChessAgent;
        let cMoves: CollectiveMove;
        try {
            agent = agents.get(agentId)!;
            cMoves = collectiveMoves.get(agentId)!;
            await cMoves.addMove(move);
        } catch (err) {
            let errMsg: string = "Unhandled error occurred";
            if (typeof err === "string") {
                errMsg = err;
            }
            reply.code(400).send({error: errMsg});
        }
        reply.code(200).send();
    });
    server.listen({ port: 8123 }, (err, address) => {
        if (err) {
            console.error(err)
            process.exit(1)
        }
        console.log(`Server listening at ${address}`)
    });
    return server;
}
export default runServer;