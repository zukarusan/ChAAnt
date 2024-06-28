import { ComputerConfigState } from "@components/ComputerConfigState";
import { IComputerOption } from "../IComputerOption";
import puppeteer, { Page } from "puppeteer";
import { ResolveType } from "@misc/Util";

export class ChesscomComputerOpt implements IComputerOption {
    private static readonly computerConfigs: ChesscomComputerOpt[] = new Array<ChesscomComputerOpt>();
    private static initialized: Promise<boolean> = new Promise(this.initComputers);
    static {
        this.initialized.then((init)=> {
            if (!init) {
                console.error("Cannot make a call to https://www.chess.com/callback/bot-personalities");
            }
        }).catch((err)=>{
            throw err;
        })
    }
    private _elo: number;
    private _name: string;
    private _username: string;
    private _group: string;
    private constructor(username: string, name: string, elo: number, group: string) {
        this._username = username;
        this._name = name;
        this._elo = elo;
        this._group = group;
    }
    private static async initComputers(resolve: ResolveType<boolean>, reject: (reason?: any) => void): Promise<void> {
        try {
            const browser = await puppeteer.launch({
                headless: true
            });
            const page = await browser.newPage();
            let resp = await page.goto('https://www.chess.com/callback/bot-personalities');
            let respJson = await resp?.json();
            if (respJson == null || respJson.length == 0) {
                throw "Lists of bots are unavailable";
            }
            let bots = respJson as Array<ChesscomBot>;
            await browser.close();
            bots.forEach((bot)=> {
                if (!bot.is_premium) {
                    ChesscomComputerOpt.computerConfigs.push(new ChesscomComputerOpt(bot.username, bot.name, bot.rating, bot.classification));
                }
            });
            resolve(true);
        } catch (error) {
            reject(error);
        }
    }
    public static async getAvailableBots(): Promise<Array<ChesscomComputerOpt>>{
        if (!(await ChesscomComputerOpt.initialized)) {
            throw "Bots are not available";
        }
        return ChesscomComputerOpt.computerConfigs;
    }
    get name(): string {
        return this._name;
    }
    get elo(): number {
        return this._elo;
    }
    async selectMe(page: Page, asBlack: boolean): Promise<ComputerConfigState> {
        let init = await ChesscomComputerOpt.initialized;
        if (!init) {
            throw "Cannot select because no bots are available";
        }
        if (!page.url().includes("chess.com/play/computer")) {
            throw "Page is not within computer mode";
        }
        let botBtn = await page.waitForSelector(`div[data-bot-selection-name='${this._name}'][data-bot-classification='${this._group}']`);
        if (null == botBtn) {
            throw `Bot ${this._name} is not found`;
        }
        await botBtn.click();
        await botBtn.dispose();
        let chooseBtn = await page.$("#board-layout-sidebar button[title='Choose']");
        if (null == chooseBtn) {
            throw "There is no choose button";
        }
        await chooseBtn.click();
        await chooseBtn.dispose();

        let colorBtn = await page.waitForSelector(`div.select-playing-as-radio-${asBlack ? 'black' : 'white'} input[name="colorSelectionButton"]`);
        if (null == colorBtn) {
            throw "There is no color button";
        }
        await colorBtn.click();
        await colorBtn.dispose();

        await page.evaluate(() => new Promise<void>((resolve)=>{
            let timeoutId = setTimeout(() => {
                throw "Asserting bot selection times out";
            }, 10200);
            let node = document.querySelector("#board-layout-sidebar div.selection-menu-component");
            var x = new MutationObserver(function (mut, ob) {
                if (mut[0].attributeName == "class" && document.querySelector("div.selection-menu-component") == null) {
                    clearTimeout(timeoutId);
                    ob.disconnect();
                    resolve();
                } 
            });
            if (node != null) {
                x.observe(node , { attributes: true });
            } else {
                clearTimeout(timeoutId);
                resolve();
            }
        }));
        let menu = await page.$("#board-layout-sidebar div.selection-menu-component");
        await menu?.dispose();
        if (null == menu) {
            return ComputerConfigState.Chosen;
        } else {
            throw ComputerConfigState.ConfigOutOfReach;
        }
    }
    async configure(page: Page, ...args: any): Promise<ComputerConfigState> {
        if ((await page.$("#board-layout-sidebar div.selection-component")) == null) {
            throw "Bot is not yet chosen";
        }
        return ComputerConfigState.ChosenConfigured;
    }

}

export interface ChesscomBot {
  id: string
  sort_order: number
  is_enabled: boolean
  name: string
  username: string
  user_id: number
  classification: string
  is_premium: boolean
  komodo_skill_level: number
  komodo_skill: any
  is_adapt: boolean
  human: any
  personality: string
  book: string
  country_code: string
  gender: string
  rating: number
  rating_text: any
  live_online_rating: number
  description: string
  classification_text: string
  classification_hint_text: string
  image_url: string
  crown_earned: any
  image_url_override: any
  phrase_list: ChesscomBotPhraseList
  is_v2: boolean
  theme_id: any
  minimum_ceeversion: any
}
export interface ChesscomBotPhraseList {
    greeting: string
    computer_wins: string
    computer_loses: string
    computer_draws: string
    computer_is_winning: string
    computer_is_losing: string
    computer_gives_check: string
    player_gives_check: string
    computer_captures_queen: string
    player_captures_queen: string
    computer_promotes: string
    player_promotes: string
    first_capture: string
    threatening: string
    threatened: string
    computer_has_mate_in_x: string
    player_has_mate_in_x: string
    random: string
    opening_e4: string
    opening_d4: string
    opening_c4_english: string
    opening_nf3: string
    opening_e4_e5_kings_pawn: string
    opening_e4_c5_sicilian: string
    opening_e4_c6_caro_kann: string
    opening_e4_e6_french: string
    opening_d4_nf6_indian: string
    opening_d4_d5_queens_gambit: string
    opening_other: string
    user_spends_more_than_15_seconds_on_a_move: string
    user_spends_more_than_1_minute_on_a_move: string
    user_spends_more_than_3_minutes_on_move: string
    pawn_endgame: string
    r_p_endgame_reached: string
    major_piece_endgame: string
    minor_piece_endgame: string
    game_reached_move_40: string
    game_reached_move_100: string
    rematch_if_user_has_played_before: string
  }