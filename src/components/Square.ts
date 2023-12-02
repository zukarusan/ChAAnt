export class Square {
    private static readonly CHESS_SQUARES: Square[][] = [];
    static {
        for (let i = 0; i < 8; i++) {
            let file: Square[] = [];
            this.CHESS_SQUARES.push(file);
            for (let j = 0; j < 8; j++) {
                file.push(new Square(i, j));
            }
        }
    }
    private static readonly _files_notations: string[] = ["a", "b", "c", "d", "e", "f", "g", "h"];
    private _rank: number;
    private _file: number;
    private constructor(file: number, rank: number) {
        this._file = file;
        this._rank = rank;
    }
    public static toFileIndex(fileNotation: string): number {
        let not = fileNotation.toLowerCase();
        let file: number;
        if ((file = this._files_notations.indexOf(not)) == -1) {
            throw `File notation is not defined within board: ${fileNotation}`;
        }
        return file;
    }
    private static checkIndexWithinRange(idx: number, rankOrFile: string, originArg: string) {
        if (idx < 0 || idx >= 8) {
            throw `${rankOrFile} is not correct: ${originArg}}`;
        }
    }
    public static square(notation: string): Square {
        let not = notation.trim();
        if (not.length > 2 || not.length <= 0) {
            throw `Notation is not in correct format: ${notation}`;
        }
        let fileIdx = this.toFileIndex(not[0]);
        let rankStr = not[1];
        let rankIdx = Number(rankStr) - 1;
        if (isNaN(rankIdx)) {
            throw `Rank notation is not correct: ${rankStr}}`;
        }
        this.checkIndexWithinRange(fileIdx, "File", not[0]);
        this.checkIndexWithinRange(rankIdx, "Rank", not[1]);
        return this.CHESS_SQUARES[fileIdx][rankIdx];
    }
    public get rank(): number {
        return this._rank;
    }
    public get file(): number {
        return this._rank;
    }
    public get rankNotation(): string {
        return (this._rank + 1).toString();
    }
    public get fileNotation(): string {
        return Square._files_notations[this._file];
    }
    public get notation(): string {
        return this.fileNotation + this.rankNotation;
    }
}