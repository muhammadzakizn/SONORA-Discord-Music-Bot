"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Megaphone,
  Send,
  CheckCircle,
  AlertCircle,
  Users,
  Hash,
  Globe,
  AtSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

export default function BroadcastPage() {
  const [message, setMessage] = useState("");
  const [mentionType, setMentionType] = useState<"none" | "everyone" | "here">("none");
  const [allChannels, setAllChannels] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    sent: number;
    failed: number;
  } | null>(null);

  const handleSend = async () => {
    if (!message.trim()) return;
    
    setSending(true);
    setResult(null);
    
    try {
      const response = await api.broadcast(message, {
        all_channels: allChannels,
        mention_type: mentionType,
      });
      setResult(response);
      if (response.success) {
        setMessage("");
      }
    } catch (err) {
      setResult({ success: false, sent: 0, failed: 1 });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Megaphone className="w-8 h-8 text-purple-400" />
          Broadcast Message
        </h1>
        <p className="text-zinc-500 mt-2">
          Send announcements to all servers or specific channels
        </p>
      </div>

      {/* Message Input */}
      <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800">
        <label className="block text-sm font-medium text-zinc-400 mb-2">
          Message Content
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your broadcast message here..."
          rows={6}
          className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-colors resize-none"
        />
        <p className="text-xs text-zinc-600 mt-2">
          {message.length} / 2000 characters
        </p>
      </div>

      {/* Options */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Target Selection */}
        <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-cyan-400" />
            Target
          </h3>
          
          <label className="flex items-center gap-3 p-4 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={allChannels}
              onChange={(e) => setAllChannels(e.target.checked)}
              className="w-5 h-5 rounded bg-zinc-700 border-zinc-600 text-purple-500 focus:ring-purple-500"
            />
            <div>
              <p className="font-medium">All Channels</p>
              <p className="text-sm text-zinc-500">Send to every text channel in every server</p>
            </div>
          </label>
        </div>

        {/* Mention Type */}
        <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AtSign className="w-5 h-5 text-rose-400" />
            Mention
          </h3>
          
          <div className="space-y-2">
            {[
              { value: "none", label: "No Mention", desc: "Silent announcement" },
              { value: "here", label: "@here", desc: "Notify online members" },
              { value: "everyone", label: "@everyone", desc: "Notify all members" },
            ].map((option) => (
              <label
                key={option.value}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors",
                  mentionType === option.value
                    ? "bg-purple-500/20 border border-purple-500/30"
                    : "bg-zinc-800/50 hover:bg-zinc-800"
                )}
              >
                <input
                  type="radio"
                  name="mention"
                  value={option.value}
                  checked={mentionType === option.value}
                  onChange={(e) => setMentionType(e.target.value as any)}
                  className="w-4 h-4 text-purple-500 focus:ring-purple-500"
                />
                <div>
                  <p className="font-medium">{option.label}</p>
                  <p className="text-xs text-zinc-500">{option.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Result */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "p-4 rounded-xl flex items-center gap-3",
            result.success
              ? "bg-green-500/20 border border-green-500/30"
              : "bg-rose-500/20 border border-rose-500/30"
          )}
        >
          {result.success ? (
            <CheckCircle className="w-5 h-5 text-green-400" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400" />
          )}
          <div>
            <p className={result.success ? "text-green-400" : "text-rose-400"}>
              {result.success
                ? `Successfully sent to ${result.sent} channel(s)`
                : `Failed to send (${result.failed} errors)`}
            </p>
          </div>
        </motion.div>
      )}

      {/* Send Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSend}
          disabled={!message.trim() || sending}
          className={cn(
            "flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-lg transition-all",
            message.trim() && !sending
              ? "bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white"
              : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
          )}
        >
          {sending ? (
            <>
              <div className="spinner" />
              Sending...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Send Broadcast
            </>
          )}
        </button>
      </div>
    </div>
  );
}
