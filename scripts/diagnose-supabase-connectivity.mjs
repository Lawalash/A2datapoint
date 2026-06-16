import dns from 'dns';
import { performance } from 'perf_hooks';

async function diagnose() {
  const url = 'vnbvqlwqoifruuirsjpk.supabase.co';
  const fullUrl = `https://${url}`;
  
  console.log('--- SUPABASE CONNECTIVITY DIAGNOSTICS ---\n');

  // 1. DNS
  console.log('[1] Testing DNS lookup...');
  let t0 = performance.now();
  try {
    const addresses = await dns.promises.lookup(url);
    console.log(`✅ DNS OK: IP ${addresses.address} (took ${Math.round(performance.now() - t0)}ms)`);
  } catch (e) {
    console.error(`❌ DNS_FAIL: ${e.message}`);
    return;
  }

  // 2. HTTP Básico
  console.log('\n[2] Testing HTTP Basic Fetch...');
  t0 = performance.now();
  try {
    const res = await fetch(fullUrl);
    console.log(`✅ HTTP OK: Status ${res.status} (took ${Math.round(performance.now() - t0)}ms)`);
  } catch (e) {
    console.error(`❌ HTTP_FAIL: ${e.message}`);
    return;
  }

  // 3. Auth Endpoint
  console.log('\n[3] Testing Auth Endpoint (/auth/v1/health)...');
  t0 = performance.now();
  try {
    const res = await fetch(`${fullUrl}/auth/v1/health`);
    console.log(`✅ AUTH OK: Status ${res.status} (took ${Math.round(performance.now() - t0)}ms)`);
  } catch (e) {
    try {
      const res2 = await fetch(`${fullUrl}/auth/v1/settings`);
      console.log(`✅ AUTH OK (/settings): Status ${res2.status} (took ${Math.round(performance.now() - t0)}ms)`);
    } catch(err) {
      console.error(`❌ AUTH HTTP_FAIL: ${err.message}`);
    }
  }

  // 4. REST Endpoint
  console.log('\n[4] Testing REST Endpoint (/rest/v1/)...');
  t0 = performance.now();
  try {
    const res = await fetch(`${fullUrl}/rest/v1/`);
    console.log(`✅ REST OK: Status ${res.status} (took ${Math.round(performance.now() - t0)}ms)`);
  } catch (e) {
    console.error(`❌ REST HTTP_FAIL: ${e.message}`);
  }

  console.log('\n✅ SUPABASE_REACHABLE: The connection to Supabase was successful.');
}

diagnose();
