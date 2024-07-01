import { IChessAgent } from "../agents/IChessAgent";
import { ChesscomAgent } from "../agents/chesscom/ChesscomAgent";
import { initMaxBrowser } from "../misc/PuppeteerUtil"

test("Chess.com Agent test online", async () => {
    const browser = await initMaxBrowser();
	const page = (await browser.pages())[0];
	let jendela = await page.evaluate(() => document.defaultView);
	if (jendela != null) {
		await page.setViewport({ width: jendela.innerWidth, height: jendela.innerHeight });
	}
	let agent: IChessAgent;
	agent = new ChesscomAgent(page);
    await agent.playRapid();
    await agent.waitTurn();
    if (agent.blackOrWhite == "black") {
        await agent.move("e5");
        expect(await agent.agentLastMove).toEqual("e5");
    } else {
        await agent.move("e4");
        expect(await agent.agentLastMove).toEqual("e4");
    }
}, 30000);