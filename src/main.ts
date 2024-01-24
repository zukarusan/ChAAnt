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
		protocolTimeout: 0,
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
const askUntilQuit = async(prompt: string, beforeAsk: ()=>Promise<boolean>, onAnswer: (ans: string)=>Promise<boolean>) => {
	let quit: boolean = false;
	do {
		try {
			if (!await beforeAsk())
				break;
			let ans = await ask(prompt);
			if (!await onAnswer(ans))
				break;
		} catch (err: any) {
			quit = err == quitId;
			if (!quit) console.error(`Invalid input! Reason: ${err}`);
		}
	} while(!quit);
}
const askTurn = async (agent: ChessAgentInterface) => {
	await askUntilQuit("Your move: ",  async ()=> {
		if (PlayState.NotPlaying == agent.playingState) {
			return false;
		}
		await agent.waitTurn();
		return true;
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
	await askUntilQuit("Choose bot to play against: ", async ()=> true, async (ans)=> {
		let choice = parseInt(ans);
		if (choice < 1 || choice > bots.length) {
			throw "Invalid choice. Choose the correct available bot"
		}
		bot = bots[choice-1];
		return false;
	});
	if (undefined === bot) {
		throw "No chosen bot";
	}
	return bot;
}
const matches = ["Vs. Computer", "Rapid", "Blitz", "Bullet", "30 mins"];
const askGame = async (): Promise<1 | 2 | 3 | 4 | 5> => {
	console.info("Chess game automation")
	console.info("========================");
	matches.forEach((match, idx)=> {
		console.info(`${idx+1}. ${match}`);
	});
	console.info();
	let matchMode: 1 | 2 | 3 | 4 | 5 | undefined;
	await askUntilQuit("Choose match: ", async ()=> true, async (ans)=> {
		let choice = parseInt(ans);
		if (choice < 1 || choice > matches.length) {
			throw "Invalid choice. Choose the correct match option"
		}
		matchMode = choice as 1 | 2 | 3 | 4 | 5;
		return false;
	});
	if (undefined === matchMode) {
		throw "No chosen match mode";
	}
	return matchMode;
}
const playComputer = async (agent: ChessAgentInterface, bots: ComputerOptInterface[]) => {
	showAllBots(bots);
	let chosenBot = await askBot(bots);
	console.log(`Playing against ${chosenBot.name}, rating: ${chosenBot.elo}`);
	return await agent.playComputer(chosenBot);
	
}
(async () => {
	let bots = await ChesscomComputerOpt.getAvailableBots();
	const browser = await initBrowser();
	const page = (await browser.pages())[0];
	let jendela = await page.evaluate(() => document.defaultView);
	if (jendela != null) {
		await page.setViewport({ width: jendela.innerWidth, height: jendela.innerHeight });
	}
	let agent: ChessAgentInterface;
	agent = new ChesscomAgent(page);
	try {
		while (agent.playingState == PlayState.NotPlaying) {
			let choice = await askGame();
			let state: AgentState;
			switch(choice) {
				case 1:
					state = await playComputer(agent, bots);
					break;
				case 2:
					state = await agent.playRapid();
					break;
				case 3:
					state = await agent.playBlitz();
					break;
				case 4:
					state = await agent.playBullet();
					break;
				case 5:
					state = await agent.playClassical();
					break;
			}
			if (state == AgentState.TakingTurn) {
				await askTurn(agent);
			} else if (state == AgentState.FirstWaitingTurn) {
				await agent.waitTurn();
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