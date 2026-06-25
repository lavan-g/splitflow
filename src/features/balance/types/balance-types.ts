export type UserBalance = {
  totalOwed: number;       // amount I owe others
  totalReceivable: number; // amount others owe me
  netBalance: number;      // positive = I am owed more, negative = I owe more
};

export type PeerBalance = {
  userId: string;
  fullName: string;
  username: string;
  amount: number; // positive = they owe me, negative = I owe them
};
