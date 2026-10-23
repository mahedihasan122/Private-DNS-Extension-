# AegisDNS Guard — DNS Privacy VPN, Ad Blocker & 18+ Content Filter Extension

AegisDNS Guard is a comprehensive DNS-based privacy shield and Chrome Extension suite that gives users complete control over their internet traffic. It combines a real-time interactive Web Control Dashboard & BrowserPopup Simulator with a one-click builder that exports a ready-to-install Chrome Extension (Manifest V3) configured with DNS-over-HTTPS (DoH) routing, total web ad/tracker elimination, granular 18+ media blocking (images, video, audio, and adult websites), custom blocklists/whitelists, and optional PIN lock protection.

## User Review & Critical Decisions

> [!IMPORTANT]
> **Confirmed Choices from Phase 1:**
> - **Delivery Format**: Interactive Web Control Dashboard + Live Extension Popup Simulator + Ready-to-Install Chrome Extension (`.zip` / Manifest V3 bundle) that reflects your exact customized rules.
> - **Core Filtering Suite**:
>   1. **DNS-over-HTTPS (DoH) Server Selector**: Pre-configured profiles for AdGuard DNS (Ads + Trackers), AdGuard Family Protection (Ads + 18+ SafeSearch), Cloudflare `1.1.1.3` Family (Malware + Adult Content Block), CleanBrowsing Family/Adult Filter, and Custom DoH Endpoint support.
>   2. **Granular 18+ Media & Website Blocker**: Separate toggleable shields for Adult Domains, 18+ Images (`<img>`/`<picture>`/CSS backgrounds), 18+ Video Streams (`<video>`/embeds), 18+ Audio (`<audio>`), and Forced SafeSearch across search engines.
>   3. **Total Ad & Tracker Blocker**: Blocks banner ads, video pre-roll ads, pop-ups, third-party trackers, and analytics scripts, paired with an interactive Custom Blocklist & Whitelist manager.
>   4. **Live DNS Query Log & Blocked Request Counter**: Real-time request inspector with live DNS-over-HTTPS resolution testing and rule simulation.
> - **Parental / Self-Control Security**: Optional 4-digit PIN / Password Lock that protects 18+ filtering toggles, DNS provider changes, and whitelist modifications from unauthorized or impulsive disabling.

> [!NOTE]
> **How Chrome Extension DNS & Media Filtering Works in Practice:**
> Chrome's Manifest V3 `declarativeNetRequest` API intercepts and blocks network requests by domain, URL pattern, and resource type (`image`, `media`, `xmlhttprequest`, `script`, `sub_frame`) directly at the browser network layer before any data downloads, while content scripts inspect and sanitize on-page 18+ media elements and ad containers. The bundled extension package exports your exact custom ruleset ready to load via `chrome://extensions` (Developer Mode -> Load Unpacked).

---

## 1. Overview & Core Concept

- **What It Does**: Provides a dual-mode experience:
  1. **Web Command Center & Live Simulator**: Configure DNS-over-HTTPS resolvers, toggle ad and 18+ media filters, test real domain resolutions against live DoH endpoints, simulate webpage ad/18+ media blocking in an interactive sandbox, inspect live query logs, and lock settings with a PIN.
  2. **Chrome Extension Package Exporter**: Dynamically compiles your current DNS selection, 18+ media rules, custom blocklist/whitelist, and PIN hash into a complete, ready-to-install Chrome Extension (Manifest V3) downloadable as a single `.zip` archive or inspectable file-by-file with step-by-step Bengali + English installation instructions.
- **Target Audience / Persona**: Privacy-conscious users, families, and individuals looking for a lightweight, zero-cost DNS system that blocks intrusive web ads and strictly filters 18+ websites, images, audio, and videos with tamper-resistant PIN protection.
- **Key Value**: Delivers DNS-level privacy and content control without slow traditional proxy bottlenecks, while giving granular control over media types (images, audio, video) and custom domain rules.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **One-Click Shield Activation & Extension Popup Preview**: Users can toggle the master DNS VPN & Protection switch on the dashboard or inside the interactive 380px Chrome Extension Popup preview, immediately seeing active DNS server latency, blocked ads count, and 18+ shield status.
  2. **DNS System & Resolver Configuration**: Users select from curated DNS-over-HTTPS servers (AdGuard Family, Cloudflare 1.1.1.3, CleanBrowsing Adult Filter, Quad9, or Custom DoH URL) and run a **Live DNS Lookup & Filter Test** on any domain to verify whether it resolves or gets blocked.
  3. **Granular 18+ Media & Ad Filtering Matrix**: Users independently toggle switches for Web Banner/Video Ads, Tracking Scripts, 18+ Adult Websites, 18+ Images, 18+ Videos, 18+ Audio streams, and SafeSearch Enforcement.
  4. **Interactive Sandbox Testbed**: A built-in "Test Webpage Simulator" lets users preview how a sample web page containing ads, trackers, and 18+ image/video/audio placeholders gets cleaned in real time as filters are toggled.
  5. **Custom Blocklist / Whitelist & PIN Guard**: Users add or import/export custom domains or keywords to block or allow. Enabling the **PIN Lock** requires entering the 4-digit PIN before any 18+ filter can be turned off or any blocked domain whitelisted.
  6. **One-Click Chrome Extension Export**: Clicking **"Download Chrome Extension (.zip)"** packages the live configuration into `manifest.json`, `rules.json`, `background.js`, `content-filter.js`, `popup.html`, and `popup.js`, accompanied by an illustrated installation guide.

