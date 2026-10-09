import { Link } from "react-router-dom";
import { Show, UserButton } from "@clerk/react";

const Landing = () => {
  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-black">
      {/* =====================================================
          NAVBAR
      ===================================================== */}
      <header className="flex h-[76px] items-center justify-between border-b border-neutral-200 px-[5vw]">
        <Link
          to="/"
          className="text-[21px] font-bold tracking-[-0.05em]"
        >
          CivicPilot<span className="ml-[2px]">.</span>
        </Link>

        <nav className="hidden items-center gap-9 md:flex">
          <a
            href="#how-it-works"
            className="text-[13px] text-neutral-600 transition hover:text-black"
          >
            How it works
          </a>

          <a
            href="#privacy"
            className="text-[13px] text-neutral-600 transition hover:text-black"
          >
            Privacy
          </a>

          <a
            href="#about"
            className="text-[13px] text-neutral-600 transition hover:text-black"
          >
            About
          </a>
        </nav>

        <div className="flex items-center gap-4">
  <Show when="signed-out">
    <Link
      to="/sign-in"
      className="hidden text-[13px] md:block"
    >
      Sign in
    </Link>

    <Link
      to="/sign-up"
      className="border border-black bg-black px-[18px] py-[10px] text-[13px] text-white transition hover:bg-white hover:text-black"
    >
      Get CivicPilot
    </Link>
  </Show>

  <Show when="signed-in">
    <Link
      to="/dashboard"
      className="border border-black bg-black px-[18px] py-[10px] text-[13px] text-white transition hover:bg-white hover:text-black"
    >
      Dashboard
    </Link>

    <UserButton />
  </Show>
</div>
      </header>

      <main>
        {/* =====================================================
            HERO
        ===================================================== */}
        <section className="flex min-h-[680px] flex-col items-center px-5 pb-24 pt-28 text-center md:min-h-[720px] md:px-[5vw] md:pt-32">
          <div className="mb-10 flex items-center gap-2 font-mono text-[10px] tracking-wide text-neutral-600 md:text-[11px]">
            <span className="h-[7px] w-[7px] rounded-full bg-black" />

            A smarter way to navigate government websites
          </div>

          <h1 className="text-[68px] font-semibold leading-[0.84] tracking-[-0.075em] sm:text-[85px] md:text-[11vw] lg:text-[150px]">
            Government,
            <br />
            <span className="text-neutral-400">
              simplified.
            </span>
          </h1>

          <p className="mt-11 max-w-[530px] text-[15px] leading-7 text-neutral-600 md:text-[17px]">
            CivicPilot helps you understand, find, and navigate
            online government forms — without taking control
            away from you.
          </p>

          <div className="mt-9 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row">
  <Show when="signed-out">
    <Link
      to="/sign-up"
      className="flex min-h-12 w-full items-center justify-center border border-black bg-black px-6 text-[13px] text-white transition hover:bg-white hover:text-black sm:w-auto"
    >
      Get CivicPilot
    </Link>
  </Show>

  <Show when="signed-in">
    <Link
      to="/dashboard"
      className="flex min-h-12 w-full items-center justify-center border border-black bg-black px-6 text-[13px] text-white transition hover:bg-white hover:text-black sm:w-auto"
    >
      Open Dashboard
    </Link>
  </Show>

  <a
    href="#how-it-works"
    className="flex min-h-12 w-full items-center justify-center border border-neutral-200 px-5 text-[13px] transition hover:border-black sm:w-auto"
  >
    See how it works
    <span className="ml-2">↓</span>
  </a>
</div>
        </section>

        {/* =====================================================
            PRODUCT PREVIEW
        ===================================================== */}
        <section className="px-5 pb-32 md:px-[5vw] md:pb-40">
          <div className="mx-auto max-w-[1100px] border border-black shadow-[12px_12px_0_#000] md:shadow-[20px_20px_0_#000]">
            {/* Browser header */}
            <div className="flex h-12 items-center border-b border-black px-4">
              <div className="flex gap-[6px]">
                <i className="block h-2 w-2 rounded-full border border-black" />
                <i className="block h-2 w-2 rounded-full border border-black" />
                <i className="block h-2 w-2 rounded-full border border-black" />
              </div>

              <div className="m-auto font-mono text-[9px] text-neutral-500">
                government-portal.gov.in
              </div>
            </div>

            {/* Browser content */}
            <div className="grid min-h-[460px] grid-cols-1 md:grid-cols-[1.6fr_0.7fr]">
              {/* Form */}
              <div className="bg-neutral-50 p-7 md:p-[60px]">
                <span className="font-mono text-[9px] tracking-[0.12em] text-neutral-600">
                  APPLICATION FORM
                </span>

                <h3 className="mb-9 mt-2 text-[27px] font-semibold tracking-[-0.04em]">
                  Personal Details
                </h3>

                <div className="mb-[22px] max-w-[500px]">
                  <label className="mb-2 block text-[12px] font-semibold">
                    Full Name
                  </label>

                  <div className="flex h-[46px] items-center border border-neutral-200 bg-white px-3.5 text-[12px] text-neutral-400">
                    Enter your name
                  </div>
                </div>

                <div className="relative mb-[22px] max-w-[500px]">
                  <label className="mb-2 block text-[12px] font-semibold">
                    State
                  </label>

                  <div className="flex h-[46px] items-center border border-black bg-white px-3.5 text-[12px] text-neutral-400 shadow-[0_0_0_3px_#ddd]">
                    Select your state
                  </div>

                  {/* Spotlight */}
                  <div className="absolute left-[calc(100%+20px)] top-[30px] hidden whitespace-nowrap bg-black px-[13px] py-2.5 font-mono text-[10px] text-white lg:block">
                    <span className="mr-1.5">✦</span>
                    CivicPilot found it
                  </div>
                </div>

                <div className="max-w-[500px]">
                  <label className="mb-2 block text-[12px] font-semibold">
                    District
                  </label>

                  <div className="flex h-[46px] items-center border border-neutral-200 bg-white px-3.5 text-[12px] text-neutral-400">
                    Select district
                  </div>
                </div>
              </div>

              {/* Copilot */}
              <aside className="border-t border-black bg-white p-6 md:border-l md:border-t-0">
                <div className="flex items-center gap-2.5 border-b border-neutral-200 pb-5">
                  <div className="grid h-[30px] w-[30px] place-items-center bg-black text-[12px] font-semibold text-white">
                    C
                  </div>

                  <div>
                    <strong className="block text-[12px]">
                      CivicPilot
                    </strong>

                    <small className="mt-0.5 block text-[10px] text-neutral-400">
                      Assistant
                    </small>
                  </div>
                </div>

                <div className="border-b border-neutral-200 py-[22px]">
                  <span className="font-mono text-[8px] tracking-[0.12em] text-neutral-400">
                    YOU
                  </span>

                  <p className="mt-2 text-[12px] leading-6">
                    Where do I enter my State?
                  </p>
                </div>

                <div className="border-b border-neutral-200 py-[22px]">
                  <span className="font-mono text-[8px] tracking-[0.12em] text-neutral-400">
                    CIVICPILOT
                  </span>

                  <p className="mt-2 text-[12px] leading-6 text-neutral-600">
                    I found the State field and highlighted
                    it for you.
                  </p>
                </div>
              </aside>
            </div>
          </div>
        </section>

        {/* =====================================================
            STATEMENT
        ===================================================== */}
        <section className="border-y border-black px-5 py-28 text-center md:px-[5vw] md:py-36">
          <p className="font-mono text-[10px] font-medium tracking-[0.15em]">
            CIVICPILOT
          </p>

          <h2 className="mt-9 text-[56px] font-semibold leading-[0.92] tracking-[-0.07em] sm:text-[70px] md:text-[8vw] lg:text-[110px]">
            Understand.
            <br />
            Navigate.
            <br />
            <span className="text-neutral-400">
              Stay in control.
            </span>
          </h2>
        </section>

        {/* =====================================================
            FEATURES
        ===================================================== */}
        <section
          id="how-it-works"
          className="grid grid-cols-1 border-b border-black md:grid-cols-3"
        >
          <div className="min-h-[320px] border-b border-black p-7 md:min-h-[400px] md:border-b-0 md:border-r md:p-[55px_5vw]">
            <span className="font-mono text-[10px] text-neutral-400">
              01
            </span>

            <h3 className="mt-20 text-[35px] font-semibold tracking-[-0.05em] md:mt-[100px]">
              Understand
            </h3>

            <p className="mt-[18px] max-w-[290px] text-[13px] leading-7 text-neutral-600">
              Confusing government forms become easier to
              understand with simple, contextual guidance.
            </p>
          </div>

          <div className="min-h-[320px] border-b border-black p-7 md:min-h-[400px] md:border-b-0 md:border-r md:p-[55px_5vw]">
            <span className="font-mono text-[10px] text-neutral-400">
              02
            </span>

            <h3 className="mt-20 text-[35px] font-semibold tracking-[-0.05em] md:mt-[100px]">
              Find
            </h3>

            <p className="mt-[18px] max-w-[290px] text-[13px] leading-7 text-neutral-600">
              Ask where something is and CivicPilot finds the
              right field directly on the page.
            </p>
          </div>

          <div className="min-h-[320px] p-7 md:min-h-[400px] md:p-[55px_5vw]">
            <span className="font-mono text-[10px] text-neutral-400">
              03
            </span>

            <h3 className="mt-20 text-[35px] font-semibold tracking-[-0.05em] md:mt-[100px]">
              Protect
            </h3>

            <p className="mt-[18px] max-w-[290px] text-[13px] leading-7 text-neutral-600">
              Sensitive information stays under your control.
              CivicPilot doesn't need to take over your forms.
            </p>
          </div>
        </section>

        {/* =====================================================
            PRIVACY
        ===================================================== */}
        <section
          id="privacy"
          className="grid grid-cols-1 border-b border-black md:grid-cols-2"
        >
          <div className="border-b border-black px-7 py-24 md:border-b-0 md:border-r md:px-[7vw] md:py-32">
            <p className="font-mono text-[10px] font-medium tracking-[0.15em]">
              PRIVACY FIRST
            </p>

            <h2 className="mt-9 text-[52px] font-semibold leading-[0.95] tracking-[-0.065em] md:text-[6vw]">
              Your information
              <br />
              stays{" "}
              <span className="text-neutral-400">
                yours.
              </span>
            </h2>

            <p className="mt-9 max-w-[410px] text-[14px] leading-7 text-neutral-600">
              CivicPilot is designed to assist you without
              taking control of sensitive information.
            </p>
          </div>

          <div className="px-7 py-20 md:px-[7vw] md:py-24">
            {[
              "Passwords",
              "OTPs",
              "CAPTCHAs",
              "Sensitive data",
            ].map((item, index) => (
              <div
                key={item}
                className={`flex min-h-[75px] items-center gap-5 border-b border-neutral-200 text-[16px] ${
                  index === 0
                    ? "border-t border-neutral-200"
                    : ""
                }`}
              >
                <span className="font-mono text-[10px] text-neutral-400">
                  {String(index + 1).padStart(2, "0")}
                </span>

                {item}

                <b className="ml-auto text-xl font-normal">
                  ×
                </b>
              </div>
            ))}
          </div>
        </section>

        {/* =====================================================
            ABOUT
        ===================================================== */}
        <section
          id="about"
          className="border-b border-black px-7 py-24 md:px-[7vw] md:py-36"
        >
          <p className="font-mono text-[10px] font-medium tracking-[0.15em]">
            WHY CIVICPILOT?
          </p>

          <h2 className="mt-10 max-w-[1000px] text-[55px] font-semibold leading-[0.9] tracking-[-0.07em] sm:text-[70px] md:text-[8vw]">
            Government websites
            <br />
            weren't built for everyone.
          </h2>

          <p className="mt-11 max-w-[480px] text-[15px] leading-7 text-neutral-600 md:text-[17px]">
            CivicPilot is building a simpler layer between
            people and the digital services they need.
          </p>
        </section>

        {/* =====================================================
            FINAL CTA
        ===================================================== */}
        <section className="px-5 py-32 text-center md:py-40">
          <p className="font-mono text-[10px] font-medium tracking-[0.15em]">
            READY?
          </p>

          <h2 className="my-9 text-[65px] font-semibold leading-[0.85] tracking-[-0.075em] sm:text-[85px] md:text-[10vw] lg:text-[140px]">
            Make government
            <br />
            <span className="text-neutral-400">
              easier.
            </span>
          </h2>

          <Show when="signed-out">
  <Link
    to="/sign-up"
    className="inline-flex min-h-[52px] items-center justify-center border border-black bg-black px-8 text-[13px] text-white transition hover:bg-white hover:text-black"
  >
    Get CivicPilot
  </Link>
</Show>

<Show when="signed-in">
  <Link
    to="/dashboard"
    className="inline-flex min-h-[52px] items-center justify-center border border-black bg-black px-8 text-[13px] text-white transition hover:bg-white hover:text-black"
  >
    Open Dashboard
  </Link>
</Show>
        </section>
      </main>

      {/* =====================================================
          FOOTER
      ===================================================== */}
      <footer className="grid grid-cols-1 gap-8 border-t border-black px-5 py-10 md:grid-cols-[2fr_1fr_1fr] md:px-[5vw]">
        <div>
          <Link
            to="/"
            className="text-[21px] font-bold tracking-[-0.05em]"
          >
            CivicPilot<span>.</span>
          </Link>

          <p className="mt-3 text-[11px] text-neutral-600">
            Making government websites easier to navigate.
          </p>
        </div>

        <div className="flex flex-col gap-2.5 text-[12px]">
          <a href="#how-it-works">How it works</a>
          <a href="#privacy">Privacy</a>
          <a href="#about">About</a>
        </div>

        <div className="font-mono text-[9px] text-neutral-400 md:text-right">
          © 2026 CivicPilot
        </div>
      </footer>
    </div>
  );
};

export default Landing;