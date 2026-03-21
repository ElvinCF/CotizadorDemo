export type SortDirection = "asc" | "desc" | null;

export type SortState<TSortKey extends string = string> = {
  key: TSortKey | null;
  direction: SortDirection;
};
