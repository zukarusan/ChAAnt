import { initMaxBrowser } from "../misc/PuppeteerUtil"
import { ChesscomAgent } from "../agents/chesscom/ChesscomAgent";
import { ChesscomComputerOpt } from "../components/computers/chesscom/ChesscomComputerOpt";
import { CollectiveMove } from "../misc/CollectiveMove";

function delay(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
}
test("Chess.com Collective move test", async () => {
    const browser = await initMaxBrowser();
	const page = (await browser.pages())[0];
	let jendela = await page.evaluate(() => document.defaultView);
	if (jendela != null) {
		await page.setViewport({ width: jendela.innerWidth, height: jendela.innerHeight });
	}
	let agent = new ChesscomAgent(page);
    let bots = await ChesscomComputerOpt.getAvailableBots();
    await agent.playComputer(bots[0], false);
    expect(agent.blackOrWhite).toEqual("white");
    await agent.waitTurn();
    let colMoves = new CollectiveMove(agent);
    await colMoves.addMove("d4");
    await colMoves.addMove("e4");
    await colMoves.addMove("e4");
    await colMoves.addMove("d4");
    await delay(CollectiveMove.MIN * 0.2);
    await colMoves.addMove("e4");
    await delay(CollectiveMove.MAX);
    let lastMove = await agent.agentLastMove;
    expect(lastMove).toEqual("e4");

    await agent.waitTurn();
    await colMoves.addMove("nc3");
    await colMoves.addMove("d4");
    await delay(CollectiveMove.MIN * 0.2);
    await colMoves.addMove("nf3");
    await colMoves.addMove("nc3");
    await colMoves.addMove("a4");
   
    await delay(CollectiveMove.MAX);
    lastMove = await agent.agentLastMove;
    expect(lastMove).toEqual("nc3"); 
}, CollectiveMove.MAX * 5);