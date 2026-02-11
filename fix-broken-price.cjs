const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function fix() {
  const priceId = 'price_1SrPeV6zLLCul0SQjiCboYa7';
  
  console.log('Fixing price:', priceId);
  
  // Update price metadata (remove bad key, add correct one)
  await stripe.prices.update(priceId, {
    metadata: {
      allowed_categories: 'general_lines',
      subscription_type: 'single'  // Correct key without space
    }
  });
  
  console.log('✅ Fixed! Metadata updated.');
  
  // Verify
  const price = await stripe.prices.retrieve(priceId);
  console.log('New metadata:', price.metadata);
}

fix().catch(e => console.error('Error:', e.message));
