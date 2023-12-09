import { ChessAgentInterface } from "@agents/ChessAgentInterface";
import { ChesscomAgent } from "@agents/chesscom/ChesscomAgent";
import { AgentState } from "@components/AgentState";
import { ChesscomComputerOpt } from "@components/computers/chesscom/ChesscomComputerOpt";
import * as puppeteer from "puppeteer";

const initBrowser = async () => {
  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 1,
    defaultViewport: null,
    args: ['--start-maximized'] 
  });
  var test: ChessAgentInterface; 
  return browser;
};



(async () => {
  let bots = await ChesscomComputerOpt.getAvailableBots();
  let mediumBot: ChesscomComputerOpt | null = null;
  bots.every(b => {
    if (b.elo >= 1600 ) {
      mediumBot = b;
      return false;
    }
    return true;
  });
  if (mediumBot == null) {
    return Promise.reject("No available medium bot");
  }
  let bot = mediumBot as ChesscomComputerOpt;
  const browser = await initBrowser();
  const page = (await browser.pages())[0];
  let jendela = await page.evaluate(()=> document.defaultView);
  if (jendela != null) {
    await page.setViewport({width: jendela.innerWidth, height: jendela.innerHeight});
  }
  let agent = new ChesscomAgent(page);
  console.log(`Playing against ${bot.name}, rating: ${bot.elo}`);
  try {
    let state = await agent.playComputer(bot);
  } catch (err: unknown) {
    if (err instanceof Array) {
      let state = err[1] as AgentState;
      browser.close();
      console.error(`Browser out of reach: ${AgentState[state]}`);
      console.error("Error cause: ", err[0]);
    }
  }
})();