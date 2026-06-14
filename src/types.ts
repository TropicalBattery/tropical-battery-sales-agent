/** Messages received from Twilio ConversationRelay over the WebSocket. */
export type RelayInbound =
  | { type: "setup"; callSid?: string; from?: string; to?: string; [k: string]: unknown }
  | { type: "connected"; callSid?: string; streamSid?: string }
  | { type: "prompt"; voicePrompt: string; last?: boolean }
  | { type: "interrupt" }
  | { type: "dtmf"; digit: string }
  | { type: "error"; description?: string };

/** Messages we send back to Twilio. */
export type RelayOutbound =
  | { type: "text"; token: string; last: boolean }
  | { type: "interrupt" }
  | { type: "end"; reason?: string };

export interface LeadDraft {
  caller_phone?: string;
  name?: string;
  vehicle_or_equipment?: string;
  product_need?: string;
  urgency?: string;
  budget_range?: string;
  branch_of_interest?: string;
  preferred_callback?: string;
  notes_summary?: string;
  source?: string;
}

export interface ScoredLead extends LeadDraft {
  lead_score: number;
  lead_temperature: "hot" | "warm" | "cool" | "unqualified";
  routing: "sales-immediate" | "sales-next-business-day" | "nurture";
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: unknown; // string | Anthropic content blocks
}

export interface CallSession {
  callSid: string;
  from: string;
  startedAt: number;
  history: ChatTurn[];
  lead: LeadDraft;
  captured: boolean;
  interrupted: boolean;
}
