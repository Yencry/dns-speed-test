import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { fileURLToPath } from 'node:url';
import { RAW_DNS_SERVERS } from '../src/config/dnsServers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUBLIC_RESOLVERS_URL = process.env.DNSCRYPT_PUBLIC_RESOLVERS_URL
  || 'https://download.dnscrypt.info/resolvers-list/v3/public-resolvers.md';

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          // Follow redirect
          return resolve(fetchUrl(res.headers.location));
        }

        if (res.statusCode !== 200) {
          const msg = `Failed to download ${url}: ${res.statusCode} ${res.statusMessage || ''}`;
          res.resume();
          return reject(new Error(msg));
        }

        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => resolve(data));
      })
      .on('error', (err) => reject(err));
  });
}

function decodeStamp(stamp) {
  const prefix = 'sdns://';
  if (!stamp.startsWith(prefix)) return null;

  let b64 = stamp.slice(prefix.length).trim();
  if (!b64) return null;

  b64 = b64.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4;
  if (pad) {
    b64 = b64 + '='.repeat(4 - pad);
  }

  let buf;
  try {
    buf = Buffer.from(b64, 'base64');
  } catch {
    return null;
  }

  if (!buf.length) return null;

  const proto = buf[0];
  if (proto !== 0x02) {
    // Only care about DoH stamps (0x02)
    return { proto };
  }

  let offset = 1;
  if (buf.length < offset + 8) return null;

  // props (8 bytes) – we currently ignore detailed flags
  offset += 8;

  const readLP = () => {
    if (offset >= buf.length) return '';
    const len = buf[offset];
    offset += 1;
    if (!len) return '';
    const end = offset + len;
    if (end > buf.length) return '';
    const slice = buf.subarray(offset, end);
    offset = end;
    return slice.toString('utf8');
  };

  const readVLP = () => {
    const parts = [];
    while (offset < buf.length) {
      const lenByte = buf[offset++];
      const more = (lenByte & 0x80) !== 0;
      const len = lenByte & 0x7f;
      if (len) {
        const end = offset + len;
        if (end > buf.length) break;
        const slice = buf.subarray(offset, end);
        offset = end;
        parts.push(slice);
      }
      if (!more) break;
    }
    return parts;
  };

  const addr = readLP();
  readVLP(); // hashes – not used at the moment
  const host = readLP();
  const pathStr = readLP() || '/dns-query';

  return { proto, addr, host, path: pathStr };
}

function parsePublicResolvers(mdText) {
  const lines = mdText.split(/\r?\n/);
  let currentName = null;
  const stampEntries = [];

  for (const line of lines) {
    if (line.startsWith('## ')) {
      const name = line.slice(3).trim();
      if (name && name !== 'public-resolvers') {
        currentName = name;
      } else {
        currentName = null;
      }
      continue;
    }

    const trimmed = line.trim();
    if (trimmed.startsWith('sdns://') && currentName) {
      stampEntries.push({ name: currentName, stamp: trimmed });
    }
  }

  const dohMap = new Map();

  for (const { name, stamp } of stampEntries) {
    const decoded = decodeStamp(stamp);
    if (!decoded || decoded.proto !== 0x02) continue;

    const { host, path, addr } = decoded;
    if (!host) continue;

    const url = `https://${host}${path || '/dns-query'}`;
    const key = url;
    const ip = addr || null;

    let entry = dohMap.get(key);
    if (!entry) {
      entry = {
        name,
        url,
        type: 'post',
        allowCors: false,
        ips: [],
        // 其余元数据目前留空，后续可按需要补充
        country: undefined,
        noLogs: undefined,
        jurisdiction: undefined,
        transparency: undefined,
        dnssec: undefined,
        malwareFilter: undefined,
        trustLevel: 'external',
      };
      dohMap.set(key, entry);
    }

    if (ip && !entry.ips.includes(ip)) {
      entry.ips.push(ip);
    }
  }

  return Array.from(dohMap.values());
}

function mergeServers(baseServers, extraServers) {
  const byUrl = new Map();

  for (const server of baseServers) {
    if (!server || !server.url) continue;
    byUrl.set(server.url, { ...server });
  }

  for (const server of extraServers) {
    if (!server || !server.url) continue;
    const existing = byUrl.get(server.url);
    if (existing) {
      const ips = new Set([...(existing.ips || []), ...(server.ips || [])]);
      if (ips.size) {
        existing.ips = Array.from(ips);
      }
    } else {
      byUrl.set(server.url, server);
    }
  }

  return Array.from(byUrl.values());
}

async function main() {
  try {
    console.log(`[dnscrypt-all-in] Downloading public resolvers from: ${PUBLIC_RESOLVERS_URL}`);
    const md = await fetchUrl(PUBLIC_RESOLVERS_URL);

    const dohServers = parsePublicResolvers(md);
    console.log(`[dnscrypt-all-in] Parsed ${dohServers.length} DoH servers from dnscrypt-resolvers.`);

    const merged = mergeServers(RAW_DNS_SERVERS, dohServers);
    console.log(`[dnscrypt-all-in] Merged total servers: ${merged.length}`);

    const outPath = path.resolve(__dirname, '../public/servers.json');
    fs.writeFileSync(outPath, JSON.stringify(merged, null, 2), 'utf-8');

    console.log(`[dnscrypt-all-in] Wrote ${merged.length} servers to ${outPath}`);
  } catch (err) {
    console.error('[dnscrypt-all-in] Failed to build servers.json:', err);
    process.exitCode = 1;
  }
}

main();
