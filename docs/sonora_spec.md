- Comprehensive testing untuk each feature sebelum deployment
- Security penetration testing (mandatory)
- User acceptance testing (UAT)
- Load testing untuk high-traffic scenarios
- Cross-browser testing
- Mobile responsiveness testing

### Quality Assurance dan Testing Protocol (CRITICAL - NO BUGS POLICY)

**MANDATORY: Zero-Bug Deployment Policy**

Sistem ini HARUS melalui rigorous testing process dengan multiple iterations sampai benar-benar bebas bug dan berjalan dengan smooth. Tidak ada compromise untuk quality.

#### Phase 1: Unit Testing (Development Stage)
**Requirements:**
- **Code Coverage Minimum: 80%** (ideal: 90%+)
- Test setiap function, method, dan component secara isolated
- Test all edge cases dan boundary conditions
- **Testing Areas:**
  - Authentication functions (login, logout, session, tokens)
  - Database operations (CRUD operations, queries, transactions)
  - API endpoints (request/response, error handling)
  - Bot commands (all Discord commands dan interactions)
  - Cache management functions
  - Notification systems
  - File upload/download functions
  - Data validation functions
  - Security functions (encryption, hashing, sanitization)
- **Automated Unit Tests:**
  - Run automatically on every code commit
  - CI/CD pipeline integration
  - Fail build jika tests tidak pass
  - Test reports generated automatically
- **Manual Verification:**
  - Developer self-testing sebelum commit
  - Code review oleh senior developer
  - Peer testing untuk complex features

#### Phase 2: Integration Testing
**Requirements:**
- Test interaksi antar modules dan components
- **Testing Areas:**
  - Frontend ↔ Backend communication
  - Backend ↔ Database interactions
  - Bot ↔ Discord API integration
  - Bot ↔ Dashboard communication
  - Authentication flow end-to-end
  - Support ticket submission → storage → notification → response flow
  - Cache management → storage → retrieval → deletion flow
  - Push notification system complete flow
  - Payment integration (jika applicable)
- **API Testing:**
  - Test all API endpoints dengan various inputs
  - Test error responses (4xx, 5xx codes)
  - Test rate limiting
  - Test authentication dan authorization
  - Test payload validation
  - Postman/Insomnia collection untuk all endpoints
- **Database Testing:**
  - Test migrations (up dan down)
  - Test transaction rollbacks
  - Test concurrent operations
  - Test data integrity constraints
  - Test indexes performance
- **Bot Integration:**
  - Test all Discord commands dalam server
  - Test voice channel operations
  - Test music playback functionality
  - Test permission handling
  - Test error recovery

#### Phase 3: System Testing (Complete System)
**Requirements:**
- Test entire system sebagai whole
- Simulate real-world usage scenarios
- **Testing Scenarios:**
  1. **New User Journey:**
     - Register account → Login → Tutorial → Use features → Logout
     - Test setiap step untuk smooth experience
  2. **Support Ticket Journey:**
     - Submit ticket → Track status → Receive updates → Export data → Verify deletion
  3. **Admin Operations:**
     - Monitor dashboard → Manage servers → Ban user → Send notification → View analytics
  4. **Bot Usage:**
     - Invite bot → Join voice → Play music → Use commands → Leave voice
  5. **Security Scenarios:**
     - Failed login attempts → Account lockout
     - Suspicious activity detection
     - Unauthorized access attempts
  6. **Cache Management:**
     - Cache fill → Auto cleanup → Manual cleanup → Verify deletion
  7. **Data Retention:**
     - Ticket creation → Resolution → 15-day countdown → Auto-deletion → Verification

#### Phase 4: Security Testing (CRITICAL - Bank-Level)
**Requirements:**
- **Penetration Testing (MANDATORY):**
  - Hire professional security auditor atau use automated tools
  - Test for common vulnerabilities:
    - SQL Injection
    - Cross-Site Scripting (XSS)
    - Cross-Site Request Forgery (CSRF)
    - Authentication bypass
    - Authorization flaws
    - Session hijacking
    - Insecure direct object references
    - Security misconfigurations
    - Sensitive data exposure
    - XML External Entities (XXE)
    - Broken access control
  - **Tools to Use:**
    - OWASP ZAP
    - Burp Suite
    - Nmap
    - Metasploit (controlled environment)
    - SQLMap
    - Nikto
- **Vulnerability Scanning:**
  - Automated scans dengan Snyk, Dependabot
  - Check for outdated dependencies
  - Check for known vulnerabilities (CVE database)
  - Regular scans (weekly minimum)
- **Code Security Review:**
  - Static analysis dengan SonarQube, CodeQL
  - Review authentication logic
  - Review authorization checks
  - Review data validation
  - Review encryption implementations
  - Review API security
- **Security Audit:**
  - Document all security measures
  - Verify compliance dengan OWASP Top 10
  - Verify GDPR compliance
  - Verify data encryption
  - Verify secure communication (HTTPS, WSS)
  - Security checklist sign-off

#### Phase 5: Performance Testing
**Requirements:**
- **Load Testing:**
  - Simulate 100 concurrent users (minimum baseline)
  - Simulate 500 concurrent users (medium load)
  - Simulate 1000 concurrent users (high load)
  - Test peak load scenarios (2x expected traffic)
  - Tools: JMeter, Gatling, k6
- **Stress Testing:**
  - Push system beyond normal limits
  - Identify breaking points
  - Test system recovery after crash
  - Test graceful degradation
- **Performance Metrics to Monitor:**
  - Response time (API, page load)
  - Throughput (requests per second)
  - Error rate under load
  - CPU usage under load
  - Memory usage under load
  - Database query performance
  - Cache hit ratio
  - Network latency
- **Performance Benchmarks:**
  - Page load: < 3 seconds
  - API response: < 500ms
  - Database queries: < 100ms
  - Real-time updates: < 1 second latency
  - Bot command response: < 2 seconds
- **Optimization:**
  - Identify bottlenecks
  - Optimize slow queries
  - Implement caching strategies
  - Use CDN untuk static assets
  - Code splitting untuk frontend
  - Database indexing optimization
  - Image optimization
  - Lazy loading implementation

#### Phase 6: Compatibility Testing
**Requirements:**
- **Browser Testing (MANDATORY untuk all major browsers):**
  - ✅ Chrome (latest 2 versions)
  - ✅ Firefox (latest 2 versions)
  - ✅ Safari (latest 2 versions)
  - ✅ Edge (latest 2 versions)
  - ⚠️ Older browsers (graceful degradation)
- **Device Testing:**
  - 📱 Mobile phones (iOS dan Android)
    - Various screen sizes (small, medium, large)
    - Portrait dan landscape orientation
    - Touch interactions
  - 💻 Tablets (iPad, Android tablets)
  - 🖥️ Desktop (various resolutions)
  - Test responsive breakpoints
- **Operating System Testing:**
  - Windows 10/11
  - macOS (latest 2 versions)
  - Linux (Ubuntu/Debian)
  - iOS (latest 2 versions)
  - Android (version 9+)
- **Screen Reader Compatibility:**
  - NVDA (Windows)
  - JAWS (Windows)
  - VoiceOver (macOS, iOS)
  - TalkBack (Android)
- **Accessibility Testing:**
  - Keyboard navigation
  - Color contrast ratio (WCAG AA minimum)
  - Focus indicators
  - Alt text untuk images
  - ARIA labels
  - Form labels
  - Heading hierarchy

#### Phase 7: User Acceptance Testing (UAT)
**Requirements:**
- **Beta Testing Phase:**
  - Select 10-20 beta testers
  - Include mix of technical dan non-technical users
  - Test untuk minimum 2 weeks
  - Collect detailed feedback
