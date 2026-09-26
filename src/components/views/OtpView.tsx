import React, { useState, useEffect, useRef } from "react";
import {
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Lock,
  Smartphone,
  Mail,
  CheckCircle2,
  AlertCircle,
  Wifi,
  WifiOff,
  MessageSquare,
} from "lucide-react";
import { MoasLogo } from "../MoasLogo";

interface OtpViewProps {
  phone?: string;
  email?: string;
  onVerifySuccess: () => void;
  onBackToRegister: () => void;
}

export const OtpView: React.FC<OtpViewProps> = ({
  phone = "",
  email = "",
  onVerifySuccess,
  onBackToRegister,
}) => {
  const [otpInputs, setOtpInputs] = useState<string[]>(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(300); // 5 minute TTL
  const [resendCooldown, setResendCooldown] = useState(30);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [dispatchNotice, setDispatchNotice] = useState<string | null>(null);
  const [smsSent, setSmsSent] = useState(false);
  const [smsError, setSmsError] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState(5);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const hasRequestedRef = useRef(false);

  // Send OTP via SMS once on mount (guarded against React StrictMode double-execution)
  useEffect(() => {
    if (phone && !hasRequestedRef.current) {
      hasRequestedRef.current = true;
      sendOtpSms(false);
    }
  }, [phone]);

  // Resend cooldown timer countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // OTP expiry countdown
  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  // Call the backend to generate and dispatch OTP via TextBee SMS
  const sendOtpSms = async (isExplicitResend = false) => {
    setIsSending(true);
    setSmsError(null);
    setVerificationError(null);
    setOtpInputs(["", "", "", "", "", ""]);
    setAttemptsRemaining(5);

    try {
      const response = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, resend: isExplicitResend }),
      });

      const result = await response.json();

      if (result.success) {
        if (result.smsSent) {
          setSmsSent(true);
          setDispatchNotice(`OTP sent via SMS to ${phone}. Please check your phone messages!`);
        } else {
          setSmsSent(false);
          setDispatchNotice(`SMS could not be delivered: ${result.message || "Gateway unavailable"}`);
          if (result.textbeeError) {
            setSmsError(result.textbeeError?.message || "SMS delivery failed");
          }
        }

        setTimer(300); // 5 min TTL
        setResendCooldown(30);
      } else {
        setSmsError(result.error || "Failed to send OTP");
        setDispatchNotice(`Failed to send OTP: ${result.error || "Service unavailable"}`);
      }
    } catch (err: any) {
      console.error("[OTP] Send error:", err);
      setSmsError(err.message || "Network error");
      setDispatchNotice("Network error. Could not reach OTP service.");
    } finally {
      setIsSending(false);
      // Auto-dismiss notice after 6 seconds
      setTimeout(() => setDispatchNotice(null), 6000);
      // Focus first input box
      setTimeout(() => inputRefs.current[0]?.focus(), 250);
    }
  };

  const handleChange = (index: number, value: string) => {
    // Only accept digits
    const cleaned = value.replace(/\D/g, "");
    if (!cleaned && value !== "") return;

    setVerificationError(null);

    const newInputs = [...otpInputs];
    newInputs[index] = cleaned.slice(-1);
    setOtpInputs(newInputs);

    // Auto-advance to next input box
    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!otpInputs[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Paste handler: allows pasting a 6-digit code anywhere
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length > 0) {
      const newInputs = [...otpInputs];
      pasted.split("").forEach((digit, i) => {
        if (i < 6) newInputs[i] = digit;
      });
      setOtpInputs(newInputs);
      setVerificationError(null);
      const focusIdx = Math.min(pasted.length, 5);
      inputRefs.current[focusIdx]?.focus();
    }
  };

  // Resend / generate new OTP via SMS
  const handleResendOtp = () => {
    if (resendCooldown > 0 || isSending) return;
    sendOtpSms(true);
  };

  // Verify OTP against the backend
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const enteredCode = otpInputs.join("");

    if (enteredCode.length < 6) {
      setVerificationError("Please enter all 6 digits of the verification code.");
      return;
    }

    if (timer <= 0) {
      setVerificationError("Verification code has expired. Please click 'Resend OTP'.");
      return;
    }

    setIsVerifying(true);
    setVerificationError(null);

    try {
      const response = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp: enteredCode }),
      });

      const result = await response.json();

      if (result.success && result.verified) {
        setIsSuccess(true);
        setTimeout(() => {
          setIsVerifying(false);
          onVerifySuccess();
        }, 600);
      } else if (result.success && !result.verified) {
        setIsVerifying(false);
        const rem = result.attemptsRemaining ?? Math.max(0, attemptsRemaining - 1);
        setAttemptsRemaining(rem);
        setVerificationError(
          result.message || (rem > 0 ? `Incorrect verification code. ${rem} attempt${rem === 1 ? "" : "s"} remaining.` : "Maximum attempts reached. Please request a new OTP.")
        );
      } else {
        setIsVerifying(false);
        setVerificationError(result.error || "Verification failed. Please try again.");
      }
    } catch (err: any) {
      setIsVerifying(false);
      setVerificationError("Network error. Please check your connection and try again.");
      console.error("[OTP] Verify error:", err);
    }
  };

  const maskedPhone = phone
    ? phone.replace(/(\+?\d{2,3})(\d{4})(\d{4})/, "$1 **** $3")
    : "+91 98437 67005";
  const maskedEmail = email
    ? email.replace(/(.{2})(.*)(@.*)/, "$1****$3")
    : "user@domain.com";

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between py-6">
      {/* Floating SMS Dispatch Notification Banner */}
      {dispatchNotice && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-lg bg-[#0F2E4D] text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-teal-500/40 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center shrink-0">
              {smsSent ? <Smartphone className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
            </div>
            <div>
              <p className="text-xs font-bold text-teal-300">
                {smsSent ? "SMS Sent to Your Phone" : "Notification"}
              </p>
              <p className="text-xs text-slate-200 mt-0.5">{dispatchNotice}</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="w-full max-w-5xl mx-auto px-4 flex items-center justify-between">
        <button
          onClick={onBackToRegister}
          className="flex items-center gap-2 cursor-pointer focus:outline-none"
        >
          <MoasLogo size="sm" showSubtitle={false} />
        </button>
        <button
          onClick={onBackToRegister}
          className="text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-800 flex items-center gap-1.5 cursor-pointer px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Registration
        </button>
      </header>

      {/* Main Verification Card */}
      <main className="w-full max-w-lg mx-auto px-4 my-6">
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl p-6 sm:p-10 text-center">
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-bold">
              Step 3 of 3
            </span>
            <span className="text-xs text-slate-500 font-medium">
              SMS OTP Verification
            </span>
          </div>

          <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto mb-4 shadow-sm border border-teal-100">
            <ShieldCheck className="w-7 h-7" />
          </div>

          <h1 className="text-2xl font-bold text-slate-900">
            Verify Your Mobile Number
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-2">
            Enter the 6-digit verification code sent via SMS to your phone to complete your account registration.
          </p>

          {/* Masked destination badges */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-full text-xs font-semibold text-slate-800">
              <Smartphone className="w-3.5 h-3.5 text-teal-700" />
              {maskedPhone}
            </span>
            {email && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-full text-xs font-semibold text-slate-800">
                <Mail className="w-3.5 h-3.5 text-teal-700" />
                {maskedEmail}
              </span>
            )}
            <button
              onClick={onBackToRegister}
              className="text-xs text-teal-700 hover:text-teal-800 underline font-semibold cursor-pointer ml-1"
            >
              Change
            </button>
          </div>

          {/* SMS Status Indicator */}
          <div className="mt-4 flex items-center justify-center gap-2">
            {isSending ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full text-xs font-semibold text-amber-800">
                <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-amber-700 rounded-full animate-spin" />
                Dispatching SMS to your phone...
              </span>
            ) : smsSent ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-xs font-semibold text-emerald-800">
                <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                SMS sent to your mobile phone
              </span>
            ) : smsError ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-full text-xs font-semibold text-rose-800">
                <WifiOff className="w-3.5 h-3.5 text-rose-600" />
                SMS issue — click Resend below
              </span>
            ) : null}
          </div>

          {/* Error notice */}
          {verificationError && (
            <div className="mt-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold text-left flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p>{verificationError}</p>
                {attemptsRemaining <= 0 && (
                  <p className="mt-1 text-[11px] text-rose-700 font-normal">
                    Please click "Resend OTP" below to receive a fresh verification code.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Success notice */}
          {isSuccess && (
            <div className="mt-5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-2 animate-in zoom-in-95">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>OTP Verified Successfully! Launching your workspace...</span>
            </div>
          )}

          {/* OTP inputs form */}
          <form onSubmit={handleVerify} className="mt-6">
            <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
              {otpInputs.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => (inputRefs.current[idx] = el)}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  disabled={isSuccess || isVerifying}
                  className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-2xl font-black text-slate-800 bg-slate-50 border-2 rounded-xl focus:bg-white focus:outline-none transition-all shadow-inner ${
                    verificationError
                      ? "border-rose-300 focus:border-rose-500"
                      : "border-slate-200 focus:border-teal-600"
                  }`}
                />
              ))}
            </div>

            {/* Timer and Resend section */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2 border-t border-slate-100 pt-4">
              <div>
                {timer > 0 ? (
                  <span>
                    Expires in:{" "}
                    <span className="font-bold text-slate-800">{formatTimer(timer)}</span>
                  </span>
                ) : (
                  <span className="text-rose-600 font-bold">Code has expired</span>
                )}
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || isSending}
                  className="inline-flex items-center gap-1.5 font-bold text-teal-700 hover:text-teal-900 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isSending ? "animate-spin" : ""}`} />
                  <span>
                    {isSending
                      ? "Sending SMS..."
                      : resendCooldown > 0
                      ? `Resend OTP in ${resendCooldown}s`
                      : "Resend OTP via SMS"}
                  </span>
                </button>
              </div>
            </div>

            {/* Verify button */}
            <button
              type="submit"
              disabled={isVerifying || isSuccess || timer <= 0 || otpInputs.join("").length < 6}
              className="w-full mt-6 py-3.5 px-4 bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isVerifying ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Verify OTP & Launch Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Security Guarantee */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-slate-400 text-xs">
            <Lock className="w-3.5 h-3.5 text-teal-600" />
            <span>Encrypted SMS Delivery · Code valid for 5 minutes · Maximum 5 attempts</span>
          </div>
        </div>
      </main>

      <footer className="text-center text-xs text-slate-400">
        © {new Date().getFullYear()} MOAS. All rights reserved. | SMS Gateway powered by textbee.dev
      </footer>
    </div>
  );
};
