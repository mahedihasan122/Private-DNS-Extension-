import { CustomRule, DnsProvider, FilterConfig, PinSecurityState } from '../types/vpn';

export interface GeneratedExtensionFile {
  filename: string;
  description: string;
  language: 'json' | 'javascript' | 'html' | 'markdown';
  content: string;
}

export function generateExtensionFiles(
  provider: DnsProvider,
  filters: FilterConfig,
  customRules: CustomRule[],
  pinState: PinSecurityState
): GeneratedExtensionFile[] {
  const manifestJson = JSON.stringify(
    {
      manifest_version: 3,
      name: 'AegisDNS Guard — Free DNS VPN, Ad & 18+ Media Blocker',
      version: '2.4.0',
      description: `DNS Privacy Shield (${provider.name}) with Total Ad Blocking and Granular 18+ Image, Audio, Video & Website Filtering.`,
      permissions: [
        'declarativeNetRequest',
        'declarativeNetRequestWithHostAccess',
        'declarativeNetRequestFeedback',
        'storage',
        'tabs',
        'activeTab',
        'scripting',
        'privacy',
      ],
      host_permissions: ['<all_urls>'],
      background: {
        service_worker: 'background.js',
      },
      action: {
        default_popup: 'popup.html',
        default_title: 'AegisDNS Guard — VPN & 18+ Filter',
      },
      declarative_net_request: {
        rule_resources: [
          {
            id: 'aegis_static_rules',
            enabled: filters.vpnEnabled,
            path: 'rules.json',
          },
        ],
      },
      content_scripts: [
        {
          matches: ['<all_urls>'],
          js: ['content-filter.js'],
          run_at: 'document_start',
          all_frames: true,
        },
      ],
      web_accessible_resources: [
        {
          resources: ['blocked.html'],
          matches: ['<all_urls>'],
        },
      ],
    },
    null,
    2
  );

  // Build DeclarativeNetRequest rules based on active toggles & custom rules
  const dnrRules: Record<string, unknown>[] = [];
  let ruleId = 1;

  if (filters.blockBannerAds || filters.blockVideoAds) {
    const adDomains = [
      'doubleclick.net',
      'googlesyndication.com',
      'googleadservices.com',
      'adnxs.com',
      'taboola.com',
      'outbrain.com',
      'popads.net',
      'adsterra.com',
      'propellerads.com',
      'criteo.com',
    ];
    for (const domain of adDomains) {
      dnrRules.push({
        id: ruleId++,
        priority: 2,
        action: { type: 'block' },
        condition: {
          urlFilter: `||${domain}^`,
          resourceTypes: [
            'script',
            'image',
            'sub_frame',
            'xmlhttprequest',
            'media',
          ],
        },
      });
    }
  }

  if (filters.blockTrackers) {
    const trackerDomains = [
      'google-analytics.com',
      'hotjar.com',
      'mixpanel.com',
      'segment.io',
      'scorecardresearch.com',
    ];
    for (const domain of trackerDomains) {
      dnrRules.push({
        id: ruleId++,
        priority: 2,
        action: { type: 'block' },
        condition: {
          urlFilter: `||${domain}^`,
          resourceTypes: ['script', 'xmlhttprequest', 'ping'],
        },
      });
    }
  }

  // 18+ Adult Domain Blocking
  if (filters.blockAdultDomains) {
    const adultDomainPatterns = [
      '*pornhub*',
      '*xvideos*',
      '*xnxx*',
      '*xhamster*',
      '*redtube*',
      '*youporn*',
      '*onlyfans*',
      '*chaturbate*',
      '*brazzers*',
      '*spankbang*',
      '*adult-sim*',
      '*nsfw*',
    ];
    for (const pattern of adultDomainPatterns) {
      dnrRules.push({
        id: ruleId++,
        priority: 3,
        action: {
          type: 'redirect',
          redirect: { extensionPath: '/blocked.html' },
        },
        condition: {
          urlFilter: pattern,
          resourceTypes: ['main_frame', 'sub_frame'],
        },
      });
    }
  }

  // Granular 18+ Image Blocking at Network Layer
  if (filters.blockAdultImages) {
    const adultImageKeywords = ['*nsfw*', '*xxx*', '*explicit*', '*adult*', '*18plus*', '*nude*'];
    for (const kw of adultImageKeywords) {
      dnrRules.push({
        id: ruleId++,
        priority: 4,
        action: { type: 'block' },
        condition: {
          urlFilter: kw,
          resourceTypes: ['image', 'imageset'],
        },
      });
    }
  }

  // Granular 18+ Video & Audio Stream Blocking at Network Layer
  if (filters.blockAdultVideos || filters.blockAdultAudio) {
    const adultMediaKeywords = ['*nsfw*', '*xxx*', '*explicit*', '*adult*', '*erotic*'];
    for (const kw of adultMediaKeywords) {
      dnrRules.push({
        id: ruleId++,
        priority: 4,
        action: { type: 'block' },
        condition: {
          urlFilter: kw,
          resourceTypes: ['media', 'xmlhttprequest', 'object'],
        },
      });
    }
  }

  // User Custom Rules (Blocklist & Whitelist)
  for (const custom of customRules) {
    const resourceTypeMap: Record<string, string[]> = {
      all: ['main_frame', 'sub_frame', 'script', 'image', 'media', 'xmlhttprequest'],
      domain: ['main_frame', 'sub_frame'],
      image: ['image', 'imageset'],
      video: ['media', 'xmlhttprequest'],
      audio: ['media'],
      script: ['script', 'xmlhttprequest'],
    };

    dnrRules.push({
      id: ruleId++,
      priority: custom.type === 'allow' ? 10 : 5,
      action: { type: custom.type === 'allow' ? 'allow' : 'block' },
      condition: {
        urlFilter: custom.pattern,
        resourceTypes: resourceTypeMap[custom.scope] || resourceTypeMap.all,
      },
    });
  }

  const rulesJson = JSON.stringify(dnrRules, null, 2);

  const backgroundJs = `/**
 * AegisDNS Guard — Background Service Worker (Manifest V3)
 * Active DNS-over-HTTPS Profile: ${provider.name}
 * DoH Endpoint: ${provider.dohEndpoint}
 * Primary DNS IP: ${provider.primaryIp}
 */

const DEFAULT_CONFIG = ${JSON.stringify(
    {
      provider,
      filters,
      pinEnabled: pinState.enabled,
      pinCode: pinState.pinCode,
    },
    null,
    2
  )};

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get(['aegisConfig', 'stats']);
  if (!existing.aegisConfig) {
    await chrome.storage.local.set({
      aegisConfig: DEFAULT_CONFIG,
      stats: {
        adsBlocked: 0,
        adultBlocked: 0,
        mediaFiltered: 0,
        dnsQueriesResolved: 0,
      },
    });
  }

  // Enable WebRTC IP Leak Prevention when configured
  if (DEFAULT_CONFIG.filters.webrtcIpHide && chrome.privacy && chrome.privacy.network) {
    chrome.privacy.network.webRTCIPHandlingPolicy.set({
      value: 'disable_non_proxied_udp',
    });
  }
});

// DNS-over-HTTPS (DoH) Resolver Helper for Extension Verification
async function resolveDomainViaDoH(domain) {
  const { aegisConfig } = await chrome.storage.local.get('aegisConfig');
  const dohUrl = (aegisConfig?.provider?.dohEndpoint) || '${provider.dohEndpoint}';
  try {
    const response = await fetch(\`\${dohUrl}?name=\${encodeURIComponent(domain)}&type=A\`, {
      headers: { accept: 'application/dns-json' },
    });
    return await response.json();
  } catch (err) {
    return { Status: 2, error: err.message };
  }
}

// Enforce SafeSearch on Search Engines when enabled
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!changeInfo.url) return;
  const { aegisConfig } = await chrome.storage.local.get('aegisConfig');
  if (!aegisConfig?.filters?.vpnEnabled || !aegisConfig?.filters?.enforceSafeSearch) return;

  try {
    const url = new URL(changeInfo.url);
    if (url.hostname.includes('google.') && url.pathname === '/search' && url.searchParams.get('safe') !== 'active') {
      url.searchParams.set('safe', 'active');
      chrome.tabs.update(tabId, { url: url.toString() });
    } else if (url.hostname.includes('bing.com') && url.pathname === '/search' && url.searchParams.get('adlt') !== 'strict') {
      url.searchParams.set('adlt', 'strict');
      chrome.tabs.update(tabId, { url: url.toString() });
    }
  } catch (_) {}
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'DOH_LOOKUP') {
    resolveDomainViaDoH(msg.domain).then(sendResponse);
    return true;
  }
  if (msg.type === 'INCREMENT_STAT') {
    chrome.storage.local.get('stats', ({ stats }) => {
      const updated = stats || { adsBlocked: 0, adultBlocked: 0, mediaFiltered: 0, dnsQueriesResolved: 0 };
      updated[msg.key] = (updated[msg.key] || 0) + 1;
      chrome.storage.local.set({ stats: updated });
      sendResponse(updated);
    });
    return true;
  }
});
`;

  const contentFilterJs = `/**
 * AegisDNS Guard — Real-Time DOM Ad & 18+ Media Filter (Images, Video, Audio)
 * Inspects page elements before render to remove web ads and block 18+ media.
 */
(function () {
  const CONFIG = ${JSON.stringify(filters, null, 2)};
  const ADULT_PATTERNS = /(\\b(nsfw|xxx|18\\+|porn|xvideos|xnxx|onlyfans|adult|explicit|erotic|nude|hentai|sex)\\b)/i;
  const AD_SELECTORS = [
    '[id^="google_ads_"]',
    'ins.adsbygoogle',
    '[class*="ad-banner"]',
    '[class*="sponsored-content"]',
    '[id*="taboola"]',
    '[id*="outbrain"]',
    'iframe[src*="doubleclick.net"]',
    'iframe[src*="googlesyndication.com"]'
  ];

  function sanitizePage() {
    if (!CONFIG.vpnEnabled) return;

    // 1. Remove Web Banner & Video Ads
    if (CONFIG.blockBannerAds || CONFIG.blockVideoAds) {
      document.querySelectorAll(AD_SELECTORS.join(',')).forEach((el) => {
        el.remove();
      });
    }

    // 2. Inspect and Block 18+ Images
    if (CONFIG.blockAdultImages) {
      document.querySelectorAll('img, picture, figure').forEach((img) => {
        const meta = \`\${img.src || ''} \${img.alt || ''} \${img.title || ''} \${img.className || ''}\`;
        if (ADULT_PATTERNS.test(meta)) {
          img.style.filter = 'blur(28px) grayscale(100%)';
          img.style.pointerEvents = 'none';
          img.setAttribute('data-aegis-blocked', '18+-image');
          if (img.tagName === 'IMG') {
            img.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="400" height="250" fill="%230f172a"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23f87171" font-family="sans-serif" font-size="14">18+ Image Blocked by AegisDNS Guard</text></svg>';
          }
        }
      });
    }

    // 3. Inspect and Block 18+ Video Streams
    if (CONFIG.blockAdultVideos) {
      document.querySelectorAll('video, iframe').forEach((vid) => {
        const meta = \`\${vid.src || ''} \${vid.title || ''} \${vid.className || ''} \${vid.id || ''}\`;
        if (ADULT_PATTERNS.test(meta)) {
          if (typeof vid.pause === 'function') vid.pause();
          vid.removeAttribute('src');
          vid.remove();
        }
      });
    }

    // 4. Inspect and Block 18+ Audio Elements
    if (CONFIG.blockAdultAudio) {
      document.querySelectorAll('audio').forEach((aud) => {
        const meta = \`\${aud.src || ''} \${aud.title || ''} \${aud.className || ''} \${aud.innerText || ''}\`;
        if (ADULT_PATTERNS.test(meta)) {
          if (typeof aud.pause === 'function') aud.pause();
          aud.removeAttribute('src');
          aud.remove();
        }
      });
    }
  }

  const observer = new MutationObserver(() => sanitizePage());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('DOMContentLoaded', sanitizePage);
})();
`;

  const popupHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>AegisDNS Guard</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 350px;
      background: #0b1120;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 16px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 12px;
      border-bottom: 1px solid #1e293b;
      margin-bottom: 14px;
    }
    .brand { font-weight: 700; font-size: 15px; color: #f8fafc; }
    .status { font-size: 12px; color: #10b981; font-family: monospace; }
    .dns-box {
      background: #111827;
      border: 1px solid #1e293b;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 12px;
    }
    .dns-label { font-size: 11px; color: #94a3b8; margin-bottom: 4px; }
    .dns-name { font-size: 13px; font-weight: 600; color: #e2e8f0; }
    .dns-ip { font-size: 11px; color: #6366f1; font-family: monospace; margin-top: 2px; }
    .row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 9px 0;
      border-bottom: 1px solid #1e293b;
      font-size: 13px;
    }
    .btn {
      width: 100%;
      margin-top: 14px;
      padding: 10px;
      background: #4f46e5;
      color: white;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">AegisDNS Guard</div>
    <div class="status" id="vpnStatus">${filters.vpnEnabled ? 'PROTECTED' : 'PAUSED'}</div>
  </div>
  <div class="dns-box">
    <div class="dns-label">Active DNS-over-HTTPS Server</div>
    <div class="dns-name">${provider.name}</div>
    <div class="dns-ip">${provider.primaryIp} · ${provider.dohEndpoint}</div>
  </div>
  <div class="row"><span>Block All Web & Video Ads</span><strong>${filters.blockBannerAds ? 'ON' : 'OFF'}</strong></div>
  <div class="row"><span>Block 18+ Adult Websites</span><strong>${filters.blockAdultDomains ? 'ON' : 'OFF'}</strong></div>
  <div class="row"><span>Block 18+ Images & Galleries</span><strong>${filters.blockAdultImages ? 'ON' : 'OFF'}</strong></div>
  <div class="row"><span>Block 18+ Videos & Streams</span><strong>${filters.blockAdultVideos ? 'ON' : 'OFF'}</strong></div>
  <div class="row"><span>Block 18+ Audio Content</span><strong>${filters.blockAdultAudio ? 'ON' : 'OFF'}</strong></div>
  <button class="btn" id="toggleBtn">Toggle DNS Protection</button>
  <script src="popup.js"></script>
</body>
</html>`;

  const popupJs = `document.getElementById('toggleBtn').addEventListener('click', async () => {
  const statusEl = document.getElementById('vpnStatus');
  const isProtected = statusEl.textContent === 'PROTECTED';
  statusEl.textContent = isProtected ? 'PAUSED' : 'PROTECTED';
  statusEl.style.color = isProtected ? '#f59e0b' : '#10b981';
});
`;

  const blockedHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Restricted Content Blocked — AegisDNS Guard</title>
  <style>
    body {
      background: #0b1120;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
    }
    .card {
      max-width: 480px;
      background: #111827;
      border: 1px solid #1e293b;
      border-radius: 12px;
      padding: 32px;
      text-align: center;
    }
    h1 { font-size: 20px; margin-bottom: 10px; color: #f87171; }
    p { font-size: 14px; color: #94a3b8; line-height: 1.6; }
    .meta { margin-top: 16px; font-family: monospace; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="card">
    <h1>18+ Content & Restricted Domain Blocked</h1>
    <p>This website or media resource has been blocked by your AegisDNS Guard privacy and content filtering policy.</p>
    <div class="meta">DNS Server: ${provider.name} (${provider.primaryIp})</div>
  </div>
</body>
</html>`;

  const readmeMd = `# AegisDNS Guard — Chrome Extension Installation Guide (English & বাংলা)

## Configured Settings in This Package
- **DNS Server**: ${provider.name} (${provider.primaryIp} / ${provider.dohEndpoint})
- **Web Ad & Tracker Blocking**: ${filters.blockBannerAds ? 'Enabled' : 'Disabled'}
- **18+ Website Domain Blocking**: ${filters.blockAdultDomains ? 'Enabled' : 'Disabled'}
- **18+ Image / Video / Audio Media Filtering**: Images (${filters.blockAdultImages ? 'ON' : 'OFF'}) · Video (${filters.blockAdultVideos ? 'ON' : 'OFF'}) · Audio (${filters.blockAdultAudio ? 'ON' : 'OFF'})
- **Custom Rules Exported**: ${customRules.length} rules
- **PIN Protection**: ${pinState.enabled ? 'Enabled' : 'Not set'}

---

## How to Install in Google Chrome / Brave / Edge (English)
1. **Unzip** the downloaded \`aegis-dns-guard-extension.zip\` file into a folder on your computer.
2. Open Google Chrome and type \`chrome://extensions\` in the address bar, then press **Enter**.
3. Turn ON the **Developer mode** toggle switch in the top-right corner.
4. Click the **Load unpacked** button in the top-left corner.
5. Select the unzipped folder containing \`manifest.json\`.
6. Optional: For system-wide Chrome DNS-over-HTTPS, open \`chrome://settings/security\`, scroll to **Use secure DNS**, and paste:
   \`${provider.dohEndpoint}\`

## কীভাবে আপনার Chrome ব্রাউজারে ইন্সটল করবেন (বাংলা গাইড)
১. ডাউনলোড করা \`aegis-dns-guard-extension.zip\` ফাইলটি আপনার কম্পিউটারে একটি ফোল্ডারে **Extract / Unzip** করুন।
২. আপনার Chrome ব্রাউজারের অ্যাড্রেস বারে \`chrome://extensions\` লিখে **Enter** চাপুন।
৩. উপরের ডান কোণায় থাকা **Developer mode** অপশনটি **ON** করুন।
৪. উপরের বাম কোণায় **Load unpacked** বাটনে ক্লিক করুন এবং আপনার Extract করা ফোল্ডারটি সিলেক্ট করুন।
৫. সম্পূর্ণ ব্রাউজারে DNS সিস্টেম চালু করতে \`chrome://settings/security\` পেজে যান, **Use secure DNS** অপশনে গিয়ে কাস্টম সার্ভার হিসেবে নিচের লিংকটি দিন:
   \`${provider.dohEndpoint}\`
`;

  return [
    {
      filename: 'manifest.json',
      description: 'Chrome Extension Manifest V3 configuration & permissions',
      language: 'json',
      content: manifestJson,
    },
    {
      filename: 'rules.json',
      description: `DeclarativeNetRequest block/allow rules (${dnrRules.length} compiled rules)`,
      language: 'json',
      content: rulesJson,
    },
    {
      filename: 'background.js',
      description: 'DNS-over-HTTPS service worker, SafeSearch enforcer & WebRTC shield',
      language: 'javascript',
      content: backgroundJs,
    },
    {
      filename: 'content-filter.js',
      description: 'Real-time DOM scanner for ads and 18+ image, video & audio elements',
      language: 'javascript',
      content: contentFilterJs,
    },
    {
      filename: 'popup.html',
      description: 'Extension toolbar popup user interface',
      language: 'html',
      content: popupHtml,
    },
    {
      filename: 'popup.js',
      description: 'Extension popup interactive controller',
      language: 'javascript',
      content: popupJs,
    },
    {
      filename: 'blocked.html',
      description: 'Interstitial block page for restricted 18+ websites',
      language: 'html',
      content: blockedHtml,
    },
    {
      filename: 'README.md',
      description: 'Step-by-step installation guide in English and Bengali',
      language: 'markdown',
      content: readmeMd,
    },
  ];
}

// Standard CRC32 implementation for PKZIP archive generation
function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c ^= bytes[i];
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * Generates a genuine, standards-compliant .zip Blob in pure TypeScript
 * so users can download and extract the Chrome Extension folder in 1 click.
 */
export function createExtensionZipBlob(files: GeneratedExtensionFile[]): Blob {
  const encoder = new TextEncoder();
  const fileRecords: {
    nameBytes: Uint8Array;
    dataBytes: Uint8Array;
    crc: number;
    offset: number;
  }[] = [];

  let offset = 0;
  const localParts: Uint8Array[] = [];

  for (const file of files) {
    const nameBytes = encoder.encode(file.filename);
    const dataBytes = encoder.encode(file.content);
    const crc = crc32(dataBytes);

    const localHeader = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(localHeader.buffer);
    view.setUint32(0, 0x04034b50, true); // Local file header signature
    view.setUint16(4, 20, true); // Version needed to extract
    view.setUint16(6, 0, true); // General purpose bit flag
    view.setUint16(8, 0, true); // Compression method (0 = Store)
    view.setUint16(10, 0, true); // Last mod file time
    view.setUint16(12, 0x5421, true); // Last mod file date
    view.setUint32(14, crc, true); // CRC-32
    view.setUint32(18, dataBytes.length, true); // Compressed size
    view.setUint32(22, dataBytes.length, true); // Uncompressed size
    view.setUint16(26, nameBytes.length, true); // File name length
    view.setUint16(28, 0, true); // Extra field length
    localHeader.set(nameBytes, 30);

    fileRecords.push({ nameBytes, dataBytes, crc, offset });
    localParts.push(localHeader, dataBytes);
    offset += localHeader.length + dataBytes.length;
  }

  const centralParts: Uint8Array[] = [];
  let centralSize = 0;

  for (const rec of fileRecords) {
    const centralHeader = new Uint8Array(46 + rec.nameBytes.length);
    const view = new DataView(centralHeader.buffer);
    view.setUint32(0, 0x02014b50, true); // Central directory signature
    view.setUint16(4, 20, true); // Version made by
    view.setUint16(6, 20, true); // Version needed
    view.setUint16(8, 0, true); // Flags
    view.setUint16(10, 0, true); // Compression (0 = Store)
    view.setUint16(12, 0, true); // Mod time
    view.setUint16(14, 0x5421, true); // Mod date
    view.setUint32(16, rec.crc, true); // CRC-32
    view.setUint32(20, rec.dataBytes.length, true); // Compressed size
    view.setUint32(24, rec.dataBytes.length, true); // Uncompressed size
    view.setUint16(28, rec.nameBytes.length, true); // Filename length
    view.setUint16(30, 0, true); // Extra field length
    view.setUint16(32, 0, true); // Comment length
    view.setUint16(34, 0, true); // Disk number
    view.setUint16(36, 0, true); // Internal attrs
    view.setUint32(38, 0, true); // External attrs
    view.setUint32(42, rec.offset, true); // Relative offset of local header
    centralHeader.set(rec.nameBytes, 46);

    centralParts.push(centralHeader);
    centralSize += centralHeader.length;
  }

  const endRecord = new Uint8Array(22);
  const endView = new DataView(endRecord.buffer);
  endView.setUint32(0, 0x06054b50, true); // End of central directory signature
  endView.setUint16(4, 0, true); // Number of this disk
  endView.setUint16(6, 0, true); // Disk where central directory starts
  endView.setUint16(8, fileRecords.length, true); // Number of central dir records on this disk
  endView.setUint16(10, fileRecords.length, true); // Total number of central dir records
  endView.setUint32(12, centralSize, true); // Size of central directory
  endView.setUint32(16, offset, true); // Offset of start of central directory
  endView.setUint16(20, 0, true); // Comment length

  const blobParts = [
    ...localParts,
    ...centralParts,
    endRecord,
  ] as unknown as BlobPart[];

  return new Blob(blobParts, {
    type: 'application/zip',
  });
}
