import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, CheckCircle, ArrowLeft } from "lucide-react";
import { authAPI } from "../services/api";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState<"email-code" | "password">("email-code");

  const handleSubmitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      // Just validate code format - actual verification happens on password reset
      if (!email || !code) {
        setError("Please enter both email and reset code");
        setLoading(false);
        return;
      }
      if (code.length !== 6) {
        setError("Reset code must be 6 digits");
        setLoading(false);
        return;
      }
      setStep("password");
    } finally {
      setLoading(false);
    }
  };

  const validatePassword = () => {
    if (!password) {
      setError("Please enter a new password");
      return false;
    }
    if (password.length < 12) {
      setError("Password must be at least 12 characters");
      return false;
    }
    if (!/[A-Z]/.test(password)) {
      setError("Password must contain at least one uppercase letter");
      return false;
    }
    if (!/[0-9]/.test(password)) {
      setError("Password must contain at least one number");
      return false;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    return true;
  };

  const handleSubmitPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePassword()) {
      return;
    }

    setLoading(true);
    setError("");
    try {
      await authAPI.resetPassword(email, code, password);
      setSuccess(true);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full px-4 py-6 bg-gradient-to-br from-yellow-50 via-yellow-100/50 to-white overflow-hidden">
      <div className="w-full max-w-[420px] flex flex-col items-center md:bg-white md:rounded-2xl md:shadow-lg md:px-10 md:py-10">
        {!success ? (
          <>
            <button
              onClick={() => navigate("/login")}
              className="self-start mb-4 flex items-center gap-1 text-yellow-700 hover:text-yellow-800 text-sm font-medium"
            >
              <ArrowLeft size={16} />
              Back to Login
            </button>

            <img
              src="/logo.jpg"
              alt="Japz Grill"
              className="w-[72px] h-[72px] rounded-lg object-contain mb-2 md:w-[120px] md:h-[120px] md:mb-5"
            />
            <h1 className="text-xl font-bold text-gray-900 mb-1 md:text-2xl">
              Reset Password
            </h1>
            <p className="text-xs text-center text-gray-500 mb-6 md:text-sm">
              {step === "email-code"
                ? "Enter your email and the reset code from your email"
                : "Enter your new password"}
            </p>

            {error && (
              <div className="w-full bg-red-100 px-4 py-3 rounded-lg mb-4">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {step === "email-code" ? (
              <form
                className="w-full flex flex-col gap-3"
                onSubmit={handleSubmitCode}
              >
                <div className="flex flex-col gap-1">
                  <label className="text-[13px] font-medium text-gray-900">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[13px] font-medium text-gray-900">
                    Reset Code
                  </label>
                  <input
                    type="text"
                    placeholder="000000"
                    value={code}
                    onChange={(e) =>
                      setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    maxLength={6}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-center text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition font-mono text-lg tracking-widest"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Check your email for the 6-digit code
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 mt-1 rounded-lg bg-brand font-semibold text-brand-dark text-[15px] hover:shadow-md hover:shadow-yellow-300/40 active:scale-[0.97] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? "Verifying..." : "Continue"}
                </button>
              </form>
            ) : (
              <form
                className="w-full flex flex-col gap-3"
                onSubmit={handleSubmitPassword}
              >
                <div className="flex flex-col gap-1">
                  <label className="text-[13px] font-medium text-gray-900">
                    New Password
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 pr-10 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 bg-transparent border-none cursor-pointer text-gray-400 flex items-center p-1"
                    >
                      {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">
                    At least 12 characters, 1 uppercase letter, 1 number
                  </p>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[13px] font-medium text-gray-900">
                    Confirm Password
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showConfirm ? "text" : "password"}
                      placeholder="Confirm password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 pr-10 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 bg-transparent border-none cursor-pointer text-gray-400 flex items-center p-1"
                    >
                      {showConfirm ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 mt-1 rounded-lg bg-brand font-semibold text-brand-dark text-[15px] hover:shadow-md hover:shadow-yellow-300/40 active:scale-[0.97] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? "Resetting..." : "Reset Password"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep("email-code");
                    setError("");
                  }}
                  className="w-full py-2 rounded-lg bg-gray-100 font-medium text-gray-700 text-sm hover:bg-gray-200 transition"
                >
                  Back
                </button>
              </form>
            )}
          </>
        ) : (
          <div className="text-center py-8 flex flex-col items-center gap-4 w-full">
            <CheckCircle size={64} className="text-green-500" />
            <h2 className="text-xl font-bold text-gray-900">
              Password Reset Successfully
            </h2>
            <p className="text-sm text-gray-600">
              Your password has been reset. Redirecting to login...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
