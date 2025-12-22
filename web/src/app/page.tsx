"use client";

import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import {
  Music,
  Headphones,
  Zap,
  Globe,
  ArrowRight,
  ArrowUp,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Repeat,
  Shuffle,
  Volume2,
  List,
  Sparkles,
  Shield,
  Clock,
  ChevronDown,
  ChevronUp,
  Check,
  ChevronRight,
  User,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useSettings } from "@/contexts/SettingsContext";
import { Footer } from "@/components/Footer";
import { SessionProvider } from "@/contexts/SessionContext";
import { FloatingProfileButton, DashboardButton } from "@/components/FloatingProfile";

// Animation variants - Simple fade only
const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.5 }
};

const stagger = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

// Scroll to Top Button Component
function ScrollToTopButton({ isDark }: { isDark: boolean }) {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <AnimatePresence>
      {showScrollTop && (
        <motion.button
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
          onClick={scrollToTop}
          className={`fixed bottom-24 right-6 z-40 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-colors ${isDark
            ? 'bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-white'
            : 'bg-white border border-gray-200 hover:bg-gray-100 text-gray-900'
            }`}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Scroll to top"
        >
          <ArrowUp className="w-5 h-5" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}



// Animated Subtitle with Word Cycling and Glow Effect
function AnimatedSubtitle({ isDark, t, isPaused }: { isDark: boolean; t: (key: string) => string; isPaused: boolean }) {
  const [wordIndex, setWordIndex] = useState(0);
  const [isGlowing, setIsGlowing] = useState(false);
  const words = t('hero.subtitleWords').split(',');
  const prefix = t('hero.subtitleThe');
  const suffix = t('hero.subtitleEnd');

  // Find longest word for min-width
  const longestWord = words.reduce((a, b) => a.length > b.length ? a : b, '');

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setIsGlowing(true);
      setTimeout(() => {
        setWordIndex((prev) => (prev + 1) % words.length);
      }, 1000);
      setTimeout(() => {
        setIsGlowing(false);
      }, 2000);
    }, 5000);

    return () => clearInterval(interval);
  }, [words.length, isPaused]);

  return (
    <span className="inline-flex items-center justify-center">
      {prefix && <span className="mr-2">{prefix}</span>}
      <motion.span
        className="inline-block text-gradient relative mx-1"
        layout
        animate={{
          filter: isGlowing
            ? 'brightness(1.8) drop-shadow(0 0 30px rgba(255,255,255,0.9))'
            : 'brightness(1) drop-shadow(0 0 0px rgba(255,255,255,0))',
          scale: isGlowing ? 1.05 : 1,
          textShadow: isGlowing
            ? isDark
              ? '0 0 60px rgba(255, 200, 220, 1), 0 0 120px rgba(255, 150, 180, 0.8), 0 0 180px rgba(123, 30, 60, 0.6)'
              : '0 0 50px rgba(255, 150, 180, 1), 0 0 100px rgba(255, 100, 150, 0.7)'
            : isDark
              ? '0 0 20px rgba(123, 30, 60, 0.6), 0 0 40px rgba(123, 30, 60, 0.3)'
              : '0 0 15px rgba(123, 30, 60, 0.4)',
        }}
        transition={{ duration: 0.8, ease: "easeInOut", layout: { duration: 0.4 } }}
      >
        {/* Invisible spacer to maintain consistent width */}
        <span className="invisible absolute whitespace-nowrap">{longestWord}</span>

        <AnimatePresence mode="wait">
          <motion.span
            key={wordIndex}
            className="inline-block"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            {words[wordIndex]}
          </motion.span>
        </AnimatePresence>
      </motion.span>
      {suffix && <span className="ml-2">{suffix}</span>}
    </span>
  );
}





