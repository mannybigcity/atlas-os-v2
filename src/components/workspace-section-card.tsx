type WorkspaceSectionCardProps = {
  title: string;
  description: string;
  status: string;
};

export function WorkspaceSectionCard({
  title,
  description,
  status,
}: WorkspaceSectionCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-semibold text-slate-950">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        </div>
        <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          {status}
        </span>
      </div>
    </div>
  );
}
