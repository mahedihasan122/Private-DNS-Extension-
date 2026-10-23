# 🛡️ AegisDNS Guard — DNS Privacy VPN, Total Ad Blocker & 18+ Media Filter Chrome Extension

**AegisDNS Guard** is an interactive DNS-over-HTTPS (DoH) privacy control center and **Chrome Extension (Manifest V3) generator**. It gives you complete control over your internet traffic by combining encrypted DNS routing, total web & video advertisement blocking, and granular **18+ content & media filtering** (blocking explicit websites, images, videos, and audio streams) with optional **PIN Lock** protection.

---

## ✨ Key Features

### 1. 🌐 Encrypted DNS-over-HTTPS (DoH) System
- **Curated Privacy & Family DNS Resolvers**:
  - **AdGuard Family Protection DNS** (`94.140.14.15`) — Blocks ads, trackers, 18+ adult domains & enforces SafeSearch.
  - **Cloudflare 1.1.1.3 Family Shield** (`1.1.1.3`) — Ultra-low latency DNS blocking malware and 18+ adult sites.
  - **CleanBrowsing Adult Filter** (`185.228.168.10`) — Strict DNS filtering for explicit portals and media hosts.
  - **AdGuard Standard DNS** (`94.140.14.14`) — Blocks ads, pop-ups, and analytics trackers.
  - **Quad9 Encrypted Privacy DNS** (`9.9.9.9`) — Swiss privacy DNS with threat & phishing protection.
  - **Custom DoH Server** — Connect your own NextDNS, ControlD, or private DoH endpoint.
- **Live DoH Diagnostic Tool**: Test any domain in real time to inspect DNS resolution records, latency (`ms`), and policy verdicts.

### 2. 🔞 Granular 18+ Website, Image, Video & Audio Blocker
- **18+ Website Domain Blocker**: Sinkholes and redirects known adult websites and explicit portals to a safe block page.
- **18+ Image Filter (`<img>`, `<picture>`, JPEG/PNG/WebP)**: Blocks explicit image downloads at the network layer and blurs/replaces suspicious media elements in the DOM.
- **18+ Video Stream Blocker (`<video>`, MP4, HLS/m3u8)**: Terminates explicit video streams and embedded players before buffering begins.
- **18+ Audio Track Blocker (`<audio>`, MP3/AAC)**: Mutes and strips explicit audio streams and voice tracks.
- **Strict SafeSearch Enforcement**: Forces strict SafeSearch mode across Google, Bing, YouTube, and DuckDuckGo.

### 3. 🚫 Total Web Ad & Tracker Blocker
- Eliminates web banner ads, native display ads, video pre-roll/mid-roll commercials, and intrusive pop-up/tab-under windows.
- Blocks third-party analytics trackers, strips URL tracking parameters (`utm_*`, `fbclid`, `gclid`), and prevents WebRTC local IP leaks.

### 4. 🔒 Parental & Self-Control PIN Lock Guard
- Set a **4-to-8 digit security PIN** so that 18+ filters, DNS server configurations, and whitelist rules cannot be disabled or bypassed without authorization.

### 5. 🧪 Live Webpage Sandbox & Chrome Extension Popup Simulator
- Test how banner ads, video ads, and 18+ images, videos, and audio are blocked in real time inside the built-in **Live Webpage Sandbox** and docked **Chrome Extension Popup Simulator**.

### 6. 📦 One-Click Chrome Extension (`.zip`) Exporter
- Dynamically compiles your active DNS server, 18+ media toggles, ad-blocking rules, custom blocklist/whitelist, and PIN configuration into a ready-to-install **Chrome Extension (Manifest V3)** `.zip` package (`manifest.json`, `rules.json`, `background.js`, `content-filter.js`, `popup.html`, `popup.js`, `blocked.html`).

---

