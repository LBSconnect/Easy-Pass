import { getCachedStripeClient } from './stripeClient';
import { storage } from './storage';

const REQUIRED_PRICES = [
  {
    productName: 'Real Estate Exam',
    category: 'real_estate',
    prices: [
      { amount: 1999, interval: 'month' as const, billingPeriod: 'monthly' }
    ]
  },
  {
    productName: 'Property & Casualty Exam',
    category: 'property_casualty',
    prices: [
      { amount: 1999, interval: 'month' as const, billingPeriod: 'monthly' }
    ]
  },
  {
    productName: 'Life Insurance Exam',
    category: 'life_insurance',
    prices: [
      { amount: 1999, interval: 'month' as const, billingPeriod: 'monthly' }
    ]
  },
  {
    productName: 'General Lines Exam',
    category: 'general_lines',
    prices: [
      { amount: 1999, interval: 'month' as const, billingPeriod: 'monthly' }
    ]
  },
  {
    productName: 'Bundle',
    category: 'bundle',
    isBundle: true,
    prices: [
      { amount: 3499, interval: 'month' as const, billingPeriod: 'monthly' }
    ]
  }
];

export async function initializeStripePrices(): Promise<void> {
  try {
    const stripe = await getCachedStripeClient();
    const isProduction = process.env.REPLIT_DEPLOYMENT === "1";
    
    console.log(`[Stripe Init] Checking for missing products and prices... (env: ${isProduction ? 'PRODUCTION' : 'development'})`);
    
    const existingProducts = await stripe.products.list({ active: true, limit: 100 });
    const existingPrices = await stripe.prices.list({ active: true, limit: 100, expand: ['data.product'] });
    
    console.log(`[Stripe Init] Found ${existingProducts.data.length} products and ${existingPrices.data.length} prices in Stripe`);
    
    // Log all existing product names for debugging
    console.log(`[Stripe Init] All products in Stripe: ${existingProducts.data.map(p => `"${p.name}" (${p.id})`).join(', ')}`);
    
    const productsByCategory: Record<string, string> = {};
    
    for (const product of existingProducts.data) {
      if (!product.name) continue;
      
      // Priority 1: Match by metadata (most reliable)
      if (product.metadata?.allowed_categories) {
        const categories = product.metadata.allowed_categories;
        const subType = product.metadata.subscription_type;
        
        if (subType === 'bundle' || categories.includes(',')) {
          if (!productsByCategory['bundle']) {
            productsByCategory['bundle'] = product.id;
            console.log(`[Stripe Init] Matched bundle via metadata: ${product.name}`);
          }
        } else if (categories === 'real_estate' && !productsByCategory['real_estate']) {
          productsByCategory['real_estate'] = product.id;
          console.log(`[Stripe Init] Matched real_estate via metadata: ${product.name}`);
        } else if (categories === 'property_casualty' && !productsByCategory['property_casualty']) {
          productsByCategory['property_casualty'] = product.id;
          console.log(`[Stripe Init] Matched property_casualty via metadata: ${product.name}`);
        } else if (categories === 'life_insurance' && !productsByCategory['life_insurance']) {
          productsByCategory['life_insurance'] = product.id;
          console.log(`[Stripe Init] Matched life_insurance via metadata: ${product.name}`);
        } else if (categories === 'general_lines' && !productsByCategory['general_lines']) {
          productsByCategory['general_lines'] = product.id;
          console.log(`[Stripe Init] Matched general_lines via metadata: ${product.name}`);
        }
      }
    }
    
    // Priority 2: Match remaining by exact or close name (only if not matched by metadata)
    for (const product of existingProducts.data) {
      if (!product.name) continue;
      const name = product.name.toLowerCase().trim();
      
      // Skip bundle-type products when looking for single category products
      if (name.includes('bundle') || (name.includes('insurance') && name.includes('real estate'))) {
        if (!productsByCategory['bundle']) {
          productsByCategory['bundle'] = product.id;
          console.log(`[Stripe Init] Matched bundle via name: ${product.name}`);
        }
        continue; // Don't let bundle match as real_estate!
      }
      
      // Match single-category products by name (not already matched)
      if (!productsByCategory['real_estate'] && (name === 'real estate exam' || name === 'real estate exam prep')) {
        productsByCategory['real_estate'] = product.id;
        console.log(`[Stripe Init] Matched real_estate via name: ${product.name}`);
      } else if (!productsByCategory['property_casualty'] && (name.includes('property') && name.includes('casualty'))) {
        productsByCategory['property_casualty'] = product.id;
        console.log(`[Stripe Init] Matched property_casualty via name: ${product.name}`);
      } else if (!productsByCategory['life_insurance'] && name.includes('life insurance')) {
        productsByCategory['life_insurance'] = product.id;
        console.log(`[Stripe Init] Matched life_insurance via name: ${product.name}`);
      } else if (!productsByCategory['general_lines'] && name.includes('general lines')) {
        productsByCategory['general_lines'] = product.id;
        console.log(`[Stripe Init] Matched general_lines via name: ${product.name}`);
      }
    }
    
    console.log(`[Stripe Init] Product mapping: ${JSON.stringify(productsByCategory)}`);
    
    // Build existing price keys
    const existingPriceKeys = new Set<string>();
    for (const price of existingPrices.data) {
      const productId = typeof price.product === 'string' ? price.product : price.product.id;
      const key = `${productId}-${price.recurring?.interval}-${price.unit_amount}`;
      existingPriceKeys.add(key);
    }
    
    console.log(`[Stripe Init] Existing price keys: ${Array.from(existingPriceKeys).join(', ')}`);
    
    let createdProducts = 0;
    let createdPrices = 0;
    
    for (const config of REQUIRED_PRICES) {
      let productId = productsByCategory[config.category];
      
      // Create product if missing
      if (!productId) {
        try {
          console.log(`[Stripe Init] CREATING product: ${config.productName} (category: ${config.category})`);
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
          productsByCategory[config.category] = productId;
          createdProducts++;
          console.log(`[Stripe Init] Created product ${config.productName} -> ${productId}`);
        } catch (err: any) {
          console.error(`[Stripe Init] ERROR creating product ${config.productName}:`, err.message || err);
          continue;
        }
      }
      
      // Create missing prices for this product
      for (const priceConfig of config.prices) {
        const key = `${productId}-${priceConfig.interval}-${priceConfig.amount}`;
        
        if (!existingPriceKeys.has(key)) {
          try {
            console.log(`[Stripe Init] CREATING price: ${config.productName} - $${priceConfig.amount / 100}/${priceConfig.interval}`);
            const price = await stripe.prices.create({
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
            console.log(`[Stripe Init] Created price ${price.id} for ${config.productName}`);
          } catch (err: any) {
            console.error(`[Stripe Init] ERROR creating price for ${config.productName}:`, err.message || err);
          }
        }
      }
    }
    
    if (createdProducts === 0 && createdPrices === 0) {
      console.log('[Stripe Init] All products and prices already exist.');
    } else {
      console.log(`[Stripe Init] Created ${createdProducts} products and ${createdPrices} prices.`);
    }
    
    // Initialize admin user if specified in environment
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      try {
        const user = await storage.getUserByEmail(adminEmail);
        if (user) {
          let profile = await storage.getProfile(user.id);
          if (!profile) {
            await storage.createProfile({
              userId: user.id,
              preferredLanguage: 'en',
              role: 'admin',
            });
            console.log(`[Admin Init] Created admin profile for ${adminEmail}`);
          } else if (profile.role !== 'admin') {
            await storage.updateProfile(user.id, { role: 'admin' });
            console.log(`[Admin Init] Promoted ${adminEmail} to admin`);
          } else {
            console.log(`[Admin Init] ${adminEmail} is already an admin`);
          }
        } else {
          console.log(`[Admin Init] User ${adminEmail} not found - register first then restart`);
        }
      } catch (adminError) {
        console.error('[Admin Init] Error setting up admin:', adminError);
      }
    }
  } catch (error) {
    console.error('[Stripe Init] Error initializing prices:', error);
  }
}
