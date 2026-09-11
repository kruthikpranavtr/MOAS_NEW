import React, { useState, useEffect, useRef } from "react";
import {
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Lock,
  Sparkles,
  Smartphone,
  Mail,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
} from "lucide-react";
import { MoasLogo } from "../MoasLogo";

interface OtpViewProps {
  phone?: string;
  email?: string;
  onVerifySuccess: () => void;
  onBackToRegister: () => void;
}

// Function to generate a guaranteed unique 6-digit OTP different from the previous one
const generateUniqueOtp = (excludeOtp?: string): string => {
  let newOtp = "";
  do {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    newOtp = randomNum.toString();
  } while (newOtp === excludeOtp);
  return newOtp;
};

export const OtpView: React.FC<OtpViewProps> = ({
  phone = "",
  email = "",
  onVerifySuccess,
  onBackToRegister,
}) => {
  const [activeOtp, setActiveOtp] = useState<string>(() => generateUniqueOtp());
  const [otpInputs, setOtpInputs] = useState<string[]>(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(30);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dispatchNotice, setDispatchNotice] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input on mount & announce initial OTP dispatch
  useEffect(() => {
    inputRefs.current[0]?.focus();
    setDispatchNotice(`A secure 6-digit code (${activeOtp}) was sent to your contacts.`);
    const timeout = setTimeout(() => setDispatchNotice(null), 7000);
    return () => clearTimeout(timeout);
  }, []);

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleChange = (index: number, value: string) => {
    // Only allow numbers
    if (!/^\d*$/.test(value)) return;
    setVerificationError(null);

    const newInputs = [...otpInputs];
    newInputs[index] = value.slice(-1);
    setOtpInputs(newInputs);

    // Auto advance to next box
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpInputs[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Generate a different OTP
  const handleGenerateDifferentOtp = () => {
    const freshOtp = generateUniqueOtp(activeOtp);
    setActiveOtp(freshOtp);
    setOtpInputs(["", "", "", "", "", ""]);
    setTimer(30);
    setVerificationError(null);
    setDispatchNotice(`New security code generated: ${freshOtp}`);
    inputRefs.current[0]?.focus();

    setTimeout(() => {
      setDispatchNotice(null);
    }, 6000);
  };

  // Quick auto-fill current active OTP
  const handleAutoFill = () => {
    const digits = activeOtp.split("");
    setOtpInputs(digits);
    setVerificationError(null);
    inputRefs.current[5]?.focus();
  };

  // Copy OTP to clipboard
  const handleCopyOtp = () => {
    navigator.clipboard.writeText(activeOtp);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const enteredCode = otpInputs.join("");

    if (enteredCode.length < 6) {
      setVerificationError("Please enter all 6 digits of the OTP.");
      return;
    }

    setIsVerifying(true);
    setVerificationError(null);

    setTimeout(() => {
      if (enteredCode === activeOtp) {
        setIsSuccess(true);
        setTimeout(() => {
          setIsVerifying(false);
          onVerifySuccess();
        }, 800);
      } else {
        setIsVerifying(false);
        setVerificationError(
          `Incorrect OTP entered (${enteredCode}). The current active security code is ${activeOtp}. Please enter the code or generate a different one.`
        );
      }
    }, 600);
  };

  const maskedPhone = phone
    ? phone.replace(/(\d{2})(\d{4})(\d{4})/, "$1 **** $3")
    : "+91 98****4210";
  const maskedEmail = email
    ? email.replace(/(.{2})(.*)(@.*)/, "$1****$3")
    : "kr****@moas.internal";

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between py-6">
      {/* Floating Simulated SMS/Email Notification Banner */}
      {dispatchNotice && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-lg bg-[#0F2E4D] text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-teal-500/40 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-teal-300">Live SMS & Email Security Dispatch</p>
              <p className="text-xs text-slate-200 mt-0.5">
                Verification Code: <span className="font-mono font-extrabold text-white tracking-widest text-sm bg-teal-900/60 px-2 py-0.5 rounded-md">{activeOtp}</span>
              </p>
            </div>
          </div>
          <button
            onClick={handleAutoFill}
            className="text-xs font-bold bg-teal-500 hover:bg-teal-400 text-slate-900 px-3 py-1.5 rounded-xl cursor-pointer shrink-0 transition-colors shadow-sm"
          >
            Auto-fill
          </button>
        </div>
      )}

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

      <main className="w-full max-w-lg mx-auto px-4 my-6">
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl p-6 sm:p-10 text-center">
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-bold">
              Step 3 of 3
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Permanent Identity & OTP Verification
            </span>
          </div>

          <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-7 h-7" />
          </div>

          <h1 className="text-2xl font-bold text-slate-900">
            Verify Your Security Code
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-2">
            Enter the 6-digit one-time password dispatched to your registered contacts:
          </p>

          {/* Masked destination badges */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-800">
              <Smartphone className="w-3.5 h-3.5 text-teal-700" />
              {maskedPhone}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-800">
              <Mail className="w-3.5 h-3.5 text-teal-700" />
              {maskedEmail}
            </span>
            <button
              onClick={onBackToRegister}
              className="text-xs text-teal-700 hover:text-teal-800 underline font-semibold cursor-pointer ml-1"
            >
              Edit
            </button>
          </div>

          {/* Dedicated Active Code Dispatch Box with Real-Time Dynamic Code */}
          <div className="mt-6 p-4 bg-gradient-to-br from-teal-50/80 via-white to-slate-50 border-2 border-teal-200/80 rounded-2xl text-left shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-bold text-teal-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                Live Dispatched OTP Code
              </span>
              <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active
              </span>
            </div>

            <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-teal-100">
              <div className="flex items-center gap-2">
                <span className="font-mono text-2xl sm:text-3xl font-black text-slate-900 tracking-[0.25em]">
                  {activeOtp}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopyOtp}
                  title="Copy OTP"
                  className="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={handleAutoFill}
                  className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Fill Code</span>
                </button>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs pt-1 border-t border-teal-100/60">
              <span className="text-slate-500 text-[11px]">
                Need a different code?
              </span>
              <button
                type="button"
                onClick={handleGenerateDifferentOtp}
                className="inline-flex items-center gap-1 font-bold text-teal-700 hover:text-teal-900 cursor-pointer text-xs transition-colors"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Generate Different OTP</span>
              </button>
            </div>
          </div>

          {/* Error notice if validation fails */}
          {verificationError && (
            <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold text-left flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p>{verificationError}</p>
                <button
                  type="button"
                  onClick={handleAutoFill}
                  className="text-teal-700 underline font-bold mt-1 inline-block cursor-pointer"
                >
                  Auto-fill active code ({activeOtp})
                </button>
              </div>
            </div>
          )}

          {/* Success notice */}
          {isSuccess && (
            <div className="mt-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-2 animate-in zoom-in-95">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>OTP Verified Successfully! Initializing your workspace...</span>
            </div>
          )}

          {/* OTP inputs form */}
          <form onSubmit={handleVerify} className="mt-6">
            <div className="flex justify-center gap-2 sm:gap-3">
              {otpInputs.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => (inputRefs.current[idx] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  disabled={isSuccess || isVerifying}
                  className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold text-slate-800 bg-slate-50 border-2 rounded-xl focus:bg-white focus:outline-none transition-all ${
                    verificationError
                      ? "border-rose-300 focus:border-rose-500"
                      : "border-slate-200 focus:border-teal-600"
                  }`}
                />
              ))}
            </div>

            {/* Countdown / Resend */}
            <div className="mt-5 text-xs text-slate-500">
              {timer > 0 ? (
                <span>
                  Resend OTP in{" "}
                  <span className="font-bold text-slate-800">
                    00:{timer < 10 ? `0${timer}` : timer}
                  </span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleGenerateDifferentOtp}
                  className="inline-flex items-center gap-1 font-bold text-teal-700 hover:text-teal-800 cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  Resend New OTP Now
                </button>
              )}
            </div>

            {/* Verify button */}
            <button
              type="submit"
              disabled={isVerifying || isSuccess}
              className="w-full mt-6 py-3 px-4 bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
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

          {/* Trust Badge */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-slate-400 text-xs">
            <Lock className="w-3.5 h-3.5 text-teal-600" />
            <span>Strict authentication active. Only verified accounts can access MOAS.</span>
          </div>
        </div>
      </main>

      <footer className="text-center text-xs text-slate-400">
        © {new Date().getFullYear()} MOAS. All rights reserved.
      </footer>
    </div>
  );
};
