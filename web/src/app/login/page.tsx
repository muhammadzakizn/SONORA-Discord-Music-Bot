"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Lock, User, Eye, EyeOff, Shield, CheckCircle, XCircle, RefreshCw, LogIn, Fingerprint, Smartphone, MessageSquare, Mail, ChevronRight, QrCode, Key, Copy, Download } from "lucide-react";
import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSettings } from "@/contexts/SettingsContext";
import { useSession, getAvatarUrl } from "@/contexts/SessionContext";
import { cn } from "@/lib/utils";
import { checkAuthUser, registerAuthUser, setupTOTP, verifyTOTPSetup, verifyTOTP, verifyBackupCode, checkTrustedDevice, addTrustedDevice, sendDiscordDMCode, verifyDiscordDMCode, type AuthUser } from "@/lib/auth-api";

const backgroundImages = [
  {
    url: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1920&q=80",
    photographer: "Marcela Laskoski",
    photographerUrl: "https://unsplash.com/@marcelalaskoski"
  },
  {
    url: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1920&q=80",
    photographer: "Austin Neill",
    photographerUrl: "https://unsplash.com/@austinneill"
  },
  {
    url: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=1920&q=80",
    photographer: "Wes Hicks",
    photographerUrl: "https://unsplash.com/@sickhews"
  },
  {
    url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1920&q=80",
    photographer: "Aditya Chinchure",
    photographerUrl: "https://unsplash.com/@adityachinchure"
  },
  {
    url: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1920&q=80",
    photographer: "Nainoa Shizuru",
    photographerUrl: "https://unsplash.com/@nainoa"
  },
  {
    url: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=1920&q=80",
    photographer: "Austin Neill",
    photographerUrl: "https://unsplash.com/@austinneill"
  },
  {
    url: "https://images.unsplash.com/photo-1501612780327-45045538702b?w=1920&q=80",
    photographer: "Vishnu R Nair",
    photographerUrl: "https://unsplash.com/@vishnurnair"
  },
];

// Inspirational quotes about music - expanded collection
const inspirationalQuotes = [
  { text: "Music can change the world because it can change people.", author: "Bono" },
  { text: "Where words fail, music speaks.", author: "Hans Christian Andersen" },
  { text: "Music is the soundtrack of your life.", author: "Dick Clark" },
  { text: "One good thing about music, when it hits you, you feel no pain.", author: "Bob Marley" },
  { text: "Music gives a soul to the universe, wings to the mind, flight to the imagination.", author: "Plato" },
  { text: "Without music, life would be a mistake.", author: "Friedrich Nietzsche" },
  { text: "Music expresses that which cannot be said and on which it is impossible to be silent.", author: "Victor Hugo" },
  { text: "Music is the universal language of mankind.", author: "Henry Wadsworth Longfellow" },
  { text: "Life is like a beautiful melody, only the lyrics are messed up.", author: "Hans Christian Andersen" },
  { text: "Music is the strongest form of magic.", author: "Marilyn Manson" },
  { text: "Music is the art of the prophets and the gift of God.", author: "Martin Luther" },
  { text: "After silence, that which comes nearest to expressing the inexpressible is music.", author: "Aldous Huxley" },
  { text: "Music produces a kind of pleasure which human nature cannot do without.", author: "Confucius" },
  { text: "Where there is music, there can be no evil.", author: "Miguel de Cervantes" },
  { text: "Music is the wine that fills the cup of silence.", author: "Robert Fripp" },
  { text: "Music is to the soul what words are to the mind.", author: "Modest Mouse" },
  { text: "Play it loud, play it proud.", author: "Unknown" },
  { text: "Without music, life is a journey through a desert.", author: "Pat Conroy" },
  { text: "Music is the great uniter.", author: "Melissa Etheridge" },
  { text: "Where words leave off, music begins.", author: "Heinrich Heine" },
];

// Discord SVG Icon
const DiscordIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
);

type LoginMode = "select" | "admin" | "terms" | "developer" | "mfa-select" | "mfa-verify" | "mfa-setup" | "backup-codes";
type MFAMethod = "discord" | "totp" | "passkey" | "email";

const MFA_METHODS = [
  { id: "discord" as MFAMethod, label: "Discord DM", icon: MessageSquare, description: "Get code via SONORA bot" },
  { id: "totp" as MFAMethod, label: "Authenticator App", icon: Smartphone, description: "Google Authenticator, Authy" },
  { id: "passkey" as MFAMethod, label: "Passkey", icon: Fingerprint, description: "Fingerprint or Face ID" },
  { id: "email" as MFAMethod, label: "Email", icon: Mail, description: "Get code via email" },
];
type VerifyStatus = "idle" | "sending" | "sent" | "verifying" | "success" | "error";

// Loading fallback for Suspense
function LoginPageLoading() {
  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center bg-black">
      <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
    </div>
  );
}