- **Testing Checklist untuk Beta Testers:**
  - Complete registration dan login
  - Use all major features
  - Submit support tickets
  - Test bot commands
  - Test admin dashboard (for admins)
  - Report ANY issues, no matter how small
  - Rate user experience (1-10)
  - Provide suggestions untuk improvements
- **Feedback Collection:**
  - Structured feedback form
  - Bug report template
  - Feature request form
  - User satisfaction survey
  - Interview sessions dengan key testers
- **Issues Tracking:**
  - Log all reported issues
  - Categorize: Critical, High, Medium, Low
  - Assign priority
  - Track resolution progress
  - Verify fixes dengan reporters

#### Phase 8: Regression Testing (After Every Fix)
**Requirements:**
- **CRITICAL:** Setiap kali ada bug fix atau feature update, MUST run regression tests
- **Regression Test Suite:**
  - Re-run all previously passing tests
  - Verify old features still work
  - Test affected areas thoroughly
  - Test related features
  - Full system smoke test
- **Automated Regression:**
  - Automated test suite yang comprehensive
  - Run on every deployment
  - Cover critical user paths
  - Alert on any failures
- **Manual Regression:**
  - Test critical workflows manually
  - Test recently fixed bugs (ensure tidak muncul lagi)
  - Test edge cases
  - Exploratory testing

#### Phase 9: Final Pre-Deployment Testing
**Requirements:**
- **Production-Like Environment Testing:**
  - Test di staging environment yang identical dengan production
  - Same server specs
  - Same configurations
  - Same data volume (use anonymized production data)
- **Deployment Rehearsal:**
  - Practice deployment process
  - Test rollback procedures
  - Document deployment steps
  - Time deployment process
  - Identify potential issues
- **Data Migration Testing (jika applicable):**
  - Test migration scripts
  - Verify data integrity post-migration
  - Test rollback procedures
  - Create backups before migration
- **Final Checklist:**
  - ✅ All critical bugs resolved
  - ✅ All high-priority bugs resolved
  - ✅ Medium/low bugs documented (fix post-launch jika needed)
  - ✅ Security audit passed
  - ✅ Performance benchmarks met
  - ✅ All tests passing (unit, integration, system)
  - ✅ Browser compatibility verified
  - ✅ Mobile responsiveness verified
  - ✅ Accessibility standards met
  - ✅ Legal documents updated dan reviewed
  - ✅ Documentation complete
  - ✅ Backup procedures tested
  - ✅ Monitoring tools configured
  - ✅ Alert systems tested
  - ✅ Rollback plan ready
  - ✅ Team trained on new features
  - ✅ Support team briefed
  - ✅ Stakeholder sign-off obtained

#### Phase 10: Post-Deployment Monitoring (First 48 Hours Critical)
**Requirements:**
- **Real-Time Monitoring:**
  - Monitor all system metrics continuously
  - Watch for error spikes
  - Monitor user feedback channels
  - Track performance metrics
  - Monitor security alerts
- **Hotfix Readiness:**
  - Development team on standby
  - Quick response protocol active
  - Rollback plan ready to execute
  - Clear escalation procedures
- **User Support:**
  - Increased support availability
  - Quick response to issues
  - Proactive communication
  - FAQ updates based on questions
- **Metrics to Track:**
  - Error rates
  - Response times
  - User registrations
  - Feature usage
  - Support ticket volume
  - User satisfaction
  - System uptime

#### Testing Tools dan Frameworks
**Recommended Tools:**
- **Unit Testing:**
  - JavaScript: Jest, Mocha, Chai
  - Python: pytest, unittest
  - Code coverage: Istanbul, Coverage.py
- **Integration Testing:**
  - Supertest (API testing)
  - Cypress (E2E testing)
  - Selenium (browser automation)
- **Performance Testing:**
  - Apache JMeter
  - Gatling
  - k6
  - Artillery
- **Security Testing:**
  - OWASP ZAP
  - Burp Suite
  - Snyk
  - npm audit / yarn audit
- **Monitoring:**
  - Sentry (error tracking)
  - New Relic / Datadog (APM)
  - Prometheus + Grafana (metrics)
  - ELK Stack (logging)
- **CI/CD:**
  - GitHub Actions
  - GitLab CI
  - Jenkins
  - CircleCI

#### Bug Severity Classification
**Critical (P0) - Fix Immediately:**
- System crashes atau completely non-functional
- Security vulnerabilities
- Data loss atau corruption
- Payment processing failures
- Complete feature breakdown

**High (P1) - Fix within 24 hours:**
- Major feature not working correctly
- Significant performance degradation
- Issues affecting majority of users
- Workaround available but difficult

**Medium (P2) - Fix within 1 week:**
- Minor feature issues
- UI/UX problems
- Non-critical performance issues
- Affects some users, easy workaround available

**Low (P3) - Fix in next update:**
- Cosmetic issues
- Nice-to-have improvements
- Rare edge cases
- Documentation errors

#### Continuous Testing Strategy
**Ongoing Requirements:**
- **Daily:**
  - Automated test suite runs
  - Security vulnerability scans
  - Uptime monitoring
- **Weekly:**
  - Performance benchmarks
  - Code quality analysis
  - Dependency updates check
- **Monthly:**
  - Full security audit
  - Load testing
  - User feedback analysis
  - Code review sessions
- **Quarterly:**
  - Penetration testing
  - Comprehensive system audit
  - Disaster recovery drill
  - Compliance review

---

## QUALITY ASSURANCE SIGN-OFF CHECKLIST

Before ANY deployment to production, ALL items must be checked:

### Functionality
- [ ] All features working as specified
- [ ] All user stories completed
- [ ] All acceptance criteria met
- [ ] All workflows tested end-to-end
- [ ] Error handling works correctly
- [ ] Edge cases handled properly

### Security
- [ ] Penetration testing completed dan passed
- [ ] No critical or high vulnerabilities
- [ ] Authentication working securely
- [ ] Authorization properly implemented
- [ ] Data encryption verified
- [ ] SQL injection protection verified
- [ ] XSS protection verified
- [ ] CSRF protection verified
- [ ] Security headers configured
- [ ] Sensitive data not exposed

### Performance
- [ ] Load testing completed
- [ ] Performance benchmarks met
- [ ] No memory leaks detected
- [ ] Database queries optimized
- [ ] Caching implemented correctly
- [ ] CDN configured (for static assets)
- [ ] Images optimized
- [ ] Code minified dan compressed

### Compatibility
- [ ] Works on Chrome
- [ ] Works on Firefox
- [ ] Works on Safari
- [ ] Works on Edge
- [ ] Works on mobile (iOS)
- [ ] Works on mobile (Android)
- [ ] Responsive on all screen sizes
- [ ] Keyboard navigation works
- [ ] Screen reader compatible

### Code Quality
- [ ] Code reviewed by peers
- [ ] No linting errors
- [ ] Code follows style guide
- [ ] Documentation updated
- [ ] Comments added for complex logic
- [ ] Dead code removed
- [ ] Console logs removed
- [ ] TODO comments addressed

### Data & Privacy
- [ ] GDPR compliance verified
- [ ] Privacy Policy updated
- [ ] Terms of Service updated
- [ ] Data retention policy implemented (15-day rule)
- [ ] Data deletion working correctly
- [ ] Export functionality working
- [ ] Cookie consent implemented
- [ ] User data properly encrypted

### Testing
- [ ] Unit tests passing (80%+ coverage)
- [ ] Integration tests passing
- [ ] System tests passing
- [ ] UAT completed successfully
- [ ] Regression tests passing
- [ ] No known critical/high bugs
- [ ] Medium/low bugs documented

