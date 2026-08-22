import Link from "next/link";

export function PrivateAtlasAuthHeader() {
  return (
    <header className="border-b border-[#dce6f5] bg-white">
      <div className="mx-auto flex max-w-6xl items-center px-6 py-4">
        <Link className="leading-tight text-[#071b42]" href="/login">
          <span className="block text-lg font-bold tracking-tight">Atlas For Entrepreneurs</span>
          <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-[#1246a0]">
            Secure Client Workspace
          </span>
        </Link>
      </div>
    </header>
  );
}
