"use client";
import MorphOrb from "@/components/ui/ai-thiking-orb-and-input";
import { loadHelpBot } from "@/lib/helpbot-lazy";

/**
 * The thinking-orb component, answering with the site's own help bot.
 *
 * The bot answers from fixed intents (lib/helpbot.ts), so the orb can only say
 * what the site already says; anything it does not recognise gets the bot's
 * hand-off to a person.
 */
async function ask(text: string): Promise<string> {
  const bot = await loadHelpBot();
  return (bot.matchAnswer(text) ?? bot.BOT_FALLBACK).text;
}

export default function OrbDemo() {
  return (
    <div className="h-[560px]">
      <MorphOrb onSubmit={ask} copy={{ placeholder: "למשל: כמה זמן לוקח משלוח?" }} />
    </div>
  );
}
