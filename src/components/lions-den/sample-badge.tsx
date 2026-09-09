export function SampleBadge({ label }: { label: string }) {
  return (
    <span
      className="rounded-full bg-[#fff8e6] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-[#8a6a12]"
      title="Sample record added by Atlas so you can see how the desk works. Not a real business."
    >
      {label}
    </span>
  );
}