- **Visual Identity & Theme**:
  - **Aesthetic Direction**: High-craft technical SaaS & Network Security Console—authoritative, clean, and distraction-free.
  - **Color Palette & Mood** (60-30-10 Allocation):
    - *60% Dominant Canvas*: Deep slate-navy dark surface (`#0B1120` / `slate-950`) with crisp light-mode toggle support (`#F8FAFC`).
    - *30% Structural Surfaces*: Elevated slate panels (`#111827` / `slate-900`) separated by `1px solid` hairline borders (`border-slate-800`) and single-elevation depth (never cards nested inside cards).
    - *10% Semantic & Action Accents*: Emerald (`#10B981`) for active DNS protection and verified safe status; Indigo (`#6366F1`) for primary actions and export controls; Amber (`#F59E0B`) for PIN lock & parental guard warnings; Crimson (`#EF4444`) paired with explicit text labels for blocked 18+ and ad requests.
  - **Typography & Hierarchy**:
    - *Display & Navigation*: `Plus Jakarta Sans` (SemiBold/Bold) for crisp headers, brand wordmark, and section titles with `text-wrap: balance`.
    - *Body & Controls*: `DM Sans` (Regular/Medium) for clean scannability across filter descriptions and bilingual helper tips.
    - *Metrics, IP Addresses & Query Logs*: `JetBrains Mono` with strict `tabular-nums` (`font-variant-numeric: tabular-nums`) so counters, timestamps, DNS latencies, and IP records align vertically without layout jitter.
  - **Layout & Component Discipline**:
    - Desktop 1440px workspace with a structured left sidebar (`260px`), compliant top bar (contextual breadcrumb trail on the left, primary Extension Download CTA on the right), and a split main viewport featuring the configuration panels alongside a docked live Chrome Extension Popup simulator.
    - Zero static pills: all metadata (protocol types, resource categories, timestamps, latency figures) is rendered as quiet unboxed text with `·` separators.

