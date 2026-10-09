import { useEffect, useRef, useState } from "react";
import type {
  CopilotPayload,
  CopilotResponse,
  PortalContext,
  QueryIntent,
  TelemetryEvent,
} from "../../utils/types";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

type VoiceResponse = {
  success: boolean;
  audioBase64?: string;
  error?: string;
};

const id = () => crypto.randomUUID();

const locationIntent =
  /\b(where is|where's|find|locate|highlight|spotlight|show me|which field|where do i (?:enter|select|provide)|search(?: for)?\s+(?:the\s+)?(?:field|input|box))\b/i;

const sensitiveIntent =
  /\b(fill|enter|type|submit|bypass|solve|read|extract|handle|share)\b.{0,60}\b(otp|password|captcha|aadhaar otp|mpin|security pin|transaction pin)\b/i;

function getTarget(query: string): string {
  if (
    /^search(?: for)?\s+(?:the\s+)?(?:field|input|box)$/i.test(query.trim())
  ) {
    return "search";
  }

  return query
    .replace(
      /^(where is|where's|find|locate|highlight|spotlight|show me)\s+/i,
      ""
    )
    .replace(/^which field is for\s+/i, "")
    .replace(/^where do i (enter|select|provide)\s+/i, "")
    .replace(/\b(the|fields?|inputs?|boxes|please)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sendToActiveTab(query: string): Promise<any> {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;

      if (tabId == null) {
        resolve({ success: false, reason: "no_active_tab" });
        return;
      }

      chrome.tabs.sendMessage(
        tabId,
        { type: "FIND_FIELD", query },
        (response) => {
          if (chrome.runtime.lastError) {
            resolve({
              success: false,
              reason: "content_script_unavailable",
            });
            return;
          }

          resolve(response);
        }
      );
    });
  });
}

function getActivePortalContext(): Promise<PortalContext | null> {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      const tab = tabs[0];

      if (tab?.id == null || !tab.url) {
        resolve(null);
        return;
      }

      let url: URL;

      try {
        url = new URL(tab.url);
      } catch {
        resolve(null);
        return;
      }

      if (!["http:", "https:"].includes(url.protocol)) {
        resolve(null);
        return;
      }

      const fallback: PortalContext = {
        domain: url.hostname,
        title: (tab.title || "").slice(0, 200),
        pageContext: {
          headings: [],
          fieldLabels: [],
        },
      };

      chrome.tabs.sendMessage(
        tab.id,
        { type: "GET_PAGE_CONTEXT" },
        (response) => {
          if (chrome.runtime.lastError || !response?.success) {
            resolve(fallback);
            return;
          }

          const context = response.context;

          resolve({
            domain: url.hostname,
            title: (context?.title || tab.title || "").slice(0, 200),
            pageContext: {
              headings: Array.isArray(context?.headings)
                ? context.headings.slice(0, 8)
                : [],
              fieldLabels: Array.isArray(context?.fieldLabels)
                ? context.fieldLabels.slice(0, 30)
                : [],
            },
          });
        }
      );
    });
  });
}

function requestCopilot(payload: CopilotPayload): Promise<CopilotResponse> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: "COPILOT_REQUEST", payload },
      (response) => {
        if (chrome.runtime.lastError) {
          resolve({
            success: false,
            error: "Could not contact CivicPilot's backend.",
          });
          return;
        }

        resolve(
          (response as CopilotResponse) || {
            success: false,
            error: "No response received from CivicPilot.",
          }
        );
      }
    );
  });
}

function requestVoice(text: string): Promise<VoiceResponse> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      {
        type: "VOICE_REQUEST",
        payload: { text },
      },
      (response) => {
        if (chrome.runtime.lastError) {
          resolve({
            success: false,
            error: "Could not contact the voice service.",
          });
          return;
        }

        resolve(
          response || {
            success: false,
            error: "No response received from the voice service.",
          }
        );
      }
    );
  });
}