// Animated Music-themed Background with CSS Animations
function AnimatedMusicBackground({ isDark }: { isDark: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Base gradient layer */}
      <div
        className={`absolute inset-0 ${isDark
          ? 'bg-gradient-to-br from-[#1a0a10] via-[#2d0f1a] to-[#0a0508]'
          : 'bg-gradient-to-br from-rose-100 via-pink-50 to-rose-50'
          }`}
      />

      {/* Animated pulse waves - music visualizer effect */}
      <div className="absolute inset-0">
        {/* Wave 1 - Largest */}
        <div
          className="absolute left-1/2 top-1/2 w-[120vw] h-[120vh] rounded-full"
          style={{
            transform: 'translate(-50%, -50%)',
            background: isDark
              ? 'radial-gradient(circle, rgba(123, 30, 60, 0.4) 0%, rgba(91, 14, 44, 0.2) 50%, transparent 70%)'
              : 'radial-gradient(circle, rgba(251, 113, 133, 0.5) 0%, rgba(244, 114, 182, 0.3) 50%, transparent 70%)',
            filter: 'blur(40px)',
            animation: 'pulse-expand 4s ease-in-out infinite'
          }}
        />
        {/* Wave 2 - Medium */}
        <div
          className="absolute left-1/2 top-1/2 w-[100vw] h-[100vh] rounded-full"
          style={{
            transform: 'translate(-50%, -50%)',
            background: isDark
              ? 'radial-gradient(circle, rgba(155, 62, 92, 0.35) 0%, rgba(123, 30, 60, 0.2) 50%, transparent 70%)'
              : 'radial-gradient(circle, rgba(244, 114, 182, 0.45) 0%, rgba(251, 207, 232, 0.25) 50%, transparent 70%)',
            filter: 'blur(35px)',
            animation: 'pulse-expand 4s ease-in-out infinite 1s'
          }}
        />
        {/* Wave 3 - Smallest, brightest */}
        <div
          className="absolute left-1/2 top-1/2 w-[80vw] h-[80vh] rounded-full"
          style={{
            transform: 'translate(-50%, -50%)',
            background: isDark
              ? 'radial-gradient(circle, rgba(187, 94, 124, 0.3) 0%, rgba(155, 62, 92, 0.15) 50%, transparent 70%)'
              : 'radial-gradient(circle, rgba(253, 164, 175, 0.4) 0%, rgba(251, 207, 232, 0.2) 50%, transparent 70%)',
            filter: 'blur(30px)',
            animation: 'pulse-expand 4s ease-in-out infinite 2s'
          }}
        />
      </div>

      {/* Floating music note particles effect */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute w-6 h-6 rounded-full"
          style={{
            left: '20%', top: '30%',
            background: isDark ? 'rgba(123, 30, 60, 0.5)' : 'rgba(251, 113, 133, 0.4)',
            filter: 'blur(3px)',
            animation: 'float-up 6s ease-in-out infinite'
          }}
        />
        <div
          className="absolute w-4 h-4 rounded-full"
          style={{
            left: '70%', top: '60%',
            background: isDark ? 'rgba(155, 62, 92, 0.45)' : 'rgba(244, 114, 182, 0.35)',
            filter: 'blur(2px)',
            animation: 'float-up 5s ease-in-out infinite 1s'
          }}
        />
        <div
          className="absolute w-8 h-8 rounded-full"
          style={{
            left: '40%', top: '70%',
            background: isDark ? 'rgba(91, 14, 44, 0.4)' : 'rgba(253, 164, 175, 0.3)',
            filter: 'blur(4px)',
            animation: 'float-up 7s ease-in-out infinite 2s'
          }}
        />
        <div
          className="absolute w-3 h-3 rounded-full"
          style={{
            left: '85%', top: '40%',
            background: isDark ? 'rgba(187, 94, 124, 0.5)' : 'rgba(244, 114, 182, 0.4)',
            filter: 'blur(1px)',
            animation: 'float-up 4s ease-in-out infinite 0.5s'
          }}
        />
        <div
          className="absolute w-5 h-5 rounded-full"
          style={{
            left: '10%', top: '60%',
            background: isDark ? 'rgba(123, 30, 60, 0.35)' : 'rgba(251, 113, 133, 0.3)',
            filter: 'blur(2px)',
            animation: 'float-up 5.5s ease-in-out infinite 1.5s'
          }}
        />
      </div>

      {/* Vignette overlay for text focus */}
      <div
        className="absolute inset-0"
        style={{
          background: isDark
            ? 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.5) 100%)'
            : 'radial-gradient(ellipse at center, transparent 0%, rgba(255,255,255,0.3) 100%)'
        }}
      />
    </div>
  );
}