- **Interactive Feedback & Motion**:
  - Snappy $\le 180\text{ms}$ toggle transitions using compositor-only `transform` and `opacity`.
  - Real-time counter increments and instant visual placeholders when 18+ images, audio, or video elements are blocked in the sandbox preview.
  - Clear PIN modal shake and inline error feedback if an incorrect PIN is entered when attempting to disable 18+ protection.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Dual Web Control Center + Downloadable Manifest V3 Extension Bundle**
  - *Chosen Approach*: Build a full-featured web dashboard with an embedded Chrome Extension Popup simulator **and** an in-browser ZIP packager that generates the complete Manifest V3 Chrome Extension files on the fly.
  - *Why*: A web app inside a browser tab cannot automatically install itself into Chrome without user action, nor can a static code dump let the user interactively test their DNS and filtering rules first. Combining both lets the user customize, test, and immediately download their working Chrome extension.
  - *Alternatives Considered*: Building only a static UI mockup (rejected: doesn't give the user an actual working Chrome extension) or outputting raw code snippets only (rejected: poor usability).

- **Decision 2: Real DoH JSON Resolution + DeclarativeNetRequest Resource-Type Filtering**
  - *Chosen Approach*: Use real HTTPS calls to DNS-over-HTTPS JSON endpoints (Cloudflare/Google/AdGuard DNS query format) in the live DNS tester, and generate both `declarativeNetRequest` resource-type rules (`image`, `media`, `script`, `sub_frame`) and a DOM MutationObserver content script for the Chrome Extension.
  - *Why*: Blocking 18+ domains at the DNS/network level stops entire adult websites, while resource-type and DOM inspection rules allow selectively blocking 18+ images, audio, and video elements even on mixed-content websites.

- **Decision 3: Client-Side Persistent State + Tamper-Resistant PIN Guard**
  - *Chosen Approach*: Persist all DNS profiles, 18+ media toggles, custom blocklist/whitelist entries, query logs, and SHA-256 hashed PIN settings in `localStorage` (and `chrome.storage.local` in the exported extension).
  - *Why*: Ensures zero external tracking of user browsing rules while keeping settings locked behind the user's PIN across browser restarts.

---

## 4. Technical Architecture & Data Strategy

### Architecture & Component Diagram

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                         AegisDNS Guard Application                            │
├───────────────────────┬───────────────────────────────────────────────────────┤
│   Sidebar Navigation  │               Top Header Bar                          │
│  ┌─────────────────┐  │  Breadcrumb Trail         [Download Extension (.zip)] │
│  │ • Dashboard     │  ├───────────────────────────────────┬───────────────────┤
│  │ • DNS System    │  │      Main Workspace Viewport      │ Live Chrome Popup │
│  │ • 18+ & Media   │  │                                   │     Simulator     │
│  │ • Ad Blocker    │  │  ┌─────────────────────────────┐  │ ┌───────────────┐ │
│  │ • Domain Rules  │  │  │ Active View Controller      │  │ │ Master Toggle │ │
│  │ • Query Log     │  │  │ • DNS Provider & DoH Tester │  │ │ Active DoH    │ │
│  │ • Sandbox Test  │  │  │ • 18+ Image/Video/Audio Ctl │  │ │ Quick Toggles │ │
│  │ • PIN Security  │  │  │ • Ad & Tracker Rule Matrix  │  │ │ Blocked Stats │ │
│  │ • Extension Pkg │  │  │ • Blocklist / Whitelist Mgr │  │ └───────────────┘ │
│  └─────────────────┘  │  │ • Live Webpage Test Sandbox │  │                   │
│                       │  └─────────────────────────────┘  │                   │
└───────────────────────┴───────────────────────────────────┴───────────────────┘
                                        │
                    ┌───────────────────┴───────────────────┐
                    ▼                                       ▼
     ┌──────────────────────────────┐        ┌──────────────────────────────┐
     │  Filter & DNS State Engine   │        │ Manifest V3 Extension Builder│
     │ • DoH JSON Resolver Client   │        │ • manifest.json generator    │
     │ • PIN Lock Guard Middleware  │        │ • declarativeNetRequest JSON │
     │ • Rule Matcher (Ads / 18+)   │        │ • content-filter.js (Media)  │
     │ • Persistent Storage Sync    │        │ • One-Click ZIP Downloader   │
     └──────────────────────────────┘        └──────────────────────────────┘
```

### Data Model & State

- **`DnsConfig`**: Selected provider ID (`adguard-family`, `cloudflare-family`, `cleanbrowsing-adult`, `adguard-standard`, `custom`), primary DoH endpoint URL, secondary DNS IP, SafeSearch enforcement boolean, and last measured latency in `ms`.
- **`FilterConfig`**:
  - *Ad & Privacy*: `blockBannerAds`, `blockVideoAds`, `blockPopups`, `blockTrackers`, `blockMalware`.
  - *18+ Content & Media*: `blockAdultDomains`, `blockAdultImages`, `blockAdultVideos`, `blockAdultAudio`, `strictKeywordFilter`, `safeSearchEnforced`.
- **`CustomRules`**: Array of rule items `{ id, pattern, type: 'block' | 'allow', category: '18+' | 'ads' | 'custom', resourceTypes: ('main_frame' | 'image' | 'media' | 'script')[], createdAt }`.
- **`SecurityPinState`**: `{ enabled: boolean, pinHash: string, isUnlockedSession: boolean, lockTimeoutMinutes: number }`.
- **`DnsQueryLogEntry`**: `{ id, timestamp, domain, resourceType: 'domain' | 'image' | 'video' | 'audio' | 'ad-script', action: 'blocked-18+' | 'blocked-ad' | 'allowed' | 'whitelisted', provider, latencyMs }`.

### Interactive Component & State Mapping

- **PIN Verification Gate (`PinGuardModal`)**: Intercepts any state mutation that weakens protection (turning off master VPN switch, disabling 18+ image/video/audio toggles, switching away from a Family DNS server, or deleting a blocklist rule) when `SecurityPinState.enabled` is true.
- **Live DoH Resolver & Rule Tester (`DnsSystemView`)**: Sends real HTTPS requests to the active DoH JSON endpoint (`https://cloudflare-dns.com/dns-query` or `https://dns.google/resolve`) and cross-checks the domain against the active 18+ and Ad blocklists to display exact resolution records, latency in `ms`, and block/allow verdict.
- **Interactive Media & Ad Sandbox (`SandboxTesterView`)**: Renders a simulated browser viewport with sample web articles, banner ad slots, pop-up triggers, and simulated 18+ image, audio, and video embeds so the user can visually verify each toggle blocking and replacing restricted media in real time.
- **Extension Package Generator (`ExtensionExportView`)**: Compiles the user's current `DnsConfig`, `FilterConfig`, `CustomRules`, and `SecurityPinState` into a downloadable `.zip` archive containing the complete Chrome Extension source code and interactive installation steps.