// Typewriter Quote Component with character-by-character animation and glow effect
function TypewriterQuote({ quotes }: { quotes: typeof inspirationalQuotes }) {
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const [displayedChars, setDisplayedChars] = useState(0);
  const [showAuthor, setShowAuthor] = useState(false);
  const [isTyping, setIsTyping] = useState(true);

  const currentQuote = quotes[currentQuoteIndex];
  const fullText = currentQuote.text;

  useEffect(() => {
    if (!isTyping) return;

    if (displayedChars < fullText.length) {
      // Type next character - slower animation (80ms per char)
      const timeout = setTimeout(() => {
        setDisplayedChars(prev => prev + 1);
      }, 80);
      return () => clearTimeout(timeout);
    } else {
      // All chars typed, show author
      const timeout = setTimeout(() => {
        setShowAuthor(true);
        setIsTyping(false);
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [displayedChars, fullText.length, isTyping]);

  // Cycle to next quote after display completes - longer display time
  useEffect(() => {
    if (!isTyping && showAuthor) {
      const timeout = setTimeout(() => {
        setCurrentQuoteIndex((prev) => (prev + 1) % quotes.length);
        setDisplayedChars(0);
        setShowAuthor(false);
        setIsTyping(true);
      }, 6000); // Show complete quote for 6 seconds before switching
      return () => clearTimeout(timeout);
    }
  }, [isTyping, showAuthor, quotes.length]);

  // Reset when quote changes
  useEffect(() => {
    setDisplayedChars(0);
    setShowAuthor(false);
    setIsTyping(true);
  }, [currentQuoteIndex]);

  const displayedText = fullText.slice(0, displayedChars);
  const lastCharIndex = displayedChars - 1;

  return (
    <div className="text-white">
      {/* Quote Text with Character-by-Character Typewriter + Glow Effect */}
      <p className="text-2xl md:text-3xl lg:text-4xl font-light leading-relaxed mb-4">
        <span className="text-white/90">"</span>
        {displayedText.split('').map((char, index) => (
          <motion.span
            key={`${currentQuoteIndex}-${index}`}
            initial={{ opacity: 0, textShadow: '0 0 20px rgba(255,255,255,0.8)' }}
            animate={{
              opacity: 1,
              textShadow: index === lastCharIndex
                ? '0 0 15px rgba(255,255,255,0.6), 0 0 30px rgba(167,139,250,0.4)'
                : '0 0 0px transparent'
            }}
            transition={{ duration: 0.3 }}
            className="inline"
          >
            {char}
          </motion.span>
        ))}
        {displayedChars === fullText.length && (
          <span className="text-white/90">"</span>
        )}
        {isTyping && (
          <motion.span
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.5, repeat: Infinity }}
            className="inline-block w-0.5 h-6 bg-white/70 ml-1 align-middle"
            style={{ boxShadow: '0 0 8px rgba(255,255,255,0.6)' }}
          />
        )}
      </p>

      {/* Author */}
      <AnimatePresence>
        {showAuthor && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-lg text-white/60 font-medium"
          >
            — {currentQuote.author}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// Main export with Suspense boundary
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageLoading />}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useSettings();
  const { user, isLoggedIn, isLoading: sessionLoading, refreshSession } = useSession();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loginMode, setLoginMode] = useState<LoginMode>("select");
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [slideDirection, setSlideDirection] = useState(1);

  // Verification state
  const [verifyCode, setVerifyCode] = useState(["", "", "", "", "", ""]);
  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus>("idle");
  const [verifyError, setVerifyError] = useState("");
  const [verifyCountdown, setVerifyCountdown] = useState(0);
  const [isZooming, setIsZooming] = useState(false);
  const verifyInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Terms & Conditions state
  const [termsScrolled, setTermsScrolled] = useState(false);
  const [termsTimer, setTermsTimer] = useState(10);
  const [termsCanContinue, setTermsCanContinue] = useState(false);
  const termsRef = useRef<HTMLDivElement>(null);

  // MFA state
  const [selectedMfaMethod, setSelectedMfaMethod] = useState<MFAMethod | null>(null);
  const [hasRedirected, setHasRedirected] = useState(false);

  // MFA Setup state (for new users)
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [totpSetup, setTotpSetup] = useState<{ qrCode: string; secret: string } | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [trustDevice, setTrustDevice] = useState(true);
  const [copiedCode, setCopiedCode] = useState<number | null>(null);

  // Detect ?verify=true from OAuth callback
  // Handle session from query param (workaround for SameSite cookie issues)
  useEffect(() => {
    // Prevent multiple redirects
    if (hasRedirected) return;

    const isVerifyFlow = searchParams.get('verify') === 'true';
    const sessionFromUrl = searchParams.get('session');
    const flowType = searchParams.get('flow'); // 'setup' | 'verify' | null

    if (!isVerifyFlow) return;

    console.log('[Login] Verify flow detected, flow type:', flowType);
    console.log('[Login] Session from URL:', sessionFromUrl ? 'present' : 'missing');

    // If session is passed via URL, store it in cookie manually
    if (sessionFromUrl) {
      console.log('[Login] Storing session from URL to cookie...');

      // Decode to make sure it's valid, then store
      try {
        const decoded = atob(decodeURIComponent(sessionFromUrl));
        const sessionData = JSON.parse(decoded);
        console.log('[Login] Session user:', sessionData.user?.username);
        console.log('[Login] Auth state:', sessionData.authState);
        console.log('[Login] Auth user ID:', sessionData.authUserId);

        // Store in cookie (client-side)
        document.cookie = `sonora-admin-session=${decodeURIComponent(sessionFromUrl)}; path=/; max-age=${60 * 60 * 24 * 7}`;

        // Determine flow from authState in session (more reliable than URL param)
        const effectiveFlow = flowType || (sessionData.authState === 'new' ? 'setup' :
          sessionData.authState === 'mfa_required' ? 'verify' : null);

        console.log('[Login] Effective flow:', effectiveFlow, 'from authState:', sessionData.authState);

        // Handle different flow types
        if (effectiveFlow === 'setup') {
          // New user - need to setup MFA
          console.log('[Login] New user flow - going to MFA setup');
          const userId = sessionData.authUserId || Date.now(); // Use timestamp as fallback ID

          setAuthUser({
            id: userId,
            discord_id: sessionData.user.id,
            username: sessionData.user.username,
            email: sessionData.user.email,
            avatar_url: sessionData.user.avatar
              ? `https://cdn.discordapp.com/avatars/${sessionData.user.id}/${sessionData.user.avatar}.png`
              : undefined,
            status: 'pending',
            mfa_enabled: false,
            role: 'user',
            created_at: new Date().toISOString(),
          });

          // Request TOTP setup from API
          setupTOTP(userId).then((result) => {
            console.log('[Login] TOTP setup result:', result);
            if (result.success && result.qr_code && result.secret) {
              setTotpSetup({ qrCode: result.qr_code, secret: result.secret });
              setLoginMode('mfa-setup');
            } else {
              console.error('[Login] TOTP setup failed:', result.error);
              // Fallback - skip MFA for now
              setHasRedirected(true);
              window.location.href = '/admin';
            }
          });
          return;
        } else if (effectiveFlow === 'verify') {
          // Existing user with MFA - need to verify
          console.log('[Login] Existing user flow - going to MFA verify');
          setAuthUser({
            id: sessionData.authUserId,
            discord_id: sessionData.user.id,
            username: sessionData.user.username,
            email: sessionData.user.email,
            status: 'active',
            mfa_enabled: true,
            role: 'admin',
            created_at: new Date().toISOString(),
          });

          // Set available MFA methods from session
          if (sessionData.mfaMethods && sessionData.mfaMethods.length > 0) {
            setSelectedMfaMethod(sessionData.mfaMethods[0] as MFAMethod);
          }

          setLoginMode('mfa-select');
          return;
        } else {
          // trusted state or no MFA needed - go directly to admin
          console.log('[Login] Trusted or no MFA - navigating to /admin...');
          setHasRedirected(true);
          window.location.href = '/admin';
          return;
        }
      } catch (e) {
        console.error('[Login] Failed to parse session from URL:', e);
        setHasRedirected(false);
      }
    }

    // Check existing cookie (fallback if came back without session param)
    const cookies = document.cookie;
    const hasSessionCookie = cookies.includes('sonora-admin-session');

    console.log('[Login] Has session cookie:', hasSessionCookie);
    console.log('[Login] isLoggedIn:', isLoggedIn);

    // If already logged in, redirect to admin
    if (hasSessionCookie && isLoggedIn && user) {
      console.log('[Login] Already logged in, redirecting to /admin...');
      setHasRedirected(true);
      window.location.href = '/admin';
      return;
    }

    // If cookie exists but session not loaded yet, wait
    if (hasSessionCookie && !isLoggedIn && !sessionLoading) {
      console.log('[Login] Cookie exists but not logged in, refreshing session...');
      refreshSession();
    }
  }, [searchParams, isLoggedIn, user, sessionLoading, hasRedirected, refreshSession]);

  // Countdown timer for resend
  useEffect(() => {
    if (verifyCountdown > 0) {
      const timer = setTimeout(() => setVerifyCountdown(verifyCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [verifyCountdown]);

  // Background slideshow with slide transition
  useEffect(() => {
    const interval = setInterval(() => {
      setSlideDirection(1);
      setCurrentImageIndex((prev) => (prev + 1) % backgroundImages.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // Terms timer countdown
  useEffect(() => {
    if (loginMode === "terms" && termsTimer > 0 && !termsScrolled) {
      const timer = setTimeout(() => setTermsTimer(termsTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
    if (termsTimer === 0 || termsScrolled) {
      setTermsCanContinue(true);
    }
  }, [loginMode, termsTimer, termsScrolled]);

  // Handle terms scroll
  const handleTermsScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 20;
    if (isAtBottom) {
      setTermsScrolled(true);
      setTermsCanContinue(true);
    }
  }, []);

  // Handle Discord OAuth for Admin - Fixed redirect URI
  const handleDiscordLogin = useCallback(() => {
    // Use the actual deployed URL or localhost for development
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || "1443855259536461928";
    const redirectUri = encodeURIComponent(`${baseUrl}/api/auth/discord/callback`);
    const scope = encodeURIComponent("identify guilds");

    window.location.href = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
  }, []);

  // Handle Developer login - SECURE: calls backend API, no credentials in frontend
  const handleDeveloperLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Use internal Next.js API proxy to Flask backend
      // This works without exposing port 5000 externally
      const response = await fetch('/api/bot/developer/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          password: password,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Store auth token securely in localStorage
        localStorage.setItem("sonora-dev-auth", btoa(JSON.stringify({
          role: data.role || "developer",
          username: data.username,
          token: data.token,
          timestamp: Date.now()
        })));

        // Set cookie for middleware
        document.cookie = "sonora-dev-auth=authenticated; path=/; max-age=86400; SameSite=Lax";

        // Redirect to developer dashboard
        setTimeout(() => {
          window.location.href = "/developer";
        }, 100);
      } else {
        setError(data.error || t('login.invalidCredentials'));
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(t('login.serverError') || 'Server error. Please try again.');
      setIsLoading(false);
    }
  }, [username, password, t]);

  // Send verification code via Discord DM
  const sendVerificationCode = useCallback(async () => {
    if (!user) return;

    setVerifyStatus("sending");
    setVerifyError("");

    try {
      // If in MFA mode, use MFA-specific API
      if (loginMode === 'mfa-select' || loginMode === 'mfa-verify') {
        const userId = authUser?.id || user.id;
        const result = await sendDiscordDMCode(userId, user.id);

        if (result.success) {
          setVerifyStatus("sent");
          setVerifyCountdown(result.expires_in || 300); // 5 minutes default
          // If dev_code is returned (for testing), show it
          if (result.dev_code) {
            console.log('[MFA] Dev code for testing:', result.dev_code);
          }
        } else {
          setVerifyStatus("error");
          setVerifyError(result.error || "Failed to send code. Bot may be offline.");
        }
        return;
      }

      // Regular email verification
      const response = await fetch("/api/verify/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });

      const data = await response.json();

      if (response.ok) {
        setVerifyStatus("sent");
        setVerifyCountdown(60);
      } else {
        setVerifyStatus("error");
        setVerifyError(data.error || "Failed to send verification code");
      }
    } catch {
      setVerifyStatus("error");
      setVerifyError("Network error. Please try again.");
    }
  }, [user]);

  // Verify the entered code
  const handleVerifyCode = useCallback(async () => {
    if (!user) return;

    const fullCode = verifyCode.join("");
    if (fullCode.length !== 6) return;

    setVerifyStatus("verifying");
    setVerifyError("");

    try {
      // If in MFA verify mode with Discord selected, use MFA API
      if (loginMode === 'mfa-verify' && selectedMfaMethod === 'discord') {
        const userId = authUser?.id || user.id;
        const result = await verifyDiscordDMCode(userId, fullCode);

        if (result.success) {
          setVerifyStatus("success");
          // Start zoom animation after brief success message
          setTimeout(() => {
            setIsZooming(true);
          }, 1000);
          // Redirect after zoom animation fills screen completely
          setTimeout(() => {
            router.push("/admin");
          }, 2500);
        } else {
          setVerifyStatus("error");
          setVerifyError(result.error || "Invalid code");
          setVerifyCode(["", "", "", "", "", ""]);
          verifyInputRefs.current[0]?.focus();
        }
        return;
      }

      // Regular email verification
      const response = await fetch("/api/verify/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, code: fullCode }),
      });

      const data = await response.json();

      if (response.ok && data.verified) {
        setVerifyStatus("success");
        // Start zoom animation after brief success message
        setTimeout(() => {
          setIsZooming(true);
        }, 1000);
        // Redirect after zoom animation fills screen completely
        setTimeout(() => {
          router.push("/admin");
        }, 2500);
      } else {
        setVerifyStatus("error");
        setVerifyError(data.error || "Invalid verification code");
        setVerifyCode(["", "", "", "", "", ""]);
        verifyInputRefs.current[0]?.focus();
      }
    } catch {
      setVerifyStatus("error");
      setVerifyError("Network error. Please try again.");
    }
  }, [user, verifyCode, router, loginMode, selectedMfaMethod, authUser]);

  // Handle verification code input change
  const handleVerifyInputChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...verifyCode];
    newCode[index] = value.slice(-1);
    setVerifyCode(newCode);

    if (value && index < 5) {
      verifyInputRefs.current[index + 1]?.focus();
    }

    if (newCode.every(d => d) && newCode.join("").length === 6) {
      setTimeout(() => handleVerifyCode(), 100);
    }
  };

  // Handle backspace in verification inputs
  const handleVerifyKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !verifyCode[index] && index > 0) {
      verifyInputRefs.current[index - 1]?.focus();
    }
  };

  const currentImage = backgroundImages[currentImageIndex];

  // Fade animation variants (changed from slide)
  const fadeVariants = {
    enter: {
      opacity: 0,
    },
    center: {
      opacity: 1,
    },
    exit: {
      opacity: 0,
    },
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* FULL SCREEN BLACK OVERLAY - appears during zoom */}
      <AnimatePresence>
        {isZooming && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="fixed inset-0 bg-black z-[100]"
          />
        )}
      </AnimatePresence>

      {/* Full-Screen Background Fadeshow */}
      <div className="absolute inset-0">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={currentImageIndex}
            variants={fadeVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 1.2, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <Image
              src={currentImage.url}
              alt="Background"
              fill
              className="object-cover"
              priority
            />
            {/* Dark overlay for readability */}
            <div className="absolute inset-0 bg-black/50" />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Floating Orbs for depth effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-blue-600/15 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-2/3 left-1/3 w-64 h-64 bg-primary/20 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Split Layout Container - Quotes Left, Login Right */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-6xl flex flex-col lg:flex-row items-center lg:items-stretch gap-8 lg:gap-16">

          {/* Left Side - Quotes Section (hidden on mobile) */}
          <div className="hidden lg:flex flex-col justify-center flex-1 max-w-xl">
            {/* Typewriter Quotes */}
            <TypewriterQuote quotes={inspirationalQuotes} />

            {/* Photo Credit - Below Quotes */}
            <div className="mt-12 pt-8 border-t border-white/10">
              <a
                href={currentImage.photographerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-white/40 hover:text-white/70 transition-colors"
              >
                Photo by {currentImage.photographer} on Unsplash
              </a>
            </div>
          </div>

          {/* Right Side - Login Box */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: isZooming ? 20 : 1,
            }}
            transition={{
              duration: isZooming ? 1.2 : 0.6,
              ease: isZooming ? [0.4, 0, 0.2, 1] : "easeOut"
            }}
            className="w-full max-w-md lg:mr-8"
          >
            {/* Liquid Glass Card */}
            <motion.div
              animate={{
                borderRadius: isZooming ? "0px" : "24px",
                backgroundColor: isZooming ? "rgb(0, 0, 0)" : "rgba(255, 255, 255, 0.08)",
              }}
              transition={{ duration: isZooming ? 0.4 : 0.5 }}
              className={cn(
                "relative p-8 overflow-hidden",
                !isZooming && "backdrop-blur-2xl border border-white/[0.15]",
                !isZooming && "shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)]",
                !isZooming && "rounded-3xl"
              )}
            >
              {/* Glass Shimmer Effect - hide when zooming */}
              {!isZooming && (
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.1] via-transparent to-transparent pointer-events-none rounded-3xl" />
              )}

              <AnimatePresence mode="wait">
                {loginMode === "select" && (
                  <motion.div
                    key="select"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="relative z-10"
                  >
                    {/* Logo - Larger and centered at top */}
                    <div className="flex flex-col items-center mb-8">
                      <Image
                        src="/sonora-logo.png"
                        alt="SONORA"
                        width={180}
                        height={72}
                        className="h-20 w-auto drop-shadow-lg mb-4"
                      />
                      <p className="text-white/60 text-sm">{t('hero.subtitle')}</p>
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-2 text-center">{t('login.welcome')}</h2>
                    <p className="text-white/60 mb-8 text-center">{t('login.chooseMethod')}</p>

                    <div className="space-y-4">
                      {/* Admin - Discord Login */}
                      <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setLoginMode("admin")}
                        className="w-full flex items-center gap-4 p-4 rounded-2xl 
                          bg-white/[0.08] backdrop-blur-xl
                          border border-white/[0.1] 
                          hover:bg-white/[0.15] hover:border-purple-500/40
                          shadow-[0_4px_24px_rgba(0,0,0,0.3)]
                          transition-all duration-300 group"
                      >
                        <div className="p-3 rounded-xl bg-purple-500/30 group-hover:bg-purple-500/40 transition-colors">
                          <DiscordIcon />
                        </div>
                        <div className="flex-1 text-left">
                          <span className="block font-semibold text-white">{t('login.admin')}</span>
                          <span className="text-sm text-white/50">{t('login.admin.desc')}</span>
                        </div>
                      </motion.button>

                      <div className="relative flex items-center gap-4 py-2">
                        <div className="flex-1 h-px bg-white/[0.1]" />
                        <span className="text-sm text-white/40">{t('login.or')}</span>
                        <div className="flex-1 h-px bg-white/[0.1]" />
                      </div>

                      {/* Developer - Private Login */}
                      <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setLoginMode("developer")}
                        className="w-full flex items-center gap-4 p-4 rounded-2xl 
                          bg-white/[0.08] backdrop-blur-xl
                          border border-white/[0.1]
                          hover:bg-white/[0.15] hover:border-green-500/40
                          shadow-[0_4px_24px_rgba(0,0,0,0.3)]
                          transition-all duration-300 group"
                      >
                        <div className="p-3 rounded-xl bg-green-500/30 group-hover:bg-green-500/40 transition-colors">
                          <Lock className="w-5 h-5 text-green-400" />
                        </div>
                        <div className="flex-1 text-left">
                          <span className="block font-semibold text-white">{t('login.developer')}</span>
                          <span className="text-sm text-white/50">{t('login.developer.desc')}</span>
                        </div>
                      </motion.button>
                    </div>

                    <div className="mt-8 text-center">
                      <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        {t('common.backToHome')}
                      </Link>
                    </div>
                  </motion.div>
                )}

                {loginMode === "admin" && (
                  <motion.div
                    key="admin"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="relative z-10"
                  >
                    <button
                      onClick={() => setLoginMode("select")}
                      className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors mb-6"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      {t('common.back')}
                    </button>

                    {/* Logo */}
                    <div className="flex justify-center mb-6">
                      <Image
                        src="/sonora-logo.png"
                        alt="SONORA"
                        width={120}
                        height={48}
                        className="h-12 w-auto drop-shadow-lg"
                      />
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-2">{t('login.adminTitle')}</h2>
                    <p className="text-white/60 mb-8">{t('login.adminDesc')}</p>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setTermsTimer(10);
                        setTermsScrolled(false);
                        setTermsCanContinue(false);
                        setLoginMode("terms");
                      }}
                      className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl 
                        bg-[#5865F2] hover:bg-[#4752C4] 
                        text-white font-semibold transition-colors
                        shadow-[0_4px_24px_rgba(88,101,242,0.5)]"
                    >
                      <DiscordIcon />
                      {t('login.continueDiscord')}
                    </motion.button>

                    <p className="mt-6 text-xs text-white/40 text-center">
                      {t('login.termsNotice')}
                    </p>
                  </motion.div>
                )}

                {loginMode === "terms" && (
                  <motion.div
                    key="terms"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="relative z-10"
                  >
                    <button
                      onClick={() => setLoginMode("admin")}
                      className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors mb-4"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      {t('common.back')}
                    </button>

                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-xl bg-purple-500/30">
                        <Shield className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">Terms & Conditions</h2>
                        <p className="text-white/50 text-sm">Please read before continuing</p>
                      </div>
                    </div>

                    {/* Scrollable Terms Content */}
                    <div
                      ref={termsRef}
                      onScroll={handleTermsScroll}
                      className="h-48 overflow-y-auto mb-4 p-4 rounded-xl bg-black/30 border border-white/10 text-sm text-white/70 space-y-3"
                    >
                      <h3 className="font-semibold text-white">📜 Terms of Service</h3>
                      <p>By using SONORA Bot, you agree to the following terms:</p>

                      <h4 className="font-medium text-white/90 mt-3">1. Usage</h4>
                      <p>SONORA Bot is provided for personal, non-commercial use. You may not use this bot for any illegal activities.</p>

                      <h4 className="font-medium text-white/90 mt-3">2. Privacy</h4>
                      <p>We collect minimal data necessary for bot functionality, including your Discord ID and listening history. This data is stored securely and never shared with third parties.</p>

                      <h4 className="font-medium text-white/90 mt-3">3. Content</h4>
                      <p>All music content is streamed from third-party services. We do not host any copyrighted material.</p>

                      <h4 className="font-medium text-white/90 mt-3">4. Liability</h4>
                      <p>SONORA Bot is provided "as is" without warranties. We are not responsible for any damages arising from use of this service.</p>

                      <h4 className="font-medium text-white/90 mt-3">5. Changes</h4>
                      <p>We reserve the right to modify these terms at any time. Continued use constitutes acceptance of modified terms.</p>

                      <div className="pt-4 border-t border-white/10 mt-4">
                        <p className="text-white/50 text-xs">Last updated: December 2024</p>
                      </div>
                    </div>

                    {/* Progress indicator */}
                    <div className="flex items-center justify-between mb-4 text-sm">
                      <span className="text-white/50">
                        {termsScrolled ? (
                          <span className="text-green-400 flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" /> Read complete
                          </span>
                        ) : (
                          <span>Scroll to bottom or wait {termsTimer}s</span>
                        )}
                      </span>
                      {!termsCanContinue && (
                        <span className="text-purple-400 font-mono">{termsTimer}s</span>
                      )}
                    </div>

                    {/* Continue Button */}
                    <motion.button
                      whileHover={termsCanContinue ? { scale: 1.02 } : {}}
                      whileTap={termsCanContinue ? { scale: 0.98 } : {}}
                      onClick={termsCanContinue ? handleDiscordLogin : undefined}
                      disabled={!termsCanContinue}
                      className={cn(
                        "w-full flex items-center justify-center gap-3 p-4 rounded-2xl font-semibold transition-all",
                        termsCanContinue
                          ? "bg-[#5865F2] hover:bg-[#4752C4] text-white shadow-[0_4px_24px_rgba(88,101,242,0.5)] cursor-pointer"
                          : "bg-white/10 text-white/40 cursor-not-allowed"
                      )}
                    >
                      <DiscordIcon />
                      {termsCanContinue ? "Continue to Discord" : "Please read the terms"}
                    </motion.button>

                    <p className="mt-4 text-xs text-white/40 text-center">
                      By continuing, you agree to our Terms & Privacy Policy
                    </p>
                  </motion.div>
                )}

                {loginMode === "developer" && (
                  <motion.div
                    key="developer"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="relative z-10"
                  >
                    <button
                      onClick={() => setLoginMode("select")}
                      className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors mb-6"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      {t('common.back')}
                    </button>

                    {/* Logo */}
                    <div className="flex justify-center mb-6">
                      <Image
                        src="/sonora-logo.png"
                        alt="SONORA"
                        width={120}
                        height={48}
                        className="h-12 w-auto drop-shadow-lg"
                      />
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-2">{t('login.devTitle')}</h2>
                    <p className="text-white/60 mb-8">{t('login.devDesc')}</p>

                    <form onSubmit={handleDeveloperLogin} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-white/70 mb-2">
                          {t('login.username')}
                        </label>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                          <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 rounded-xl 
                              bg-white/[0.08] backdrop-blur-xl
                              border border-white/[0.1] 
                              text-white placeholder:text-white/30 
                              focus:outline-none focus:border-green-500/50 focus:bg-white/[0.12]
                              transition-all"
                            placeholder={t('login.enterUsername')}
                            autoComplete="username"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-white/70 mb-2">
                          {t('login.password')}
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                          <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-12 pr-12 py-3 rounded-xl 
                              bg-white/[0.08] backdrop-blur-xl
                              border border-white/[0.1]
                              text-white placeholder:text-white/30 
                              focus:outline-none focus:border-green-500/50 focus:bg-white/[0.12]
                              transition-all"
                            placeholder={t('login.enterPassword')}
                            autoComplete="current-password"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                          >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>

                      {error && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-rose-400 text-sm"
                        >
                          {error}
                        </motion.p>
                      )}

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl 
                          bg-gradient-to-r from-green-600 to-emerald-600 
                          hover:from-green-500 hover:to-emerald-500 
                          text-white font-semibold transition-all 
                          disabled:opacity-50 disabled:cursor-not-allowed
                          shadow-[0_4px_24px_rgba(34,197,94,0.4)]"
                      >
                        {isLoading ? (
                          <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <LogIn className="w-5 h-5" />
                            {t('login.signIn')}
                          </>
                        )}
                      </motion.button>
                    </form>
                  </motion.div>
                )}

                {/* MFA Method Selection */}
                {loginMode === "mfa-select" && user && (
                  <motion.div
                    key="mfa-select"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="relative z-10"
                  >
                    {/* Header */}
                    <div className="flex flex-col items-center mb-6">
                      <div className="w-16 h-16 mb-4 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
                        <Shield className="w-8 h-8 text-white" />
                      </div>
                      <h2 className="text-2xl font-bold text-white mb-2">Verify Your Identity</h2>
                      <p className="text-white/60 text-sm text-center">
                        Choose a verification method
                      </p>
                    </div>

                    {/* User Info */}
                    <div className="flex items-center gap-4 p-4 mb-6 rounded-2xl bg-white/[0.08] border border-white/[0.1]">
                      <Image
                        src={getAvatarUrl(user)}
                        alt={user.username}
                        width={48}
                        height={48}
                        className="rounded-full"
                      />
                      <div>
                        <p className="font-medium text-white">{user.username}</p>
                        <p className="text-sm text-white/50">Discord ID: {user.id}</p>
                      </div>
                    </div>

                    {/* MFA Methods */}
                    <div className="space-y-3">
                      {MFA_METHODS.map((method) => (
                        <motion.button
                          key={method.id}
                          whileHover={{ scale: 1.02, y: -1 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            setSelectedMfaMethod(method.id);
                            if (method.id === "discord") {
                              sendVerificationCode();
                            }
                            setLoginMode("mfa-verify");
                          }}
                          className="w-full flex items-center gap-4 p-4 rounded-2xl 
                            bg-white/[0.08] backdrop-blur-xl
                            border border-white/[0.1] 
                            hover:bg-white/[0.15] hover:border-purple-500/40
                            shadow-[0_4px_24px_rgba(0,0,0,0.3)]
                            transition-all duration-300 group"
                        >
                          <div className="p-3 rounded-xl bg-purple-500/30 group-hover:bg-purple-500/40 transition-colors">
                            <method.icon className="w-5 h-5 text-purple-300" />
                          </div>
                          <div className="flex-1 text-left">
                            <span className="block font-semibold text-white">{method.label}</span>
                            <span className="text-sm text-white/50">{method.description}</span>
                          </div>
                          <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white/60 transition-colors" />
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* MFA Verification */}
                {loginMode === "mfa-verify" && user && (
                  <motion.div
                    key="mfa-verify"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="relative z-10"
                  >
                    <button
                      onClick={() => setLoginMode("mfa-select")}
                      className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors mb-6"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Change method
                    </button>

                    {/* Header */}
                    <div className="flex flex-col items-center mb-6">
                      <div className="w-16 h-16 mb-4 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
                        <Shield className="w-8 h-8 text-white" />
                      </div>
                      <h2 className="text-2xl font-bold text-white mb-2">Enter Verification Code</h2>
                      <p className="text-white/60 text-sm text-center">
                        {selectedMfaMethod === "discord" && "Code sent to your Discord DM"}
                        {selectedMfaMethod === "email" && "Code sent to your email"}
                        {selectedMfaMethod === "totp" && "Enter code from your authenticator app"}
                        {selectedMfaMethod === "passkey" && "Use your fingerprint or Face ID"}
                      </p>
                    </div>

                    {verifyStatus === "success" ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center py-8"
                      >
                        <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-400" />
                        <h3 className="text-xl font-bold text-green-400 mb-2">Verified!</h3>
                        <p className="text-white/60">Redirecting to dashboard...</p>
                      </motion.div>
                    ) : (
                      <>
                        {/* Code Input */}
                        <div className="flex justify-center gap-3 mb-6">
                          {verifyCode.map((digit, i) => (
                            <input
                              key={i}
                              ref={(el) => { verifyInputRefs.current[i] = el; }}
                              type="text"
                              inputMode="numeric"
                              maxLength={1}
                              value={digit}
                              onChange={(e) => handleVerifyInputChange(i, e.target.value)}
                              onKeyDown={(e) => handleVerifyKeyDown(i, e)}
                              disabled={verifyStatus === "verifying"}
                              className={cn(
                                "w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 bg-white/[0.08] focus:outline-none transition-colors text-white",
                                verifyStatus === "error"
                                  ? "border-rose-500"
                                  : "border-white/[0.15] focus:border-purple-500"
                              )}
                            />
                          ))}
                        </div>

                        {/* Error Message */}
                        {verifyStatus === "error" && verifyError && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-2 justify-center text-rose-400 text-sm mb-4"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>{verifyError}</span>
                          </motion.div>
                        )}

                        {/* Verifying State */}
                        {verifyStatus === "verifying" && (
                          <div className="flex items-center justify-center gap-2 text-purple-400 mb-4">
                            <div className="w-4 h-4 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
                            <span>Verifying...</span>
                          </div>
                        )}

                        {/* Verify Button */}
                        {verifyStatus !== "verifying" && (
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleVerifyCode}
                            disabled={verifyCode.join("").length !== 6}
                            className={cn(
                              "w-full py-3 mb-4 rounded-xl font-semibold transition-all",
                              verifyCode.join("").length === 6
                                ? "bg-gradient-to-r from-purple-500 to-cyan-500 text-white hover:opacity-90 shadow-[0_4px_24px_rgba(168,85,247,0.4)]"
                                : "bg-white/[0.08] text-white/40 cursor-not-allowed"
                            )}
                          >
                            Verify Code
                          </motion.button>
                        )}

                        {/* Resend Button */}
                        {(selectedMfaMethod === "discord" || selectedMfaMethod === "email") && (
                          <div className="text-center">
                            <button
                              onClick={sendVerificationCode}
                              disabled={verifyCountdown > 0 || verifyStatus === "verifying" || verifyStatus === "sending"}
                              className={cn(
                                "flex items-center gap-2 mx-auto text-sm transition-colors",
                                verifyCountdown > 0 || verifyStatus === "verifying" || verifyStatus === "sending"
                                  ? "text-white/30 cursor-not-allowed"
                                  : "text-purple-400 hover:text-purple-300"
                              )}
                            >
                              <RefreshCw className={cn("w-4 h-4", verifyStatus === "sending" && "animate-spin")} />
                              {verifyStatus === "sending"
                                ? "Sending..."
                                : verifyCountdown > 0
                                  ? `Resend in ${verifyCountdown}s`
                                  : "Resend Code"}
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </motion.div>
                )}

                {/* MFA Setup (for new users) */}
                {loginMode === "mfa-setup" && user && (
                  <motion.div
                    key="mfa-setup"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="relative z-10"
                  >
                    {/* Header */}
                    <div className="flex flex-col items-center mb-6">
                      <div className="w-16 h-16 mb-4 rounded-full bg-gradient-to-br from-green-500 to-cyan-500 flex items-center justify-center">
                        <QrCode className="w-8 h-8 text-white" />
                      </div>
                      <h2 className="text-2xl font-bold text-white mb-2">Setup Authenticator</h2>
                      <p className="text-white/60 text-sm text-center">
                        Scan the QR code with your authenticator app
                      </p>
                    </div>

                    {/* QR Code Display */}
                    {totpSetup && (
                      <div className="space-y-6">
                        <div className="flex justify-center">
                          <div className="p-4 bg-white rounded-2xl">
                            <Image
                              src={totpSetup.qrCode}
                              alt="TOTP QR Code"
                              width={180}
                              height={180}
                              className="rounded-lg"
                            />
                          </div>
                        </div>

                        {/* Manual Entry */}
                        <div className="p-4 rounded-xl bg-white/[0.08] border border-white/[0.1]">
                          <p className="text-xs text-white/50 mb-2">Can't scan? Enter this code manually:</p>
                          <div className="flex items-center justify-between gap-2">
                            <code className="flex-1 text-sm font-mono text-purple-300 bg-black/30 px-3 py-2 rounded-lg break-all">
                              {totpSetup.secret}
                            </code>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(totpSetup.secret);
                                setCopiedCode(-1);
                                setTimeout(() => setCopiedCode(null), 2000);
                              }}
                              className="p-2 rounded-lg bg-white/[0.1] hover:bg-white/[0.2] transition-colors"
                            >
                              {copiedCode === -1 ? (
                                <CheckCircle className="w-4 h-4 text-green-400" />
                              ) : (
                                <Copy className="w-4 h-4 text-white/60" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Verification Code Input */}
                        <div>
                          <p className="text-sm text-white/60 mb-3 text-center">
                            Enter the 6-digit code from your app:
                          </p>
                          <div className="flex justify-center gap-3 mb-4">
                            {verifyCode.map((digit, i) => (
                              <input
                                key={i}
                                ref={(el) => { verifyInputRefs.current[i] = el; }}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleVerifyInputChange(i, e.target.value)}
                                onKeyDown={(e) => handleVerifyKeyDown(i, e)}
                                disabled={verifyStatus === "verifying"}
                                className={cn(
                                  "w-11 h-13 text-center text-xl font-bold rounded-xl border-2 bg-white/[0.08] focus:outline-none transition-colors text-white",
                                  verifyStatus === "error"
                                    ? "border-rose-500"
                                    : "border-white/[0.15] focus:border-green-500"
                                )}
                              />
                            ))}
                          </div>

                          {verifyStatus === "error" && verifyError && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="flex items-center gap-2 justify-center text-rose-400 text-sm mb-4"
                            >
                              <XCircle className="w-4 h-4" />
                              <span>{verifyError}</span>
                            </motion.div>
                          )}

                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={async () => {
                              const code = verifyCode.join("");
                              if (code.length !== 6 || !authUser) return;

                              setVerifyStatus("verifying");
                              const result = await verifyTOTPSetup(authUser.id, code, totpSetup.secret);

                              if (result.success && result.backup_codes) {
                                setBackupCodes(result.backup_codes);
                                setVerifyStatus("success");
                                setLoginMode("backup-codes");
                              } else {
                                setVerifyStatus("error");
                                setVerifyError(result.error || "Invalid code");
                                setVerifyCode(["", "", "", "", "", ""]);
                                verifyInputRefs.current[0]?.focus();
                              }
                            }}
                            disabled={verifyCode.join("").length !== 6 || verifyStatus === "verifying"}
                            className={cn(
                              "w-full py-3 rounded-xl font-semibold transition-all",
                              verifyCode.join("").length === 6 && verifyStatus !== "verifying"
                                ? "bg-gradient-to-r from-green-500 to-cyan-500 text-white hover:opacity-90 shadow-[0_4px_24px_rgba(34,197,94,0.4)]"
                                : "bg-white/[0.08] text-white/40 cursor-not-allowed"
                            )}
                          >
                            {verifyStatus === "verifying" ? "Verifying..." : "Verify & Activate"}
                          </motion.button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Backup Codes Display */}
                {loginMode === "backup-codes" && (
                  <motion.div
                    key="backup-codes"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="relative z-10"
                  >
                    {/* Header */}
                    <div className="flex flex-col items-center mb-6">
                      <div className="w-16 h-16 mb-4 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                        <Key className="w-8 h-8 text-white" />
                      </div>
                      <h2 className="text-2xl font-bold text-white mb-2">Backup Codes</h2>
                      <p className="text-white/60 text-sm text-center">
                        Save these codes in a safe place. Each code can only be used once.
                      </p>
                    </div>

                    {/* Warning */}
                    <div className="p-4 mb-6 rounded-xl bg-amber-500/20 border border-amber-500/30">
                      <p className="text-sm text-amber-300">
                        ⚠️ These codes will only be shown once. Make sure to save them now!
                      </p>
                    </div>

                    {/* Codes Grid */}
                    <div className="grid grid-cols-2 gap-2 mb-6">
                      {backupCodes.map((code, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            navigator.clipboard.writeText(code);
                            setCopiedCode(i);
                            setTimeout(() => setCopiedCode(null), 2000);
                          }}
                          className="flex items-center justify-between p-3 rounded-xl bg-white/[0.08] border border-white/[0.1] hover:bg-white/[0.12] transition-colors group"
                        >
                          <code className="text-sm font-mono text-white/80">{code}</code>
                          {copiedCode === i ? (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors" />
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 mb-6">
                      <button
                        onClick={() => {
                          const text = backupCodes.join("\n");
                          navigator.clipboard.writeText(text);
                          setCopiedCode(-2);
                          setTimeout(() => setCopiedCode(null), 2000);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/[0.08] border border-white/[0.1] hover:bg-white/[0.12] transition-colors text-white/80"
                      >
                        {copiedCode === -2 ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        Copy All
                      </button>
                      <button
                        onClick={() => {
                          const text = `SONORA Backup Codes\n==================\n\n${backupCodes.map((c, i) => `${i + 1}. ${c}`).join("\n")}\n\nGenerated: ${new Date().toLocaleString()}\nEach code can only be used once.`;
                          const blob = new Blob([text], { type: "text/plain" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = "sonora-backup-codes.txt";
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/[0.08] border border-white/[0.1] hover:bg-white/[0.12] transition-colors text-white/80"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                    </div>

                    {/* Trust Device Checkbox */}
                    <label className="flex items-center gap-3 p-4 mb-6 rounded-xl bg-white/[0.08] border border-white/[0.1] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={trustDevice}
                        onChange={(e) => setTrustDevice(e.target.checked)}
                        className="w-5 h-5 rounded accent-purple-500"
                      />
                      <div>
                        <p className="text-white font-medium">Trust this device</p>
                        <p className="text-sm text-white/50">Skip MFA on this device for 30 days</p>
                      </div>
                    </label>

                    {/* Continue Button */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={async () => {
                        // Trust device if checked
                        if (trustDevice && authUser) {
                          await addTrustedDevice(authUser.id, navigator.userAgent.split(" ")[0]);
                        }

                        // Redirect to admin
                        setVerifyStatus("success");
                        setIsZooming(true);
                        setTimeout(() => {
                          setHasRedirected(true);
                          window.location.href = "/admin";
                        }, 1000);
                      }}
                      className="w-full py-3 rounded-xl font-semibold bg-gradient-to-r from-purple-500 to-cyan-500 text-white hover:opacity-90 shadow-[0_4px_24px_rgba(168,85,247,0.4)] transition-all"
                    >
                      I've Saved My Codes - Continue to Dashboard
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Mobile Only: Photo Credit */}
            <div className="lg:hidden mt-6 text-center">
              <a
                href={currentImage.photographerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-white/40 hover:text-white/70 transition-colors"
              >
                Photo by {currentImage.photographer} on Unsplash
              </a>
            </div>
          </motion.div>
        </div>
      </div >
    </div >
  );
}