### Deployment
- [ ] Staging environment tested
- [ ] Deployment runbook ready
- [ ] Rollback plan documented
- [ ] Database migrations tested
- [ ] Backups verified working
- [ ] Monitoring configured
- [ ] Alerts configured
- [ ] Logs properly configured

### Documentation
- [ ] User documentation complete
- [ ] Admin documentation complete
- [ ] API documentation complete
- [ ] Code documentation complete
- [ ] Deployment guide ready
- [ ] Troubleshooting guide ready
- [ ] FAQ updated
- [ ] Changelog updated

### Team Readiness
- [ ] Development team briefed
- [ ] Support team trained
- [ ] Documentation distributed
- [ ] Stakeholders informed
- [ ] Go-live schedule confirmed
- [ ] On-call rotation scheduled

### Post-Launch Preparation
- [ ] Monitoring dashboard ready
- [ ] Support channels prepared
- [ ] Communication plan ready
- [ ] Rollback criteria defined
- [ ] Success metrics defined
- [ ] Feedback collection ready

---

**FINAL NOTE ON QUALITY:**

Tidak ada shortcuts untuk quality. Setiap bug yang lolos ke production adalah technical debt yang harus dibayar dengan interest. Better to delay launch dan deliver bug-free product daripada rush dan deal dengan angry users dan emergency fixes.

**Testing Mantra: Check → Test → Fix → Recheck → Retest → Verify → Deploy → Monitor → Iterate**

Ulangi cycle ini sampai confidence level = 100% bahwa sistem akan berjalan smooth di production.# SONORA - Discord Bot Audio High-Quality
## Spesifikasi Upgrade Sistem Lengkap

---

## A. KEAMANAN DAN MANAJEMEN AKUN ADMIN DASHBOARD

### 1. Sistem Keamanan Multi-Layer (Bank-Level Security)

**Persyaratan:**
- Implementasikan sistem keamanan berlapis setara dengan standar perbankan (bank-level security)
- Setiap akun yang mendaftar melalui Discord harus otomatis tersimpan dalam database dengan enkripsi penuh
- Lakukan penetration testing dan vulnerability assessment sebelum deployment
- Pastikan tidak ada celah keamanan apapun dalam sistem (zero vulnerability)
- Implementasikan proteksi terhadap common attacks: SQL Injection, XSS, CSRF, DDoS, brute force
- Gunakan authentication multi-factor jika diperlukan

### 2. Privacy Policy dan Data Management

**Persyaratan:**
- Update dan perbarui seluruh dokumen Terms of Service dan Privacy Policy untuk compliance dengan penyimpanan data user
- Pastikan dokumen legal mencakup:
  - Jenis data yang dikumpulkan
  - Cara penyimpanan dan penggunaan data
  - Hak user terhadap data mereka
  - Kebijakan retention data
- Sediakan tombol "Hapus Data Saya" di dua lokasi:
  1. Pengaturan profil user (user dashboard)
  2. Developer dashboard (admin control)
- Proses penghapusan data harus permanen dan compliant dengan GDPR/privacy regulations

### 3. Sistem Notifikasi Push dengan Audio Kustom

**Persyaratan:**
- Implementasikan push notifications untuk update dan pengumuman kepada user
- Sistem notifikasi harus dapat mengirim pesan ke:
  - Semua user terdaftar
  - User tertentu/spesifik
  - Berdasarkan segmentasi tertentu
- **Custom Notification Sound:**
  - Modifikasi service worker (sw.js) untuk mendukung custom notification sound
  - Gunakan audio dengan tema alunan musik ceria
  - Durasi audio: 2-3 detik minimal
  - Audio harus bebas copyright (royalty-free)
  - Format audio: MP3 atau OGG untuk kompatibilitas browser
- Notifikasi harus muncul dari developer dashboard dengan kontrol penuh

### 4. Smart Login System dan Data Persistence

**Persyaratan:**
- **Deteksi User Returning:**
  - Sistem harus mendeteksi apakah user sudah pernah login sebelumnya
  - Jika user sudah pernah login, skip tutorial/onboarding
  - Jika user baru, tampilkan tutorial lengkap
- **Profile Picture Management:**
  - User dapat mengedit foto profil
  - Format yang diterima: PNG, JPG, JPEG
  - Ukuran maksimal: 15MB
  - Jika ukuran file melebihi 15MB, lakukan kompresi otomatis tanpa mengurangi kualitas signifikan
  - Simpan foto profil secara persisten (tidak hilang saat logout)
- **Data Persistence:**
  - Simpan semua data user dengan aman:
    - Foto profil
    - Display name
    - Preferensi settings
    - Theme preferences (jika ada)
  - Data tetap tersimpan setelah logout dan tersedia saat login kembali
  - Implementasikan proper session management

### 5. Cookie dan Local Storage Security

**Persyaratan:**
- Sebagian data dapat disimpan di cookie atau local storage browser
- Implementasikan enkripsi untuk data sensitif di client-side
- Gunakan HttpOnly dan Secure flags untuk cookies
- Implementasikan Content Security Policy (CSP)
- Pastikan token dan credentials tidak exposed di client-side
- Session timeout otomatis untuk keamanan
- Keamanan setara bank-level security standards

### 6. Menu Support di Admin Dashboard

**Persyaratan:**
- Tambahkan menu/sidebar baru: **SUPPORT**
- Support menu harus terhubung dengan Support Page (dengan fitur lebih lengkap)
- Fitur yang tersedia:
  - Melihat status laporan yang masuk
  - Dashboard untuk tracking semua support tickets
  - Filter berdasarkan status: Open, In Progress, Resolved, Closed
  - Response system untuk membalas laporan
  - Update progress laporan
  - Menyelesaikan laporan dengan reason
  - Statistik dan analytics support tickets

---

## B. UPGRADE DEVELOPER DASHBOARD (Level-Up Complete Overhaul)

### 1. UI/UX Redesign Complete

**Persyaratan:**
- Rombak total tampilan Developer Dashboard
- Samakan UI/UX design dengan Admin Dashboard untuk konsistensi
- Implementasikan modern design principles:
  - Responsive design (mobile, tablet, desktop)
  - Dark mode dan light mode toggle
  - Smooth animations dan transitions
  - Intuitive navigation
  - Clean and professional interface
- Gunakan component library yang konsisten
- Pastikan accessibility (WCAG compliance)

### 2. Login System Fix

**Persyaratan:**
- **Critical Fix:** Perbaiki sistem login yang currently tidak berfungsi (stuck di loading)
- Debug dan resolve issue dengan authentication flow
- Pastikan username dan password yang valid dapat login dengan sukses
- Implementasikan proper error handling dan error messages
- Tambahkan loading indicators yang jelas
- Session management yang proper
- Remember me functionality (optional)
- Forgot password feature

### 3. Server Management Control

**Persyaratan:**
- Sediakan kontrol lengkap untuk manage semua server dimana bot berada
- Fitur yang harus tersedia:
  - **Media Player Control:**
    - Stop/pause audio playback
    - Skip lagu
    - Adjust volume
    - Clear queue
  - **Voice Channel Management:**
    - Disconnect bot dari voice channel
    - Lihat voice channel yang currently connected
    - Force disconnect dari semua voice channels
  - **Bot Management:**
    - Kick bot dari server tertentu
    - Lihat list semua servers yang menggunakan bot
    - Server statistics (member count, activity, dll)
- Real-time updates pada dashboard
- Confirmation dialogs untuk destructive actions

### 4. Advanced Bot Control System

**Persyaratan:**

#### 4.1. Shutdown Command
- Shutdown bot secara complete
- Confirmation dialog dengan warning
- Log shutdown activity dengan timestamp dan reason
- Graceful shutdown (tutup connections dengan baik)

