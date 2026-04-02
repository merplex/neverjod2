import { useEffect, useRef, useState } from "react";
import { lk } from "../utils/ledgerStorage";
import { Mic } from "lucide-react";
import { parseVoiceInput } from "../utils/keywordMatch";

interface RecordingProps {
  onTranscript?: (text: string) => void;
  onVoiceInput?: (data: { categoryId?: string; accountId?: string; amount?: number; description: string }) => void;
  onVoiceEnd?: () => void;
  startTrigger?: number;
  stopTrigger?: number;
  autoRestart?: boolean;
}

function readSilenceDelay(): number {
  try {
    const s = JSON.parse(localStorage.getItem(lk("app_settings")) || "{}");
    return typeof s.voiceInputDelay === "number" ? s.voiceInputDelay * 1000 : 3500;
  } catch { return 3500; }
}

// Reads user's chosen voice language from Settings (used on both iOS and Android)
function readVoiceLang(): string {
  try {
    const s = JSON.parse(localStorage.getItem(lk("app_settings")) || "{}");
    const lang = s.voiceLang;
    if (lang === "auto") return navigator.language || "th-TH";
    if (typeof lang === "string" && lang.length > 0) return lang;
    return "th-TH";
  } catch { return "th-TH"; }
}

const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

// iOS: accumulate fields across multiple final results (SFSpeechRecognizer splits sentences)
type MergedVoiceData = { categoryId?: string; accountId?: string; amount?: number; description: string };

