export async function POST(request: Request) {
  const body = await request.text();
  // eslint-disable-next-line no-console -- This endpoint only logs the webhook body.
  console.log(body);

  return new Response(null, { status: 200 });
}
