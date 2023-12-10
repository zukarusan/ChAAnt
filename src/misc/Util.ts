export interface ResolveType<T> {
    (value: T | PromiseLike<T>): void;
}