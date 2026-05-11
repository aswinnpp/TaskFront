/**
 * Expo's lan-network helper can fail on Windows (Docker/Hyper-V adapters) and fall back to 127.0.0.1.
 * This picks a real IPv4 and sets REACT_NATIVE_PACKAGER_HOSTNAME before starting Metro.
 */
const { spawnSync } = require('child_process');
const os = require('os');

const wantClear = process.argv.includes('--clear');

const VIRTUAL = /vEthernet|VirtualBox|VMware|Hyper-V|WSL|Docker|vether|Virtual|TAP-Windows|ZeroTier/i;

function listCandidates() {
  const nets = os.networkInterfaces();
  const out = [];
  for (const name of Object.keys(nets)) {
    if (VIRTUAL.test(name)) continue;
    for (const net of nets[name] || []) {
      const fam = net.family;
      const isV4 = fam === 'IPv4' || fam === 4;
      if (!isV4 || net.internal) continue;
      const addr = String(net.address);
      if (addr.startsWith('169.254.')) continue;
      out.push({ name, address: addr });
    }
  }
  return out;
}

function pickLan() {
  const c = listCandidates();
  const wifi = c.find((x) => /wi-?fi|wlan|wireless|eth|ethernet/i.test(x.name));
  return (wifi || c[0])?.address || null;
}

const existing = (process.env.REACT_NATIVE_PACKAGER_HOSTNAME || '').trim();
const ip = existing || pickLan();

if (!ip) {
  console.error(
    '[expo] No usable LAN IPv4 found. Set it yourself, or use tunnel:\n' +
      '  PowerShell: $env:REACT_NATIVE_PACKAGER_HOSTNAME="192.168.x.x"; npx expo start --host lan\n' +
      '  Or:        npm run start:tunnel'
  );
  process.exit(1);
}

if (!existing) {
  console.log(`[expo] Using REACT_NATIVE_PACKAGER_HOSTNAME=${ip}`);
  const all = listCandidates().map((x) => `  ${x.address} (${x.name})`);
  if (all.length) console.log('[expo] Other IPv4 on this machine:\n' + all.join('\n'));
}

console.log(
  '\n[expo] If Expo Go still says "Failed to download remote update":\n' +
    `  • On the phone browser open: http://${ip}:8081 (must load something from your PC)\n` +
    '  • Windows: Wi‑Fi → Properties → set network profile to Private; allow Node.js in firewall\n' +
    '  • Or USB: adb reverse tcp:8081 tcp:8081 then npm start (localhost QR)\n' +
    '  • Or: npm run start:tunnel\n' +
    '\n[expo] If you see "JSBigFileString::fromPath" on the phone: clear Expo Go app data, run npm run start:clean, use stable Wi‑Fi or USB adb reverse.\n'
);

const expoArgs = ['expo', 'start', '--host', 'lan'];
if (wantClear) {
  expoArgs.push('--clear');
  console.log('[expo] Metro cache clear enabled (--clear)\n');
}

const r = spawnSync('npx', expoArgs, {
  stdio: 'inherit',
  env: { ...process.env, REACT_NATIVE_PACKAGER_HOSTNAME: ip },
  shell: true,
});

process.exit(r.status === null ? 1 : r.status);
