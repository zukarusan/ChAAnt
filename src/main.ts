import { ChessAgentInterface } from "@agents/ChessAgentInterface";
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
  const browser = await initBrowser();
  const page = await browser.newPage();
  
//   await browser.close();
})();