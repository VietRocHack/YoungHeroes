import { getCallMode } from "../lib/callMode";
import PracticeCallClassic from "./PracticeCallClassic";
import PracticeCallLive from "./PracticeCallLive";

// See docs/adr/0005-live-api-for-voice-call.md — the mode is picked on
// PracticeDecision.jsx and read once here; it's fine for it to not react to
// later toggle changes since a call in progress shouldn't switch flows
// under itself.
export default function PracticeCall() {
  return getCallMode() === "live" ? <PracticeCallLive /> : <PracticeCallClassic />;
}
