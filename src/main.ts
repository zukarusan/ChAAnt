import { ChessAgentInterface } from "@agents/ChessAgentInterface";
import { ChesscomAgent } from "@agents/chesscom/ChesscomAgent";
import { AgentState } from "@components/AgentState";
import { Square } from "@components/Square";
import { ChesscomComputerOpt } from "@components/computers/chesscom/ChesscomComputerOpt";
import * as puppeteer from "puppeteer";
import * as readline from 'readline';

const initBrowser = async () => {
	const browser = await puppeteer.launch({
		headless: false,
		defaultViewport: null,
		args: ['--start-maximized']
	});
	return browser;
};
const rlconsole = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

const { v4: uuidv4 } = require('uuid');
const quitId: string = uuidv4();
const ask = (prompt: string): Promise<Square> =>  new Promise<Square>((resolve, reject) =>  {
	rlconsole.question(prompt, (answer) => {
		let ans = answer.toLowerCase();
		if (ans == 'quit') {
			reject(quitId);
			return;
		}
		try {
			resolve(Square.square(answer));
		} catch(err: any) {
			reject(err);
		}
	});
});

const askTurn = async (agent: ChessAgentInterface) => {
	let quit: boolean = false;
	do {
		try {
			let from = await ask("From square: ");
			let to = await ask("To square: ");
			await agent.move(from, to);
		} catch (err: any) {
			quit = err == quitId;
			if (!quit) console.error(`Invalid move! Reason: ${err}`);
		}
	} while(!quit);
	console.info("Quitting...");
} 

(async () => {
	let bots = await ChesscomComputerOpt.getAvailableBots();
	let mediumBot: ChesscomComputerOpt | null = null;
	bots.every(b => {
		if (b.elo >= 1600) {
			mediumBot = b;
			return false;
		}
		return true;
	});
	if (mediumBot == null) {
		throw "No available medium bot";
	}
	let bot = mediumBot as ChesscomComputerOpt;
	const browser = await initBrowser();
	const page = (await browser.pages())[0];
	let jendela = await page.evaluate(() => document.defaultView);
	if (jendela != null) {
		await page.setViewport({ width: jendela.innerWidth, height: jendela.innerHeight });
	}
	let agent = new ChesscomAgent(page);
	console.log(`Playing against ${bot.name}, rating: ${bot.elo}`);
	try {
		let state = await agent.playComputer(bot);
		if (state == AgentState.TakingTurn) {
			await askTurn(agent);
		}
	} catch (err: any) {
		if (err instanceof Array) {
			let state = err[1] as AgentState;
			console.error(`Browser out of reach: ${AgentState[state]}`);
			console.error("Error cause: ", err[0]);
		}
	} finally {
		agent.dispose();
		browser.close();
		
	}
})();