type GroupDetailsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function GroupDetailsPage({ params }: GroupDetailsPageProps) {
  const { id } = await params;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8">
      <div className="glass-card rounded-2xl p-6">
        <h1 className="text-2xl font-semibold text-white">Group Details</h1>
        <p className="mt-2 text-sm text-slate-300">
          Active group context: <span className="font-medium text-indigo-300">{id}</span>
        </p>
      </div>
    </main>
  );
}
