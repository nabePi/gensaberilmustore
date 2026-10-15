export async function POST(request: Request) {
  // The ingress must append the actual peer IP and prevent direct access to Next.js.
  // Use the last entry so a client-supplied prefix cannot bypass the allowlist.
  const clientIp = request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim();
  if (clientIp !== '103.236.201.178') {
    return new Response(null, { status: 403 });
  }

  const body = await request.text();
  // eslint-disable-next-line no-console -- This endpoint only logs the webhook body.
  console.log(body);

  return new Response(null, { status: 200 });
}
