import { useRef, useState } from "react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { useAuth } from "./useAuth";

const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

export default function AuthScreen() {
  const { signInAsGuest } = useAuth();
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance | undefined>(undefined);

  const handleGuestLogin = async () => {
    if (turnstileSiteKey && !captchaToken) {
      setError("Please complete the security check first.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const { error: authError } = await signInAsGuest(captchaToken ?? undefined);

    if (authError) {
      setError(authError.message);
      setCaptchaToken(null);
      turnstileRef.current?.reset();
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Diagflow</h1>
          <p>AI-assisted diagramming on an Excalidraw canvas</p>
        </div>

        {turnstileSiteKey && (
          <div className="auth-turnstile">
            <Turnstile
              ref={turnstileRef}
              siteKey={turnstileSiteKey}
              onSuccess={(token) => {
                setCaptchaToken(token);
                setError(null);
              }}
              onExpire={() => setCaptchaToken(null)}
              onError={() => {
                setCaptchaToken(null);
                setError("Security check failed. Please retry.");
              }}
            />
          </div>
        )}

        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}

        <button
          type="button"
          className="auth-guest-btn"
          onClick={handleGuestLogin}
          disabled={submitting || (Boolean(turnstileSiteKey) && !captchaToken)}
        >
          {submitting ? "Signing in..." : "Continue as Guest"}
        </button>
      </div>
    </div>
  );
}
