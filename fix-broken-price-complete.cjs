const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function fix() {
  const priceId = 'price_1SrPeV6zLLCul0SQjiCboYa7';
  
  console.log('Removing bad metadata key...');
  
  await stripe.prices.update(priceId, {
    metadata: {
      'subscription_type ': '',  // Delete by setting to empty string
      allowed_categories: 'general_lines',
      subscription_type: 'single'
    }
  });
  
  console.log('✅ Fixed!');
  
  const price = await stripe.prices.retrieve(priceId);
  console.log('New metadata:', price.metadata);
}

fix().catch(e => console.error('Error:', e.message));