## 🏗️ Architecture Overview

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                         AegisDNS Guard Application                            │
├───────────────────────┬───────────────────────────────────────────────────────┤
│   Control Modules     │               Main Workspace & Simulator              │
│  ┌─────────────────┐  │  ┌─────────────────────────────────────────────────┐  │
│  │ • Dashboard     │  │  │ • DNS-over-HTTPS Selector & Live Lookup Tester  │  │
│  │ • DNS System    │  │  │ • 18+ Image / Video / Audio / Domain Matrix     │  │
│  │ • 18+ & Media   │  │  │ • Total Web Ad & Tracker Blocker                │  │
│  │ • Ad Blocker    │  │  │ • Custom Blocklist & Whitelist Rule Manager     │  │
│  │ • Domain Rules  │  │  │ • Live Webpage Media & Ad Filter Sandbox        │  │
│  │ • Query Log     │  │  │ • Docked Chrome Extension Popup Simulator       │  │
│  │ • PIN Security  │  │  └─────────────────────────────────────────────────┘  │
│  │ • Extension Pkg │  │                           │                           │
│  └─────────────────┘  │                           ▼                           │
│                       │  ┌─────────────────────────────────────────────────┐  │
│                       │  │   Manifest V3 Chrome Extension ZIP Generator    │  │
│                       │  │   manifest.json · rules.json · background.js    │  │
│                       │  │   content-filter.js · popup.html · blocked.html │  │
│                       │  └─────────────────────────────────────────────────┘  │
└───────────────────────┴───────────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- **Node.js** (v18 or higher)
- **npm** (v9 or higher)

### Installation & Run
```bash
# 1. Clone the repository
git clone https://github.com/your-username/aegis-dns-guard.git
cd aegis-dns-guard

# 2. Install dependencies
npm install

# 3. Start the development server on http://localhost:3000
npm run dev
```

### Build for Production
```bash
npm run build
npm run preview
```

---

## 🧩 How to Install the Exported Chrome Extension

### English Guide
1. Open the **AegisDNS Guard** web dashboard, customize your DNS server, Ad Blocker, and 18+ Media Filters, and click **Download Extension (.zip)**.
2. **Unzip / Extract** `aegis-dns-guard-extension.zip` into a folder on your computer.
3. Open **Google Chrome** (or Brave / Microsoft Edge) and navigate to:
   ```text
   chrome://extensions
   ```
4. Enable the **Developer mode** toggle switch in the top-right corner.
5. Click **Load unpacked** in the top-left corner and select the extracted extension folder.
6. *(Optional)* To enforce encrypted DNS-over-HTTPS across your entire browser, open `chrome://settings/security`, scroll to **Use secure DNS**, and enter your chosen DoH URL (for example: `https://family.adguard-dns.com/dns-query` or `https://family.cloudflare-dns.com/dns-query`).

---

### বাংলা গাইড (Bengali Installation Guide)
১. ওয়েব ড্যাশবোর্ড থেকে আপনার পছন্দের **DNS Server**, **Ad Blocker**, এবং **18+ Image/Video/Audio Filter** সেটিংস কাস্টমাইজ করে **Download Extension (.zip)** বাটনে ক্লিক করুন।
২. ডাউনলোড হওয়া `aegis-dns-guard-extension.zip` ফাইলটি আপনার কম্পিউটারের একটি ফোল্ডারে **Extract / Unzip** করুন।
৩. আপনার Chrome ব্রাউজারের অ্যাড্রেস বারে নিচের ঠিকানাটি লিখে **Enter** চাপুন:
   ```text
   chrome://extensions
   ```
৪. উপরের ডান কোণায় থাকা **Developer mode** অপশনটি **ON** করুন।
৫. উপরের বাম কোণায় **Load unpacked** বাটনে ক্লিক করুন এবং আপনার Extract করা ফোল্ডারটি সিলেক্ট করুন।
৬. *(ঐচ্ছিক)* সম্পূর্ণ ব্রাউজারে DNS সিস্টেম চালু করতে `chrome://settings/security` পেজে যান, নিচে **Use secure DNS** অপশনে গিয়ে কাস্টম সার্ভার হিসেবে দিন:
   `https://family.adguard-dns.com/dns-query` অথবা `https://family.cloudflare-dns.com/dns-query`

---

## 🛠️ Tech Stack
- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons
- **Extension Architecture**: Chrome Extension Manifest V3 (`declarativeNetRequest`, Service Worker `background.js`, DOM `MutationObserver` Media & Ad Sanitizer, `chrome.privacy.network` WebRTC Shield)
- **Bundler**: Vite

---

## 📄 License
Distributed under the **Apache-2.0 License**. Feel free to fork, customize, and share!
