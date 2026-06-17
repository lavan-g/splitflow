export type UserBalance = {
  totalOwed: number;       // I owe others
  totalReceivable: number; // Others owe me
  netBalance: number;      // positive = I'm owed, negative = I owe
};

export type PeerBalance = {
  userId: string;
  fullName: string;
  username: string;
  amount: number; // positive = they owe me, negative = I owe them
};
