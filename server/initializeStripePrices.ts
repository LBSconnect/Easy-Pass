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
    const isProduction = process.env.REPLIT_DEPLOYMENT === "1" || process.env.NODE_ENV === "production";
    
    console.log(`[Stripe Init] Checking for missing products and prices... (env: ${isProduction ? 'PRODUCTION' : 'development'})`);
    
    const existingProducts = await stripe.products.list({ active: true, limit: 100 });
    const existingPrices = await stripe.prices.list({ active: true, limit: 100, expand: ['data.product'] });
    
    // Deactivate weekly prices (no longer offered)
    let deactivatedCount = 0;
    for (const price of existingPrices.data) {
      if (price.recurring?.interval === 'week' && price.active) {
        const product = typeof price.product === 'object' && !('deleted' in price.product) ? price.product : null;
        const hasSubscriptionMetadata = price.metadata?.subscription_type || product?.metadata?.subscription_type;
        
        if (hasSubscriptionMetadata) {
          try {
            await stripe.prices.update(price.id, { active: false });
            console.log(`[Stripe Init] Deactivated weekly price: ${price.id} (${product?.name || 'Unknown'})`);
            deactivatedCount++;
          } catch (err: any) {
            console.error(`[Stripe Init] Failed to deactivate price ${price.id}:`, err.message);
          }
        }
      }
    }
    if (deactivatedCount > 0) {
      console.log(`[Stripe Init] Deactivated ${deactivatedCount} weekly prices`);
    }
    
    console.log(`[Stripe Init] Found ${existingProducts.data.length} products and ${existingPrices.data.length} prices in Stripe`);
    
    // Log all existing product names for debugging
    console.log(`[Stripe Init] All products in Stripe: ${existingProducts.data.map(p => `"${p.name}" (${p.id})`).join(', ')}`);
    
    const productsByCategory: Record<string, string> = {};
    
    for (const product of existingProducts.data) {
      if (!product.name) continue;
      
      // Priority 1: Match by metadata (most reliable)
      // Use Object.entries to handle potential trailing-space key bugs in Stripe metadata
      const metaEntries = Object.entries(product.metadata || {});
      const allowedCategoriesMeta = metaEntries.find(([k]) => k.trim() === 'allowed_categories')?.[1];
      const subscriptionTypeMeta = metaEntries.find(([k]) => k.trim() === 'subscription_type')?.[1];
      if (allowedCategoriesMeta) {
        const categories = allowedCategoriesMeta;
        const subType = subscriptionTypeMeta;
        
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
      if (!productsByCategory['real_estate'] && name.includes('real estate') && !name.includes('bundle')) {
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

    // Update existing products with missing metadata
    let updatedProducts = 0;
    for (const config of REQUIRED_PRICES) {
      const productId = productsByCategory[config.category];
      if (!productId) continue;

      const existingProduct = existingProducts.data.find(p => p.id === productId);
      if (!existingProduct) continue;

      // Check if metadata is missing
      const hasRequiredMetadata = existingProduct.metadata?.subscription_type && existingProduct.metadata?.allowed_categories;
      if (!hasRequiredMetadata) {
        try {
          const newMetadata = {
            subscription_type: config.isBundle ? 'bundle' : 'single',
            allowed_categories: config.isBundle
              ? 'real_estate,property_casualty,life_insurance,general_lines'
              : config.category
          };
          await stripe.products.update(productId, { metadata: newMetadata });
          console.log(`[Stripe Init] Updated product metadata: ${existingProduct.name} -> ${JSON.stringify(newMetadata)}`);
          updatedProducts++;
        } catch (err: any) {
          console.error(`[Stripe Init] Failed to update product ${existingProduct.name}:`, err.message);
        }
      }
    }
    if (updatedProducts > 0) {
      console.log(`[Stripe Init] Updated metadata for ${updatedProducts} existing products`);
    }

    // Build existing price keys and update prices with missing metadata
    const existingPriceKeys = new Set<string>();
    const pricesByKey: Record<string, typeof existingPrices.data[0]> = {};
    for (const price of existingPrices.data) {
      const productId = typeof price.product === 'string' ? price.product : price.product.id;
      const key = `${productId}-${price.recurring?.interval}-${price.unit_amount}`;
      existingPriceKeys.add(key);
      pricesByKey[key] = price;
    }

    console.log(`[Stripe Init] Existing price keys: ${Array.from(existingPriceKeys).join(', ')}`);

    // Update existing prices with missing metadata
    let updatedPrices = 0;
    for (const config of REQUIRED_PRICES) {
      const productId = productsByCategory[config.category];
      if (!productId) continue;

      for (const priceConfig of config.prices) {
        const key = `${productId}-${priceConfig.interval}-${priceConfig.amount}`;
        const existingPrice = pricesByKey[key];

        // Update if any required metadata field is missing (handles partial metadata and trailing-space key bugs)
        const priceMeta = existingPrice?.metadata || {};
        const hasAllPriceMetadata =
          priceMeta['subscription_type'] &&
          priceMeta['allowed_categories'] &&
          priceMeta['billing_period'];
        if (existingPrice && !hasAllPriceMetadata) {
          try {
            const newMetadata = {
              subscription_type: config.isBundle ? 'bundle' : 'single',
              allowed_categories: config.isBundle
                ? 'real_estate,property_casualty,life_insurance,general_lines'
                : config.category,
              billing_period: priceConfig.billingPeriod
            };
            await stripe.prices.update(existingPrice.id, { metadata: newMetadata });
            console.log(`[Stripe Init] Updated price metadata: ${existingPrice.id} -> ${JSON.stringify(newMetadata)}`);
            updatedPrices++;
          } catch (err: any) {
            console.error(`[Stripe Init] Failed to update price ${existingPrice.id}:`, err.message);
          }
        }
      }
    }
    if (updatedPrices > 0) {
      console.log(`[Stripe Init] Updated metadata for ${updatedPrices} existing prices`);
    }
    
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
