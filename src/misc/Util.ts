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