// Hero Section with Animated Music Background
function HeroSection({ isDark, t, isPaused, setIsPaused }: { isDark: boolean; t: (key: string) => string; isPaused: boolean; setIsPaused: (v: boolean) => void }) {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-4">
      {/* Animated Music Background */}
      <AnimatedMusicBackground isDark={isDark} />

      {/* Content */}
      <div className="relative z-10 text-center max-w-6xl mx-auto flex-1 flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          {/* SONORA Logo */}
          <div className="mb-2 md:mb-4 inline-block">
            <Image
              src="/sonora-logo.png"
              alt="SONORA"
              width={300}
              height={120}
              className="mx-auto h-16 md:h-24 lg:h-28 w-auto drop-shadow-2xl logo-adaptive"
              priority
            />
          </div>

          {/* Animated Subtitle with Word Cycling */}
          <motion.div
            className={`text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl mb-4 md:mb-6 w-full mx-auto font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            <AnimatedSubtitle isDark={isDark} t={t} isPaused={isPaused} />
          </motion.div>

          <motion.p
            className={`text-base md:text-lg mb-10 md:mb-14 max-w-xl mx-auto ${isDark ? 'text-white/70' : 'text-gray-600'}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            {t('hero.description')}
          </motion.p>

          {/* CTA Button - Apple Music style */}
          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
          >
            <a
              href="https://discord.com/oauth2/authorize?client_id=1443855259536461928&permissions=2534224044489536&integration_type=0&scope=bot+applications.commands"
              target="_blank"
              rel="noopener noreferrer"
              className={`group px-8 py-4 rounded-full font-semibold text-lg transition-all duration-300 flex items-center justify-center gap-2 ${isDark
                ? 'bg-white text-black hover:bg-white/90'
                : 'bg-[#7B1E3C] text-white hover:bg-[#9B2E4C]'
                }`}
            >
              <span>{t('hero.addBot')}</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>
            <DashboardButton isDark={isDark} />
          </motion.div>
        </motion.div>
      </div>

      {/* Gradient fade to next section */}
      <div className={`absolute bottom-0 left-0 right-0 h-40 pointer-events-none ${isDark
        ? 'bg-gradient-to-b from-transparent to-black'
        : 'bg-gradient-to-b from-transparent to-gray-50'
        }`} />
    </section>
  );
}

// Section Wrapper with Gradient Transition
function SectionWrapper({ children, isDark, className = "" }: { children: React.ReactNode; isDark: boolean; className?: string }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0.3, 1, 1, 0.3]);
  const y = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [50, 0, 0, -50]);

  return (
    <motion.div
      ref={ref}
      style={{ opacity, y }}
      className={`relative ${className}`}
    >
      {/* Top gradient overlay */}
      <div className={`absolute top-0 left-0 right-0 h-24 pointer-events-none z-10 ${isDark
        ? 'bg-gradient-to-b from-black to-transparent'
        : 'bg-gradient-to-b from-gray-50 to-transparent'
        }`} />

      {children}

      {/* Bottom gradient overlay */}
      <div className={`absolute bottom-0 left-0 right-0 h-24 pointer-events-none z-10 ${isDark
        ? 'bg-gradient-to-t from-black to-transparent'
        : 'bg-gradient-to-t from-gray-50 to-transparent'
        }`} />
    </motion.div>
  );
}

