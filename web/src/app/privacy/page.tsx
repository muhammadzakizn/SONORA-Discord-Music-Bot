"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Shield, Calendar, Database, Eye, Trash2, Lock } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import { Footer } from "@/components/Footer";

export default function PrivacyPolicyPage() {
    const { isDark } = useSettings();

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
                        <Shield className="w-8 h-8 text-[#7B1E3C]" />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold mb-4">Privacy Policy</h1>
                    <div className={`flex items-center justify-center gap-2 text-sm ${isDark ? 'text-white/60' : 'text-gray-500'
                        }`}>
                        <Calendar className="w-4 h-4" />
                        <span>Last updated: {lastUpdated}</span>
                    </div>
                </div>

                {/* Quick Summary */}
                <div className={`p-6 rounded-2xl mb-10 ${isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200'
                    }`}>
                    <h2 className="text-lg font-semibold mb-4">Quick Summary</h2>
                    <div className="grid gap-4 md:grid-cols-2">
                        <QuickInfo icon={Database} title="What We Collect" description="Discord IDs, usernames, and command usage" isDark={isDark} />
                        <QuickInfo icon={Eye} title="How We Use It" description="To provide and improve the music bot service" isDark={isDark} />
                        <QuickInfo icon={Lock} title="Data Security" description="We use secure storage and don't share your data" isDark={isDark} />
                        <QuickInfo icon={Trash2} title="Your Rights" description="You can request data deletion at any time" isDark={isDark} />
                    </div>
                </div>

                {/* Content Sections */}
                <div className="space-y-8">
                    <Section title="1. Information We Collect" isDark={isDark}>
                        <p>
                            When you use SONORA Discord Music Bot, we collect the following information:
                        </p>
                        <SubSection title="1.1 Discord Account Information" isDark={isDark}>
                            <ul>
                                <li><strong>User ID:</strong> Your unique Discord identifier</li>
                                <li><strong>Username:</strong> Your Discord username and display name</li>
                                <li><strong>Avatar:</strong> Your Discord profile picture URL</li>
                            </ul>
                        </SubSection>
                        <SubSection title="1.2 Server Information" isDark={isDark}>
                            <ul>
                                <li><strong>Server ID:</strong> The unique identifier of servers where SONORA is added</li>
                                <li><strong>Server Name:</strong> The name of the Discord server</li>
                                <li><strong>Server Settings:</strong> Bot configuration preferences (volume, DJ role, etc.)</li>
                            </ul>
                        </SubSection>
                        <SubSection title="1.3 Usage Data" isDark={isDark}>
                            <ul>
                                <li><strong>Command History:</strong> Commands you execute with the bot</li>
                                <li><strong>Play History:</strong> Tracks you've played (title, artist, duration)</li>
                                <li><strong>Timestamps:</strong> When actions were performed</li>
                            </ul>
                        </SubSection>
                    </Section>

                    <Section title="2. How We Use Your Information" isDark={isDark}>
                        <p>We use the collected information for the following purposes:</p>
                        <ul>
                            <li><strong>Service Provision:</strong> To operate the music bot and its features</li>
                            <li><strong>Authentication:</strong> To verify your identity for the web dashboard</li>
                            <li><strong>Personalization:</strong> To save your preferences and settings</li>
                            <li><strong>Analytics:</strong> To understand usage patterns and improve the service</li>
                            <li><strong>Support:</strong> To assist you with issues and questions</li>
                        </ul>
                    </Section>

                    <Section title="3. Data Storage and Security" isDark={isDark}>
                        <p>
                            Your data is stored securely on our servers. We implement appropriate technical
                            and organizational measures to protect your information against unauthorized access,
                            alteration, disclosure, or destruction.
                        </p>
                        <ul>
                            <li>Data is stored in encrypted databases</li>
                            <li>Access to data is restricted to authorized personnel only</li>
                            <li>We use secure HTTPS connections for all data transfers</li>
                            <li>Regular security audits are conducted</li>
                        </ul>
                    </Section>

                    <Section title="4. Data Sharing" isDark={isDark}>
                        <p>
                            We do <strong>not</strong> sell, trade, or share your personal information with third parties,
                            except in the following circumstances:
                        </p>
                        <ul>
                            <li><strong>Legal Requirements:</strong> If required by law or legal process</li>
                            <li><strong>Protection:</strong> To protect our rights, privacy, safety, or property</li>
                            <li><strong>Consent:</strong> With your explicit consent</li>
                        </ul>
                    </Section>

                    <Section title="5. Data Retention" isDark={isDark}>
                        <p>We retain your data for as long as:</p>
                        <ul>
                            <li>The bot remains active in your server</li>
                            <li>Your account is associated with active bot usage</li>
                            <li>Required by applicable laws or regulations</li>
                        </ul>
                        <p>
                            Inactive data may be automatically purged after 12 months of no activity.
                        </p>

                        <SubSection title="5.1 Support Ticket Retention Policy" isDark={isDark}>
                            <div className={`p-4 rounded-xl border ${isDark ? 'bg-rose-500/10 border-rose-500/30' : 'bg-rose-50 border-rose-200'}`}>
                                <p className="font-semibold text-rose-500 mb-2">⚠️ IMPORTANT NOTICE</p>
                                <ul>
                                    <li><strong>Maximum Retention:</strong> All support tickets and related data are automatically deleted <strong>15 days after resolution or closure</strong></li>
                                    <li><strong>Immutable Policy:</strong> This is our maximum retention period and <strong>cannot be extended</strong> under any circumstances</li>
                                    <li><strong>Accelerated Deletion:</strong> Users may request earlier deletion for privacy concerns</li>
                                    <li><strong>Minimal Metadata:</strong> Only ticket code hash and deletion timestamp kept for 30 days for verification only</li>
                                    <li><strong>No Personal Information:</strong> No personal data retained after deletion</li>
                                </ul>
                            </div>
                        </SubSection>

                        <SubSection title="5.2 Ban Records Retention" isDark={isDark}>
                            <ul>
                                <li><strong>Active Bans:</strong> Ban records maintained while ban is active</li>
                                <li><strong>Expired Bans:</strong> Automatically deleted 90 days after ban expiration</li>
                                <li><strong>Appeal Records:</strong> Kept for 30 days after appeal resolution</li>
                            </ul>
                        </SubSection>
                    </Section>

                    <Section title="6. Your Rights" isDark={isDark}>
                        <p>You have the following rights regarding your data:</p>
                        <ul>
                            <li><strong>Access:</strong> Request a copy of your stored data</li>
                            <li><strong>Correction:</strong> Request correction of inaccurate data</li>
                            <li><strong>Deletion:</strong> Request deletion of your data</li>
                            <li><strong>Portability:</strong> Receive your data in a portable format</li>
                        </ul>
                        <p>
                            To exercise these rights, contact us via Discord (@thixxert) or WhatsApp (+62 851-5611-0231).
                        </p>
                    </Section>

                    <Section title="7. Third-Party Services" isDark={isDark}>
                        <p>
                            SONORA integrates with the following third-party services:
                        </p>
                        <ul>
                            <li><strong>Discord:</strong> For bot functionality and OAuth authentication</li>
                            <li><strong>Spotify:</strong> For music metadata and playback</li>
                            <li><strong>YouTube:</strong> For music streaming</li>
                            <li><strong>Apple Music:</strong> For music catalog access</li>
                        </ul>
                        <p>
                            Your use of these services is governed by their respective privacy policies.
                        </p>
                    </Section>

                    <Section title="8. Children's Privacy" isDark={isDark}>
                        <p>
                            SONORA is not intended for users under 13 years of age (or the minimum age
                            required by Discord in your country). We do not knowingly collect personal
                            information from children.
                        </p>
                    </Section>

                    <Section title="9. Changes to This Policy" isDark={isDark}>
                        <p>
                            We may update this Privacy Policy from time to time. We will notify users of
                            significant changes through our Discord support server or dashboard announcements.
                        </p>
                    </Section>

                    <Section title="10. Contact Us" isDark={isDark}>
                        <p>For privacy-related questions or concerns, please contact us:</p>
                        <ul>
                            <li>Discord: <a href="https://discord.com/users/thixxert" target="_blank" rel="noopener noreferrer" className="text-[#7B1E3C] hover:underline">@thixxert</a></li>
                            <li>WhatsApp: <a href="https://wa.me/6285156110231" target="_blank" rel="noopener noreferrer" className="text-[#7B1E3C] hover:underline">+62 851-5611-0231</a></li>
                        </ul>
                    </Section>
                </div>
            </motion.main>
            <Footer />
        </div>
    );
}

// Quick Info Component
function QuickInfo({ icon: Icon, title, description, isDark }: {
    icon: React.ElementType;
    title: string;
    description: string;
    isDark: boolean
}) {
    return (
        <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}>
                <Icon className="w-5 h-5 text-[#7B1E3C]" />
            </div>
            <div>
                <h3 className="font-medium">{title}</h3>
                <p className={`text-sm ${isDark ? 'text-white/60' : 'text-gray-500'}`}>{description}</p>
            </div>
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

// SubSection Component
function SubSection({ title, children, isDark }: { title: string; children: React.ReactNode; isDark: boolean }) {
    return (
        <div className="mt-4">
            <h3 className={`font-medium mb-2 ${isDark ? 'text-white/90' : 'text-gray-800'}`}>
                {title}
            </h3>
            <div className={isDark ? 'text-white/70' : 'text-gray-600'}>
                {children}
            </div>
        </div>
    );
}
