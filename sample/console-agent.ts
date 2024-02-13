import { IChessAgent } from "@agents/IChessAgent";
import { ChesscomAgent } from "@agents/chesscom/ChesscomAgent";
import { AgentState } from "@components/AgentState";
import { PlayState } from "@components/PlayState";
import { Square } from "@components/Square";
import { IComputerOption } from "@components/computers/IComputerOption";
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
var aborter = new AbortController();
const { v4: uuidv4 } = require('uuid');
const quitId: string = uuidv4();
const ask = (prompt: string): Promise<string> =>  new Promise<string>((resolve, reject) =>  {
	rlconsole.question(prompt, { signal: aborter.signal }, (answer) => {
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
			quit = err == quitId || err;
			if (err instanceof Array && err.length >= 2 && err[1] == AgentState.BrowserPageOutOfReach) {
				console.error(`Browser out of reach: ${err}`);
				quit = true;
			}
			if (err == AgentState.BrowserPageOutOfReach) {
				quit = true;
				console.error(err);
			}
			if (!quit) console.error(`Invalid input! Reason: ${err}`);
		}
	} while(!quit);
}
const askTurn = async (agent: IChessAgent) => {
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
		await agent.move(ans).catch(err=>{
			console.error(`Invalid move! Reason: ${err}`)
		});
		return true;
	});
} 
const showAllBots = (bots: Array<IComputerOption>) => {
	console.info("Available bots ")
	console.info("========================");
	bots.forEach((bot, idx)=> {
		console.info(`${idx+1}. ${bot.name}. Rating: ${bot.elo}`);
	});
	console.info();
};
const askBot = async (bots: Array<IComputerOption>): Promise<IComputerOption>  => {
	let bot: IComputerOption | undefined;
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
const askIfPlayAsBlack = async (): Promise<boolean>  => {
	let asBlack: boolean = false;
	await askUntilQuit("Play as black (y/n)? ", async ()=> true, async (ans)=> {
		ans = ans.toLowerCase();
		if (ans.length <= 0 || !["y", "n"].includes(ans[0])) {
			throw "Can't infer answer"
		}
		asBlack = ans[0] == "y";
		return false;
	});
	return asBlack;
}
const matches = ["Vs. Computer", "Rapid", "Blitz", "Bullet", "30 mins"];
const askGame = async (): Promise<1 | 2 | 3 | 4 | 5> => {
	console.info("========================");
	console.info("Chess game automation");
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
const playComputer = async (agent: IChessAgent, bots: IComputerOption[]) => {
	showAllBots(bots);
	let chosenBot = await askBot(bots);
	let asBlack = await askIfPlayAsBlack();
	console.log(`Playing against ${chosenBot.name}, rating: ${chosenBot.elo}, as ${asBlack ? "Black" : "white"}`);
	return await agent.playComputer(chosenBot, asBlack);
	
}
const selectMode = async (agent: IChessAgent, choice: 1 | 2 | 3 | 4 | 5, bots: IComputerOption[]) => {
	switch(choice) {
		case 1:
			return await playComputer(agent, bots);
		case 2:
			return await agent.playRapid();
		case 3:
			return await agent.playBlitz();
		case 4:
			return await agent.playBullet();
		case 5:
			return await agent.playClassical();
	}
}
const iterGame = async (agent: IChessAgent, bots: IComputerOption[])=> await new Promise<void>(async (resolve, reject) => {
	let choice = await askGame();
	await selectMode(agent, choice, bots).then(async (state)=>{
		agent.onGameOver = ()=> {
			aborter.abort();
			aborter = new AbortController();
			reject("END");
		};
		if (AgentState.TakingTurn == state) {
			await askTurn(agent);
		} else if (AgentState.FirstWaitingTurn == state) {
			await agent.waitTurn();
			await askTurn(agent);
		}
	}).catch(err=>{
		reject(err);
	});
	resolve();
}).catch((err)=>{
	if ("END" == err) {
		console.info("----------");
		console.info("Game Ends.");
		console.info("----------");
	} else {
		throw err;
	}
});

(async () => {
	let bots = await ChesscomComputerOpt.getAvailableBots();
	const browser = await initBrowser();
	const page = (await browser.pages())[0];
	let jendela = await page.evaluate(() => document.defaultView);
	if (jendela != null) {
		await page.setViewport({ width: jendela.innerWidth, height: jendela.innerHeight });
	}
	let agent: IChessAgent;
	agent = new ChesscomAgent(page);
	while (agent.playingState == PlayState.NotPlaying) {
		try {
			await iterGame(agent, bots);
		} catch (err: any) {
			if (err instanceof Array) {
				let state = err[1] as AgentState;
				console.error(`Browser out of reach: ${AgentState[state]}`);
				console.error("Error cause: ", err[0]);
			}
		}
	} 

	rlconsole.close();
	await agent.dispose();
	await browser.close();
	console.info("Quitting...");
})();