const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

stripe.prices.list({ active: true, expand: ['data.product'] })
  .then(r => {
    console.log('Checking what passes the filter:\n');
    
    r.data.forEach(p => {
      const product = typeof p.product === "object" && !('deleted' in p.product) ? p.product : null;
      const hasSubType = p.metadata?.subscription_type || product?.metadata?.subscription_type;
      const interval = p.recurring?.interval;
      const billingPeriod = p.metadata?.billing_period || product?.metadata?.billing_period ||
        (interval === 'week' ? 'weekly' : interval === 'month' ? 'monthly' : null);
      
      if (hasSubType) {
        console.log(`✅ ${p.id} - ${p.nickname}`);
        console.log(`   subscription_type: ${hasSubType}`);
        console.log(`   interval: ${interval}`);
        console.log(`   billing_period: ${billingPeriod}`);
        console.log('');
      }
    });
  });
