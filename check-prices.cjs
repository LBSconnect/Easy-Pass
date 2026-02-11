const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
stripe.prices.list({ active: true, limit: 10 })
  .then(r => {
    console.log('Total prices:', r.data.length);
    r.data.forEach(p => console.log(`- ${p.id}: ${p.nickname || 'no name'} ($${p.unit_amount/100})`));
  })
  .catch(e => console.error('Error:', e.message));
