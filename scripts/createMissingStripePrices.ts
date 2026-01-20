import { getCachedStripeClient } from '../server/stripeClient';

async function createMissingPrices() {
  const stripe = await getCachedStripeClient();
  
  console.log('Fetching existing products and prices...');
  
  const existingProducts = await stripe.products.list({ active: true, limit: 100 });
  const existingPrices = await stripe.prices.list({ active: true, limit: 100, expand: ['data.product'] });
  
  console.log('Existing products:', existingProducts.data.map(p => ({ id: p.id, name: p.name })));
  console.log('Existing prices:', existingPrices.data.map(p => ({ 
    id: p.id, 
    product: typeof p.product === 'object' ? p.product.name : p.product,
    interval: p.recurring?.interval,
    amount: p.unit_amount
  })));
  
  const productMap: Record<string, string> = {};
  for (const product of existingProducts.data) {
    if (product.name?.includes('Property')) productMap['property_casualty'] = product.id;
    if (product.name?.includes('Life')) productMap['life_insurance'] = product.id;
    if (product.name?.includes('General')) productMap['general_lines'] = product.id;
    if (product.name?.includes('Real Estate')) productMap['real_estate'] = product.id;
    if (product.name?.includes('Bundle')) productMap['bundle'] = product.id;
  }
  
  console.log('Product map:', productMap);
  
  if (!productMap['real_estate']) {
    console.log('Creating Real Estate Exam product...');
    const realEstateProduct = await stripe.products.create({
      name: 'Real Estate Exam',
      metadata: {
        subscription_type: 'single',
        allowed_categories: 'real_estate'
      }
    });
    productMap['real_estate'] = realEstateProduct.id;
    console.log('Created Real Estate product:', realEstateProduct.id);
  }
  
  const pricesToCreate = [
    {
      productKey: 'real_estate',
      name: 'Real Estate Weekly',
      amount: 699,
      interval: 'week' as const,
      metadata: {
        subscription_type: 'single',
        allowed_categories: 'real_estate',
        billing_period: 'weekly'
      }
    },
    {
      productKey: 'real_estate',
      name: 'Real Estate Monthly',
      amount: 1999,
      interval: 'month' as const,
      metadata: {
        subscription_type: 'single',
        allowed_categories: 'real_estate',
        billing_period: 'monthly'
      }
    },
    {
      productKey: 'property_casualty',
      name: 'Property & Casualty Weekly',
      amount: 699,
      interval: 'week' as const,
      metadata: {
        subscription_type: 'single',
        allowed_categories: 'property_casualty',
        billing_period: 'weekly'
      }
    },
    {
      productKey: 'life_insurance',
      name: 'Life Insurance Weekly',
      amount: 699,
      interval: 'week' as const,
      metadata: {
        subscription_type: 'single',
        allowed_categories: 'life_insurance',
        billing_period: 'weekly'
      }
    },
    {
      productKey: 'general_lines',
      name: 'General Lines Weekly',
      amount: 699,
      interval: 'week' as const,
      metadata: {
        subscription_type: 'single',
        allowed_categories: 'general_lines',
        billing_period: 'weekly'
      }
    }
  ];
  
  const existingPriceKey = (productId: string, interval: string, amount: number) => 
    `${productId}-${interval}-${amount}`;
  
  const existingPriceKeys = new Set(
    existingPrices.data.map(p => 
      existingPriceKey(
        typeof p.product === 'string' ? p.product : p.product.id,
        p.recurring?.interval || '',
        p.unit_amount || 0
      )
    )
  );
  
  for (const priceConfig of pricesToCreate) {
    const productId = productMap[priceConfig.productKey];
    if (!productId) {
      console.log(`Skipping ${priceConfig.name} - no product found for ${priceConfig.productKey}`);
      continue;
    }
    
    const key = existingPriceKey(productId, priceConfig.interval, priceConfig.amount);
    if (existingPriceKeys.has(key)) {
      console.log(`Skipping ${priceConfig.name} - price already exists`);
      continue;
    }
    
    console.log(`Creating price: ${priceConfig.name}...`);
    try {
      const price = await stripe.prices.create({
        product: productId,
        unit_amount: priceConfig.amount,
        currency: 'usd',
        recurring: { interval: priceConfig.interval },
        metadata: priceConfig.metadata
      });
      console.log(`Created price ${priceConfig.name}: ${price.id}`);
    } catch (error) {
      console.error(`Failed to create ${priceConfig.name}:`, error);
    }
  }
  
  console.log('Done! Fetching updated prices...');
  const updatedPrices = await stripe.prices.list({ active: true, limit: 100, expand: ['data.product'] });
  console.log('Updated prices:', updatedPrices.data.length);
  for (const p of updatedPrices.data) {
    const product = typeof p.product === 'object' ? p.product : null;
    console.log(`- ${product?.name || 'Unknown'}: $${(p.unit_amount || 0) / 100}/${p.recurring?.interval} (${p.id})`);
  }
}

createMissingPrices().catch(console.error);
