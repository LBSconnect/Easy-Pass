import { getCachedStripeClient } from './stripeClient';
import { storage } from './storage';

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
    const isProduction = process.env.REPLIT_DEPLOYMENT === "1";
    
    console.log(`[Stripe Init] Checking for missing products and prices... (env: ${isProduction ? 'PRODUCTION' : 'development'})`);
    
    const existingProducts = await stripe.products.list({ active: true, limit: 100 });
    const existingPrices = await stripe.prices.list({ active: true, limit: 100, expand: ['data.product'] });
    
    console.log(`[Stripe Init] Found ${existingProducts.data.length} products and ${existingPrices.data.length} prices in Stripe`);
    
    const productsByName: Record<string, string> = {};
    for (const product of existingProducts.data) {
      if (product.name) {
        const normalizedName = product.name.toLowerCase().trim();
        
        // Use exact name matching or metadata to avoid false positives
        // Check metadata first (most reliable)
        if (product.metadata?.allowed_categories) {
          const categories = product.metadata.allowed_categories;
          if (product.metadata.subscription_type === 'bundle' || categories.includes(',')) {
            productsByName['bundle'] = product.id;
          } else if (categories === 'real_estate') {
            productsByName['real_estate'] = product.id;
          } else if (categories === 'property_casualty') {
            productsByName['property_casualty'] = product.id;
          } else if (categories === 'life_insurance') {
            productsByName['life_insurance'] = product.id;
          } else if (categories === 'general_lines') {
            productsByName['general_lines'] = product.id;
          }
        } else {
          // Fallback to exact name matching (avoid substring issues)
          if (normalizedName === 'real estate exam' || normalizedName === 'real estate exam prep') {
            productsByName['real_estate'] = product.id;
          } else if (normalizedName === 'property & casualty exam' || normalizedName === 'property & casualty insurance exam prep') {
            productsByName['property_casualty'] = product.id;
          } else if (normalizedName === 'life insurance exam' || normalizedName === 'life insurance exam prep') {
            productsByName['life_insurance'] = product.id;
          } else if (normalizedName === 'general lines exam' || normalizedName === 'general lines insurance exam prep') {
            productsByName['general_lines'] = product.id;
          } else if (normalizedName === 'bundle' || normalizedName === 'insurance + real estate bundle') {
            productsByName['bundle'] = product.id;
          }
        }
      }
    }
    
    console.log(`[Stripe Init] Existing products found: ${Object.keys(productsByName).join(', ') || 'none'}`)
    
    console.log(`[Stripe Init] Product mapping: ${JSON.stringify(productsByName)}`);
    
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
        console.log(`[Stripe Init] CREATING product: ${config.productName}`);
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
          console.log(`[Stripe Init] CREATING price: ${config.productName} - $${priceConfig.amount / 100}/${priceConfig.interval}`);
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
