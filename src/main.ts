import { ChessAgentInterface } from "@agents/ChessAgentInterface";
import { ChesscomComputerOpt } from "@components/computers/chesscom/ChesscomComputerOpt";
import * as puppeteer from "puppeteer";

const initBrowser = async () => {
  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 50
  });
  var test: ChessAgentInterface; 
  return browser;
};



(async () => {
  console.info((await ChesscomComputerOpt.getAvailableBots()));
//   await browser.close();
})();