#### 4.2. Pause System (Sophisticated)
- **Pause Options:**
  - Pause semua aktivitas bot (global)
  - Pause aktivitas di server discord spesifik (per-server)
- **Pause Features:**
  - Required field: Reason untuk pause
  - Notifikasi otomatis ke users yang mencoba menggunakan bot saat paused
  - Message yang dikirim harus include:
    - Informasi bahwa bot sedang di-pause
    - Reason mengapa di-pause
    - Estimasi kapan akan active kembali (optional)
  - Log semua pause activities
- **User Experience saat Paused:**
  - Setiap command yang diterima akan ditolak secara graceful
  - Bot mengirim pesan informatif ke user
  - Tidak ada error messages yang harsh/confusing

#### 4.3. Resume System
- Resume bot dari pause state
- Notifikasi ke affected users bahwa bot sudah active kembali
- Log resume activity
- Pastikan semua services berjalan normal setelah resume

#### 4.4. Restart System
- **Restart Options:**
  - Full System Restart (entire system)
  - File System Restart (reload configurations tanpa restart complete)
  - Web System Restart (restart web interface only)
  - Bot System Restart (restart Discord bot only)
- **Restart Features:**
  - Apply perubahan/updates baru setelah restart
  - Zero downtime restart (jika possible)
  - Confirmation dialog
  - Log all restart activities
  - Estimated downtime indicator

#### 4.5. Maintenance Mode (Comprehensive)
- **Maintenance Activation:**
  - Toggle untuk enable/disable maintenance mode
  - Required field: Reason untuk maintenance
  - Required field: Progress description
- **Maintenance Dashboard (Always Visible saat Active):**
  - Real-time progress tracker
  - Radio/selector untuk update progress stages
  - Textarea untuk detailed reason dan progress updates
  - Tombol **SAVE** untuk menyimpan progress updates
    - Progress update akan visible di SONORA Status Page
    - Progress juga dikirim ke users yang mencoba gunakan bot
  - Tombol **OK/Complete** dengan confirmation dialog
    - Required: Final completion reason
    - Marks maintenance sebagai completed
- **Integration dengan SONORA Status Page:**
  - Status page automatically shows maintenance mode
  - Display current progress dari maintenance
  - Display reason untuk maintenance
  - Link ke changelog page setelah maintenance selesai
- **User Experience saat Maintenance:**
  - Semua commands ditolak dengan informative message
  - Message include:
    - Informasi maintenance mode active
    - Current progress percentage/stage
    - Reason untuk maintenance
    - Link ke SONORA Status Page
  - No confusion atau frustration untuk users
- **Maintenance History:**
  - Log semua maintenance activities
  - Logs visible di changelog page
  - Maintenance duration tracking
  - Success/failure status

### 5. Messaging System - Server/Channel/User Specific

**Persyaratan:**
- Kirim pesan dari dashboard ke Discord
- **Target Options:**
  - Server tertentu (pilih dari dropdown)
  - Channel tertentu dalam server (pilih dari dropdown)
  - User tertentu (DM langsung)
- **Message Options:**
  - Tag @everyone (mention everyone di server/channel)
  - Tag @here (mention online users only)
  - Rich text editor untuk formatting
  - Emoji support
  - Attachment support (images, files)
- Preview message sebelum send
- Confirmation dialog sebelum send
- Log semua messages yang dikirim

### 6. Announcement System

**Persyaratan:**
- Sistem khusus untuk pengumuman (berbeda dari regular messages)
- **Target Options:** (sama seperti messaging system)
  - Server tertentu
  - Channel tertentu
  - User tertentu
- **Announcement Features:**
  - Special formatting untuk announcements (e.g., embed dengan header)
  - Tag options: @everyone atau @here
  - Priority levels (low, medium, high, urgent)
  - Schedule announcements (optional - send later)
  - Pin announcement automatically (optional)
- **Announcement Templates:**
  - Save frequently used announcement templates
  - Quick send dengan templates
- Log semua announcements

### 7. User Ban System

**Persyaratan:**
- Ban user tertentu dari menggunakan bot
- **Ban Features:**
  - User tetap bisa stay di server, tapi tidak bisa gunakan bot commands
  - Block semua commands dari banned user
  - Block user dari invite bot ke server lain
  - Required field: Reason untuk ban
  - Include link ke support: https://sonora.muhammadzakizn.com/support
- **Ban Management:**
  - List semua banned users
  - Search/filter banned users
  - Unban functionality
  - Ban duration options (temporary atau permanent)
  - Ban history dan logs
- **User Experience saat Banned:**
  - User receive informative message when trying to use bot
  - Message include:
    - Informasi bahwa mereka di-ban
    - Reason untuk ban
    - Link ke support untuk appeal
  - Tidak ada harsh/insulting language

### 8. Server/Channel Ban System

**Persyaratan:**
- Ban entire server atau specific channel dari menggunakan bot
- **Ban Features:**
  - Block semua commands dari banned server/channel
  - Auto-leave jika bot di-reinvite ke banned server
  - Send message ke server owner dengan:
    - Informasi bahwa server di-ban
    - Reason untuk ban
    - Link ke support: https://sonora.muhammadzakizn.com/support
- **Ban Management:**
  - List semua banned servers/channels
  - Search/filter
  - Unban functionality
  - Ban history dan logs
- Proper notification system

### 9. Legal Documents Update (Comprehensive)

**Persyaratan:**

#### 9.1. TERMS OF SERVICE Updates
- **Ban Policies dan Procedures:**
  - Detailed ban reasons dan criteria
  - Appeal process dengan timeline
  - Reasons untuk potential ban
  - User rights during ban
  - Responsibilities setelah unban
- **Support Ticket Policies:**
  - Acceptable use policy untuk support system
  - Prohibited content dalam tickets
  - Spam dan abuse consequences
  - Response time commitments (SLA)
- **Data Retention Policy:**
  - **EXPLICIT STATEMENT:** "Semua laporan support akan disimpan maksimal 15 hari setelah status resolved/closed"
  - Clear explanation tentang automatic deletion
  - User rights untuk request earlier deletion
  - Cannot request extension beyond 15 days
  - Data export rights before deletion
  - What happens to attachments
- **Account Termination:**
  - What happens to user data
  - Ticket data treatment upon account closure
  - Reactivation policies

#### 9.2. PRIVACY POLICY Updates
- **Data Collection untuk Support:**
  - What data is collected via support tickets
  - How attachments are processed
  - Contact information usage
  - IP address logging for security
- **Data Storage Location:**
  - Where support data is stored
  - Security measures in place (bank-level)
  - Encryption methods
  - Access controls
- **Data Retention Specific Section:**
  - **PROMINENT NOTICE:** "Support Ticket Retention Policy"
  - "All support tickets and related data are automatically deleted 15 days after resolution or closure"
  - "This is our maximum retention period and cannot be extended"
  - "Users may request earlier deletion for privacy concerns"
  - "Minimal metadata (ticket code hash, deletion timestamp) kept for 30 days for verification only"
  - "No personal information retained after deletion"
- **Data Processing:**
  - Who can access support tickets (admin only)
  - How data is used (only for support purposes)
  - No third-party sharing
  - Automated processing disclosures
- **User Rights (GDPR Compliance):**
  - Right to access support ticket data
  - Right to rectification (while ticket active)
  - Right to erasure (accelerated deletion)
  - Right to data portability (export feature)
  - Right to restrict processing
  - Right to object
  - How to exercise these rights
- **Data Security Measures:**
  - Encryption at rest dan in transit
  - Access logging dan monitoring
  - Regular security audits
  - Incident response procedures
  - Data breach notification policy
