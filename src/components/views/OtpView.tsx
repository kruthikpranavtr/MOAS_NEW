import React, { useState, useEffect, useRef } from "react";
import { ShieldCheck, ArrowLeft, ArrowRight, RotateCw, Lock, Sparkles } from "lucide-react";
import { MoasLogo } from "../MoasLogo";

interface OtpViewProps {
  phone?: string;
  email?: string;
  onVerifySuccess: () => void;
  onBackToRegister: () => void;
}

export const OtpView: React.FC<OtpViewProps> = ({
  phone = "+91 98765 43210",
  email = "arun.kumar@email.com",
  onVerifySuccess,
  onBackToRegister,
}) => {
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(45);
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus();

    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto advance
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = () => {
    if (timer === 0) {
      setTimer(45);
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    }
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      onVerifySuccess();
    }, 600);
  };

  // Pre-fill demo OTP button
  const handleAutoFillDemo = () => {
    setOtp(["5", "8", "2", "9", "4", "0"]);
  };

  const maskedPhone = phone.replace(/(\d{2})(\d{4})(\d{4})/, "$1 **** $3");
  const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, "$1****$3");

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between py-6">
      <header className="w-full max-w-5xl mx-auto px-4 flex items-center justify-between">
        <button
          onClick={onBackToRegister}
          className="flex items-center gap-2 cursor-pointer focus:outline-none"
        >
          <MoasLogo size="sm" showSubtitle={false} />
        </button>
        <button
          onClick={onBackToRegister}
          className="text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-800 flex items-center gap-1.5 cursor-pointer px-3 py-1.5 rounded-xl hover:bg-slate-100"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Account Details
        </button>
      </header>

      <main className="w-full max-w-md mx-auto px-4 my-6">
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl p-8 sm:p-10 text-center">
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-bold">
              Step 3 of 3
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Two-Factor OTP Security
            </span>
          </div>

          <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-7 h-7" />
          </div>

          <h1 className="text-2xl font-bold text-slate-900">
            Verify Your Identity
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-2">
            Enter the 6-digit security code sent to your registered contacts:
          </p>

          {/* Masked credentials with Edit action */}
          <div className="mt-3 flex flex-col sm:flex-row items-center justify-center gap-2">
            <span className="px-3 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-800">
              📱 {maskedPhone}
            </span>
            <span className="px-3 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-800">
              ✉️ {maskedEmail}
            </span>
            <button
              onClick={onBackToRegister}
              className="text-xs text-teal-700 hover:text-teal-800 underline font-semibold cursor-pointer"
            >
              Edit
            </button>
          </div>

          {/* OTP inputs form */}
          <form onSubmit={handleVerify} className="mt-8">
            <div className="flex justify-center gap-2 sm:gap-3">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => (inputRefs.current[idx] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold text-slate-800 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-teal-600 focus:bg-white focus:outline-none transition-all"
                />
              ))}
            </div>

            {/* Quick autofill helper */}
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={handleAutoFillDemo}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200 text-xs font-semibold hover:bg-teal-100 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                <span>Auto-fill Demo Code (582940)</span>
              </button>
            </div>

            {/* Countdown / Resend */}
            <div className="mt-6 text-xs text-slate-500">
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
                  onClick={handleResend}
                  className="inline-flex items-center gap-1 font-bold text-teal-700 hover:text-teal-800 cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  Resend OTP Now
                </button>
              )}
            </div>

            {/* Verify button */}
            <button
              type="submit"
              disabled={isVerifying}
              className="w-full mt-6 py-3 px-4 bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
            >
              {isVerifying ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Verify OTP & Access MOAS</span>
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
