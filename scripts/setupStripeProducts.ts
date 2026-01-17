import Stripe from 'stripe';
import { getCachedStripeClient } from '../server/stripeClient';

interface ProductConfig {
  name: string;
  description: string;
  subscriptionType: 'single' | 'bundle';
  allowedCategories: string[];
  weeklyPrice: number;
  monthlyPrice: number;
}

const PRODUCTS: ProductConfig[] = [
  {
    name: 'Real Estate Exam Prep',
    description: 'Access to Texas Real Estate exam preparation materials',
    subscriptionType: 'single',
    allowedCategories: ['real_estate'],
    weeklyPrice: 699,
    monthlyPrice: 1999,
  },
  {
    name: 'Property & Casualty Insurance Exam Prep',
    description: 'Access to Texas Property & Casualty Insurance exam preparation materials',
    subscriptionType: 'single',
    allowedCategories: ['property_casualty'],
    weeklyPrice: 699,
    monthlyPrice: 1999,
  },
  {
    name: 'Life Insurance Exam Prep',
    description: 'Access to Texas Life Insurance exam preparation materials',
    subscriptionType: 'single',
    allowedCategories: ['life_insurance'],
    weeklyPrice: 699,
    monthlyPrice: 1999,
  },
  {
    name: 'General Lines Insurance Exam Prep',
    description: 'Access to Texas General Lines Insurance exam preparation materials',
    subscriptionType: 'single',
    allowedCategories: ['general_lines'],
    weeklyPrice: 699,
    monthlyPrice: 1999,
  },
  {
    name: 'Insurance + Real Estate Bundle',
    description: 'Complete access to all Texas Insurance and Real Estate exam preparation materials',
    subscriptionType: 'bundle',
    allowedCategories: ['real_estate', 'property_casualty', 'life_insurance', 'general_lines'],
    weeklyPrice: 1299,
    monthlyPrice: 3499,
  },
];

async function setupProducts() {
  console.log('Setting up Stripe products...\n');
  const stripe = await getCachedStripeClient();

  for (const config of PRODUCTS) {
    console.log(`Creating product: ${config.name}`);

    const product = await stripe.products.create({
      name: config.name,
      description: config.description,
      metadata: {
        subscription_type: config.subscriptionType,
        allowed_categories: config.allowedCategories.join(','),
      },
    });

    console.log(`  Product ID: ${product.id}`);

    const weeklyPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: config.weeklyPrice,
      currency: 'usd',
      recurring: {
        interval: 'week',
      },
      metadata: {
        subscription_type: config.subscriptionType,
        allowed_categories: config.allowedCategories.join(','),
        billing_period: 'weekly',
      },
    });

    console.log(`  Weekly Price ID: ${weeklyPrice.id} ($${config.weeklyPrice / 100}/week)`);

    const monthlyPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: config.monthlyPrice,
      currency: 'usd',
      recurring: {
        interval: 'month',
      },
      metadata: {
        subscription_type: config.subscriptionType,
        allowed_categories: config.allowedCategories.join(','),
        billing_period: 'monthly',
      },
    });

    console.log(`  Monthly Price ID: ${monthlyPrice.id} ($${config.monthlyPrice / 100}/month)`);
    console.log('');
  }

  console.log('All products created successfully!');
  console.log('\nTo use these products, update the pricing page to fetch prices from Stripe.');
}

setupProducts().catch(console.error);