- **Cookies dan Local Storage:**
  - What is stored in cookies/local storage
  - How to manage cookies
  - Session management

#### 9.3. SUPPORT PAGE Updates
- **How Support Works Section:**
  - Step-by-step guide untuk submit ticket
  - What to expect after submission
  - Response time expectations
  - How to track tickets
- **Data Privacy in Support:**
  - "Your data is handled with utmost security"
  - "Bank-level security protections in place"
  - **"IMPORTANT: All tickets are automatically deleted 15 days after resolution"**
  - "Please export important information before deletion"
  - Link to full Privacy Policy
- **Acceptable Use:**
  - What is appropriate untuk support tickets
  - Examples of acceptable tickets
  - Examples of inappropriate tickets
  - Consequences of misuse
  - Reference to ToS violations
- **Ban Appeal Process:**
  - How to appeal a ban via support
  - Information needed untuk appeal
  - Expected timeline
  - Multiple appeal policies
- **FAQ Section:**
  - "How long is my ticket stored?" → "Maximum 15 days after resolution, with automatic deletion for security"
  - "Can I keep my ticket longer?" → "No, 15 days is our maximum for security and privacy"
  - "Can I delete my ticket earlier?" → "Yes, you can request immediate deletion or choose shorter retention"
  - "How do I check if my ticket is deleted?" → "Use ticket verification system dengan ticket code"
  - "What happens to my attachments?" → "Permanently deleted dengan ticket data"
  - "Can I export my ticket data?" → "Yes, you can export anytime before deletion"
- **Contact Information:**
  - Support link: https://sonora.muhammadzakizn.com/support
  - Alternative contact methods
  - Emergency contact (for critical issues)

#### 9.4. Legal Document Display Requirements
- **Prominent Display:**
  - Easy access dari all pages (footer links)
  - Version number dan last updated date
  - "We've updated our [Policy Name]" notification banner jika ada changes
- **Acceptance Requirements:**
  - Checkbox untuk agree to ToS saat registration
  - Checkbox untuk acknowledge Privacy Policy
  - Checkbox untuk understand Support policies saat submit ticket
  - Cannot proceed without acceptance
- **Change Notifications:**
  - Email notification untuk significant changes
  - In-app notification
  - 30-day notice period untuk material changes
  - Continued use = acceptance policy
- **Archives:**
  - Keep previous versions accessible
  - "View Previous Versions" link
  - Changelog for policy updates

### 10. Comprehensive Monitoring Dashboard

**Persyaratan:**

#### 10.1. Music Analytics
- **Most Requested Songs:**
  - List lagu yang paling sering di-request
  - Show request count
  - Last requested timestamp
  - Requester information
  - Trending songs graph
- Filter by: time period, server, genre (jika applicable)

#### 10.2. Error Monitoring
- **Error Tracking:**
  - Most frequent errors dengan count
  - Error severity levels
  - Error timestamps dan patterns
  - Stack traces untuk debugging
  - Error rate graphs
- **Error Categories:**
  - Command errors
  - API errors
  - Audio playback errors
  - Connection errors
  - Database errors
- Alert system untuk critical errors

#### 10.3. System Health Monitoring
- **Component Status:**
  - Visual indicators untuk setiap komponen:
    - ✅ Normal (green)
    - ⚠️ Warning (yellow)
    - ❌ Critical/Danger (red)
  - Monitor:
    - Bot modules
    - Commands functionality
    - Database connections
    - API integrations
    - Audio processing
    - Voice connections
- Real-time status updates
- Historical uptime data

#### 10.4. Server/Device Metrics
- **System Metrics:**
  - CPU usage
  - RAM usage
  - Disk space
  - Network bandwidth
  - Internet connection status
  - Ping/latency
  - Uptime
- **Performance Graphs:**
  - Real-time graphs untuk each metric
  - Historical data (24h, 7d, 30d)
  - Threshold alerts
- Server location dan info

#### 10.5. Command Usage Analytics
- **Usage Statistics:**
  - Most used commands/slash commands
  - Usage frequency per command
  - Usage trends over time
  - Most used features
  - Least used features (untuk identify potential improvements)
- **User Behavior:**
  - Peak usage hours
  - Active users count
  - Commands per user statistics
- Interactive charts dan graphs

#### 10.6. Cache Management System (Enhanced dengan Support Logs)
- **Cache Monitoring:**
  - Current cache size (total dan per-type)
  - Cache breakdown by type:
    - Python cache (__pycache__)
    - Song/audio cache
    - Artwork/thumbnail cache
    - API response cache
    - **Support ticket logs dan attachments**
    - **Support ticket history records**
    - Session data
    - Other caches
  - Cache hit/miss ratio
  - Last accessed timestamps
  - Storage usage visualization (pie chart)
- **Cache Control:**
  - Manual delete options:
    - Delete all cache (with confirmation)
    - Delete specific cache type (selective)
    - Delete old cache (by date range)
    - Delete cache by size threshold
    - **Delete support logs:**
      - Delete by ticket status (resolved/closed only)
      - Delete by age (older than X days)
      - Delete by ticket code (specific ticket)
      - Bulk delete multiple tickets
  - **Automatic Cache Cleanup:**
    - Schedule cleanup by time: specify jam/tanggal/hari
    - Cleanup based on storage threshold: delete when storage reaches X%
    - Cleanup based on total size: delete when cache size reaches X MB/GB
    - Cleanup based on age: delete cache older than X days
    - Priority-based cleanup (least recently used first)
    - **AUTOMATIC SUPPORT LOG DELETION:**
      - **Default: 15 hari setelah ticket resolved/closed**
      - **TIDAK DAPAT diperpanjang beyond 15 hari (hard limit)**
      - **DAPAT dipercepat (manual atau automatic)**
      - Admin dapat set retention period < 15 hari untuk security
      - Warning notification 3 hari sebelum auto-delete
- **Cache Settings:**
  - Configure cache retention policies per type
  - Set maximum cache sizes per type
  - Enable/disable caching per feature
  - **Support Log Retention Policy:**
    - Default retention: 15 hari (immutable maximum)
    - Minimum retention: 1 hari
    - Accelerated deletion options (immediate, 1 day, 3 days, 7 days)
    - Cannot exceed 15 hari under any circumstances
- **Warnings dan Confirmations:**
  - Double confirmation untuk destructive operations
  - Clear warnings sebelum permanent deletion
  - Countdown timer untuk bulk deletions
  - Cannot undo after deletion (permanent)
- **Cache Statistics dan Analytics:**
  - Storage trends over time
  - Most space-consuming cache types
  - Deletion history logs
  - Compliance reports (for support logs)

#### 10.7. Real-Time Console Access
- **Live Console:**
  - Direct connection ke bot console
  - Real-time log streaming
  - Color-coded log levels (INFO, WARNING, ERROR, CRITICAL)
  - Search/filter logs
  - Export logs functionality
  - Pause/resume log streaming
- **Console Features:**
  - Timestamps untuk each log entry
  - Log source identification
  - Stack traces untuk errors
  - Clear console button
  - Auto-scroll toggle
- Connected secara real-time ke both web dan bot systems

### 11. Push Notification System (Advanced)

**Persyaratan:**

#### 11.1. Notification Composer
- **Required Fields:**
  - Notification Title
  - Notification Body/Content
  - Notification Image (optional)
    - Format: JPG, PNG, WEBP
    - Max size: 2MB
    - Auto-compress jika lebih besar
  - Target URL (where notification leads when clicked)
  - Target Audience:
    - All registered users
    - Specific users (multiple selection)
    - Users by criteria (e.g., last active, server membership)
- **Optional Fields:**
  - Action buttons (e.g., "View Now", "Dismiss")
  - Priority level
  - Expiration time
  - Badge count
