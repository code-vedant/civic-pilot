import { Show, SignInButton, UserButton } from "@clerk/chrome-extension";

export default function Header() {
  return (
    <header className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
      <div className="flex items-center gap-2.5">
        <div className="grid h-7 w-7 place-items-center bg-black text-xs font-semibold text-white">
          C
        </div>
        <div>
          <p className="text-[13px] font-semibold">CivicPilot</p>
          <p className="text-[9px] text-neutral-400">Government copilot</p>
        </div>
      </div>
      <Show when="signed-out">
        <SignInButton mode="modal">
          <button
            type="button"
            className="border border-black bg-black px-3 py-1.5 text-[10px] text-white hover:bg-white hover:text-black"
          >
            Sign in
          </button>
        </SignInButton>
      </Show>
      <Show when="signed-in">
        <UserButton />
      </Show>
    </header>
  );
}
