export interface ComputerOptInterface {
    get name(): string;
    get elo(): number;

    selectMe(): Promise<Enumerator>;
    configure(...args: any): Promise<Enumerator>;
}