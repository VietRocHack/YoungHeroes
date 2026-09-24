import { Headphones } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { api } from "../lib/api";
import { startMicCapture, createPcmPlayer } from "../lib/liveAudio";
import PhoneFrame from "../components/PhoneFrame";
import MotionButton from "../components/MotionButton";

// See docs/adr/0005-live-api-for-voice-call.md — this used to be a
// record -> upload -> transcribe -> reply -> synthesize -> play cascade
// driven by explicit "Start Call"/"Stop Recording" taps. Now it's a
// persistent WebSocket streaming raw mic audio in and spoken audio back in
// real time, with barge-in, so there's no more turn-by-turn button to press.
const statusLabel = {
  connecting: "Connecting...",
  active: "Emergency Calling...",
  ended: "Call Ended",
  error: "Couldn't connect",
};

export default function PracticeCallLive() {
  const [status, setStatus] = useState("connecting");
  const [timer, setTimer] = useState(0);
  const navigate = useNavigate();

  const wsRef = useRef(null);
  const stopMicRef = useRef(null);
  const pcmPlayerRef = useRef(null);
  const endedRef = useRef(false);
  const timerRef = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      timerRef.current += 1;
      setTimer(timerRef.current);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const finishCall = (result) => {
      if (endedRef.current) return;
      endedRef.current = true;
      sessionStorage.setItem(
        "callResult",
        JSON.stringify({ duration: timerRef.current, naturalEnd: false, prankCall: false, ...result })
      );
      stopMicRef.current?.();
      pcmPlayerRef.current?.close();
      wsRef.current?.close();
      navigate("/practice/call/result");
    };

    const connect = async () => {
      try {
        const { data: callId } = await axios.get(api.newCall());
        if (cancelled) return;

        const ws = new WebSocket(api.callLive(callId));
        ws.binaryType = "arraybuffer";
        wsRef.current = ws;
        pcmPlayerRef.current = createPcmPlayer();

        ws.onopen = async () => {
          if (cancelled) return;
          try {
            stopMicRef.current = await startMicCapture((chunk) => {
              if (ws.readyState === WebSocket.OPEN) ws.send(chunk);
            });
            setStatus("active");
          } catch (err) {
            console.error("Microphone access denied", err);
            setStatus("error");
            ws.close();
          }
        };

        ws.onmessage = (event) => {
          if (typeof event.data === "string") {
            const message = JSON.parse(event.data);
            if (message.type === "interrupted") {
              pcmPlayerRef.current?.clear();
            } else if (message.type === "ended") {
              finishCall({ naturalEnd: message.naturalEnd, prankCall: message.isPrankCall });
            }
            return;
          }
          pcmPlayerRef.current?.enqueue(event.data);
        };

        ws.onerror = (err) => {
          console.error("Live call socket error", err);
        };

        ws.onclose = () => {
          // A clean end already navigated via the "ended" message above; an
          // unexpected drop still needs to land the child somewhere sane.
          finishCall({ naturalEnd: false, prankCall: false });
        };
      } catch (err) {
        console.error("Error starting call:", err);
        if (!cancelled) setStatus("error");
      }
    };

    connect();

    return () => {
      cancelled = true;
      stopMicRef.current?.();
      pcmPlayerRef.current?.close();
      wsRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEndCall = () => {
    if (endedRef.current) return;
    endedRef.current = true;
    sessionStorage.setItem(
      "callResult",
      JSON.stringify({ duration: timerRef.current, naturalEnd: false, prankCall: false })
    );
    stopMicRef.current?.();
    pcmPlayerRef.current?.close();
    wsRef.current?.close();
    navigate("/practice/call/result");
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <PhoneFrame className="bg-red-100">
      <div className="flex-1 p-6 flex flex-col">
        <div className="text-center mt-8">
          <h1 className="text-4xl text-black">911</h1>
          <h2 className="text-2xl font-semibold mt-1 text-red-400">
            {statusLabel[status]}
          </h2>
          <div className="text-xl text-red-400">{formatTime(timer)}</div>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="relative w-64 h-64">
            <div
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-200 rounded-full opacity-25 animate-pulse"
              style={{
                width: "311px",
                height: "311px",
                animationDelay: "0.2s",
              }}
            ></div>
            <div
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-300 rounded-full opacity-30 animate-pulse"
              style={{
                width: "256px",
                height: "256px",
                animationDelay: "0.4s",
              }}
            ></div>
            <div
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-400 rounded-full flex items-center justify-center opacity-65 animate-pulse"
              style={{ width: "191px", height: "191px" }}
            >
              <Headphones className="text-white animate-wiggle" size={70} />
            </div>
            <div className="absolute -top-24 -right-20 w-40 h-40 rounded-full">
              <img src="/assets/planet.png" alt="planet" className="w-50" />
            </div>
            <div className="absolute -bottom-12 -left-20 w-50 h-50 rounded-md transform rotate-12 flex items-center justify-center">
              <img src="/assets/ballon.png" alt="ballon" className="" />
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 pt-0 flex justify-center items-center">
        <MotionButton
          className="w-60 mb-8 bg-white text-gray-800 font-semibold py-3 px-4 rounded-full transition duration-300 ease-in-out shadow-xl"
          onClick={handleEndCall}
        >
          End Call
        </MotionButton>
      </div>
    </PhoneFrame>
  );
}
