"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

// Supported languages
export type Language = 'en' | 'id' | 'zh' | 'ru' | 'ja' | 'th' | 'ar';

export const LANGUAGES: Record<Language, { name: string; nativeName: string; dir: 'ltr' | 'rtl' }> = {
    en: { name: 'English', nativeName: 'English', dir: 'ltr' },
    id: { name: 'Indonesian', nativeName: 'Bahasa Indonesia', dir: 'ltr' },
    zh: { name: 'Chinese', nativeName: '中文', dir: 'ltr' },
    ru: { name: 'Russian', nativeName: 'Русский', dir: 'ltr' },
    ja: { name: 'Japanese', nativeName: '日本語', dir: 'ltr' },
    th: { name: 'Thai', nativeName: 'ไทย', dir: 'ltr' },
    ar: { name: 'Arabic', nativeName: 'العربية', dir: 'rtl' },
};

interface SettingsContextType {
    // Language
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;

    // Theme
    theme: 'dark' | 'light' | 'system';
    setTheme: (theme: 'dark' | 'light' | 'system') => void;
    isDark: boolean;

    // Accessibility
    reducedMotion: boolean;
    setReducedMotion: (value: boolean) => void;
    highContrast: boolean;
    setHighContrast: (value: boolean) => void;
    fontSize: 'normal' | 'large' | 'xlarge';
    setFontSize: (size: 'normal' | 'large' | 'xlarge') => void;
    dyslexicFont: boolean;
    setDyslexicFont: (value: boolean) => void;

