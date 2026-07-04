export type UserSearchResult = {
  userId: string;
  fullName: string;
  username: string;
  uniqueId: string;
};

export type UserSearchState =
  | { status: "idle" }
  | { status: "found"; user: UserSearchResult }
  | { status: "not_found"; message: string }
  | { status: "error"; message: string };

export const USER_SEARCH_INITIAL: UserSearchState = { status: "idle" };
