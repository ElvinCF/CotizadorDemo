export type TableLoadState = "loading-initial" | "loading-refresh" | "ready" | "empty";

export const resolveTableLoadState = (loading: boolean, rowCount: number): TableLoadState => {
  if (loading && rowCount === 0) return "loading-initial";
  if (loading && rowCount > 0) return "loading-refresh";
  if (!loading && rowCount === 0) return "empty";
  return "ready";
};
