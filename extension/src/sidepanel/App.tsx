import Header from "./components/Header";
import ChatThread from "./components/ChatThread";
import PrivacyBanner from "./components/PrivacyBanner";

export default function App() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-black">
      <Header />
      <ChatThread />
      <PrivacyBanner />
    </div>
  );
}