- Rich text editor untuk notification body
- Preview notification sebelum send

#### 11.2. Custom Notification Sound
- **Custom Sound Requirements:**
  - Modify service worker (sw.js) untuk support custom sound
  - Sound theme: cheerful music/melody
  - Duration: 2-3 seconds minimum
  - Format: MP3 atau OGG untuk browser compatibility
  - **Must be royalty-free/copyright-free**
  - Volume control options
- Fallback ke default browser sound jika custom sound fails
- Test sound button di notification composer

#### 11.3. Notification Testing
- **Test Functionality:**
  - Send test notification ke admin only
  - Verify appearance on different devices/browsers
  - Test custom sound
  - Test click action/URL
  - Test image rendering
- Test results log

#### 11.4. Notification History/Log
- **Notification Center:**
  - Location: Samping foto profil (top-right corner)
  - Icon dengan badge untuk unread count
  - **History Features:**
    - List semua notifications yang sent
    - Notification status: Sent, Delivered, Clicked, Expired
    - Timestamp
    - Recipient count
    - Click-through rate
    - Preview notification content
  - Filter by: date, type, status
  - Search functionality
- **User-Side Notification Center:**
  - Users juga dapat akses notification history
  - Mark as read/unread
  - Clear notifications
  - Notification preferences/settings

#### 11.5. Notification Analytics
- Delivery rate
- Click-through rate
- Engagement metrics
- Best performing notifications
- Optimal send times

### 12. Account Blocking System (Advanced)

**Persyaratan:**

#### 12.1. Block Mechanisms
- **Block Types:**
  - Temporary block (dengan duration: hours, days, weeks, months)
  - Permanent block
- **Block Criteria:**
  - Block by Discord ID
  - Block by IP Address
  - Block by device fingerprint
  - Block by email (jika tersedia)
- **Multiple Account Detection:**
  - Detect jika sama user buat account baru
  - Track by:
    - IP Address
    - Browser fingerprint
    - Device fingerprint
    - Behavioral patterns
  - Auto-block detected alt accounts

#### 12.2. Block Management
- **Block Dashboard:**
  - List all blocked accounts
  - Filter by: block type, reason, date
  - Search functionality
  - Bulk actions (block/unblock multiple)
- **Block Details:**
  - Block reason (required)
  - Block duration (untuk temporary blocks)
  - Block timestamp
  - Blocked by (admin name)
  - Block history (previous blocks)
  - Associated accounts detected

