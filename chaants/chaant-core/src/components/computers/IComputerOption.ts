import { ComputerConfigState } from "@components/ComputerConfigState";
import { Page } from "puppeteer";

export interface IComputerOption {
    get name(): string;
    get elo(): number;

    selectMe(page: Page, asBlack: boolean): Promise<ComputerConfigState>;
    configure(...args: any): Promise<ComputerConfigState>;
}