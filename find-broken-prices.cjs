const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
stripe.prices.list({ active: true, limit: 20, expand: ['data.product'] })
  .then(r => {
    console.log('Checking for metadata key issues:\n');
    r.data.forEach(p => {
      const hasSub = p.metadata?.subscription_type || p.product?.metadata?.subscription_type;
      const hasSubWithSpace = p.metadata?.['subscription_type '] || p.product?.metadata?.['subscription_type '];
      
      if (hasSubWithSpace) {
        console.log(`❌ BROKEN: ${p.id} - ${p.nickname}`);
        console.log(`   Has 'subscription_type ' with space!`);
        console.log(`   Metadata keys:`, Object.keys(p.metadata));
      } else if (hasSub) {
        console.log(`✅ OK: ${p.id} - ${p.nickname}`);
      }
    });
  })
  .catch(e => console.error('Error:', e.message));
