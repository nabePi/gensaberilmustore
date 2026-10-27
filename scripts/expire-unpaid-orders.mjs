// Dokploy runs this inside the app service. Loopback avoids public proxy rules
// and reads the secret from the container environment, not the command line.
async function main() {
  const secret = process.env.CRON_SECRET;
  if (!secret?.trim()) throw new Error('CRON_SECRET belum dikonfigurasi');
  const url = `http://127.0.0.1:${process.env.PORT || 3000}/api/cron/expire-unpaid-orders`;
  let cancelled = 0;
  let hasMore = false;
  let batches = 0;
  do {
    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(45_000),
    });
    if (!response.ok) throw new Error(`Expire unpaid orders: HTTP ${response.status}`);
    const result = await response.json();
    if (
      !Number.isInteger(result.cancelled) ||
      result.cancelled < 0 ||
      typeof result.hasMore !== 'boolean'
    ) {
      throw new Error('Respons scheduler tidak valid');
    }
    cancelled += result.cancelled;
    hasMore = result.hasMore;
    batches += 1;
    // Bound catch-up work after downtime. Remaining orders are picked up next run.
  } while (hasMore && batches < 20);
  process.stdout.write(`${JSON.stringify({ cancelled, batches, hasMore })}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