export default function Recording({ onTranscript, onVoiceInput, onVoiceEnd, startTrigger, stopTrigger, autoRestart }: RecordingProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isListeningRef = useRef(false);
  const speechStartTimeoutRef = useRef<NodeJS.Timeout>();
  const hasSpeechStartedRef = useRef(false);
  const silenceTimeoutRef = useRef<NodeJS.Timeout>();
  const onVoiceInputRef = useRef(onVoiceInput);
  const onVoiceEndRef = useRef(onVoiceEnd);
  const onTranscriptRef = useRef(onTranscript);
  const autoRestartRef = useRef(autoRestart);
  const manualStopRef = useRef(false);
  // iOS only — accumulates best-matched fields across multiple final results
  const iosMergedRef = useRef<MergedVoiceData>({ description: "" });
  // Android only — last interim result containing Thai unit words (before ASR normalizes to digits)
  const androidThaiInterimRef = useRef<string>("");

  useEffect(() => { onVoiceInputRef.current = onVoiceInput; }, [onVoiceInput]);
  useEffect(() => { onVoiceEndRef.current = onVoiceEnd; }, [onVoiceEnd]);
  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);
  useEffect(() => { autoRestartRef.current = autoRestart; }, [autoRestart]);

  // Stop when stopTrigger increments
  useEffect(() => {
    if (!stopTrigger || !recognitionRef.current || !isListeningRef.current) return;
    manualStopRef.current = true;
    recognitionRef.current.stop();
  }, [stopTrigger]);

  // Auto-start when startTrigger increments
  useEffect(() => {
    if (!startTrigger || !recognitionRef.current || isListeningRef.current) return;
    try {
      hasSpeechStartedRef.current = false;
      iosMergedRef.current = { description: "" };
      setIsListening(true);
      isListeningRef.current = true;
      try { recognitionRef.current.start(); } catch {
        setIsListening(false);
        isListeningRef.current = false;
      }
    } catch {
      setIsListening(false);
      isListeningRef.current = false;
    }
  }, [startTrigger]);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition ||
      (window as any).mozSpeechRecognition ||
      (window as any).msSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    setIsSupported(true);

    const resetSilenceTimer = () => {
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = setTimeout(() => {
        if (isListeningRef.current && hasSpeechStartedRef.current) {
          hasSpeechStartedRef.current = false;
          if (onVoiceEndRef.current) onVoiceEndRef.current();
        }
      }, readSilenceDelay());
    };

    // ── Language ─────────────────────────────────────────────────────────────
    // Both iOS and Android read language from Settings
    const lang = readVoiceLang();

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;
    // Android: request extra alternatives — Thai text sometimes appears in lower-ranked results
    // even when the top result has been normalized to digits
    if (!isIOSDevice) recognition.maxAlternatives = 7;

    recognition.onstart = () => {
      console.log("[voice] started, platform:", isIOSDevice ? "iOS" : "Android");
      hasSpeechStartedRef.current = false;
      iosMergedRef.current = { description: "" };
      androidThaiInterimRef.current = "";
    };

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const isFinal = event.results[i].isFinal;
        const transcriptPart = event.results[i][0].transcript;

        if (isIOSDevice) {
          // ── iOS Early Exit: process interim results too ──
          // Parse interim to accumulate keywords as soon as they appear
          hasSpeechStartedRef.current = true;
          const voiceData = parseVoiceInput(transcriptPart);

          // Each utterance is treated independently — amount from current transcriptPart only.
          // Falls back to previously detected amount if current utterance has no number.
          const merged: MergedVoiceData = {
            description: transcriptPart,
            accountId:   voiceData.accountId   ?? iosMergedRef.current.accountId,
            categoryId:  voiceData.categoryId  ?? iosMergedRef.current.categoryId,
            amount:      voiceData.amount      ?? iosMergedRef.current.amount,
          };
          iosMergedRef.current = merged;

          if (onTranscriptRef.current) onTranscriptRef.current(transcriptPart);
          if (onVoiceInputRef.current) onVoiceInputRef.current({ ...merged });

          // Early exit: all 3 keywords found → stop immediately, no need to wait for isFinal
          if (merged.categoryId && merged.accountId && merged.amount) {
            console.log("[voice] iOS early exit — all keywords found:", merged);
            manualStopRef.current = true;
            recognition.stop();
            if (onVoiceEndRef.current) onVoiceEndRef.current();
            return;
          }

          if (isFinal) {
            console.log("[voice] iOS final:", transcriptPart);
            resetSilenceTimer();
          }
        } else {
          // ── Android ──
          // Android ASR normalizes Thai number words to digits in the FINAL result
          // (e.g. "สามหมื่นสองร้อยห้าสิบ" → "3250" instead of "30250").
          // Interim results arrive BEFORE normalization and still contain Thai unit words.
          // So we capture the last interim that has Thai units and use it for amount parsing.
          const hasThaiUnits = /แสน|หมื่น|พัน|ร้อย|สิบ|ล้าน/.test(transcriptPart);
          if (!isFinal) {
            if (hasThaiUnits) {
              androidThaiInterimRef.current = transcriptPart;
              console.log("[voice] Android interim Thai:", transcriptPart);
            }
            continue;
          }
          // Check all alternatives for Thai unit words — Android normalizes the top result
          // to digits but may still provide the original Thai text as a lower-ranked alternative
          const resultItem = event.results[i];
          let thaiAlt: string | undefined;
          for (let k = 0; k < resultItem.length; k++) {
            const alt = resultItem[k].transcript;
            if (/แสน|หมื่น|พัน|ร้อย|สิบ|ล้าน/.test(alt)) { thaiAlt = alt; break; }
          }
          console.log("[voice] final:", transcriptPart, "| alternatives:", Array.from({ length: resultItem.length }, (_, k) => resultItem[k].transcript));
          hasSpeechStartedRef.current = true;
          if (onTranscriptRef.current) onTranscriptRef.current(transcriptPart);
          // Priority: Thai alternative > Thai interim > final digit text
          const textForAmount = thaiAlt ?? androidThaiInterimRef.current ?? transcriptPart;
          androidThaiInterimRef.current = "";
          const voiceData = parseVoiceInput(transcriptPart);
          const amountFromThai = parseVoiceInput(textForAmount).amount;
          const merged = { ...voiceData, amount: amountFromThai ?? voiceData.amount };
          console.log("[voice] Android merged:", merged, "| Thai source:", textForAmount);
          if (onVoiceInputRef.current) onVoiceInputRef.current(merged);
          resetSilenceTimer();
        }
      }
    };

    recognition.onend = () => {
      console.log("[voice] ended");
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = undefined;
      }

      const hadSpeech = hasSpeechStartedRef.current;
      hasSpeechStartedRef.current = false;

      if (hadSpeech && onVoiceEndRef.current) onVoiceEndRef.current();

      if (isListeningRef.current && !manualStopRef.current && autoRestartRef.current) {
        try { recognition.start(); return; } catch (e) {
          console.error("[voice] auto-restart failed:", e);
        }
      }

      manualStopRef.current = false;

      if (isListeningRef.current) {
        setIsListening(false);
        isListeningRef.current = false;
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === "aborted") return;
      if (event.error === "no-speech") return;
      console.error("[voice] error:", event.error);
      setIsListening(false);
      isListeningRef.current = false;
    };

    recognitionRef.current = recognition;

    const handleBlur = () => {
      if (isListeningRef.current && recognition) {
        manualStopRef.current = true;
        recognition.stop();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && isListeningRef.current && recognition) {
        manualStopRef.current = true;
        recognition.stop();
      }
    };

    window.addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      manualStopRef.current = true;
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (recognition) recognition.stop();
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    };
  }, []);

  const handleToggleListening = () => {
    if (!recognitionRef.current) return;

    try {
      if (isListeningRef.current) {
        manualStopRef.current = true;
        recognitionRef.current.stop();
      } else {
        hasSpeechStartedRef.current = false;
        iosMergedRef.current = { description: "" };

        if (speechStartTimeoutRef.current) {
          clearTimeout(speechStartTimeoutRef.current);
          speechStartTimeoutRef.current = undefined;
        }

        setIsListening(true);
        isListeningRef.current = true;

        const doStart = () => {
          try { recognitionRef.current.start(); } catch (e) {
            console.error("[voice] start failed:", (e as Error).message);
            setIsListening(false);
            isListeningRef.current = false;
          }
        };

        if (isIOSDevice) {
          // iOS: call start() directly — getUserMedia breaks gesture context in WKWebView
          doStart();
        } else {
          // Android: pre-grant mic permission before starting recognition
          if (navigator.mediaDevices?.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ audio: true })
              .then(stream => { stream.getTracks().forEach(t => t.stop()); doStart(); })
              .catch(err => {
                console.error("[voice] mic denied:", err.name);
                setIsListening(false);
                isListeningRef.current = false;
              });
          } else {
            doStart();
          }
        }
      }
    } catch (error) {
      console.error("[voice] toggle error:", (error as Error).message);
      setIsListening(false);
      isListeningRef.current = false;
    }
  };

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  if (!isSupported) {
    return (
      <div ref={containerRef}>
        <button disabled className="relative p-2 rounded-lg text-slate-300 cursor-not-allowed">
          <Mic size={24} />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative z-10">
      <button
        onClick={handleToggleListening}
        disabled={!isSupported}
        className={`relative p-2 rounded-lg transition-colors focus:outline-none focus:bg-transparent ${
          isListening ? "text-red-500 bg-red-50" : "text-slate-600 active:bg-slate-200"
        } disabled:cursor-not-allowed disabled:opacity-50`}
        title={isListening ? "Stop recording" : "Start recording"}
      >
        <Mic size={24} />
        {isListening && (
          <div className="absolute inset-0 rounded-full border-2 border-red-500 opacity-40 animate-ping" style={{ animationDuration: "1.5s" }} />
        )}
      </button>
    </div>
  );
}
