import Stripe from "stripe";

export async function POST(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRO_PRICE_ID;

  if (!secretKey || !priceId) {
    return Response.json({ demo: true });
  }

  try {
    const { userId } = (await request.json()) as { userId?: string };
    const origin = request.headers.get("origin") ?? "http://localhost:3000";
    const stripe = new Stripe(secretKey);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/pro/success`,
      cancel_url: `${origin}/pro`,
      subscription_data: {
        metadata: {
          user_id: userId ?? "",
        },
      },
      metadata: {
        user_id: userId ?? "",
      },
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error("[DamaIQ] Stripe checkout failed:", error);
    return Response.json({ error: "Checkout unavailable" }, { status: 500 });
  }
}
