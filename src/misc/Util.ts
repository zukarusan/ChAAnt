import * as fs from 'fs';

export interface ResolveType<T> {
    (value: T | PromiseLike<T>): void;
}

export enum PieceNotation {
    Pawn = 'p',
    Rook = 'r',
    Knight = 'n',
    Bishop = 'b',
    Queen = 'q',
    King = 'k'
}

let rawData = fs.readFileSync('src/regexes.json', 'utf8');
let regexes = JSON.parse(rawData)["regexes"];

export const notationMoveRegex: RegExp = new RegExp(regexes["chess-notation-move"] as string, "i"); 