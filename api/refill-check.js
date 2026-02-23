export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const emailRaw = req.query.email;
    const email = (Array.isArray(emailRaw) ? emailRaw[0] : emailRaw || "")
      .trim()
      .toLowerCase();

    if (!email) {
      return res.status(400).json({ ok: false, error: "Email required" });
    }

    const shop = process.env.SHOPIFY_SHOP_DOMAIN;
    const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
    const apiVersion = process.env.SHOPIFY_API_VERSION || "2024-10";
    const refillTag = process.env.REFILL_TAG || "refill_eligible";

    if (!shop || !token) {
      return res.status(500).json({
        ok: false,
        error: "Missing SHOPIFY_SHOP_DOMAIN or SHOPIFY_ADMIN_ACCESS_TOKEN in Vercel env vars"
      });
    }

    const url = `https://${shop}/admin/api/${apiVersion}/customers/search.json?query=email:${encodeURIComponent(
      email
    )}`;

    const r = await fetch(url, {
      method: "GET",
      headers: {
        "X-Shopify-Access-Token": token,
        "Content-Type": "application/json"
      }
    });

    const data = await r.json();

    if (!r.ok) {
      return res.status(500).json({
        ok: false,
        error: "Shopify API error",
        details: data
      });
    }

    const customer = data.customers?.[0];

    if (!customer) {
      return res.status(200).json({
        ok: true,
        eligible: false,
        reason: "customer_not_found"
      });
    }

    const tags = (customer.tags || "")
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const eligible = tags.includes(refillTag.toLowerCase());

    return res.status(200).json({
      ok: true,
      eligible,
      customerEmail: customer.email,
      customerId: customer.id
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e?.message || "Server error" });
  }
}