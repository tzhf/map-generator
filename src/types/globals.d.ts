export {}

declare global {
  interface Array<T> {
    chunk(n: number): T[][]
  }
}
