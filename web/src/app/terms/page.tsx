"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, FileText, Calendar } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";

export default function TermsOfServicePage() {
    const { isDark, t } = useSettings();

    const lastUpdated = "December 9, 2025";

    return (
        <div className={`min-h-screen ${isDark ? 'bg-black text-white' : 'bg-gray-50 text-gray-900'}`}>
            {/* Header */}
            <header className={`sticky top-0 z-40 backdrop-blur-xl border-b ${isDark ? 'bg-black/80 border-white/10' : 'bg-white/80 border-gray-200'
                }`}>
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
                    <Link
                        href="/"
                        className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                            }`}
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="flex items-center gap-3">
                        <Image
                            src="/sonora-logo.png"
                            alt="SONORA"
                            width={100}
                            height={40}
                            className="h-8 w-auto"
                        />
                    </div>
                </div>
            </header>

            {/* Content */}
            <motion.main
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-4xl mx-auto px-4 py-12 pb-32"
            >
                {/* Title Section */}
                <div className="text-center mb-12">
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6 ${isDark ? 'bg-[#7B1E3C]/20' : 'bg-[#7B1E3C]/10'
                        }`}>
                        <FileText className="w-8 h-8 text-[#7B1E3C]" />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold mb-4">Terms of Service</h1>
                    <div className={`flex items-center justify-center gap-2 text-sm ${isDark ? 'text-white/60' : 'text-gray-500'
                        }`}>
                        <Calendar className="w-4 h-4" />
                        <span>Last updated: {lastUpdated}</span>
                    </div>
                </div>

                {/* Content Sections */}
                <div className={`prose max-w-none ${isDark ? 'prose-invert' : ''}`}>
                    <Section title="1. Acceptance of Terms" isDark={isDark}>
                        <p>
                            By using the SONORA Discord Music Bot ("the Bot", "we", "our", "us"),
                            you agree to be bound by these Terms of Service. If you do not agree
                            to these terms, please do not use the Bot.
                        </p>
                        <p>
                            These terms apply to all users of the Bot, including server administrators
                            who add the Bot to their Discord servers and regular users who interact
                            with the Bot.
                        </p>
                    </Section>

                    <Section title="2. Description of Service" isDark={isDark}>
                        <p>
                            SONORA is a Discord music bot that allows users to play music from various
                            sources including Spotify, Apple Music, and YouTube in Discord voice channels.
                            The Bot provides the following features:
                        </p>
                        <ul>
                            <li>Music playback from multiple sources</li>
                            <li>Queue management and playback controls</li>
                            <li>Web-based dashboard for server management</li>
                            <li>Real-time playback status and lyrics display</li>
                        </ul>
                    </Section>

                    <Section title="3. User Responsibilities" isDark={isDark}>
                        <p>When using SONORA, you agree to:</p>
                        <ul>
                            <li>Use the Bot in compliance with Discord's Terms of Service</li>
                            <li>Not use the Bot for any illegal purposes</li>
                            <li>Not attempt to exploit, abuse, or manipulate the Bot's functionality</li>
                            <li>Not use automated systems to interact with the Bot in an abusive manner</li>
                            <li>Respect the intellectual property rights of content creators</li>
                        </ul>
                    </Section>

                    <Section title="4. Data Collection and Privacy" isDark={isDark}>
                        <p>
                            To provide our services, we collect and process certain data.
                            Please refer to our <Link href="/privacy" className="text-[#7B1E3C] hover:underline">Privacy Policy</Link> for
                            detailed information about what data we collect and how we use it.
                        </p>
                        <p>In summary, we collect:</p>
                        <ul>
                            <li>Discord User IDs and usernames</li>
                            <li>Server (Guild) IDs where the Bot is active</li>
                            <li>Command usage and play history</li>
                            <li>Bot configuration settings per server</li>
                        </ul>
                    </Section>

                    <Section title="5. Intellectual Property" isDark={isDark}>
                        <p>
                            The SONORA Bot, including its source code, design, logos, and documentation,
                            is the intellectual property of the SONORA development team. The music content
                            played through the Bot is owned by their respective copyright holders.
                        </p>
                        <p>
                            SONORA does not host or store any music files. We only facilitate playback
                            from third-party sources that users have access to.
                        </p>
                    </Section>

                    <Section title="6. Limitation of Liability" isDark={isDark}>
                        <p>
                            SONORA is provided "as is" without warranties of any kind. We do not guarantee:
                        </p>
                        <ul>
                            <li>Continuous, uninterrupted access to the Bot</li>
                            <li>That the Bot will be free from errors or bugs</li>
                            <li>The availability of any specific music source</li>
                            <li>The accuracy of lyrics or metadata</li>
                        </ul>
                        <p>
                            To the maximum extent permitted by law, we are not liable for any damages
                            arising from the use or inability to use the Bot.
                        </p>
                    </Section>

                    <Section title="7. Service Modifications" isDark={isDark}>
                        <p>
                            We reserve the right to modify, suspend, or discontinue the Bot at any time,
                            with or without notice. We may also update these Terms of Service periodically,
                            and continued use of the Bot after such changes constitutes acceptance of the
                            new terms.
                        </p>
                    </Section>

                    <Section title="8. Account Suspension and Bans" isDark={isDark}>
                        <p>
                            We reserve the right to suspend or ban any user or server that violates these Terms of Service.
                        </p>
                        <h3 className={`font-semibold mt-4 mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>8.1 Ban Reasons</h3>
                        <ul>
                            <li>Violation of Discord Terms of Service</li>
                            <li>Abuse or exploitation of the Bot's functionality</li>
                            <li>Harassment of other users or bot developers</li>
                            <li>Spam or automated abuse</li>
                            <li>Copyright infringement violations</li>
                            <li>Distribution of malicious content</li>
                        </ul>
                        <h3 className={`font-semibold mt-4 mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>8.2 Ban Types</h3>
                        <ul>
                            <li><strong>Temporary Ban:</strong> Access restricted for specified duration (hours to months)</li>
                            <li><strong>Permanent Ban:</strong> Permanent removal of access to the Bot</li>
                            <li><strong>Server Ban:</strong> Entire server blocked from using the Bot</li>
                        </ul>
                        <h3 className={`font-semibold mt-4 mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>8.3 Appeal Process</h3>
                        <p>
                            Banned users may appeal their ban by contacting support at{' '}
                            <a href="https://s.id/SONORAbotSUPPORT" target="_blank" rel="noopener noreferrer" className="text-[#7B1E3C] hover:underline">
                                https://s.id/SONORAbotSUPPORT
                            </a>. Appeals are reviewed within 7 business days.
                        </p>
                    </Section>

                    <Section title="9. Support Ticket Policies" isDark={isDark}>
                        <ul>
                            <li><strong>Data Retention:</strong> Support tickets are automatically deleted 15 days after resolution</li>
                            <li><strong>Follow-up:</strong> Users may add additional details to a ticket once after submission</li>
                            <li><strong>Response Time:</strong> We aim to respond within 24-48 hours</li>
                            <li><strong>Prohibited Content:</strong> Do not submit spam, illegal content, or abusive messages</li>
                        </ul>
                    </Section>

                    <Section title="9. Contact Information" isDark={isDark}>
                        <p>
                            If you have any questions about these Terms of Service, please contact us:
                        </p>
                        <ul>
                            <li>Discord: <a href="https://discord.com/users/thixxert" target="_blank" rel="noopener noreferrer" className="text-[#7B1E3C] hover:underline">@thixxert</a></li>
                            <li>WhatsApp: <a href="https://wa.me/6285156110231" target="_blank" rel="noopener noreferrer" className="text-[#7B1E3C] hover:underline">+62 851-5611-0231</a></li>
                        </ul>
                    </Section>
                </div>
            </motion.main>
        </div>
    );
}

// Section Component
function Section({ title, children, isDark }: { title: string; children: React.ReactNode; isDark: boolean }) {
    return (
        <section className="mb-8">
            <h2 className={`text-xl font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {title}
            </h2>
            <div className={`space-y-4 ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
                {children}
            </div>
        </section>
    );
}
