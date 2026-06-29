exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const { order_amount, order_currency, order_note, customer_id, customer_name, customer_email, customer_phone } = JSON.parse(event.body);

    if (!order_amount) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing order_amount" }) };
    }

    const CF_APP_ID = process.env.CASHFREE_APP_ID;
    const CF_SECRET = process.env.CASHFREE_SECRET_KEY;

    if (!CF_APP_ID || !CF_SECRET) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: "Payment gateway not configured. Set CASHFREE_APP_ID and CASHFREE_SECRET_KEY in Netlify env vars." }) };
    }

    const orderId = "order_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);

    const cfRes = await fetch("https://api.cashfree.com/pg/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-client-id": CF_APP_ID,
        "x-client-secret": CF_SECRET,
        "x-api-version": "2023-08-01",
      },
      body: JSON.stringify({
        order_id: orderId,
        order_amount: parseFloat(order_amount),
        order_currency: order_currency || "INR",
        customer_details: {
          customer_id: customer_id || "guest_" + Date.now(),
          customer_name: customer_name || "PLANMYCASHFLOWS Customer",
          customer_email: customer_email || "customer@planmycashflows.com",
          customer_phone: customer_phone || "9999999999",
        },
        order_meta: {
          return_url: "https://app.planmycashflows.com?order_id={order_id}",
        },
        order_note: order_note || "PlanMyCashflows Payment",
      }),
    });

    const cfText = await cfRes.text();
    let cfData;
    try { cfData = JSON.parse(cfText); } catch (e) {
      return { statusCode: 502, headers, body: JSON.stringify({ error: "Cashfree returned non-JSON", details: cfText.substring(0, 500) }) };
    }

    if (!cfData.payment_session_id) {
      console.error("Cashfree API response:", cfText);
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          error: "Cashfree order creation failed",
          details: cfData.message || cfData.type || cfText.substring(0, 500),
        }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        payment_session_id: cfData.payment_session_id,
        order_id: cfData.order_id || orderId,
        cf_order_id: cfData.cf_order_id,
      }),
    };
  } catch (err) {
    console.error("create-cashfree-order error:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Internal error: " + err.message }) };
  }
};
