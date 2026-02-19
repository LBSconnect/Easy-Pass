const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
stripe.prices.list({ active: true, limit: 20, expand: ['data.product'] })
  .then(r => {
    console.log('Checking metadata for all prices:\n');
    r.data.forEach(p => {
      console.log(`Price: ${p.id} - ${p.nickname || 'no name'}`);
      console.log(`  Metadata:`, p.metadata);
      console.log(`  Product Metadata:`, p.product?.metadata);
      console.log('');
    });
  })
  .catch(e => console.error('Error:', e.message));