// Flip Card Component
function FlipCard({
  icon: Icon,
  title,
  description,
  details,
  color,
  isDark
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  details: string[];
  color: string;
  isDark: boolean;
}) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <motion.div
      className="relative h-72 md:h-80 perspective-1000"
      variants={fadeIn}
      onHoverStart={() => setIsFlipped(true)}
      onHoverEnd={() => setIsFlipped(false)}
      onTouchStart={() => setIsFlipped(!isFlipped)}
    >
      <motion.div
        className="relative w-full h-full transition-all duration-500 preserve-3d cursor-pointer"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
      >
        {/* Front */}
        <div className="absolute inset-0 backface-hidden">
          <div className={`h-full p-6 md:p-8 rounded-3xl border transition-all duration-300 flex flex-col ${isDark ? 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700' : 'bg-white/80 border-gray-200 hover:border-gray-300 shadow-lg'}`}>
            <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center mb-4 md:mb-6`}>
              <Icon className="w-6 h-6 md:w-7 md:h-7 text-white" />
            </div>
            <h3 className={`text-lg md:text-xl font-semibold mb-2 md:mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
            <p className={`text-sm md:text-base flex-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{description}</p>
            <div className="mt-4 flex items-center gap-2 text-sm text-primary">
              <span>Tap to learn more</span>
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Back */}
        <div className="absolute inset-0 backface-hidden rotate-y-180">
          <div className={`h-full p-6 md:p-8 rounded-3xl bg-gradient-to-br ${color} flex flex-col`}>
            <h3 className="text-lg md:text-xl font-bold mb-4 text-white">{title}</h3>
            <ul className="space-y-2 md:space-y-3 flex-1">
              {details.map((detail, index) => (
                <li key={index} className="flex items-start gap-2 text-sm md:text-base text-white/90">
                  <Check className="w-4 h-4 md:w-5 md:h-5 mt-0.5 shrink-0" />
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Features Section with Flip Cards
function FeaturesSection({ isDark, t }: { isDark: boolean; t: (key: string) => string }) {
  const features = [
    {
      icon: Headphones,
      title: "Multi-Source Playback",
      description: "Play music from Spotify, Apple Music, and YouTube with a single command.",
      details: [
        "Spotify tracks, albums & playlists",
        "Apple Music integration",
        "YouTube & YouTube Music support",
        "Automatic source detection",
        "3-tier fallback system"
      ],
      color: "from-green-500 to-emerald-600",
    },
    {
      icon: Zap,
      title: "High-Quality Audio",
      description: "256kbps Opus audio for crystal-clear sound. No compromises on quality.",
      details: [
        "256kbps bitrate streaming",
        "Opus codec optimization",
        "48kHz sample rate",
        "Low latency playback",
        "Discord-native audio"
      ],
      color: "from-yellow-500 to-orange-600",
    },
    {
      icon: List,
      title: "Smart Queue System",
      description: "FIFO queue per voice channel with shuffle, move, and auto-play.",
      details: [
        "Up to 100 tracks per queue",
        "Shuffle & loop modes",
        "Move & remove tracks",
        "Auto-play suggestions",
        "Save queue as playlist"
      ],
      color: "from-blue-500 to-cyan-600",
    },
    {
      icon: Clock,
      title: "Instant Playback",
      description: "Smart caching and pre-fetching for zero-wait music experience.",
      details: [
        "Intelligent track caching",
        "Pre-fetch next tracks",
        "Parallel downloads",
        "Cache management",
        "< 2 second start time"
      ],
      color: "from-primary to-accent",
    },
    {
      icon: Globe,
      title: "Web Dashboard",
      description: "Control your bot from anywhere with real-time web dashboard.",
      details: [
        "Real-time playback control",
        "Server management",
        "Play history & analytics",
        "Broadcast messages",
        "Mobile responsive"
      ],
      color: "from-rose-500 to-red-600",
    },
    {
      icon: Shield,
      title: "Robust & Reliable",
      description: "Auto-reconnect, error recovery, and 24/7 uptime monitoring.",
      details: [
        "Auto voice reconnect",
        "Error recovery system",
        "Rate limit handling",
        "Database persistence",
        "Health monitoring"
      ],
      color: "from-indigo-500 to-violet-600",
    },
  ];

  return (
    <section id="features-section" className={`py-24 md:py-36 px-4 relative ${isDark ? 'bg-zinc-950' : 'bg-gray-50'}`}>
      <div className="max-w-6xl mx-auto relative z-20">
        <motion.div
          className="text-center mb-12 md:mb-20"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className={`text-3xl md:text-5xl font-bold mb-4 md:mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {t('features.title')}
          </h2>
          <p className={`text-base md:text-xl max-w-2xl mx-auto ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {t('features.subtitle')}
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
          variants={stagger}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
        >
          {features.map((feature, index) => (
            <FlipCard key={index} {...feature} isDark={isDark} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// Music Sources Section with Real Logos
function SourcesSection({ isDark, t }: { isDark: boolean; t: (key: string) => string }) {
  const sources = [
    { name: "Spotify", color: "#1DB954", logo: "/spotify.svg" },
    { name: "Apple Music", color: "#FC3C44", logo: "/apple-music.svg" },
    { name: "YouTube Music", color: "#FF0000", logo: "/youtube.svg" },
  ];

  return (
    <section className={`py-24 md:py-36 px-4 relative ${isDark ? 'bg-black' : 'bg-white'}`}>
      <div className="max-w-6xl mx-auto relative z-20">
        <motion.div
          className="text-center mb-12 md:mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className={`text-3xl md:text-5xl font-bold mb-4 md:mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {t('sources.title')}
          </h2>
          <p className={`text-base md:text-xl ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {t('sources.subtitle')}
          </p>
        </motion.div>

        <div className="flex flex-wrap justify-center gap-8 md:gap-16">
          {sources.map((source, index) => (
            <motion.div
              key={index}
              className="flex flex-col items-center"
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.1, y: -5 }}
            >
              <div
                className="w-28 h-28 md:w-36 md:h-36 rounded-2xl md:rounded-3xl flex items-center justify-center mb-4 transition-shadow hover:shadow-xl"
                style={{
                  backgroundColor: `${source.color}15`,
                  border: `2px solid ${source.color}`,
                  boxShadow: `0 0 30px ${source.color}30`
                }}
              >
                <Image
                  src={source.logo}
                  alt={source.name}
                  width={64}
                  height={64}
                  className="w-14 h-14 md:w-18 md:h-18"
                  style={{ color: source.color }}
                />
              </div>
              <span className={`text-base md:text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{source.name}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Animated Live Lyrics Component
function AnimatedLyrics({ isDark, t }: { isDark: boolean; t: (key: string) => string }) {
  const lyrics = [
    { time: "0:42", text: "I've been tryna call", active: false },
    { time: "0:45", text: "I've been on my own for long enough", active: false },
    { time: "0:48", text: "Maybe you can show me how to love, maybe", active: true },
    { time: "0:53", text: "I'm going through withdrawals", active: false },
    { time: "0:56", text: "You don't even have to do too much", active: false },
  ];

  const [currentLine, setCurrentLine] = useState(2);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentLine((prev) => (prev + 1) % lyrics.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [lyrics.length]);

  return (
    <div className={`rounded-xl p-4 ${isDark ? 'bg-zinc-800/50' : 'bg-gray-100'}`}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{t('player.lyrics')}</span>
      </div>
      <div className="space-y-2">
        {lyrics.map((line, index) => (
          <motion.div
            key={index}
            className={`flex items-center gap-3 transition-all duration-500 ${index === currentLine
              ? 'opacity-100 scale-100'
              : Math.abs(index - currentLine) === 1
                ? 'opacity-60 scale-95'
                : 'opacity-30 scale-90'
              }`}
            animate={index === currentLine ? {
              opacity: [0.8, 1, 0.8],
              scale: [0.98, 1, 0.98],
            } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <span className={`text-xs font-mono w-10 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{line.time}</span>
            <span className={`text-sm md:text-base font-medium transition-colors ${index === currentLine
              ? 'text-primary'
              : isDark ? 'text-gray-300' : 'text-gray-700'
              }`}>
              {line.text}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Player Preview Section - Redesigned
function PlayerPreviewSection({ isDark, t }: { isDark: boolean; t: (key: string) => string }) {
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setProgress((prev) => (prev >= 100 ? 0 : prev + 0.5));
    }, 100);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const formatTime = (percent: number) => {
    const totalSeconds = Math.floor((percent / 100) * 200);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <section className={`py-24 md:py-36 px-4 relative ${isDark ? 'bg-zinc-950' : 'bg-gray-50'}`}>
      <div className="max-w-6xl mx-auto relative z-20">
        <div className="grid lg:grid-cols-2 gap-10 md:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className={`text-3xl md:text-5xl font-bold mb-4 md:mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {t('player.titleText')} <span className="text-gradient">{t('player.titleHighlight')}</span> {t('player.titleEnd')}
            </h2>
            <p className={`text-base md:text-xl mb-6 md:mb-8 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {t('player.subtitle')}
            </p>
            <ul className="space-y-3 md:space-y-4">
              {[
                t('player.feature1'),
                t('player.feature2'),
                t('player.feature3'),
                t('player.feature4'),
              ].map((item, index) => (
                <motion.li
                  key={index}
                  className={`flex items-center gap-3 text-base md:text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                  <span>{item}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Player mockup - SONORA Style */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className={`rounded-2xl md:rounded-3xl p-4 md:p-6 border glow-primary ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200 shadow-xl'}`}>
              {/* Header - NOW PLAYING */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <motion.div
                    className="w-3 h-3 rounded-full bg-green-500"
                    animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">{t('player.nowPlaying')}</span>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1 bg-primary rounded-full"
                      animate={{ height: ["8px", "16px", "8px"] }}
                      transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                    />
                  ))}
                </div>
              </div>

              {/* Main Content */}
              <div className={`rounded-xl p-4 border-l-4 border-primary ${isDark ? 'bg-zinc-800/50' : 'bg-gray-50'}`}>
                <div className="flex gap-4">
                  {/* Album art */}
                  <motion.div
                    className="w-24 h-24 md:w-28 md:h-28 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center shrink-0 overflow-hidden"
                    animate={{ scale: isPlaying ? [1, 1.02, 1] : 1 }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Music className="w-10 h-10 md:w-12 md:h-12 text-white" />
                  </motion.div>

                  {/* Track info */}
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-lg md:text-xl font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>Blinding Lights</h4>
                    <p className={`text-sm md:text-base truncate ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>The Weeknd</p>

                    {/* Request by & Source */}
                    <div className={`mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span>Request by:</span>
                        <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>@username</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span>Source:</span>
                        <Image src="/spotify.svg" alt="Spotify" width={14} height={14} className="inline" style={{ filter: 'brightness(0) saturate(100%) invert(62%) sepia(74%) saturate(401%) hue-rotate(87deg) brightness(94%) contrast(89%)' }} />
                        <span className="text-green-500">Spotify</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Lyrics */}
              <div className="mt-4">
                <AnimatedLyrics isDark={isDark} t={t} />
              </div>

              {/* Progress Bar */}
              <div className="mt-4">
                <div className={`flex justify-between text-xs mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  <span>TIME</span>
                  <span className="font-mono">{formatTime(progress)} / 3:20</span>
                </div>
                <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-zinc-700' : 'bg-gray-200'}`}>
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary to-accent rounded-full progress-active relative"
                    style={{ width: `${progress}%` }}
                  >
                    <motion.div
                      className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg"
                      whileHover={{ scale: 1.3 }}
                    />
                  </motion.div>
                </div>
                <div className={`text-center text-xs mt-1 font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  <span className="text-primary">DYNAMIC</span> / NOW BAR
                </div>
              </div>

              {/* Controls */}
              <div className="mt-4">
                <div className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Controls Menu</div>
                <div className="flex justify-center items-center gap-3 md:gap-4">
                  {[
                    { icon: Shuffle, size: "w-4 h-4" },
                    { icon: SkipBack, size: "w-5 h-5" },
                    { icon: isPlaying ? Pause : Play, size: "w-6 h-6", primary: true },
                    { icon: SkipForward, size: "w-5 h-5" },
                    { icon: Repeat, size: "w-4 h-4" },
                    { icon: Volume2, size: "w-4 h-4" },
                  ].map((item, index) => (
                    <motion.button
                      key={index}
                      className={`rounded-full flex items-center justify-center transition-colors ${item.primary
                        ? 'w-12 h-12 bg-primary hover:bg-primary-hover text-white'
                        : `w-9 h-9 ${isDark ? 'bg-zinc-700 hover:bg-zinc-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`
                        }`}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => item.primary && setIsPlaying(!isPlaying)}
                    >
                      <item.icon className={item.size} />
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// CTA Section
function CTASection({ isDark, t }: { isDark: boolean; t: (key: string) => string }) {
  return (
    <section className={`py-24 md:py-36 px-4 relative ${isDark ? 'bg-black' : 'bg-white'}`}>
      <div className="max-w-4xl mx-auto relative z-20">
        <motion.div
          className={`text-center p-8 md:p-12 rounded-2xl md:rounded-3xl border ${isDark ? 'bg-gradient-to-br from-primary/20 to-accent/20 border-primary/30' : 'bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20'}`}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className={`text-3xl md:text-5xl font-bold mb-4 md:mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {t('cta.title')}
          </h2>
          <p className={`text-base md:text-xl mb-6 md:mb-8 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {t('cta.subtitle')}
          </p>
          <motion.a
            href="https://discord.com/oauth2/authorize?client_id=1443855259536461928&permissions=2534224044489536&integration_type=0&scope=bot+applications.commands"
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 px-8 md:px-10 py-4 md:py-5 rounded-full font-bold text-base md:text-lg transition-colors ${isDark ? 'bg-white text-black hover:bg-gray-200' : 'bg-primary text-white hover:bg-primary-hover'}`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            <span>{t('cta.button')}</span>
            <ArrowRight className="w-5 h-5" />
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
}

// Main Page Component
function HomeContent() {
  const { isDark, t } = useSettings();
  const [isAnimationPaused, setIsAnimationPaused] = useState(false);

  return (
    <main className={`min-h-screen overflow-x-hidden transition-colors duration-300 ${isDark ? 'bg-black text-white' : 'bg-white text-gray-900'}`}>
      <HeroSection isDark={isDark} t={t} isPaused={isAnimationPaused} setIsPaused={setIsAnimationPaused} />
      <FeaturesSection isDark={isDark} t={t} />
      <SourcesSection isDark={isDark} t={t} />
      <PlayerPreviewSection isDark={isDark} t={t} />
      <CTASection isDark={isDark} t={t} />
      <Footer />
    </main>
  );
}

export default function Home() {
  return <HomeContent />;
}