    // Settings panel
    isSettingsOpen: boolean;
    openSettings: () => void;
    closeSettings: () => void;
    toggleSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

// Comprehensive translations for all page content
const translations: Record<Language, Record<string, string>> = {
    en: {
        // Navigation
        'nav.home': 'Home',
        'nav.dashboard': 'Dashboard',
        'nav.settings': 'Settings',
        'nav.logout': 'Logout',
        'nav.developer': 'Developer',
        'nav.github': 'GitHub',

        // Settings Panel
        'settings.title': 'Settings',
        'settings.language': 'Language',
        'settings.theme': 'Theme',
        'settings.theme.light': 'Light',
        'settings.theme.dark': 'Dark',
        'settings.theme.system': 'System',
        'settings.accessibility': 'Accessibility',
        'settings.reducedMotion': 'Reduced Motion',
        'settings.reducedMotion.desc': 'Disable animations and transitions',
        'settings.highContrast': 'High Contrast',
        'settings.highContrast.desc': 'Increase color contrast for better visibility',
        'settings.fontSize': 'Font Size',
        'settings.dyslexicFont': 'Dyslexic-Friendly Font',
        'settings.dyslexicFont.desc': 'Use OpenDyslexic font for easier reading',
        'settings.support': 'Help & Support',
        'settings.support.whatsapp': 'WhatsApp',
        'settings.support.discord': 'Discord',
        'settings.support.addBot': 'Add Bot to Server',
        'settings.support.addBot.desc': 'Invite SONORA',

        // Common
        'common.save': 'Save',
        'common.cancel': 'Cancel',
        'common.close': 'Close',
        'common.back': 'Back',
        'common.backToHome': 'Back to Home',

        // Hero Section
        'hero.subtitleThe': 'The',
        'hero.subtitleWords': 'Awesome,Powerful,Amazing,Premium,Incredible',
        'hero.subtitleEnd': 'Discord Music Bot',
        'hero.subtitle': 'The Awesome Discord Music Bot',
        'hero.description': 'Experience crystal-clear music with advanced features. Fast, reliable, and easy to use.',
        'hero.addBot': 'Add SONORA Now',
        'hero.scrollDown': 'Scroll Down',

        // Features Section
        'features.title': 'Premium Features',
        'features.subtitle': 'Everything you need for the perfect music experience',
        'features.quality.title': 'High Quality Audio',
        'features.quality.desc': 'Crystal clear audio with support for lossless formats',
        'features.fast.title': 'Lightning Fast',
        'features.fast.desc': 'Sub-second response times with optimized performance',
        'features.reliable.title': 'Always Online',
        'features.reliable.desc': '99.9% uptime guarantee with automatic recovery',
        'features.easy.title': 'Easy to Use',
        'features.easy.desc': 'Simple commands and intuitive controls',

        // Sources Section
        'sources.title': 'Multi-Platform Support',
        'sources.subtitle': 'Play music from your favorite platforms',
        'sources.spotify': 'Spotify',
        'sources.youtube': 'YouTube',
        'sources.apple': 'Apple Music',
        'sources.soundcloud': 'SoundCloud',

        // Player Preview
        'player.title': 'Music Player Preview',
        'player.titleText': 'Beautiful',
        'player.titleHighlight': 'real-time',
        'player.titleEnd': 'player',
        'player.subtitle': 'Watch your music come alive with synchronized progress bars, live lyrics, and beautiful album artwork.',
        'player.feature1': 'Real-time progress bar sync',
        'player.feature2': 'Album artwork display',
        'player.feature3': 'Live synced lyrics',
        'player.feature4': 'Interactive controls',
        'player.nowPlaying': 'Now Playing',
        'player.lyrics': 'Live Lyrics',

        // CTA Section
        'cta.title': 'Ready to Start?',
        'cta.subtitle': 'Add SONORA to your server now and enjoy premium music experience',
        'cta.button': 'Add SONORA Now',

        // Footer
        'footer.madeWith': 'Made with ❤️',
        'footer.copyright': '© 2024 SONORA Bot',

        // Login Page
        'login.welcome': 'Welcome Back',
        'login.chooseMethod': 'Choose how you want to sign in',
        'login.admin': 'Admin Dashboard',
        'login.admin.desc': 'Sign in with Discord',
        'login.developer': 'Developer Console',
        'login.developer.desc': 'Private access only',
        'login.or': 'OR',
        'login.adminTitle': 'Admin Login',
        'login.adminDesc': 'Connect your Discord account to manage servers',
        'login.continueDiscord': 'Continue with Discord',
        'login.termsNotice': 'By signing in, you agree to our Terms of Service and Privacy Policy',
        'login.devTitle': 'Developer Login',
        'login.devDesc': 'Enter your credentials to access the console',
        'login.username': 'Username',
        'login.password': 'Password',
        'login.enterUsername': 'Enter username',
        'login.enterPassword': 'Enter password',
        'login.signIn': 'Sign In',
        'login.invalidCredentials': 'Invalid credentials',

        // Admin Dashboard
        'admin.title': 'Admin Dashboard',
        'admin.menu': 'Menu',
        'admin.dashboard': 'Dashboard',
        'admin.servers': 'Servers',
        'admin.history': 'History',
        'admin.settings': 'Settings',
        'admin.profile': 'Profile',
        'admin.backToHome': 'Back to Home',
        'admin.logout': 'Logout',
        'admin.loading': 'Loading session...',

        // Dashboard Page
        'dashboard.welcome': 'Welcome back',
        'dashboard.accessInfo': 'You have admin access to {count} servers.',
        'dashboard.botStatus.connected': 'Bot connected and running',
        'dashboard.botStatus.disconnected': 'Bot disconnected',
        'dashboard.stats.yourServers': 'Your Servers',
        'dashboard.stats.botServers': 'Bot Servers',
        'dashboard.stats.voiceConnections': 'Voice Connections',
        'dashboard.stats.uptime': 'Uptime',
        'dashboard.managedServers': 'Your Managed Servers',
        'dashboard.botActive': 'Bot Active',
        'dashboard.addBot': 'Add Bot',
        'dashboard.owner': 'Owner',
        'dashboard.admin': 'Admin',
        'dashboard.systemHealth': 'System Health',
        'dashboard.cpu': 'CPU',
        'dashboard.memory': 'Memory',
        'dashboard.database': 'Database',
        'dashboard.latency': 'Latency',

        // Servers Page
        'servers.title': 'Servers',
        'servers.subtitle': 'Manage servers where SONORA is active',
        'servers.search': 'Search servers...',
        'servers.refresh': 'Refresh',
        'servers.all': 'All Servers',
        'servers.yourServers': 'Your Servers',
        'servers.noServers': 'No servers found',
        'servers.nowPlaying': 'Now Playing',
        'servers.idle': 'Idle',
        'servers.queue': 'Queue',
        'servers.tracks': 'tracks',
        'servers.viewDetails': 'View Details',
        'servers.settings': 'Settings',

        // Server Detail
        'server.back': 'Back to Servers',
        'server.nowPlaying': 'Now Playing',
        'server.requestedBy': 'Requested by',
        'server.queue': 'Queue',
        'server.emptyQueue': 'Queue is empty',
        'server.stats': 'Server Stats',
        'server.queueLength': 'Queue Length',
        'server.status': 'Status',
        'server.playing': 'Playing',
        'server.voiceChannel': 'Voice Channel',
        'server.members': 'Members',

        // Server Settings
        'serverSettings.title': 'Server Settings',
        'serverSettings.playback': 'Playback',
        'serverSettings.playbackDesc': 'Music playback settings for this server',
        'serverSettings.defaultVolume': 'Default Volume',
        'serverSettings.announceTrack': 'Announce Now Playing',
        'serverSettings.announceTrackDesc': 'Send a message when a new track starts',
        'serverSettings.autoPlay': 'Auto-play Next',
        'serverSettings.autoPlayDesc': 'Automatically play next track in queue',
        'serverSettings.permissions': 'Permissions',
        'serverSettings.permissionsDesc': 'Control who can use the bot',
        'serverSettings.djOnly': 'DJ Only Mode',
        'serverSettings.djOnlyDesc': 'Only users with DJ role can control playback',
        'serverSettings.allowRequests': 'Allow Song Requests',
        'serverSettings.allowRequestsDesc': 'Let anyone request songs to the queue',
        'serverSettings.maxQueuePerUser': 'Max Queue per User',
        'serverSettings.maxQueuePerUserDesc': 'Maximum songs a user can add at once',
        'serverSettings.commands': 'Commands',
        'serverSettings.commandsDesc': 'Bot command settings',
        'serverSettings.commandPrefix': 'Command Prefix',
        'serverSettings.deleteCommands': 'Delete Command Messages',
        'serverSettings.deleteCommandsDesc': 'Remove user commands after processing',
        'serverSettings.channels': 'Channels',
        'serverSettings.channelsDesc': 'Channel restrictions',
        'serverSettings.restrictToChannel': 'Restrict to Music Channel',
        'serverSettings.restrictToChannelDesc': 'Only allow commands in designated channel',
        'serverSettings.musicChannelId': 'Music Channel ID',
        'serverSettings.save': 'Save Changes',
        'serverSettings.saved': 'Saved!',
        'serverSettings.notFound': 'Server not found',
        'serverSettings.noAccess': 'You may not have access to this server',

        // Settings Page (Admin)
        'adminSettings.title': 'Settings',
        'adminSettings.subtitle': 'Manage your preferences and server settings',
        'adminSettings.notifications': 'Notifications',
        'adminSettings.notificationsDesc': 'How SONORA communicates with you',
        'adminSettings.dmNotifications': 'Discord DM Notifications',
        'adminSettings.dmNotificationsDesc': 'Receive important updates via Discord DM',
        'adminSettings.trackAnnouncements': 'Track Announcements',
        'adminSettings.trackAnnouncementsDesc': 'Announce when a new track starts playing',
        'adminSettings.queueUpdates': 'Queue Updates',
        'adminSettings.queueUpdatesDesc': 'Notify when songs are added to queue',
        'adminSettings.dashboardPrefs': 'Dashboard Preferences',
        'adminSettings.dashboardPrefsDesc': 'Customize your dashboard experience',
        'adminSettings.compactView': 'Compact View',
        'adminSettings.compactViewDesc': 'Show more content with smaller cards',
        'adminSettings.autoRefresh': 'Auto-refresh Data',
        'adminSettings.autoRefreshDesc': 'Automatically update server status',
        'adminSettings.yourServers': 'Your Servers',
        'adminSettings.serversWithBot': 'servers with SONORA',
        'adminSettings.noServersWithBot': 'No servers with SONORA',
        'adminSettings.addToServer': 'Add SONORA to a server',
        'adminSettings.viewAllServers': 'View all {count} servers',
        'adminSettings.quickActions': 'Quick Actions',
        'adminSettings.editProfile': 'Edit Profile',
        'adminSettings.manageServers': 'Manage All Servers',
        'adminSettings.tip': 'Tip',
        'adminSettings.tipText': 'For per-server settings like default volume, DJ role, and command prefix, click on a server below to access its settings.',

        // Profile Page
        'profile.title': 'Profile Settings',
        'profile.subtitle': 'Manage your account and preferences',
        'profile.displayName': 'Display Name',
        'profile.displayNameDesc': 'This is how you appear on SONORA',
        'profile.discordInfo': 'Discord Account',
        'profile.connectedAs': 'Connected as',
        'profile.userId': 'User ID',
        'profile.managedServers': 'Managed Servers',
        'profile.managedServersDesc': 'Servers where you have admin access',
        'profile.noManagedServers': 'No managed servers',
        'profile.dangerZone': 'Danger Zone',
        'profile.logoutAll': 'Logout from all devices',

        // History Page
        'history.title': 'Play History',
        'history.subtitle': 'Recent tracks played across your servers',
        'history.noHistory': 'No play history yet',
        'history.playedAt': 'Played at',
        'history.playedBy': 'Played by',
        'history.server': 'Server',
    },
    id: {
        // Navigation
        'nav.home': 'Beranda',
        'nav.dashboard': 'Dasbor',
        'nav.settings': 'Pengaturan',
        'nav.logout': 'Keluar',
        'nav.developer': 'Pengembang',
        'nav.github': 'GitHub',

        // Settings Panel
        'settings.title': 'Pengaturan',
        'settings.language': 'Bahasa',
        'settings.theme': 'Tema',
        'settings.theme.light': 'Terang',
        'settings.theme.dark': 'Gelap',
        'settings.theme.system': 'Sistem',
        'settings.accessibility': 'Aksesibilitas',
        'settings.reducedMotion': 'Kurangi Gerakan',
        'settings.reducedMotion.desc': 'Nonaktifkan animasi dan transisi',
        'settings.highContrast': 'Kontras Tinggi',
        'settings.highContrast.desc': 'Tingkatkan kontras warna untuk visibilitas lebih baik',
        'settings.fontSize': 'Ukuran Font',
        'settings.dyslexicFont': 'Font Ramah Disleksia',
        'settings.dyslexicFont.desc': 'Gunakan font OpenDyslexic untuk membaca lebih mudah',
        'settings.support': 'Bantuan & Dukungan',
        'settings.support.whatsapp': 'WhatsApp',
        'settings.support.discord': 'Discord',
        'settings.support.addBot': 'Tambah Bot ke Server',
        'settings.support.addBot.desc': 'Undang SONORA',

        // Common
        'common.save': 'Simpan',
        'common.cancel': 'Batal',
        'common.close': 'Tutup',
        'common.back': 'Kembali',
        'common.backToHome': 'Kembali ke Beranda',

        // Hero Section
        'hero.subtitleThe': 'Bot Musik Discord yang',
        'hero.subtitleWords': 'Luar Biasa,Powerful,Amazing,Premium,Incredible',
        'hero.subtitleEnd': '',
        'hero.subtitle': 'Bot Musik Discord yang Luar Biasa',
        'hero.description': 'Nikmati musik dengan kualitas jernih dan fitur canggih. Cepat, andal, dan mudah digunakan.',
        'hero.addBot': 'Tambahkan SONORA Sekarang',
        'hero.scrollDown': 'Gulir ke Bawah',

        // Features Section
        'features.title': 'Fitur Premium',
        'features.subtitle': 'Semua yang Anda butuhkan untuk pengalaman musik sempurna',
        'features.quality.title': 'Audio Berkualitas Tinggi',
        'features.quality.desc': 'Audio jernih dengan dukungan format lossless',
        'features.fast.title': 'Sangat Cepat',
        'features.fast.desc': 'Waktu respons kurang dari satu detik dengan performa optimal',
        'features.reliable.title': 'Selalu Online',
        'features.reliable.desc': 'Jaminan uptime 99.9% dengan pemulihan otomatis',
        'features.easy.title': 'Mudah Digunakan',
        'features.easy.desc': 'Perintah sederhana dan kontrol intuitif',

        // Sources Section
        'sources.title': 'Dukungan Multi-Platform',
        'sources.subtitle': 'Putar musik dari platform favorit Anda',
        'sources.spotify': 'Spotify',
        'sources.youtube': 'YouTube',
        'sources.apple': 'Apple Music',
        'sources.soundcloud': 'SoundCloud',

        // Player Preview
        'player.title': 'Pratinjau Pemutar Musik',
        'player.titleText': 'Pemutar',
        'player.titleHighlight': 'real-time',
        'player.titleEnd': 'yang indah',
        'player.subtitle': 'Saksikan musik Anda menjadi hidup dengan progress bar tersinkronisasi, lirik langsung, dan artwork album yang indah.',
        'player.feature1': 'Sinkronisasi progress bar real-time',
        'player.feature2': 'Tampilan artwork album',
        'player.feature3': 'Lirik tersinkronisasi langsung',
        'player.feature4': 'Kontrol interaktif',
        'player.nowPlaying': 'Sedang Diputar',
        'player.lyrics': 'Lirik Langsung',

        // CTA Section
        'cta.title': 'Siap Memulai?',
        'cta.subtitle': 'Tambahkan SONORA ke server Anda sekarang dan nikmati pengalaman musik premium',
        'cta.button': 'Tambahkan SONORA Sekarang',

        // Footer
        'footer.madeWith': 'Dibuat dengan ❤️',
        'footer.copyright': '© 2024 SONORA Bot',

        // Login Page
        'login.welcome': 'Selamat Datang Kembali',
        'login.chooseMethod': 'Pilih cara Anda ingin masuk',
        'login.admin': 'Dasbor Admin',
        'login.admin.desc': 'Masuk dengan Discord',
        'login.developer': 'Konsol Pengembang',
        'login.developer.desc': 'Akses khusus',
        'login.or': 'ATAU',
        'login.adminTitle': 'Login Admin',
        'login.adminDesc': 'Hubungkan akun Discord Anda untuk mengelola server',
        'login.continueDiscord': 'Lanjutkan dengan Discord',
        'login.termsNotice': 'Dengan masuk, Anda menyetujui Ketentuan Layanan dan Kebijakan Privasi kami',
        'login.devTitle': 'Login Pengembang',
        'login.devDesc': 'Masukkan kredensial untuk mengakses konsol',
        'login.username': 'Nama Pengguna',
        'login.password': 'Kata Sandi',
        'login.enterUsername': 'Masukkan nama pengguna',
        'login.enterPassword': 'Masukkan kata sandi',
        'login.signIn': 'Masuk',
        'login.invalidCredentials': 'Kredensial tidak valid',

        // Admin Dashboard
        'admin.title': 'Dasbor Admin',
        'admin.menu': 'Menu',
        'admin.dashboard': 'Dasbor',
        'admin.servers': 'Server',
        'admin.history': 'Riwayat',
        'admin.settings': 'Pengaturan',
        'admin.profile': 'Profil',
        'admin.backToHome': 'Kembali ke Beranda',
        'admin.logout': 'Keluar',
        'admin.loading': 'Memuat sesi...',

        // Dashboard Page
        'dashboard.welcome': 'Selamat datang kembali',
        'dashboard.accessInfo': 'Anda memiliki akses admin ke {count} server.',
        'dashboard.botStatus.connected': 'Bot terhubung dan berjalan',
        'dashboard.botStatus.disconnected': 'Bot terputus',
        'dashboard.stats.yourServers': 'Server Anda',
        'dashboard.stats.botServers': 'Server Bot',
        'dashboard.stats.voiceConnections': 'Koneksi Suara',
        'dashboard.stats.uptime': 'Waktu Aktif',
        'dashboard.managedServers': 'Server Yang Anda Kelola',
        'dashboard.botActive': 'Bot Aktif',
        'dashboard.addBot': 'Tambah Bot',
        'dashboard.owner': 'Pemilik',
        'dashboard.admin': 'Admin',
        'dashboard.systemHealth': 'Kesehatan Sistem',
        'dashboard.cpu': 'CPU',
        'dashboard.memory': 'Memori',
        'dashboard.database': 'Database',
        'dashboard.latency': 'Latensi',

        // Servers Page
        'servers.title': 'Server',
        'servers.subtitle': 'Kelola server di mana SONORA aktif',
        'servers.search': 'Cari server...',
        'servers.refresh': 'Segarkan',
        'servers.all': 'Semua Server',
        'servers.yourServers': 'Server Anda',
        'servers.noServers': 'Tidak ada server ditemukan',
        'servers.nowPlaying': 'Sedang Diputar',
        'servers.idle': 'Menganggur',
        'servers.queue': 'Antrean',
        'servers.tracks': 'lagu',
        'servers.viewDetails': 'Lihat Detail',
        'servers.settings': 'Pengaturan',

        // Server Detail
        'server.back': 'Kembali ke Server',
        'server.nowPlaying': 'Sedang Diputar',
        'server.requestedBy': 'Diminta oleh',
        'server.queue': 'Antrean',
        'server.emptyQueue': 'Antrean kosong',
        'server.stats': 'Statistik Server',
        'server.queueLength': 'Panjang Antrean',
        'server.status': 'Status',
        'server.playing': 'Memutar',
        'server.voiceChannel': 'Kanal Suara',
        'server.members': 'Anggota',

        // Server Settings
        'serverSettings.title': 'Pengaturan Server',
        'serverSettings.playback': 'Pemutaran',
        'serverSettings.playbackDesc': 'Pengaturan pemutaran musik untuk server ini',
        'serverSettings.defaultVolume': 'Volume Default',
        'serverSettings.announceTrack': 'Umumkan Lagu',
        'serverSettings.announceTrackDesc': 'Kirim pesan saat lagu baru mulai',
        'serverSettings.autoPlay': 'Putar Otomatis',
        'serverSettings.autoPlayDesc': 'Otomatis putar lagu berikutnya',
        'serverSettings.permissions': 'Izin',
        'serverSettings.permissionsDesc': 'Kontrol siapa yang dapat menggunakan bot',
        'serverSettings.djOnly': 'Mode DJ Saja',
        'serverSettings.djOnlyDesc': 'Hanya pengguna dengan peran DJ yang dapat mengontrol',
        'serverSettings.allowRequests': 'Izinkan Permintaan Lagu',
        'serverSettings.allowRequestsDesc': 'Biarkan siapa saja meminta lagu',
        'serverSettings.maxQueuePerUser': 'Maks Antrean per Pengguna',
        'serverSettings.maxQueuePerUserDesc': 'Maksimal lagu yang dapat ditambahkan sekaligus',
        'serverSettings.commands': 'Perintah',
        'serverSettings.commandsDesc': 'Pengaturan perintah bot',
        'serverSettings.commandPrefix': 'Awalan Perintah',
        'serverSettings.deleteCommands': 'Hapus Pesan Perintah',
        'serverSettings.deleteCommandsDesc': 'Hapus perintah setelah diproses',
        'serverSettings.channels': 'Kanal',
        'serverSettings.channelsDesc': 'Pembatasan kanal',
        'serverSettings.restrictToChannel': 'Batasi ke Kanal Musik',
        'serverSettings.restrictToChannelDesc': 'Hanya izinkan perintah di kanal tertentu',
        'serverSettings.musicChannelId': 'ID Kanal Musik',
        'serverSettings.save': 'Simpan Perubahan',
        'serverSettings.saved': 'Tersimpan!',
        'serverSettings.notFound': 'Server tidak ditemukan',
        'serverSettings.noAccess': 'Anda mungkin tidak memiliki akses ke server ini',

        // Settings Page (Admin)
        'adminSettings.title': 'Pengaturan',
        'adminSettings.subtitle': 'Kelola preferensi dan pengaturan server Anda',
        'adminSettings.notifications': 'Notifikasi',
        'adminSettings.notificationsDesc': 'Cara SONORA berkomunikasi dengan Anda',
        'adminSettings.dmNotifications': 'Notifikasi DM Discord',
        'adminSettings.dmNotificationsDesc': 'Terima pembaruan penting via Discord DM',
        'adminSettings.trackAnnouncements': 'Pengumuman Lagu',
        'adminSettings.trackAnnouncementsDesc': 'Umumkan saat lagu baru mulai diputar',
        'adminSettings.queueUpdates': 'Pembaruan Antrean',
        'adminSettings.queueUpdatesDesc': 'Beritahu saat lagu ditambahkan ke antrean',
        'adminSettings.dashboardPrefs': 'Preferensi Dasbor',
        'adminSettings.dashboardPrefsDesc': 'Sesuaikan pengalaman dasbor Anda',
        'adminSettings.compactView': 'Tampilan Kompak',
        'adminSettings.compactViewDesc': 'Tampilkan lebih banyak konten dengan kartu lebih kecil',
        'adminSettings.autoRefresh': 'Segarkan Otomatis',
        'adminSettings.autoRefreshDesc': 'Perbarui status server secara otomatis',
        'adminSettings.yourServers': 'Server Anda',
        'adminSettings.serversWithBot': 'server dengan SONORA',
        'adminSettings.noServersWithBot': 'Tidak ada server dengan SONORA',
        'adminSettings.addToServer': 'Tambahkan SONORA ke server',
        'adminSettings.viewAllServers': 'Lihat semua {count} server',
        'adminSettings.quickActions': 'Aksi Cepat',
        'adminSettings.editProfile': 'Edit Profil',
        'adminSettings.manageServers': 'Kelola Semua Server',
        'adminSettings.tip': 'Tip',
        'adminSettings.tipText': 'Untuk pengaturan per-server seperti volume default, peran DJ, dan awalan perintah, klik server di bawah untuk mengakses pengaturannya.',

        // Profile Page
        'profile.title': 'Pengaturan Profil',
        'profile.subtitle': 'Kelola akun dan preferensi Anda',
        'profile.displayName': 'Nama Tampilan',
        'profile.displayNameDesc': 'Ini cara Anda muncul di SONORA',
        'profile.discordInfo': 'Akun Discord',
        'profile.connectedAs': 'Terhubung sebagai',
        'profile.userId': 'ID Pengguna',
        'profile.managedServers': 'Server Dikelola',
        'profile.managedServersDesc': 'Server di mana Anda memiliki akses admin',
        'profile.noManagedServers': 'Tidak ada server dikelola',
        'profile.dangerZone': 'Zona Bahaya',
        'profile.logoutAll': 'Keluar dari semua perangkat',

        // History Page
        'history.title': 'Riwayat Putar',
        'history.subtitle': 'Lagu terbaru yang diputar di server Anda',
        'history.noHistory': 'Belum ada riwayat putar',
        'history.playedAt': 'Diputar pada',
        'history.playedBy': 'Diputar oleh',
        'history.server': 'Server',
    },
    zh: {
        // Navigation
        'nav.home': '首页',
        'nav.dashboard': '仪表板',
        'nav.settings': '设置',
        'nav.logout': '登出',
        'nav.developer': '开发者',
        'nav.github': 'GitHub',

        // Settings Panel
        'settings.title': '设置',
        'settings.language': '语言',
        'settings.theme': '主题',
        'settings.theme.light': '浅色',
        'settings.theme.dark': '深色',
        'settings.theme.system': '系统',
        'settings.accessibility': '辅助功能',
        'settings.reducedMotion': '减少动画',
        'settings.reducedMotion.desc': '禁用动画和过渡效果',
        'settings.highContrast': '高对比度',
        'settings.highContrast.desc': '增加颜色对比度以提高可见性',
        'settings.fontSize': '字体大小',
        'settings.dyslexicFont': '阅读障碍友好字体',
        'settings.dyslexicFont.desc': '使用OpenDyslexic字体便于阅读',
        'settings.support': '帮助与支持',
        'settings.support.whatsapp': 'WhatsApp',
        'settings.support.discord': 'Discord',
        'settings.support.addBot': '添加机器人到服务器',
        'settings.support.addBot.desc': '邀请SONORA',

        // Common
        'common.save': '保存',
        'common.cancel': '取消',
        'common.close': '关闭',
        'common.back': '返回',
        'common.backToHome': '返回首页',

        // Hero Section
        'hero.subtitleThe': '',
        'hero.subtitleWords': '超棒的,强大的,惊艳的,高级的,卓越的',
        'hero.subtitleEnd': 'Discord音乐机器人',
        'hero.subtitle': '超棒的Discord音乐机器人',
        'hero.description': '体验水晶般清晰的音乐和高级功能。快速、可靠、易于使用。',
        'hero.addBot': '立即添加SONORA',
        'hero.scrollDown': '向下滚动',

        // Features Section
        'features.title': '高级功能',
        'features.subtitle': '完美音乐体验所需的一切',
        'features.quality.title': '高品质音频',
        'features.quality.desc': '水晶般清晰的音质，支持无损格式',
        'features.fast.title': '闪电般快速',
        'features.fast.desc': '亚秒级响应时间，优化性能',
        'features.reliable.title': '始终在线',
        'features.reliable.desc': '99.9%正常运行时间保证，自动恢复',
        'features.easy.title': '易于使用',
        'features.easy.desc': '简单命令和直观控制',

        // Sources Section
        'sources.title': '多平台支持',
        'sources.subtitle': '从您喜爱的平台播放音乐',
        'sources.spotify': 'Spotify',
        'sources.youtube': 'YouTube',
        'sources.apple': 'Apple Music',
        'sources.soundcloud': 'SoundCloud',

        // Player Preview
        'player.title': '音乐播放器预览',
        'player.titleText': '精美的',
        'player.titleHighlight': '实时',
        'player.titleEnd': '播放器',
        'player.subtitle': '通过同步进度条、实时歌词和精美专辑封面，让您的音乐栩栩如生。',
        'player.feature1': '实时进度条同步',
        'player.feature2': '专辑封面显示',
        'player.feature3': '实时同步歌词',
        'player.feature4': '交互式控制',
        'player.nowPlaying': '正在播放',
        'player.lyrics': '实时歌词',

        // CTA Section
        'cta.title': '准备开始？',
        'cta.subtitle': '立即将SONORA添加到您的服务器，享受高级音乐体验',
        'cta.button': '立即添加SONORA',

        // Footer
        'footer.madeWith': '用❤️制作',
        'footer.copyright': '© 2024 SONORA Bot',

        // Login Page
        'login.welcome': '欢迎回来',
        'login.chooseMethod': '选择登录方式',
        'login.admin': '管理员仪表板',
        'login.admin.desc': '使用Discord登录',
        'login.developer': '开发者控制台',
        'login.developer.desc': '仅限私人访问',
        'login.or': '或',
        'login.adminTitle': '管理员登录',
        'login.adminDesc': '连接您的Discord账户以管理服务器',
        'login.continueDiscord': '继续使用Discord',
        'login.termsNotice': '登录即表示您同意我们的服务条款和隐私政策',
        'login.devTitle': '开发者登录',
        'login.devDesc': '输入凭据以访问控制台',
        'login.username': '用户名',
        'login.password': '密码',
        'login.enterUsername': '输入用户名',
        'login.enterPassword': '输入密码',
        'login.signIn': '登录',
        'login.invalidCredentials': '凭据无效',

        // Admin Dashboard
        'admin.title': '管理员仪表板',
        'admin.menu': '菜单',
        'admin.dashboard': '仪表板',
        'admin.servers': '服务器',
        'admin.history': '历史',
        'admin.settings': '设置',
        'admin.profile': '个人资料',
        'admin.backToHome': '返回首页',
        'admin.logout': '登出',
        'admin.loading': '加载会话中...',

        // Dashboard Page
        'dashboard.welcome': '欢迎回来',
        'dashboard.accessInfo': '您有 {count} 个服务器的管理员权限。',
        'dashboard.botStatus.connected': '机器人已连接并运行',
        'dashboard.botStatus.disconnected': '机器人已断开',
        'dashboard.stats.yourServers': '您的服务器',
        'dashboard.stats.botServers': '机器人服务器',
        'dashboard.stats.voiceConnections': '语音连接',
        'dashboard.stats.uptime': '运行时间',
        'dashboard.managedServers': '您管理的服务器',
        'dashboard.botActive': '机器人活跃',
        'dashboard.addBot': '添加机器人',
        'dashboard.owner': '所有者',
        'dashboard.admin': '管理员',
        'dashboard.systemHealth': '系统健康',
        'dashboard.cpu': 'CPU',
        'dashboard.memory': '内存',
        'dashboard.database': '数据库',
        'dashboard.latency': '延迟',

        // Servers Page
        'servers.title': '服务器',
        'servers.subtitle': '管理SONORA活跃的服务器',
        'servers.search': '搜索服务器...',
        'servers.refresh': '刷新',
        'servers.all': '所有服务器',
        'servers.yourServers': '您的服务器',
        'servers.noServers': '未找到服务器',
        'servers.nowPlaying': '正在播放',
        'servers.idle': '空闲',
        'servers.queue': '队列',
        'servers.tracks': '首歌曲',
        'servers.viewDetails': '查看详情',
        'servers.settings': '设置',

        // Server Settings
        'serverSettings.title': '服务器设置',
        'serverSettings.playback': '播放',
        'serverSettings.playbackDesc': '此服务器的音乐播放设置',
        'serverSettings.defaultVolume': '默认音量',
        'serverSettings.announceTrack': '播报正在播放',
        'serverSettings.announceTrackDesc': '新歌曲开始时发送消息',
        'serverSettings.autoPlay': '自动播放',
        'serverSettings.autoPlayDesc': '自动播放队列中的下一首',
        'serverSettings.permissions': '权限',
        'serverSettings.permissionsDesc': '控制谁可以使用机器人',
        'serverSettings.djOnly': 'DJ专属模式',
        'serverSettings.djOnlyDesc': '只有DJ角色可以控制播放',
        'serverSettings.allowRequests': '允许点歌',
        'serverSettings.allowRequestsDesc': '让任何人都可以点歌',
        'serverSettings.maxQueuePerUser': '每用户最大队列',
        'serverSettings.maxQueuePerUserDesc': '用户一次可添加的最大歌曲数',
        'serverSettings.save': '保存更改',
        'serverSettings.saved': '已保存！',

        // Settings Page (Admin)
        'adminSettings.title': '设置',
        'adminSettings.subtitle': '管理您的偏好和服务器设置',
        'adminSettings.notifications': '通知',
        'adminSettings.notificationsDesc': 'SONORA与您沟通的方式',
        'adminSettings.dmNotifications': 'Discord私信通知',
        'adminSettings.dmNotificationsDesc': '通过Discord私信接收重要更新',
        'adminSettings.yourServers': '您的服务器',
        'adminSettings.serversWithBot': '个服务器有SONORA',
        'adminSettings.quickActions': '快捷操作',
        'adminSettings.editProfile': '编辑资料',
        'adminSettings.manageServers': '管理所有服务器',

        // Profile Page
        'profile.title': '个人资料设置',
        'profile.subtitle': '管理您的账户和偏好',
        'profile.displayName': '显示名称',
        'profile.displayNameDesc': '这是您在SONORA上的显示名称',
        'profile.discordInfo': 'Discord账户',
        'profile.connectedAs': '已连接为',
        'profile.userId': '用户ID',
        'profile.managedServers': '管理的服务器',
        'profile.managedServersDesc': '您有管理员权限的服务器',
        'profile.dangerZone': '危险区域',
        'profile.logoutAll': '从所有设备登出',

        // History Page
        'history.title': '播放历史',
        'history.subtitle': '您服务器最近播放的歌曲',
        'history.noHistory': '暂无播放历史',
    },
    ru: {
        'nav.home': 'Главная',
        'nav.dashboard': 'Панель',
        'nav.settings': 'Настройки',
        'nav.logout': 'Выйти',
        'nav.developer': 'Разработчик',
        'nav.github': 'GitHub',
        'settings.title': 'Настройки',
        'settings.language': 'Язык',
        'settings.theme': 'Тема',
        'settings.theme.light': 'Светлая',
        'settings.theme.dark': 'Темная',
        'settings.theme.system': 'Система',
        'settings.accessibility': 'Доступность',
        'settings.reducedMotion': 'Уменьшить анимацию',
        'settings.reducedMotion.desc': 'Отключить анимации и переходы',
        'settings.highContrast': 'Высокий контраст',
        'settings.highContrast.desc': 'Увеличить контрастность цветов',
        'settings.fontSize': 'Размер шрифта',
        'settings.dyslexicFont': 'Шрифт для дислексии',
        'settings.dyslexicFont.desc': 'Использовать шрифт OpenDyslexic',
        'settings.support': 'Помощь и поддержка',
        'settings.support.whatsapp': 'WhatsApp',
        'settings.support.discord': 'Discord',
        'settings.support.addBot': 'Добавить бота на сервер',
        'settings.support.addBot.desc': 'Пригласить SONORA',
        'common.save': 'Сохранить',
        'common.cancel': 'Отмена',
        'common.close': 'Закрыть',
        'common.back': 'Назад',
        'common.backToHome': 'Вернуться на главную',
        // Hero Section
        'hero.subtitleThe': '',
        'hero.subtitleWords': 'Потрясающий,Мощный,Удивительный,Премиум,Невероятный',
        'hero.subtitleEnd': 'Discord Music Bot',
        'hero.subtitle': 'Потрясающий Discord Music Bot',
        'hero.description': 'Кристально чистый звук с передовыми функциями.',
        'hero.addBot': 'Добавить SONORA',
        'hero.scrollDown': 'Прокрутить вниз',
        'features.title': 'Премиум функции',
        'features.subtitle': 'Все для идеального музыкального опыта',
        'features.quality.title': 'Высокое качество звука',
        'features.quality.desc': 'Кристально чистый звук с поддержкой lossless',
        'features.fast.title': 'Молниеносная скорость',
        'features.fast.desc': 'Время отклика менее секунды',
        'features.reliable.title': 'Всегда онлайн',
        'features.reliable.desc': 'Гарантия 99.9% работоспособности',
        'features.easy.title': 'Легко использовать',
        'features.easy.desc': 'Простые команды и интуитивное управление',
        'sources.title': 'Мультиплатформенность',
        'sources.subtitle': 'Воспроизводите музыку с любимых платформ',
        'player.title': 'Превью плеера',
        'player.titleText': 'Красивый',
        'player.titleHighlight': 'в реальном времени',
        'player.titleEnd': 'плеер',
        'player.subtitle': 'Смотрите, как ваша музыка оживает с синхронизированными прогресс-барами, живыми текстами и красивыми обложками.',
        'player.feature1': 'Синхронизация прогресс-бара',
        'player.feature2': 'Отображение обложки альбома',
        'player.feature3': 'Синхронизированные тексты',
        'player.feature4': 'Интерактивное управление',
        'player.nowPlaying': 'Сейчас играет',
        'player.lyrics': 'Живой текст',
        'cta.title': 'Готовы начать?',
        'cta.subtitle': 'Добавьте SONORA на свой сервер',
        'cta.button': 'Добавить SONORA',
        'footer.madeWith': 'Сделано с ❤️',
        'footer.copyright': '© 2024 SONORA Bot',
        'login.welcome': 'С возвращением',
        'login.chooseMethod': 'Выберите способ входа',
        'login.admin': 'Панель администратора',
        'login.admin.desc': 'Войти через Discord',
        'login.developer': 'Консоль разработчика',
        'login.developer.desc': 'Только приватный доступ',
        'login.or': 'ИЛИ',
        'login.adminTitle': 'Вход администратора',
        'login.adminDesc': 'Подключите Discord для управления серверами',
        'login.continueDiscord': 'Продолжить с Discord',
        'login.termsNotice': 'Входя, вы соглашаетесь с нашими условиями',
        'login.devTitle': 'Вход разработчика',
        'login.devDesc': 'Введите учетные данные',
        'login.username': 'Имя пользователя',
        'login.password': 'Пароль',
        'login.enterUsername': 'Введите имя пользователя',
        'login.enterPassword': 'Введите пароль',
        'login.signIn': 'Войти',
        'login.invalidCredentials': 'Неверные учетные данные',

        // Admin Dashboard
        'admin.title': 'Панель администратора',
        'admin.menu': 'Меню',
        'admin.dashboard': 'Панель',
        'admin.servers': 'Серверы',
        'admin.history': 'История',
        'admin.settings': 'Настройки',
        'admin.profile': 'Профиль',
        'admin.backToHome': 'Вернуться на главную',
        'admin.logout': 'Выйти',
        'admin.loading': 'Загрузка сессии...',

        // Dashboard Page
        'dashboard.welcome': 'С возвращением',
        'dashboard.accessInfo': 'У вас есть доступ администратора к {count} серверам.',
        'dashboard.botStatus.connected': 'Бот подключен и работает',
        'dashboard.botStatus.disconnected': 'Бот отключен',
        'dashboard.stats.yourServers': 'Ваши серверы',
        'dashboard.stats.botServers': 'Серверы бота',
        'dashboard.stats.voiceConnections': 'Голосовые подключения',
        'dashboard.stats.uptime': 'Время работы',
        'dashboard.managedServers': 'Ваши управляемые серверы',
        'dashboard.botActive': 'Бот активен',
        'dashboard.addBot': 'Добавить бота',
        'dashboard.owner': 'Владелец',
        'dashboard.admin': 'Админ',
        'dashboard.systemHealth': 'Состояние системы',
        'dashboard.cpu': 'Процессор',
        'dashboard.memory': 'Память',
        'dashboard.database': 'База данных',
        'dashboard.latency': 'Задержка',

        // Servers Page
        'servers.title': 'Серверы',
        'servers.subtitle': 'Управляйте серверами с SONORA',
        'servers.search': 'Поиск серверов...',
        'servers.refresh': 'Обновить',
        'servers.all': 'Все серверы',
        'servers.yourServers': 'Ваши серверы',
        'servers.noServers': 'Серверы не найдены',
        'servers.nowPlaying': 'Сейчас играет',
        'servers.idle': 'Ожидание',
        'servers.queue': 'Очередь',
        'servers.tracks': 'треков',
        'servers.viewDetails': 'Подробнее',
        'servers.settings': 'Настройки',

        // Settings Page (Admin)
        'adminSettings.title': 'Настройки',
        'adminSettings.subtitle': 'Управляйте настройками серверов',
        'adminSettings.yourServers': 'Ваши серверы',
        'adminSettings.quickActions': 'Быстрые действия',
        'adminSettings.editProfile': 'Редактировать профиль',
        'adminSettings.manageServers': 'Управлять серверами',

        // Profile Page
        'profile.title': 'Настройки профиля',
        'profile.subtitle': 'Управляйте учетной записью',
        'profile.displayName': 'Отображаемое имя',
        'profile.discordInfo': 'Аккаунт Discord',
        'profile.connectedAs': 'Подключен как',
        'profile.userId': 'ID пользователя',
        'profile.managedServers': 'Управляемые серверы',
        'profile.dangerZone': 'Опасная зона',
        'profile.logoutAll': 'Выйти со всех устройств',

        // History Page
        'history.title': 'История воспроизведения',
        'history.subtitle': 'Недавние треки на ваших серверах',
        'history.noHistory': 'История пуста',
    },
    ja: {
        'nav.home': 'ホーム',
        'nav.dashboard': 'ダッシュボード',
        'nav.settings': '設定',
        'nav.logout': 'ログアウト',
        'nav.developer': '開発者',
        'nav.github': 'GitHub',
        'settings.title': '設定',
        'settings.language': '言語',
        'settings.theme': 'テーマ',
        'settings.theme.light': 'ライト',
        'settings.theme.dark': 'ダーク',
        'settings.theme.system': 'システム',
        'settings.accessibility': 'アクセシビリティ',
        'settings.reducedMotion': 'アニメーションを減らす',
        'settings.reducedMotion.desc': 'アニメーションとトランジションを無効化',
        'settings.highContrast': 'ハイコントラスト',
        'settings.highContrast.desc': '視認性向上のため色コントラストを増加',
        'settings.fontSize': 'フォントサイズ',
        'settings.dyslexicFont': '失読症対応フォント',
        'settings.dyslexicFont.desc': 'OpenDyslexicフォントを使用',
        'settings.support': 'ヘルプとサポート',
        'settings.support.whatsapp': 'WhatsApp',
        'settings.support.discord': 'Discord',
        'settings.support.addBot': 'ボットをサーバーに追加',
        'settings.support.addBot.desc': 'SONORAを招待',
        'common.save': '保存',
        'common.cancel': 'キャンセル',
        'common.close': '閉じる',
        'common.back': '戻る',
        'common.backToHome': 'ホームに戻る',
        // Hero Section
        'hero.subtitleThe': '',
        'hero.subtitleWords': '素晴らしい,パワフル,驚きの,プレミアム,最高の',
        'hero.subtitleEnd': 'Discord音楽ボット',
        'hero.subtitle': '素晴らしいDiscord音楽ボット',
        'hero.description': '高度な機能でクリスタルクリアな音楽を体験。',
        'hero.addBot': 'SONORAを追加',
        'hero.scrollDown': '下にスクロール',
        'features.title': 'プレミアム機能',
        'features.subtitle': '完璧な音楽体験に必要なすべて',
        'features.quality.title': '高品質オーディオ',
        'features.quality.desc': 'ロスレスフォーマット対応のクリスタルクリアな音質',
        'features.fast.title': '超高速',
        'features.fast.desc': '1秒以下の応答時間',
        'features.reliable.title': '常時オンライン',
        'features.reliable.desc': '99.9%の稼働率保証',
        'features.easy.title': '使いやすい',
        'features.easy.desc': 'シンプルなコマンドと直感的な操作',
        'sources.title': 'マルチプラットフォーム対応',
        'sources.subtitle': 'お気に入りのプラットフォームから再生',
        'player.title': 'ミュージックプレーヤープレビュー',
        'player.titleText': '美しい',
        'player.titleHighlight': 'リアルタイム',
        'player.titleEnd': 'プレーヤー',
        'player.subtitle': '同期されたプログレスバー、ライブ歌詞、美しいアルバムアートワークで音楽が生き生きと。',
        'player.feature1': 'リアルタイムプログレスバー同期',
        'player.feature2': 'アルバムアートワーク表示',
        'player.feature3': 'ライブ同期歌詞',
        'player.feature4': 'インタラクティブコントロール',
        'player.nowPlaying': '再生中',
        'player.lyrics': 'ライブ歌詞',
        'cta.title': '始める準備はできましたか？',
        'cta.subtitle': '今すぐサーバーにSONORAを追加',
        'cta.button': '今すぐSONORAを追加',
        'footer.madeWith': '❤️で作成',
        'footer.copyright': '© 2024 SONORA Bot',
        'login.welcome': 'おかえりなさい',
        'login.chooseMethod': 'サインイン方法を選択',
        'login.admin': '管理者ダッシュボード',
        'login.admin.desc': 'Discordでサインイン',
        'login.developer': '開発者コンソール',
        'login.developer.desc': 'プライベートアクセスのみ',
        'login.or': 'または',
        'login.adminTitle': '管理者ログイン',
        'login.adminDesc': 'Discordアカウントを接続してサーバーを管理',
        'login.continueDiscord': 'Discordで続ける',
        'login.termsNotice': 'サインインすることで、利用規約に同意します',
        'login.devTitle': '開発者ログイン',
        'login.devDesc': '認証情報を入力してください',
        'login.username': 'ユーザー名',
        'login.password': 'パスワード',
        'login.enterUsername': 'ユーザー名を入力',
        'login.enterPassword': 'パスワードを入力',
        'login.signIn': 'サインイン',
        'login.invalidCredentials': '認証情報が無効です',

        // Admin Dashboard
        'admin.title': '管理者ダッシュボード',
        'admin.menu': 'メニュー',
        'admin.dashboard': 'ダッシュボード',
        'admin.servers': 'サーバー',
        'admin.history': '履歴',
        'admin.settings': '設定',
        'admin.profile': 'プロフィール',
        'admin.backToHome': 'ホームに戻る',
        'admin.logout': 'ログアウト',
        'admin.loading': 'セッションを読み込み中...',

        // Dashboard Page
        'dashboard.welcome': 'おかえりなさい',
        'dashboard.accessInfo': '{count}個のサーバーの管理者権限があります。',
        'dashboard.botStatus.connected': 'ボットは接続済みで稼働中',
        'dashboard.botStatus.disconnected': 'ボットが切断されています',
        'dashboard.stats.yourServers': 'あなたのサーバー',
        'dashboard.stats.botServers': 'ボットサーバー',
        'dashboard.stats.voiceConnections': '音声接続',
        'dashboard.stats.uptime': '稼働時間',
        'dashboard.managedServers': '管理中のサーバー',
        'dashboard.botActive': 'ボット稼働中',
        'dashboard.addBot': 'ボットを追加',
        'dashboard.owner': 'オーナー',
        'dashboard.admin': '管理者',
        'dashboard.systemHealth': 'システム状態',
        'dashboard.cpu': 'CPU',
        'dashboard.memory': 'メモリ',
        'dashboard.database': 'データベース',
        'dashboard.latency': '遅延',

        // Servers Page
        'servers.title': 'サーバー',
        'servers.subtitle': 'SONORAが稼働中のサーバーを管理',
        'servers.search': 'サーバーを検索...',
        'servers.refresh': '更新',
        'servers.all': 'すべてのサーバー',
        'servers.yourServers': 'あなたのサーバー',
        'servers.noServers': 'サーバーが見つかりません',
        'servers.nowPlaying': '再生中',
        'servers.idle': 'アイドル',
        'servers.queue': 'キュー',
        'servers.tracks': '曲',
        'servers.viewDetails': '詳細を見る',
        'servers.settings': '設定',

        // Settings Page (Admin)
        'adminSettings.title': '設定',
        'adminSettings.subtitle': '設定と環境設定を管理',
        'adminSettings.yourServers': 'あなたのサーバー',
        'adminSettings.quickActions': 'クイックアクション',
        'adminSettings.editProfile': 'プロフィールを編集',
        'adminSettings.manageServers': 'サーバーを管理',

        // Profile Page
        'profile.title': 'プロフィール設定',
        'profile.subtitle': 'アカウントと環境設定を管理',
        'profile.displayName': '表示名',
        'profile.discordInfo': 'Discordアカウント',
        'profile.connectedAs': '接続済み',
        'profile.userId': 'ユーザーID',
        'profile.managedServers': '管理サーバー',
        'profile.dangerZone': '危険ゾーン',
        'profile.logoutAll': 'すべてのデバイスからログアウト',

        // History Page
        'history.title': '再生履歴',
        'history.subtitle': 'サーバーで最近再生されたトラック',
        'history.noHistory': '再生履歴がありません',
    },
    th: {
        'nav.home': 'หน้าแรก',
        'nav.dashboard': 'แดชบอร์ด',
        'nav.settings': 'การตั้งค่า',
        'nav.logout': 'ออกจากระบบ',
        'nav.developer': 'นักพัฒนา',
        'nav.github': 'GitHub',
        'settings.title': 'การตั้งค่า',
        'settings.language': 'ภาษา',
        'settings.theme': 'ธีม',
        'settings.theme.light': 'สว่าง',
        'settings.theme.dark': 'มืด',
        'settings.theme.system': 'ระบบ',
        'settings.accessibility': 'การเข้าถึง',
        'settings.reducedMotion': 'ลดการเคลื่อนไหว',
        'settings.reducedMotion.desc': 'ปิดการใช้งานแอนิเมชัน',
        'settings.highContrast': 'คอนทราสต์สูง',
        'settings.highContrast.desc': 'เพิ่มคอนทราสต์สีเพื่อการมองเห็นที่ดีขึ้น',
        'settings.fontSize': 'ขนาดตัวอักษร',
        'settings.dyslexicFont': 'ฟอนต์สำหรับผู้มีปัญหาการอ่าน',
        'settings.dyslexicFont.desc': 'ใช้ฟอนต์ OpenDyslexic',
        'settings.support': 'ความช่วยเหลือและการสนับสนุน',
        'settings.support.whatsapp': 'WhatsApp',
        'settings.support.discord': 'Discord',
        'settings.support.addBot': 'เพิ่มบอทไปยังเซิร์ฟเวอร์',
        'settings.support.addBot.desc': 'เชิญ SONORA',
        'common.save': 'บันทึก',
        'common.cancel': 'ยกเลิก',
        'common.close': 'ปิด',
        'common.back': 'กลับ',
        'common.backToHome': 'กลับหน้าแรก',
        // Hero Section
        'hero.subtitleThe': 'บอทเพลง Discord ที่',
        'hero.subtitleWords': 'สุดเจ๋ง,ทรงพลัง,น่าทึ่ง,พรีเมียม,ยอดเยี่ยม',
        'hero.subtitleEnd': '',
        'hero.subtitle': 'บอทเพลง Discord ที่สุดเจ๋ง',
        'hero.description': 'สัมผัสเพลงที่ใสกริ๊งพร้อมฟีเจอร์ขั้นสูง',
        'hero.addBot': 'เพิ่ม SONORA',
        'hero.scrollDown': 'เลื่อนลง',
        'features.title': 'ฟีเจอร์พรีเมียม',
        'features.subtitle': 'ทุกอย่างที่คุณต้องการสำหรับประสบการณ์เพลงที่สมบูรณ์แบบ',
        'features.quality.title': 'เสียงคุณภาพสูง',
        'features.quality.desc': 'เสียงใสกระจ่างรองรับฟอร์แมต lossless',
        'features.fast.title': 'รวดเร็วดุจสายฟ้า',
        'features.fast.desc': 'ตอบสนองภายในเสี้ยววินาที',
        'features.reliable.title': 'ออนไลน์ตลอดเวลา',
        'features.reliable.desc': 'รับประกันอัพไทม์ 99.9%',
        'features.easy.title': 'ใช้งานง่าย',
        'features.easy.desc': 'คำสั่งง่ายและควบคุมได้ง่าย',
        'sources.title': 'รองรับหลายแพลตฟอร์ม',
        'sources.subtitle': 'เล่นเพลงจากแพลตฟอร์มโปรดของคุณ',
        'player.title': 'ตัวอย่างเครื่องเล่นเพลง',
        'player.titleText': 'เครื่องเล่น',
        'player.titleHighlight': 'เรียลไทม์',
        'player.titleEnd': 'ที่สวยงาม',
        'player.subtitle': 'ดูเพลงของคุณมีชีวิตชีวาด้วยแถบความคืบหน้าที่ซิงค์, เนื้อเพลงสด และอาร์ตเวิร์คอัลบั้มที่สวยงาม',
        'player.feature1': 'ซิงค์แถบความคืบหน้าเรียลไทม์',
        'player.feature2': 'แสดงอาร์ตเวิร์คอัลบั้ม',
        'player.feature3': 'เนื้อเพลงซิงค์สด',
        'player.feature4': 'ควบคุมแบบอินเทอร์แอคทีฟ',
        'player.nowPlaying': 'กำลังเล่น',
        'player.lyrics': 'เนื้อเพลงสด',
        'cta.title': 'พร้อมเริ่มหรือยัง?',
        'cta.subtitle': 'เพิ่ม SONORA ไปยังเซิร์ฟเวอร์ของคุณตอนนี้',
        'cta.button': 'เพิ่ม SONORA ตอนนี้',
        'footer.madeWith': 'สร้างด้วย ❤️',
        'footer.copyright': '© 2024 SONORA Bot',
        'login.welcome': 'ยินดีต้อนรับกลับ',
        'login.chooseMethod': 'เลือกวิธีลงชื่อเข้าใช้',
        'login.admin': 'แดชบอร์ดผู้ดูแล',
        'login.admin.desc': 'ลงชื่อเข้าใช้ด้วย Discord',
        'login.developer': 'คอนโซลนักพัฒนา',
        'login.developer.desc': 'เฉพาะการเข้าถึงส่วนตัว',
        'login.or': 'หรือ',
        'login.adminTitle': 'เข้าสู่ระบบผู้ดูแล',
        'login.adminDesc': 'เชื่อมต่อ Discord เพื่อจัดการเซิร์ฟเวอร์',
        'login.continueDiscord': 'ดำเนินการต่อด้วย Discord',
        'login.termsNotice': 'การลงชื่อเข้าใช้หมายความว่าคุณยอมรับข้อกำหนด',
        'login.devTitle': 'เข้าสู่ระบบนักพัฒนา',
        'login.devDesc': 'ป้อนข้อมูลประจำตัวของคุณ',
        'login.username': 'ชื่อผู้ใช้',
        'login.password': 'รหัสผ่าน',
        'login.enterUsername': 'ป้อนชื่อผู้ใช้',
        'login.enterPassword': 'ป้อนรหัสผ่าน',
        'login.signIn': 'ลงชื่อเข้าใช้',
        'login.invalidCredentials': 'ข้อมูลประจำตัวไม่ถูกต้อง',

        // Admin Dashboard
        'admin.title': 'แดชบอร์ดผู้ดูแล',
        'admin.menu': 'เมนู',
        'admin.dashboard': 'แดชบอร์ด',
        'admin.servers': 'เซิร์ฟเวอร์',
        'admin.history': 'ประวัติ',
        'admin.settings': 'การตั้งค่า',
        'admin.profile': 'โปรไฟล์',
        'admin.backToHome': 'กลับหน้าแรก',
        'admin.logout': 'ออกจากระบบ',
        'admin.loading': 'กำลังโหลดเซสชัน...',

        // Dashboard Page
        'dashboard.welcome': 'ยินดีต้อนรับกลับ',
        'dashboard.accessInfo': 'คุณมีสิทธิ์ผู้ดูแลใน {count} เซิร์ฟเวอร์',
        'dashboard.botStatus.connected': 'บอทเชื่อมต่อและทำงานอยู่',
        'dashboard.botStatus.disconnected': 'บอทถูกตัดการเชื่อมต่อ',
        'dashboard.stats.yourServers': 'เซิร์ฟเวอร์ของคุณ',
        'dashboard.stats.botServers': 'เซิร์ฟเวอร์บอท',
        'dashboard.stats.voiceConnections': 'การเชื่อมต่อเสียง',
        'dashboard.stats.uptime': 'เวลาทำงาน',
        'dashboard.managedServers': 'เซิร์ฟเวอร์ที่คุณจัดการ',
        'dashboard.botActive': 'บอททำงาน',
        'dashboard.addBot': 'เพิ่มบอท',
        'dashboard.owner': 'เจ้าของ',
        'dashboard.admin': 'ผู้ดูแล',
        'dashboard.systemHealth': 'สุขภาพระบบ',
        'dashboard.cpu': 'CPU',
        'dashboard.memory': 'หน่วยความจำ',
        'dashboard.database': 'ฐานข้อมูล',
        'dashboard.latency': 'เวลาแฝง',

        // Servers Page
        'servers.title': 'เซิร์ฟเวอร์',
        'servers.subtitle': 'จัดการเซิร์ฟเวอร์ที่ SONORA ทำงานอยู่',
        'servers.search': 'ค้นหาเซิร์ฟเวอร์...',
        'servers.refresh': 'รีเฟรช',
        'servers.all': 'ทั้งหมด',
        'servers.yourServers': 'ของคุณ',
        'servers.noServers': 'ไม่พบเซิร์ฟเวอร์',
        'servers.nowPlaying': 'กำลังเล่น',
        'servers.idle': 'ว่าง',
        'servers.queue': 'คิว',
        'servers.tracks': 'เพลง',
        'servers.viewDetails': 'ดูรายละเอียด',
        'servers.settings': 'การตั้งค่า',

        // Settings Page (Admin)
        'adminSettings.title': 'การตั้งค่า',
        'adminSettings.subtitle': 'จัดการการตั้งค่าและความชอบของคุณ',
        'adminSettings.yourServers': 'เซิร์ฟเวอร์ของคุณ',
        'adminSettings.quickActions': 'การดำเนินการด่วน',
        'adminSettings.editProfile': 'แก้ไขโปรไฟล์',
        'adminSettings.manageServers': 'จัดการเซิร์ฟเวอร์',

        // Profile Page
        'profile.title': 'การตั้งค่าโปรไฟล์',
        'profile.subtitle': 'จัดการบัญชีและความชอบของคุณ',
        'profile.displayName': 'ชื่อที่แสดง',
        'profile.discordInfo': 'บัญชี Discord',
        'profile.connectedAs': 'เชื่อมต่อเป็น',
        'profile.userId': 'รหัสผู้ใช้',
        'profile.managedServers': 'เซิร์ฟเวอร์ที่จัดการ',
        'profile.dangerZone': 'โซนอันตราย',
        'profile.logoutAll': 'ออกจากระบบทุกอุปกรณ์',

        // History Page
        'history.title': 'ประวัติการเล่น',
        'history.subtitle': 'เพลงล่าสุดที่เล่นในเซิร์ฟเวอร์ของคุณ',
        'history.noHistory': 'ยังไม่มีประวัติการเล่น',
    },
    ar: {
        'nav.home': 'الرئيسية',
        'nav.dashboard': 'لوحة التحكم',
        'nav.settings': 'الإعدادات',
        'nav.logout': 'تسجيل الخروج',
        'nav.developer': 'المطور',
        'nav.github': 'GitHub',
        'settings.title': 'الإعدادات',
        'settings.language': 'اللغة',
        'settings.theme': 'المظهر',
        'settings.theme.light': 'فاتح',
        'settings.theme.dark': 'داكن',
        'settings.theme.system': 'النظام',
        'settings.accessibility': 'إمكانية الوصول',
        'settings.reducedMotion': 'تقليل الحركة',
        'settings.reducedMotion.desc': 'تعطيل الرسوم المتحركة',
        'settings.highContrast': 'تباين عالي',
        'settings.highContrast.desc': 'زيادة تباين الألوان للرؤية الأفضل',
        'settings.fontSize': 'حجم الخط',
        'settings.dyslexicFont': 'خط صديق لعسر القراءة',
        'settings.dyslexicFont.desc': 'استخدام خط OpenDyslexic',
        'settings.support': 'المساعدة والدعم',
        'settings.support.whatsapp': 'واتساب',
        'settings.support.discord': 'ديسكورد',
        'settings.support.addBot': 'إضافة البوت إلى الخادم',
        'settings.support.addBot.desc': 'دعوة SONORA',
        'common.save': 'حفظ',
        'common.cancel': 'إلغاء',
        'common.close': 'إغلاق',
        'common.back': 'رجوع',
        'common.backToHome': 'العودة للرئيسية',
        // Hero Section
        'hero.subtitleThe': 'بوت موسيقى Discord',
        'hero.subtitleWords': 'رائع,قوي,مذهل,متميز,لا يصدق',
        'hero.subtitleEnd': '',
        'hero.subtitle': 'بوت موسيقى Discord رائع',
        'hero.description': 'استمتع بموسيقى نقية مع ميزات متقدمة',
        'hero.addBot': 'أضف SONORA',
        'hero.scrollDown': 'مرر للأسفل',
        'features.title': 'ميزات متميزة',
        'features.subtitle': 'كل ما تحتاجه لتجربة موسيقية مثالية',
        'features.quality.title': 'صوت عالي الجودة',
        'features.quality.desc': 'صوت نقي يدعم الفورمات غير المضغوطة',
        'features.fast.title': 'سريع كالبرق',
        'features.fast.desc': 'وقت استجابة أقل من ثانية',
        'features.reliable.title': 'متصل دائماً',
        'features.reliable.desc': 'ضمان 99.9% وقت التشغيل',
        'features.easy.title': 'سهل الاستخدام',
        'features.easy.desc': 'أوامر بسيطة وتحكم بديهي',
        'sources.title': 'دعم متعدد المنصات',
        'sources.subtitle': 'شغل الموسيقى من منصاتك المفضلة',
        'player.title': 'معاينة مشغل الموسيقى',
        'player.titleText': 'مشغل',
        'player.titleHighlight': 'مباشر',
        'player.titleEnd': 'جميل',
        'player.subtitle': 'شاهد موسيقاك تنبض بالحياة مع أشرطة التقدم المتزامنة والكلمات الحية وأغلفة الألبومات الجميلة.',
        'player.feature1': 'مزامنة شريط التقدم في الوقت الحقيقي',
        'player.feature2': 'عرض غلاف الألبوم',
        'player.feature3': 'كلمات متزامنة مباشرة',
        'player.feature4': 'عناصر تحكم تفاعلية',
        'player.nowPlaying': 'يعمل الآن',
        'player.lyrics': 'كلمات مباشرة',
        'cta.title': 'مستعد للبدء؟',
        'cta.subtitle': 'أضف SONORA إلى خادمك الآن',
        'cta.button': 'أضف SONORA الآن',
        'footer.madeWith': 'صنع بـ ❤️',
        'footer.copyright': '© 2024 SONORA Bot',
        'login.welcome': 'مرحباً بعودتك',
        'login.chooseMethod': 'اختر طريقة تسجيل الدخول',
        'login.admin': 'لوحة تحكم المسؤول',
        'login.admin.desc': 'تسجيل الدخول بـ Discord',
        'login.developer': 'وحدة تحكم المطور',
        'login.developer.desc': 'وصول خاص فقط',
        'login.or': 'أو',
        'login.adminTitle': 'دخول المسؤول',
        'login.adminDesc': 'اربط حسابك في Discord لإدارة الخوادم',
        'login.continueDiscord': 'متابعة مع Discord',
        'login.termsNotice': 'بتسجيل الدخول، فإنك توافق على شروط الخدمة',
        'login.devTitle': 'دخول المطور',
        'login.devDesc': 'أدخل بيانات الاعتماد للوصول',
        'login.username': 'اسم المستخدم',
        'login.password': 'كلمة المرور',
        'login.enterUsername': 'أدخل اسم المستخدم',
        'login.enterPassword': 'أدخل كلمة المرور',
        'login.signIn': 'تسجيل الدخول',
        'login.invalidCredentials': 'بيانات اعتماد غير صالحة',

        // Admin Dashboard
        'admin.title': 'لوحة تحكم المسؤول',
        'admin.menu': 'القائمة',
        'admin.dashboard': 'لوحة التحكم',
        'admin.servers': 'الخوادم',
        'admin.history': 'السجل',
        'admin.settings': 'الإعدادات',
        'admin.profile': 'الملف الشخصي',
        'admin.backToHome': 'العودة للرئيسية',
        'admin.logout': 'تسجيل الخروج',
        'admin.loading': 'جاري تحميل الجلسة...',

        // Dashboard Page
        'dashboard.welcome': 'مرحباً بعودتك',
        'dashboard.accessInfo': 'لديك صلاحية إدارة {count} خادم.',
        'dashboard.botStatus.connected': 'البوت متصل ويعمل',
        'dashboard.botStatus.disconnected': 'البوت غير متصل',
        'dashboard.stats.yourServers': 'خوادمك',
        'dashboard.stats.botServers': 'خوادم البوت',
        'dashboard.stats.voiceConnections': 'اتصالات الصوت',
        'dashboard.stats.uptime': 'وقت التشغيل',
        'dashboard.managedServers': 'خوادمك المُدارة',
        'dashboard.botActive': 'البوت نشط',
        'dashboard.addBot': 'إضافة البوت',
        'dashboard.owner': 'المالك',
        'dashboard.admin': 'مسؤول',
        'dashboard.systemHealth': 'صحة النظام',
        'dashboard.cpu': 'المعالج',
        'dashboard.memory': 'الذاكرة',
        'dashboard.database': 'قاعدة البيانات',
        'dashboard.latency': 'التأخير',

        // Servers Page
        'servers.title': 'الخوادم',
        'servers.subtitle': 'إدارة الخوادم التي يعمل فيها SONORA',
        'servers.search': 'بحث في الخوادم...',
        'servers.refresh': 'تحديث',
        'servers.all': 'جميع الخوادم',
        'servers.yourServers': 'خوادمك',
        'servers.noServers': 'لم يتم العثور على خوادم',
        'servers.nowPlaying': 'يعمل الآن',
        'servers.idle': 'في الانتظار',
        'servers.queue': 'قائمة الانتظار',
        'servers.tracks': 'مسار',
        'servers.viewDetails': 'عرض التفاصيل',
        'servers.settings': 'الإعدادات',

        // Settings Page (Admin)
        'adminSettings.title': 'الإعدادات',
        'adminSettings.subtitle': 'إدارة تفضيلاتك وإعدادات الخادم',
        'adminSettings.yourServers': 'خوادمك',
        'adminSettings.quickActions': 'إجراءات سريعة',
        'adminSettings.editProfile': 'تعديل الملف الشخصي',
        'adminSettings.manageServers': 'إدارة الخوادم',

        // Profile Page
        'profile.title': 'إعدادات الملف الشخصي',
        'profile.subtitle': 'إدارة حسابك وتفضيلاتك',
        'profile.displayName': 'اسم العرض',
        'profile.discordInfo': 'حساب Discord',
        'profile.connectedAs': 'متصل كـ',
        'profile.userId': 'معرف المستخدم',
        'profile.managedServers': 'الخوادم المُدارة',
        'profile.dangerZone': 'منطقة الخطر',
        'profile.logoutAll': 'تسجيل الخروج من جميع الأجهزة',

        // History Page
        'history.title': 'سجل التشغيل',
        'history.subtitle': 'المسارات الأخيرة على خوادمك',
        'history.noHistory': 'لا يوجد سجل تشغيل بعد',
    },
};

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [language, setLanguageState] = useState<Language>('en');
    const [theme, setThemeState] = useState<'dark' | 'light' | 'system'>('dark');
    const [isDark, setIsDark] = useState(true);
    const [reducedMotion, setReducedMotionState] = useState(false);
    const [highContrast, setHighContrastState] = useState(false);
    const [fontSize, setFontSizeState] = useState<'normal' | 'large' | 'xlarge'>('normal');
    const [dyslexicFont, setDyslexicFontState] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);

    // Save settings to localStorage - memoized
    const saveSettings = useCallback((newSettings: {
        language?: Language;
        theme?: 'dark' | 'light' | 'system';
        reducedMotion?: boolean;
        highContrast?: boolean;
        fontSize?: 'normal' | 'large' | 'xlarge';
        dyslexicFont?: boolean;
    }) => {
        const current = localStorage.getItem('sonora-settings');
        let settings = current ? JSON.parse(current) : {};
        settings = { ...settings, ...newSettings };
        localStorage.setItem('sonora-settings', JSON.stringify(settings));
    }, []);

    // Load settings from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('sonora-settings');
        if (saved) {
            try {
                const settings = JSON.parse(saved);
                if (settings.language) setLanguageState(settings.language);
                if (settings.theme) setThemeState(settings.theme);
                if (settings.reducedMotion !== undefined) setReducedMotionState(settings.reducedMotion);
                if (settings.highContrast !== undefined) setHighContrastState(settings.highContrast);
                if (settings.fontSize) setFontSizeState(settings.fontSize);
                if (settings.dyslexicFont !== undefined) setDyslexicFontState(settings.dyslexicFont);
            } catch {
                // Invalid settings, ignore
            }
        }

        // Check system preference for reduced motion
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setReducedMotionState(true);
        }

        setIsInitialized(true);
    }, []);

    // Compute isDark based on theme setting and system preference
    useEffect(() => {
        const updateDarkMode = () => {
            if (theme === 'system') {
                setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
            } else {
                setIsDark(theme === 'dark');
            }
        };

        updateDarkMode();

        // Listen for system theme changes
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = () => {
            if (theme === 'system') {
                updateDarkMode();
            }
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [theme]);

    // Apply all settings to document - runs whenever any setting changes
    useEffect(() => {
        if (!isInitialized) return;

        const html = document.documentElement;

        // Apply theme class
        if (isDark) {
            html.classList.add('dark');
            html.classList.remove('light');
        } else {
            html.classList.add('light');
            html.classList.remove('dark');
        }

        // Font size
        html.style.fontSize = fontSize === 'large' ? '18px' : fontSize === 'xlarge' ? '20px' : '16px';

        // High contrast
        if (highContrast) {
            html.classList.add('high-contrast');
        } else {
            html.classList.remove('high-contrast');
        }

        // Reduced motion
        if (reducedMotion) {
            html.classList.add('reduce-motion');
        } else {
            html.classList.remove('reduce-motion');
        }

        // Dyslexic font
        if (dyslexicFont) {
            html.classList.add('dyslexic-font');
        } else {
            html.classList.remove('dyslexic-font');
        }

        // RTL for Arabic
        html.dir = LANGUAGES[language].dir;
        html.lang = language;
    }, [fontSize, highContrast, reducedMotion, dyslexicFont, language, isDark, isInitialized]);

    const setLanguage = useCallback((lang: Language) => {
        setLanguageState(lang);
        saveSettings({ language: lang });
    }, [saveSettings]);

    const setTheme = useCallback((t: 'dark' | 'light' | 'system') => {
        setThemeState(t);
        saveSettings({ theme: t });
    }, [saveSettings]);

    const setReducedMotion = useCallback((value: boolean) => {
        setReducedMotionState(value);
        saveSettings({ reducedMotion: value });
    }, [saveSettings]);

    const setHighContrast = useCallback((value: boolean) => {
        setHighContrastState(value);
        saveSettings({ highContrast: value });
    }, [saveSettings]);

    const setFontSize = useCallback((size: 'normal' | 'large' | 'xlarge') => {
        setFontSizeState(size);
        saveSettings({ fontSize: size });
    }, [saveSettings]);

    const setDyslexicFont = useCallback((value: boolean) => {
        setDyslexicFontState(value);
        saveSettings({ dyslexicFont: value });
    }, [saveSettings]);

    const t = useCallback((key: string): string => {
        return translations[language]?.[key] || translations.en[key] || key;
    }, [language]);

    return (
        <SettingsContext.Provider
            value={{
                language,
                setLanguage,
                t,
                theme,
                setTheme,
                isDark,
                reducedMotion,
                setReducedMotion,
                highContrast,
                setHighContrast,
                fontSize,
                setFontSize,
                dyslexicFont,
                setDyslexicFont,
                isSettingsOpen,
                openSettings: () => setIsSettingsOpen(true),
                closeSettings: () => setIsSettingsOpen(false),
                toggleSettings: () => setIsSettingsOpen(!isSettingsOpen),
            }}
        >
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
}
