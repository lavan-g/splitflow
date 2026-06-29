import Link from "next/link";

type Props = {
  groups: Array<{ id: string; name: string }>;
  selectedGroupId?: string;
};

export function ExpenseGroupFilter({ groups, selectedGroupId }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href="/expenses"
        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
          !selectedGroupId
            ? "bg-indigo-500/20 text-indigo-200"
            : "border border-white/20 bg-white/5 text-slate-300 hover:bg-white/10"
        }`}
      >
        All groups
      </Link>
      {groups.map((group) => (
        <Link
          key={group.id}
          href={`/expenses?group=${group.id}`}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
            selectedGroupId === group.id
              ? "bg-indigo-500/20 text-indigo-200"
              : "border border-white/20 bg-white/5 text-slate-300 hover:bg-white/10"
          }`}
        >
          {group.name}
        </Link>
      ))}
    </div>
  );
}
