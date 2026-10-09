
import { useState } from "react";
import Header from "./components/Header";
import ChatThread from "./components/ChatThread";
import PrivacyBanner from "./components/PrivacyBanner";
import FormDataManager from "./components/FormDataManager";

type View = "chat" | "data";

export default function App() {
  const [view, setView] = useState<View>("chat");

  return (
    <div className="flex min-h-screen flex-col bg-white text-black">
      <Header />

      <nav className="grid grid-cols-2 border-b border-neutral-200">
        <button
          type="button"
          onClick={() => setView("chat")}
          className={`px-3 py-3 text-xs ${
            view === "chat"
              ? "border-b-2 border-black font-semibold"
              : "text-neutral-500"
          }`}
        >
          Chat & guidance
        </button>

        <button
          type="button"
          onClick={() => setView("data")}
          className={`px-3 py-3 text-xs ${
            view === "data"
              ? "border-b-2 border-black font-semibold"
              : "text-neutral-500"
          }`}
        >
          Saved form data
        </button>
      </nav>

      {view === "chat" ? <ChatThread /> : <FormDataManager />}

      <PrivacyBanner />
    </div>
  );
}