#### 12.3. User Experience saat Blocked
- Clear error message saat login attempt
- Explanation tentang block
- Support contact information
- Appeal process information (jika applicable)
- No revealing security mechanisms (don't tell attacker how detection works)

#### 12.4. Legal Updates
- Update TERMS OF SERVICE dengan:
  - Account blocking policies
  - Reasons untuk potential block
  - Multiple account policies
  - Appeal procedures
- Update PRIVACY POLICY dengan:
  - Data collection untuk fraud detection
  - IP address dan device fingerprint storage
  - Data retention untuk blocked accounts

---

## C. UPGRADE SUPPORT PAGE (Complete Overhaul)

### 1. Support Ticket Submission System

**Persyaratan:**

#### 1.1. Authentication Requirement
- **MANDATORY:** User harus login sebelum mengakses support form
- Redirect ke login page jika belum login
- Seamless experience setelah login (kembali ke support page)

#### 1.2. Ticket Form Fields
- **Category/Reason Dropdown (Required):**
  - Bug Report
  - Feature Request
  - Account Issue
  - Bot Not Working
  - Ban Appeal
  - Payment Issue (jika applicable)
  - Other
- **Ticket Title (Required):**
  - Character limit: 5-200 characters
  - Clear dan descriptive
- **Description/Details (Required):**
  - Rich text editor
  - Minimum 20 characters
  - Maximum 5000 characters
  - Support formatting: bold, italic, lists, code blocks
- **Attachments (Optional):**
  - **Images:**
    - Formats: JPEG, JPG, PNG, WEBP
    - Max size PER FILE: 50MB
    - Auto-compress jika melebihi size
    - Multiple images allowed (max 5)
  - **Videos:**
    - Formats: MP4, MOV, AVI
    - Max size: 100MB
    - Show error jika exceed limit (don't auto-compress video)
    - Max 2 videos
  - **Documents:**
    - Formats: PDF, DOC, DOCX, TXT
    - Max size per file: 25MB
    - Max 3 documents
  - Preview attachments sebelum submit
  - Remove attachment option

#### 1.3. User Contact Information
- **Auto-Filled (dari account):**
  - Discord Username
  - Discord User ID
  - Email (jika tersedia di profile)
- **Required jika tidak ada:**
  - Discord tag harus provided
  - Email harus provided
- Cannot submit without contact info

#### 1.4. Terms and Warnings
- **Prominent Warning Display:**
  - "Laporan ini bukan untuk main-main"
  - "Jangan kirim hal-hal yang tidak pantas atau tidak relevan"
  - "Privasi Anda akan dijaga dan form ini aman"
  - "Pelanggaran dapat berakibat fatal termasuk ban account"
  - Reference ke Terms of Service (dengan link)
  - Privacy Policy compliance (dengan link)
- **Required Checkbox:**
  - "Saya telah membaca dan menyetujui Terms of Service"
  - "Saya confirm bahwa laporan ini legitimate dan bukan spam"
- Cannot submit tanpa accept checkboxes

#### 1.5. Rate Limiting
- **Submission Limits:**
  - 1 ticket per user per day (24 hours)
  - Show countdown timer untuk next available submission
  - Exception untuk critical issues (e.g., security vulnerabilities)
- Clear message jika rate limit exceeded
- Show last submission timestamp

#### 1.6. Submission Confirmation
- **After Submit:**
  - Success message dengan animation
  - Display unique ticket ID/code
  - Explain bagaimana track ticket dengan code
  - Email confirmation (jika email provided)
  - Estimated response time
- Clear call-to-action untuk track ticket

### 2. Ticket Tracking System

**Persyaratan:**

#### 2.1. Unique Ticket Code
- Generate unique code untuk each ticket
- Format: SONORA-XXXXX-XXXX (random alphanumeric)
- Easily copyable
- QR code untuk ticket (optional)

#### 2.2. User Ticket Tracking
- **Track via Admin Dashboard:**
  - User masukkan ticket code
  - View current status
  - View progress updates
  - View responses dari admin
  - View timeline/history
- **Status Indicators:**
  - 🆕 New/Submitted
  - 👀 Reviewing
  - 🔧 In Progress
  - ⏳ Waiting for Info
  - ✅ Resolved
  - ❌ Closed
- Progress bar visual untuk status
- Timestamp untuk each status change

#### 2.3. Add More Details (Limited)
- **Follow-Up Submission:**
  - User dapat add more details ONCE
  - Required: Original ticket code
  - Same form constraints sebagai original submission
  - **IMPORTANT:** Cannot edit after adding details (final submission)
  - Clear warning: "Anda hanya dapat menambah detail 1x dan tidak bisa diedit"
- **Linked to Original Ticket:**
  - Additional details attached ke original ticket
  - Notifikasi ke admin tentang new details
  - Updated timestamp

#### 2.4. Ticket Completion (User Side)
- **Mark as Resolved:**
  - User dapat mark ticket sebagai resolved jika issue sudah fixed
  - Required: Completion reason/feedback
  - Textarea untuk feedback (optional but encouraged)
  - Satisfaction rating (1-5 stars, optional)
  - Cannot reopen after marking resolved
- **Auto-Update Status:**
  - Status berubah ke "Resolved - User Confirmed"
  - Notifikasi ke admin
  - Update visible di developer dashboard

#### 2.5. Ticket Deletion Verification System
- **Check Ticket Status via Code:**
  - User dapat mengecek apakah ticket masih ada atau sudah dihapus
  - Input: Ticket code (SONORA-XXXXX-XXXX)
  - **Response jika ticket masih ada:**
    - "Ticket ditemukan"
    - Current status
    - Created date
    - Scheduled deletion date (countdown timer)
    - "Ticket akan otomatis terhapus dalam X hari"
  - **Response jika ticket sudah dihapus:**
    - "Ticket tidak ditemukan atau sudah dihapus dari sistem"
    - Deletion date (jika dalam grace period)
    - Reason untuk deletion (auto-expired atau manual)
    - "Data ticket telah dihapus permanen dari sistem kami sesuai kebijakan retensi data"
  - **Additional Info Displayed:**
    - Data retention policy explanation
    - Link ke Privacy Policy
    - Notice: "Sesuai kebijakan, ticket dihapus setelah 15 hari resolved"
- **Grace Period Notification:**
  - 3 hari sebelum deletion: warning notification
  - 1 hari sebelum deletion: final reminder
  - Option untuk export ticket data sebelum deletion (PDF atau TXT)
- **Deletion History (Limited):**
  - System keeps minimal metadata untuk 30 hari setelah deletion:
    - Ticket code (hashed)
    - Deletion timestamp
    - Deletion reason
    - NO personal data atau ticket content
  - Used only untuk verification purposes

### 3. Admin Side Ticket Management

**Persyaratan:**

#### 3.1. Ticket Delivery Methods
- **Method 1: Direct Discord Message**
  - Bot automatically sends ticket ke admin Discord (@thixxert)
  - Format: Rich embed dengan all details
  - Include:
    - Ticket code
    - Category
    - Title
    - Description
    - Attachments (as links atau embedded)
    - User info
    - Timestamp
  - Actionable buttons (jika applicable):
    - View in Dashboard
    - Mark as Reviewing
    - Quick Reply

- **Method 2: Database Storage dengan Dashboard View**
  - **CRITICAL:** Secure database dengan bank-level security
  - All tickets stored in database
  - Accessible via Developer Dashboard
  - **Dashboard Features:**
    - List all tickets dengan filters:
      - Status
      - Category
      - Date range
      - User
      - Priority
    - Search by: ticket code, user name, keywords
    - Sort by: date, priority, status
    - Bulk actions
    - Export tickets (CSV, PDF)

#### 3.2. Ticket Response System
- **Reply to Tickets:**
  - Rich text editor untuk responses
  - Attach files/images jika needed
  - Save as draft
  - Send reply ke user via:
    - Email notification
    - Dashboard notification
    - Discord DM (optional)
- **Update Progress:**
  - Change ticket status
  - Add progress notes (internal dan user-visible)
  - Update priority
  - Assign to team member (jika applicable)
  - Set estimated resolution time
- **Progress Timeline:**
  - Visual timeline dari all updates
  - Show who made each update
  - Timestamps untuk each action
  - User-visible dan internal notes separated

#### 3.3. Ticket Resolution (Admin Side)
- **Mark as Resolved:**
  - Required: Resolution reason
  - Optional: Resolution details (detailed explanation)
  - Optional: Follow-up actions recommended
- **Notify User:**
  - Automatic notification via email dan dashboard
  - Include resolution details
  - Include satisfaction survey link
  - Ask untuk confirmation
- **Status Update:**
  - Status berubah ke "Resolved - Admin Closed"
  - Jika user confirms → "Resolved - Confirmed"
  - Auto-close after 7 days no response dari user

#### 3.4. Ticket Analytics
- **Statistics Dashboard:**
  - Total tickets: today, week, month, all-time
  - Tickets by category
  - Tickets by status
  - Average response time
  - Average resolution time
  - Customer satisfaction scores
  - Most common issues
  - **Deletion Statistics:**
    - Tickets auto-deleted (by retention policy)
    - Tickets manually deleted
    - Storage space freed
    - Retention compliance rate
- **Performance Metrics:**
  - Admin response rate
  - Tickets resolved vs pending
  - SLA compliance (jika applicable)
- Visual graphs dan charts

### 5. Automatic Ticket Deletion System (Data Retention Policy)

**Persyaratan CRITICAL untuk Keamanan dan Privacy:**

#### 5.1. Retention Policy Rules
- **HARD LIMIT: 15 Hari Maximum Retention**
  - Semua ticket (new, resolved, closed) HARUS dihapus setelah 15 hari
  - 15 hari dihitung dari tanggal ticket status berubah ke "Resolved" atau "Closed"
  - **TIDAK DAPAT diperpanjang beyond 15 hari** (immutable policy)
  - **DAPAT dipercepat** untuk enhanced security
- **Flexible Deletion Timeline:**
  - Admin dapat set retention period: 1-15 hari
  - Default setting: 15 hari
  - Recommended untuk sensitive cases: 1-7 hari
  - Can be set per-ticket atau global policy
- **Immediate Deletion Option:**
  - Admin dapat manually delete ticket immediately after resolution
  - Requires confirmation dan reason
  - Irreversible action

#### 5.2. Automatic Deletion Process
- **Scheduled Check:**
  - System runs daily check (midnight UTC)
  - Identifies tickets yang mencapai retention deadline
  - Creates deletion queue
- **Pre-Deletion Notifications:**
  - **T-3 days:** Warning notification ke user dan admin
    - Email notification
    - In-app notification
    - Option untuk export ticket data
  - **T-1 day:** Final reminder notification
    - Last chance untuk export data
    - Countdown timer
- **Deletion Execution:**
  - Permanent deletion dari database
  - Delete all attachments (images, videos, documents)
  - Clear all related cache
  - Remove from search indices
  - **Create deletion log entry** (minimal metadata only):
    - Ticket code (hashed untuk verification)
    - Deletion timestamp
    - Deletion reason (auto-retention atau manual)
    - NO content atau personal data
- **Post-Deletion:**
  - Confirmation notification (optional)
  - Update analytics
  - Free storage space
  - Deletion audit log

#### 5.3. Manual Accelerated Deletion
- **Admin Controls:**
  - Select single atau multiple tickets
  - Set custom retention period (1-15 days)
  - Immediate deletion option
  - Bulk operations dengan filters
- **Required Actions:**
  - Confirmation dialog dengan warning
  - Input deletion reason
  - Review affected tickets count
  - Final confirmation dengan password/2FA
- **Deletion Queue Management:**
  - View upcoming deletions
  - Scheduled deletion calendar
  - Modify deletion schedule (only to accelerate)
  - Cancel scheduled deletion (convert back to max 15 days)

#### 5.4. Data Included in Deletion
**Everything related to ticket is permanently deleted:**
- Ticket metadata (title, description, category)
- User information connected to ticket
- All attachments:
  - Images (compressed dan original)
  - Videos
  - Documents (PDF, Word, etc.)
- Admin responses dan notes
- Progress updates dan timeline
- Notification history for this ticket
- Search index entries
- Cache related to ticket
- Temporary files
**Only preserved (for 30 days):**
- Hashed ticket code (untuk verification purposes)
- Deletion timestamp
- Deletion reason
- No personal data whatsoever

#### 5.5. Export Before Deletion
- **User Export Options:**
  - **PDF Export:**
    - Complete ticket thread
    - All messages dan responses
    - Timestamps
    - Attachments as embedded images atau links
  - **TXT Export:**
    - Plain text version
    - Lightweight format
  - **JSON Export:**
    - Machine-readable format
    - Complete data structure
    - For archival purposes
- **Download Attachments:**
  - Zip file dengan all attachments
  - Organized by type
  - Filename preservation
- **Admin Export:**
  - Same options as user
  - Additional: Internal notes
  - Bulk export multiple tickets
- **Automatic Export (Optional):**
  - Auto-export 7 days before deletion
  - Send via email
  - Store in user's download history

#### 5.6. Compliance dan Audit
- **Deletion Audit Trail:**
  - Log all deletion activities
  - Who initiated deletion (system atau admin)
  - When deletion occurred
  - How many tickets deleted
  - Storage space freed
- **Compliance Reports:**
  - Monthly retention compliance report
  - Tickets deleted on schedule
  - Manual deletions summary
  - Policy violations (if any)
- **Legal Compliance:**
  - GDPR Right to Erasure compliance
  - Data minimization principle
  - Storage limitation principle
  - Automated decision-making transparency

### 4. Notification System for Tickets

**Persyaratan:**

#### 4.1. Admin Notifications
- **New Ticket Notification:**
  - Push notification di admin dashboard
  - Sound alert (customizable)
  - Badge count di notification icon
  - Desktop notification (jika enabled)
- **Ticket Update Notification:**
  - When user adds more details
  - When user marks as resolved
  - When ticket reaches critical status
  - When ticket approaching deletion (T-3 days)
  - Configurable notification preferences

#### 4.2. User Notifications
- **Status Change Notifications:**
  - When admin responds
  - When status changes
  - When ticket resolved
  - When follow-up needed
  - **When ticket approaching auto-deletion (T-3 days):**
    - Push notification (jika enabled)
    - Email notification
    - In-app notification banner
    - Message: "Your ticket #SONORA-XXXXX will be automatically deleted in 3 days. Export your data now if needed."
    - Direct link ke export functionality
  - **Final deletion reminder (T-1 day):**
    - All notification channels (push, email, in-app)
    - Urgent tone
    - Message: "FINAL REMINDER: Your ticket will be deleted tomorrow. This is your last chance to export data."
    - Prominent export button
- **Notification Channels:**
  - In-dashboard notifications (primary)
  - Email notifications (optional)
  - Push notifications (jika enabled)
- **Notification Preferences:**
  - User dapat configure notification settings
  - Choose channels
  - Mute specific ticket updates (except deletion warnings - CANNOT be muted)

#### 4.3. Retention Policy Warnings Throughout System
**Display 15-Day Policy di Multiple Locations:**

1. **Support Page (Before Submission):**
   - Prominent warning box:
     - 🔔 "IMPORTANT: All support tickets are automatically deleted 15 days after resolution for security purposes"
     - "Please save any important information before this period expires"
     - "You will receive notifications before deletion"
   - Cannot be dismissed (always visible)

2. **Ticket Submission Confirmation:**
   - After successful submission:
     - "Your ticket has been submitted successfully!"
     - ⚠️ "REMINDER: This ticket will be automatically deleted 15 days after resolution"
     - "Deletion date will be displayed in ticket tracking"
     - Link ke export options

3. **Ticket Tracking Page:**
   - Persistent banner di top:
     - "🗓️ Auto-deletion in: [X days, Y hours]"
     - Countdown timer (visual)
     - Progress bar showing time remaining
     - "Export Data" button (always accessible)
   - Color-coded urgency:
     - Green: >7 days remaining
     - Yellow: 3-7 days remaining
     - Red: <3 days remaining (blinking/animated)

4. **User Dashboard:**
   - "Active Tickets" widget shows deletion countdown
   - Filter: "Expiring Soon" (tickets with <7 days)
   - Bulk export option untuk multiple tickets

5. **Email Notifications:**
   - Every email includes footer:
     - "Support tickets are automatically deleted 15 days after resolution"
     - Link ke Privacy Policy

6. **Admin Dashboard:**
   - Show tickets approaching deletion
   - Highlight tickets in red when <3 days
   - Option to manually delete early
   - Cannot extend beyond 15 days (UI prevents this)

7. **Privacy Policy Page:**
   - Dedicated section with icon
   - Explanation with examples
   - FAQ about retention policy
   - Cannot be missed

8. **Terms of Service:**
   - Clear statement in "Data Handling" section
   - Consequences of not exporting data
   - User agreement acknowledgment

9. **First-Time User Onboarding:**
   - Tutorial step explaining retention policy
   - Interactive example
   - "I understand" confirmation required

10. **Settings Page:**
    - "Data & Privacy" section
    - Shows current tickets dan deletion dates
    - Quick export all option
    - Educational tooltip

---

## IMPLEMENTATION NOTES

### Priority Levels
1. **Critical/High Priority:**
   - Security implementations (A.1, A.5)
   - Login fix (B.2)
   - Core bot functionality (B.3, B.4)
2. **Medium Priority:**
   - Monitoring systems (B.10)
   - Support page (C.1, C.2, C.3)
   - User ban systems (B.7, B.8, B.12)
3. **Low Priority:**
   - UI polish dan animations
   - Advanced analytics
   - Optional features

### Testing Requirements
- Comprehensive testing untuk each feature sebelum deployment
- Security penetration testing (mandatory)
- User acceptance testing (UAT)
- Load testing untuk high-traffic scenarios
- Cross-browser testing
- Mobile responsiveness testing

### Documentation Requirements
- API documentation (jika applicable)
- User guides untuk each major feature
- Admin documentation
- Code documentation (inline comments)
- Database schema documentation
- Deployment procedures
- Rollback procedures

### Compliance Requirements
- GDPR compliance untuk data handling
- Update all legal documents (ToS, Privacy Policy)
- Cookie consent management
- Data retention policies
- Right to deletion implementation
- Data portability (export user data)

### Performance Requirements
- Page load time: < 3 seconds
- API response time: < 500ms
- Real-time updates latency: < 1 second
- Support untuk minimum 1000 concurrent users
- Database query optimization
- CDN untuk static assets
- Caching strategies

### Backup and Recovery
- Automated daily backups
- Point-in-time recovery capability
- Backup retention: minimum 30 days
- Test restore procedures monthly
- Disaster recovery plan
- High availability setup (jika applicable)

---

## TEKNOLOGI YANG DISARANKAN

### Backend
- Node.js dengan Express.js atau Fastify
- Discord.js untuk bot functionality
- PostgreSQL atau MongoDB untuk database
- Redis untuk caching dan session management
- JWT untuk authentication
- Socket.io untuk real-time features

### Frontend
- React.js atau Vue.js
- TailwindCSS untuk styling
- Chart.js atau Recharts untuk analytics
- Progressive Web App (PWA) capabilities
- Service Worker untuk push notifications

### Security
- Helmet.js untuk HTTP security headers
- bcrypt untuk password hashing
- express-rate-limit untuk rate limiting
- cors configuration
- XSS protection libraries
- SQL injection prevention (parameterized queries)

### DevOps
- Docker untuk containerization
- CI/CD pipeline (GitHub Actions, GitLab CI)
- Monitoring: Prometheus, Grafana
- Logging: Winston, Morgan
- Error tracking: Sentry
- Uptime monitoring: Uptime Robot, Pingdom

---

## DELIVERABLES

1. Source code (well-documented)
2. Database schema dan migrations
3. API documentation
4. User documentation
5. Admin documentation
6. Deployment guide
7. Testing reports
8. Security audit report
9. Legal documents (updated ToS, Privacy Policy)
10. Maintenance procedures

---

**Catatan Akhir:**
Spesifikasi ini sangat comprehensive dan memerlukan development time yang significant. Disarankan untuk implementasi dalam phases/sprints dengan prioritas yang jelas. Pastikan regular communication dengan stakeholders dan testing menyeluruh di setiap phase.