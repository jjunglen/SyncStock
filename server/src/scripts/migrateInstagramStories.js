const path = require("path");
// Load server/.env regardless of the directory this is run from
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const { sequelize } = require("../config/database.js");

// One-time migration for the new-arrival Instagram stories email:
//   instagram_stories  — the merchant turned the daily email on
//   stories_checked_at — new arrivals up to here are already emailed
//   story_frequency    — "daily" (9am) or "batch" (15 min after a batch)
//   story_background, story_box_color, story_text_color — story colors
//   story_font         — label font (utils/storyDetails.js STORY_FONTS)
// Additive only; safe for older deployed code and safe to re-run.
//
// Run BEFORE starting a server with the updated Store model.
//
// Usage: node src/scripts/migrateInstagramStories.js
const STATEMENTS = [
  `ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS instagram_stories BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS stories_checked_at TIMESTAMPTZ`,
  `ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS story_frequency VARCHAR(10) NOT NULL DEFAULT 'daily'`,
  `ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS story_background VARCHAR(7) NOT NULL DEFAULT '#ffffff'`,
  `ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS story_box_color VARCHAR(7) NOT NULL DEFAULT '#0b0b0b'`,
  `ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS story_text_color VARCHAR(7) NOT NULL DEFAULT '#ffffff'`,
  `ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS story_font VARCHAR(20) NOT NULL DEFAULT 'strong'`,
];

const run = async () => {
  await sequelize.transaction(async (transaction) => {
    for (const sql of STATEMENTS) {
      await sequelize.query(sql, { transaction });
    }
  });
  console.log("Done — Instagram stories columns are in place.");
  process.exit(0);
};

run().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