export default function ChatThread() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: id(),
      role: "assistant",
      text: "Hi, I'm CivicPilot. I can locate fields on the current page and answer questions about navigating government portals.",
    },
  ]);

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [portal, setPortal] = useState<PortalContext | null>(null);
  const [voiceLoadingId, setVoiceLoadingId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState("");

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  function stopAudio() {
    audioRef.current?.pause();
    audioRef.current = null;

    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }

    setSpeakingId(null);
  }

  useEffect(() => {
    const refresh = () => {
      void getActivePortalContext().then(setPortal);
    };

    refresh();

    chrome.tabs.onActivated.addListener(refresh);

    const onUpdated = (
      _tabId: number,
      changeInfo: { status?: string; title?: string; url?: string },
      tab: chrome.tabs.Tab
    ) => {
      if (
        tab.active &&
        (changeInfo.status === "complete" ||
          typeof changeInfo.title === "string" ||
          typeof changeInfo.url === "string")
      ) {
        refresh();
      }
    };

    chrome.tabs.onUpdated.addListener(onUpdated);

    return () => {
      chrome.tabs.onActivated.removeListener(refresh);
      chrome.tabs.onUpdated.removeListener(onUpdated);

      audioRef.current?.pause();

      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    };
  }, []);

  async function listen(message: ChatMessage) {
    if (voiceLoadingId) return;

    if (speakingId === message.id) {
      stopAudio();
      return;
    }

    stopAudio();
    setVoiceError("");
    setVoiceLoadingId(message.id);

    try {
      const result = await requestVoice(message.text);

      if (!result.success || !result.audioBase64) {
        throw new Error(result.error || "Could not generate speech.");
      }

      const binary = atob(result.audioBase64);
      const bytes = new Uint8Array(binary.length);

      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      const url = URL.createObjectURL(
        new Blob([bytes], { type: "audio/mpeg" })
      );

      const audio = new Audio(url);

      audioRef.current = audio;
      audioUrlRef.current = url;

      const cleanup = () => {
        if (audioRef.current === audio) {
          audioRef.current = null;
          setSpeakingId(null);

          if (audioUrlRef.current === url) {
            URL.revokeObjectURL(url);
            audioUrlRef.current = null;
          }
        }
      };

      audio.onended = cleanup;

      audio.onerror = () => {
        cleanup();
        setVoiceError("Audio playback failed. Please try again.");
      };

      setSpeakingId(message.id);

      await audio.play();
    } catch (error) {
      stopAudio();

      setVoiceError(
        error instanceof Error
          ? error.message
          : "Voice assistance is temporarily unavailable."
      );
    } finally {
      setVoiceLoadingId(null);
    }
  }

  async function submit() {
    const q = query.trim();

    if (!q || loading) return;

    setQuery("");

    setMessages((previous) => [
      ...previous,
      { id: id(), role: "user", text: q },
    ]);

    setLoading(true);

    const started = performance.now();

    let intent: QueryIntent = "general_guidance";
    let success = false;
    let targetFieldId: string | undefined;
    let targetFieldName: string | undefined;
    let actionType: string | undefined;
    let portalDomain: string | undefined;
    let answer = "";

    try {
      const activePortal = await getActivePortalContext();

      setPortal(activePortal);
      portalDomain = activePortal?.domain;

      if (sensitiveIntent.test(q)) {
        intent = "security_sensitive";
        actionType = "blocked";

        answer =
          "For your security, please handle passwords, OTPs, CAPTCHA codes, and authentication PINs yourself. CivicPilot will not enter or bypass them.";
      } else if (locationIntent.test(q)) {
        intent = "field_location";

        const target = getTarget(q);

        if (!target) {
          answer = "Tell me the field name you want me to find.";
        } else {
          const result = await sendToActiveTab(target);

          if (result?.success && result.field) {
            success = true;
            targetFieldId = result.field.id;
            targetFieldName = result.field.name || result.field.label;
            actionType = "spotlight";

            answer = `I found the ${
              result.field.label || target
            } field and highlighted it.`;
          } else if (result?.reason === "content_script_unavailable") {
            answer =
              "I couldn't access this page. Refresh the webpage and try again. Chrome's internal pages and the Chrome Web Store do not allow this extension to inspect them.";
          } else if (result?.reason === "no_active_tab") {
            answer = "Open a webpage first, then ask me to locate a field.";
          } else {
            answer = `I couldn't confidently find "${target}" on this page. Try the exact field label or check that the field is visible.`;
          }
        }
      } else {
        if (!activePortal) {
          answer =
            "Please open a regular HTTP or HTTPS webpage before asking for portal guidance.";
        } else {
          const result = await requestCopilot({
            query: q,
            portal: activePortal,
          });

          if (result.success && result.answer) {
            console.log("[CivicPilot] Raw backend response:", result);
            console.log("[CivicPilot] Answer length:", result.answer.length);
            console.log(
              "[CivicPilot] Last 100 characters:",
              result.answer.slice(-100)
            );
          
            success = true;
            actionType = "guidance";
            answer = result.answer;
          }

          else {
            answer =
              result.error ||
              "AI guidance is temporarily unavailable. Please try again.";
          }
        }
      }
    } catch {
      answer = "I couldn't process that request. Please try again.";
    } finally {
      setMessages((previous) => [
        ...previous,
        { id: id(), role: "assistant", text: answer },
      ]);

      const event: TelemetryEvent = {
        eventType: "copilot_interaction",
        intent,
        targetFieldId,
        targetFieldName,
        actionType,
        success,
        responseTimeMs: Math.round(performance.now() - started),
        portalDomain,
      };

      chrome.runtime.sendMessage({
        type: "QUEUE_TELEMETRY",
        payload: event,
      });

      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-2">
        <p className="text-[9px] uppercase tracking-wider text-neutral-400">
          Current page
        </p>

        <p className="truncate text-[11px] font-medium">
          {portal?.domain || "No supported webpage detected"}
        </p>

        {portal?.title && (
          <p className="truncate text-[10px] text-neutral-500">
            {portal.title}
          </p>
        )}
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5">
        {messages.map((message) => (
          <div
            key={message.id}
            className={message.role === "user" ? "ml-8" : "mr-2"}
          >
            <span className="font-mono text-[8px] tracking-[0.12em] text-neutral-400">
              {message.role === "user" ? "YOU" : "CIVICPILOT"}
            </span>

            <div
              className={
                message.role === "user"
                  ? "mt-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-[12px] leading-5"
                  : "mt-2 rounded-xl border border-neutral-200 bg-white px-3 py-3 text-[12px] leading-5 shadow-sm"
              }
            >
              {message.role === "user" ? (
                <div className="whitespace-pre-wrap break-words">
                  {message.text}
                </div>
              ) : (
                <div className="break-words [&_h1]:mb-2 [&_h1]:mt-3 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:mt-3 [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:mb-1 [&_h3]:mt-2 [&_h3]:font-semibold [&_p]:mb-2 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1 [&_strong]:font-semibold [&_a]:break-all [&_a]:text-blue-600 [&_a]:underline [&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-neutral-300 [&_blockquote]:pl-3 [&_hr]:my-3 [&_hr]:border-neutral-200">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      a: ({ href, children }) => (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {children}
                        </a>
                      ),
                    }}
                  >
                    {message.text}
                  </ReactMarkdown>
                </div>
              )}
            </div>

            {message.role === "assistant" && (
              <button
                type="button"
                onClick={() => void listen(message)}
                disabled={voiceLoadingId !== null}
                className="mt-2 border border-neutral-300 px-2 py-1 text-[10px] hover:bg-neutral-100 disabled:opacity-50"
              >
                {voiceLoadingId === message.id
                  ? "Generating audio…"
                  : speakingId === message.id
                  ? "Stop audio"
                  : "Listen"}
              </button>
            )}
          </div>
        ))}

        {loading && (
          <div className="text-[11px] text-neutral-400">
            CivicPilot is thinking…
          </div>
        )}

        {voiceError && <p className="text-[11px] text-red-600">{voiceError}</p>}
      </div>

      <form
        className="border-t border-neutral-200 p-3"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="flex items-center gap-2 border border-black p-1">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ask about this page…"
            className="min-w-0 flex-1 bg-transparent px-2 py-2 text-[12px] outline-none placeholder:text-neutral-400"
          />

          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="bg-black px-3 py-2 text-[10px] text-white disabled:opacity-30"
          >
            Ask
          </button>
        </div>

        <p className="mt-2 text-center text-[9px] text-neutral-400">
          Only limited page metadata and your question are sent for AI guidance.
          Form values remain on the page.
        </p>
      </form>
    </main>
  );
}
