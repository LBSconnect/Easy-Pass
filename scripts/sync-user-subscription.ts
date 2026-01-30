/**
 * Script to sync a user's subscription from Stripe by email
 *
 * Usage: DATABASE_URL=... npx tsx scripts/sync-user-subscription.ts <email>
 * Example: npx tsx scripts/sync-user-subscription.ts rosalyn@example.com
 */

import { Pool } from 'pg';
import Stripe from 'stripe';

async function syncUserSubscription(email: string) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false }
  });

  try {
    // Find user by email
    const userResult = await pool.query(
      'SELECT id, email, first_name, last_name FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    if (userResult.rows.length === 0) {
      console.error(`No user found with email: ${email}`);

      // List all users to help find the right one
      const allUsers = await pool.query(
        'SELECT email, first_name, last_name FROM users ORDER BY created_at DESC LIMIT 20'
      );
      console.log('\nRecent users:');
      allUsers.rows.forEach(u => console.log(`  ${u.first_name} ${u.last_name} - ${u.email}`));
      process.exit(1);
    }

    const user = userResult.rows[0];
    console.log(`Found user: ${user.first_name} ${user.last_name} (${user.email})`);

    // Get user profile
    const profileResult = await pool.query(
      'SELECT * FROM user_profiles WHERE user_id = $1',
      [user.id]
    );

    let profile = profileResult.rows[0];

    if (!profile) {
      // Create profile if doesn't exist
      const createResult = await pool.query(
        'INSERT INTO user_profiles (user_id, preferred_language, role) VALUES ($1, $2, $3) RETURNING *',
        [user.id, 'en', 'user']
      );
      profile = createResult.rows[0];
      console.log('Created new profile for user');
    }

    console.log(`Current subscription status: ${profile.subscription_status || 'None'}`);
    console.log(`Current Stripe customer ID: ${profile.stripe_customer_id || 'None'}`);

    // Initialize Stripe
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      console.error('STRIPE_SECRET_KEY environment variable is required');
      process.exit(1);
    }

    const stripe = new Stripe(stripeSecretKey);

    // Find or search for Stripe customer
    let customerId = profile.stripe_customer_id;

    if (!customerId) {
      console.log(`Searching Stripe for customer with email: ${user.email}`);
      const customers = await stripe.customers.list({
        email: user.email,
        limit: 1,
      });

      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        console.log(`Found Stripe customer: ${customerId}`);
      } else {
        console.error('No Stripe customer found for this email');
        process.exit(1);
      }
    }

    // Find active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 10,
    });

    console.log(`Found ${subscriptions.data.length} subscription(s) for customer`);
    subscriptions.data.forEach(s => {
      console.log(`  - ${s.id}: ${s.status}`);
    });

    const activeSubscription = subscriptions.data.find(
      s => s.status === 'active' || s.status === 'trialing'
    );

    if (!activeSubscription) {
      console.log('No active subscription found - updating status to canceled');
      await pool.query(
        'UPDATE user_profiles SET subscription_status = $1, stripe_customer_id = $2 WHERE user_id = $3',
        ['canceled', customerId, user.id]
      );
      console.log('Done!');
      process.exit(0);
    }

    console.log(`Active subscription: ${activeSubscription.id} (${activeSubscription.status})`);

    // Get metadata from product
    const item = activeSubscription.items?.data?.[0];
    let subscriptionType: string | undefined;
    let allowedCategories: string[] | undefined;

    if (item?.price?.product) {
      const productId = typeof item.price.product === 'string'
        ? item.price.product
        : item.price.product.id;

      const product = await stripe.products.retrieve(productId);
      console.log(`Product: ${product.name}`);
      console.log(`Product metadata:`, product.metadata);

      subscriptionType = product.metadata?.subscription_type;
      const allowedCategoriesStr = product.metadata?.allowed_categories;
      allowedCategories = allowedCategoriesStr
        ? allowedCategoriesStr.split(',').map(c => c.trim())
        : undefined;
    }

    // Check price metadata as fallback
    if (!subscriptionType || !allowedCategories) {
      const priceMetadata = item?.price?.metadata;
      if (priceMetadata) {
        console.log(`Price metadata:`, priceMetadata);
        if (!subscriptionType) {
          subscriptionType = priceMetadata.subscription_type;
        }
        if (!allowedCategories) {
          const allowedCategoriesStr = priceMetadata.allowed_categories;
          allowedCategories = allowedCategoriesStr
            ? allowedCategoriesStr.split(',').map(c => c.trim())
            : undefined;
        }
      }
    }

    const interval = item?.price?.recurring?.interval;
    const plan = interval === 'week' ? 'weekly' : interval === 'month' ? 'monthly' : undefined;

    const periodEnd = (activeSubscription as any).current_period_end;
    const endDate = periodEnd ? new Date(periodEnd * 1000) : null;

    console.log(`\nSyncing subscription data:`);
    console.log(`  Status: ${activeSubscription.status}`);
    console.log(`  Type: ${subscriptionType || 'unknown'}`);
    console.log(`  Plan: ${plan || 'unknown'}`);
    console.log(`  Categories: ${allowedCategories?.join(', ') || 'none'}`);
    console.log(`  End date: ${endDate?.toISOString() || 'unknown'}`);

    // Update profile
    await pool.query(`
      UPDATE user_profiles
      SET stripe_customer_id = $1,
          stripe_subscription_id = $2,
          subscription_status = $3,
          subscription_plan = $4,
          subscription_type = $5,
          allowed_categories = $6,
          subscription_end_date = $7,
          updated_at = NOW()
      WHERE user_id = $8
    `, [
      customerId,
      activeSubscription.id,
      activeSubscription.status === 'active' ? 'active' :
        activeSubscription.status === 'trialing' ? 'trialing' : 'canceled',
      plan,
      subscriptionType,
      allowedCategories ? JSON.stringify(allowedCategories) : null,
      endDate,
      user.id
    ]);

    console.log('\n✅ Subscription synced successfully!');

    // Verify the update
    const verifyResult = await pool.query(
      'SELECT subscription_status, allowed_categories FROM user_profiles WHERE user_id = $1',
      [user.id]
    );
    console.log(`Verified status: ${verifyResult.rows[0]?.subscription_status}`);
    console.log(`Verified categories: ${JSON.stringify(verifyResult.rows[0]?.allowed_categories)}`);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

const email = process.argv[2];
if (!email) {
  console.log('Usage: npx tsx scripts/sync-user-subscription.ts <email>');
  console.log('Example: npx tsx scripts/sync-user-subscription.ts rosalyn@example.com');
  process.exit(1);
}

syncUserSubscription(email);
