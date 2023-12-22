import { ChessAgentInterface } from "@agents/ChessAgentInterface";
import { ChesscomAgent } from "@agents/chesscom/ChesscomAgent";
import { AgentState } from "@components/AgentState";
import { PlayState } from "@components/PlayState";
import { Square } from "@components/Square";
import { ComputerOptInterface } from "@components/computers/ComputerOptInterface";
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
const ask = (prompt: string): Promise<string> =>  new Promise<string>((resolve, reject) =>  {
	rlconsole.question(prompt, (answer) => {
		let ans = answer.toLowerCase().trim();
		if ('quit' == ans) {
			reject(quitId);
			return;
		}
		try {
			resolve(ans);
		} catch(err: any) {
			reject(err);
		}
	});
});
const askUntilQuit = async(prompt: string, beforeAsk: ()=>Promise<void>, onAnswer: (ans: string)=>Promise<boolean>) => {
	let quit: boolean = false;
	do {
		try {
			await beforeAsk();
			let ans = await ask(prompt);
			if (!await onAnswer(ans)) {
				break;
			}
		} catch (err: any) {
			quit = err == quitId;
			if (!quit) console.error(`Invalid input! Reason: ${err}`);
		}
	} while(!quit);
}
const askTurn = async (agent: ChessAgentInterface) => {
	await askUntilQuit("Your move: ",  async ()=> {
		await agent.waitTurn();
	}, async (ans)=> {
		if (PlayState.NotPlaying == agent.playingState) {
			return false;
		}
		await agent.move(ans);
		return true;
	});
} 
const showAllBots = (bots: Array<ComputerOptInterface>) => {
	console.info("Available bots ")
	console.info("========================");
	bots.forEach((bot, idx)=> {
		console.info(`${idx+1}. ${bot.name}. Rating: ${bot.elo}`);
	});
	console.info();
};
const askBot = async (bots: Array<ComputerOptInterface>): Promise<ComputerOptInterface>  => {
	let bot: ComputerOptInterface | undefined;
	await askUntilQuit("Choose bot to play against: ", async()=> {}, async (ans)=> {
		let choice = parseInt(ans);
		if (choice < 1 || choice > bots.length) {
			throw "Invalid choice. Choose the correct available bot"
		}
		bot = bots[choice-1];
		return false;
	})
	if (undefined === bot) {
		throw "No chosen bot";
	}
	return bot;
}
(async () => {
	let chosenBot: ComputerOptInterface;
	let bots = await ChesscomComputerOpt.getAvailableBots();
	showAllBots(bots);
	chosenBot = await askBot(bots);
	const browser = await initBrowser();
	const page = (await browser.pages())[0];
	let jendela = await page.evaluate(() => document.defaultView);
	if (jendela != null) {
		await page.setViewport({ width: jendela.innerWidth, height: jendela.innerHeight });
	}
	let agent = new ChesscomAgent(page);
	console.log(`Playing against ${chosenBot.name}, rating: ${chosenBot.elo}`);
	try {
		while (agent.playingState == PlayState.NotPlaying) {
			let state = await agent.playComputer(chosenBot);
			if (state == AgentState.TakingTurn) {
				await askTurn(agent);
			}
		}
	} catch (err: any) {
		if (err instanceof Array) {
			let state = err[1] as AgentState;
			console.error(`Browser out of reach: ${AgentState[state]}`);
			console.error("Error cause: ", err[0]);
		}
	} finally {
		await agent.dispose();
		await browser.close();
		console.info("Quitting...");
	}
})();