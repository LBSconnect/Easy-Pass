import { db } from '../server/db';
import { userProfiles } from '../shared/schema';
import { eq, and, or, isNull, sql } from 'drizzle-orm';

const ALL_CATEGORIES = ['real_estate', 'property_casualty', 'life_insurance', 'general_lines'];

async function backfillAllowedCategories() {
  console.log('Backfilling allowedCategories for existing subscribers...\n');

  const profiles = await db
    .select()
    .from(userProfiles)
    .where(
      and(
        or(
          eq(userProfiles.subscriptionStatus, 'active'),
          eq(userProfiles.subscriptionStatus, 'trialing')
        ),
        or(
          isNull(userProfiles.allowedCategories),
          sql`${userProfiles.allowedCategories} = '[]'::jsonb`
        )
      )
    );

  console.log(`Found ${profiles.length} active subscribers with missing allowedCategories\n`);

  if (profiles.length === 0) {
    console.log('No profiles need updating.');
    return;
  }

  for (const profile of profiles) {
    let newCategories: string[];
    let newType: 'single' | 'bundle';

    if (profile.subscriptionType === 'bundle') {
      newCategories = ALL_CATEGORIES;
      newType = 'bundle';
    } else if (profile.subscriptionType === 'single') {
      console.log(`  Warning: Profile ${profile.id} has subscriptionType=single but no categories. Setting to bundle for safety.`);
      newCategories = ALL_CATEGORIES;
      newType = 'bundle';
    } else {
      console.log(`  Profile ${profile.id} has legacy subscription (no type). Setting to full bundle access.`);
      newCategories = ALL_CATEGORIES;
      newType = 'bundle';
    }

    await db
      .update(userProfiles)
      .set({
        allowedCategories: newCategories,
        subscriptionType: newType,
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.id, profile.id));

    console.log(`  Updated profile ${profile.id}: allowedCategories=${newCategories.join(',')}, type=${newType}`);
  }

  console.log('\nBackfill complete!');
}

backfillAllowedCategories().catch(console.error);
