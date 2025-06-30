export type ReactChildren = {
  children?: React.ReactNode
}

export type SetState<T> = React.Dispatch<React.SetStateAction<T>>

export type PaginationSize = 10 | 20 | 30 | 40 | 50

declare global {
  interface Window {
    isUnderTest: boolean
  }
}
