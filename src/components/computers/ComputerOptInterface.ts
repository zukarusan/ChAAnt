import { ComputerConfigState } from "@components/ComputerConfigState";

export interface ComputerOptInterface {
    get name(): string;
    get elo(): number;

    selectMe(): Promise<ComputerConfigState>;
    configure(...args: any): Promise<ComputerConfigState>;
}