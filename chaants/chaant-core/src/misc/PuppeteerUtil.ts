import * as puppeteer from "puppeteer";
export const initMaxBrowser = async () => {
	const browser = await puppeteer.launch({
		headless: false,
		defaultViewport: null,
		protocolTimeout: 0,
		args: ['--start-maximized']
	});
	return browser;
};