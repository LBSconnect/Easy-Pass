import { getUncachableStripeClient } from "./stripeClient";

async function seedProducts() {
  console.log("Creating subscription products...");
  
  const stripe = await getUncachableStripeClient();

  const existingProducts = await stripe.products.list({ limit: 100 });
  const weeklyExists = existingProducts.data.find(p => p.name === "Easy Pass Weekly");
  const monthlyExists = existingProducts.data.find(p => p.name === "Easy Pass Monthly");

  if (weeklyExists && monthlyExists) {
    console.log("Products already exist, skipping creation");
    return;
  }

  if (!weeklyExists) {
    const weeklyProduct = await stripe.products.create({
      name: "Easy Pass Weekly",
      description: "Weekly access to all Texas licensing exam practice tests",
      metadata: {
        plan: "weekly",
      },
    });

    await stripe.prices.create({
      product: weeklyProduct.id,
      unit_amount: 699,
      currency: "usd",
      recurring: { interval: "week" },
      metadata: {
        plan: "weekly",
      },
    });

    console.log("Created weekly subscription product:", weeklyProduct.id);
  }

  if (!monthlyExists) {
    const monthlyProduct = await stripe.products.create({
      name: "Easy Pass Monthly",
      description: "Monthly access to all Texas licensing exam practice tests - Best Value!",
      metadata: {
        plan: "monthly",
      },
    });

    await stripe.prices.create({
      product: monthlyProduct.id,
      unit_amount: 1999,
      currency: "usd",
      recurring: { interval: "month" },
      metadata: {
        plan: "monthly",
      },
    });

    console.log("Created monthly subscription product:", monthlyProduct.id);
  }

  console.log("Products created successfully!");
}

seedProducts().catch(console.error);
