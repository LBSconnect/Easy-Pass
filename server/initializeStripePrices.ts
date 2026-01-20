import { getCachedStripeClient } from './stripeClient';

const REQUIRED_PRICES = [
  {
    productName: 'Real Estate Exam',
    category: 'real_estate',
    prices: [
      { amount: 699, interval: 'week' as const, billingPeriod: 'weekly' },
      { amount: 1999, interval: 'month' as const, billingPeriod: 'monthly' }
    ]
  },
  {
    productName: 'Property & Casualty Exam',
    category: 'property_casualty',
    prices: [
      { amount: 699, interval: 'week' as const, billingPeriod: 'weekly' },
      { amount: 1999, interval: 'month' as const, billingPeriod: 'monthly' }
    ]
  },
  {
    productName: 'Life Insurance Exam',
    category: 'life_insurance',
    prices: [
      { amount: 699, interval: 'week' as const, billingPeriod: 'weekly' },
      { amount: 1999, interval: 'month' as const, billingPeriod: 'monthly' }
    ]
  },
  {
    productName: 'General Lines Exam',
    category: 'general_lines',
    prices: [
      { amount: 699, interval: 'week' as const, billingPeriod: 'weekly' },
      { amount: 1999, interval: 'month' as const, billingPeriod: 'monthly' }
    ]
  },
  {
    productName: 'Bundle',
    category: 'bundle',
    isBundle: true,
    prices: [
      { amount: 1299, interval: 'week' as const, billingPeriod: 'weekly' },
      { amount: 3499, interval: 'month' as const, billingPeriod: 'monthly' }
    ]
  }
];

export async function initializeStripePrices(): Promise<void> {
  try {
    const stripe = await getCachedStripeClient();
    
    console.log('[Stripe Init] Checking for missing products and prices...');
    
    const existingProducts = await stripe.products.list({ active: true, limit: 100 });
    const existingPrices = await stripe.prices.list({ active: true, limit: 100, expand: ['data.product'] });
    
    const productsByName: Record<string, string> = {};
    for (const product of existingProducts.data) {
      if (product.name) {
        const normalizedName = product.name.toLowerCase();
        if (normalizedName.includes('real estate')) productsByName['real_estate'] = product.id;
        if (normalizedName.includes('property') || normalizedName.includes('casualty')) productsByName['property_casualty'] = product.id;
        if (normalizedName.includes('life')) productsByName['life_insurance'] = product.id;
        if (normalizedName.includes('general')) productsByName['general_lines'] = product.id;
        if (normalizedName.includes('bundle')) productsByName['bundle'] = product.id;
      }
    }
    
    const existingPriceKeys = new Set<string>();
    for (const price of existingPrices.data) {
      const productId = typeof price.product === 'string' ? price.product : price.product.id;
      const key = `${productId}-${price.recurring?.interval}-${price.unit_amount}`;
      existingPriceKeys.add(key);
    }
    
    let createdProducts = 0;
    let createdPrices = 0;
    
    for (const config of REQUIRED_PRICES) {
      let productId = productsByName[config.category];
      
      if (!productId) {
        console.log(`[Stripe Init] Creating product: ${config.productName}`);
        const product = await stripe.products.create({
          name: config.productName,
          metadata: {
            subscription_type: config.isBundle ? 'bundle' : 'single',
            allowed_categories: config.isBundle 
              ? 'real_estate,property_casualty,life_insurance,general_lines' 
              : config.category
          }
        });
        productId = product.id;
        productsByName[config.category] = productId;
        createdProducts++;
      }
      
      for (const priceConfig of config.prices) {
        const key = `${productId}-${priceConfig.interval}-${priceConfig.amount}`;
        
        if (!existingPriceKeys.has(key)) {
          console.log(`[Stripe Init] Creating price: ${config.productName} - $${priceConfig.amount / 100}/${priceConfig.interval}`);
          await stripe.prices.create({
            product: productId,
            unit_amount: priceConfig.amount,
            currency: 'usd',
            recurring: { interval: priceConfig.interval },
            metadata: {
              subscription_type: config.isBundle ? 'bundle' : 'single',
              allowed_categories: config.isBundle 
                ? 'real_estate,property_casualty,life_insurance,general_lines' 
                : config.category,
              billing_period: priceConfig.billingPeriod
            }
          });
          createdPrices++;
        }
      }
    }
    
    if (createdProducts === 0 && createdPrices === 0) {
      console.log('[Stripe Init] All products and prices already exist.');
    } else {
      console.log(`[Stripe Init] Created ${createdProducts} products and ${createdPrices} prices.`);
    }
  } catch (error) {
    console.error('[Stripe Init] Error initializing prices:', error);
  }
}
