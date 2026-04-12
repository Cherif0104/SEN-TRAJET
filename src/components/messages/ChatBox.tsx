"use client";

import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useMessages } from "@/hooks/useMessages";
import { sendMessage } from "@/lib/messages";

type Props = {
  bookingId: string;
  currentUserId: string;
};

export function ChatBox({ bookingId, currentUserId }: Props) {
  const { messages, loading } = useMessages(bookingId);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await sendMessage(bookingId, currentUserId, text);
      setBody("");
    } catch (err) {
      console.error("Envoi message:", err);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-8">
        <p className="text-sm text-neutral-500">Chargement des messages…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-2">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-neutral-500">
            Aucun message. Envoyez le premier.
          </p>
        ) : (
          messages.map((m) => {
            const isMe = m.sender_id === currentUserId;
            return (
              <div
                key={m.id}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    isMe
                      ? "bg-primary text-white"
                      : "bg-neutral-200 text-neutral-900"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{m.body}</p>
                  <p
                    className={`mt-1 text-xs ${
                      isMe ? "text-primary-100" : "text-neutral-500"
                    }`}
                  >
                    {new Date(m.created_at).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSend}
        className="flex gap-2 border-t border-neutral-200 bg-white p-3"
      >
        <input
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Votre message…"
          className="flex-1 rounded-xl border-2 border-neutral-200 px-4 py-2 text-sm focus:border-primary focus:outline-none"
          maxLength={2000}
        />
        <Button type="submit" size="sm" disabled={!body.trim() || sending}>
          Envoyer
        </Button>
      </form>
    </div>
  );
}
