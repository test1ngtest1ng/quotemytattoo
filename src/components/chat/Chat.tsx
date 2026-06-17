"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/image";
import { ReportButton } from "@/components/ReportButton";

type Msg = {
  id: string;
  sender_id: string | null;
  body: string;
  created_at: string;
  image_url?: string | null;
};

export function Chat({
  conversationId,
  currentUserId,
  initialMessages = [],
  placeholder = "Write a message…",
}: {
  conversationId: string;
  currentUserId: string;
  initialMessages?: Msg[];
  placeholder?: string;
}) {
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const supabase = createClient();
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  useEffect(() => {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const m = payload.new as Msg;
          setMessages((cur) => (cur.some((x) => x.id === m.id) ? cur : [...cur, m]));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  function pushOwn(data: Msg) {
    setMessages((cur) => (cur.some((x) => x.id === data.id) ? cur : [...cur, data]));
  }

  // Tell the server to email the other participant (fire-and-forget; debounced
  // server-side so an active conversation doesn't spam their inbox).
  function notify(messageId: string) {
    fetch("/api/messages/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, messageId }),
    }).catch(() => {});
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setText("");
    const { data, error } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, sender_id: currentUserId, body })
      .select("id, sender_id, body, created_at, image_url")
      .single();
    if (!error && data) {
      pushOwn(data);
      notify(data.id);
    } else if (error) setText(body);
    setSending(false);
  }

  async function sendImage(original: File) {
    if (sending) return;
    setSending(true);
    try {
      const file = await compressImage(original);
      const ext = file.type === "image/webp" ? "webp" : file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${conversationId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("chat-images")
        .upload(path, file, { contentType: file.type || undefined });
      if (upErr) throw upErr;
      const url = supabase.storage.from("chat-images").getPublicUrl(path).data.publicUrl;
      const { data, error } = await supabase
        .from("messages")
        .insert({ conversation_id: conversationId, sender_id: currentUserId, body: "", image_url: url })
        .select("id, sender_id, body, created_at, image_url")
        .single();
      if (!error && data) {
        pushOwn(data);
        notify(data.id);
      }
    } catch {
      /* upload failed - silently ignore (user can retry) */
    }
    setSending(false);
  }

  return (
    <div className="flex flex-col rounded-[14px] border border-line bg-white">
      <div className="max-h-80 min-h-40 flex-1 space-y-2 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="py-8 text-center text-sm text-muted">No messages yet. Say hello 👋</p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === currentUserId;
          const imageOnly = !!m.image_url && !m.body;
          return (
            <div key={m.id} className={`group flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`flex max-w-[80%] flex-col ${mine ? "items-end" : "items-start"}`}>
                <div
                  className={`overflow-hidden rounded-[14px] text-sm ${imageOnly ? "p-1" : "px-3.5 py-2"} ${
                    mine ? "bg-violet text-white" : "bg-[#f1ecf5] text-ink"
                  }`}
                >
                  {m.image_url && (
                    <a href={m.image_url} target="_blank" rel="noreferrer" className="block">
                      <img src={m.image_url} alt="Shared image" className="max-h-56 w-auto rounded-[10px]" loading="lazy" />
                    </a>
                  )}
                  {m.body && <div className={`whitespace-pre-wrap ${m.image_url ? "mt-1.5 px-2 pb-1" : ""}`}>{m.body}</div>}
                </div>
                {!mine && m.sender_id && (
                  <span className="mt-0.5 opacity-0 transition group-hover:opacity-100">
                    <ReportButton targetType="message" targetId={m.id} isLoggedIn label="Report" className="report-link !text-[11px]" />
                  </span>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} className="flex items-center gap-2 border-t border-line p-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) sendImage(f);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={sending}
          aria-label="Attach an image"
          className="flex h-10 w-10 flex-none items-center justify-center rounded-[10px] border border-line text-muted transition hover:border-violet hover:text-violet disabled:opacity-50"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          className="flex-1 rounded-[10px] border border-line px-4 py-2.5 outline-none focus:border-violet focus:ring-2 focus:ring-violet/20"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="rounded-[10px] bg-violet px-5 py-2.5 font-semibold text-white transition hover:bg-violet-dark disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
