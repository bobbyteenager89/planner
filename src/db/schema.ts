import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  jsonb,
  boolean,
  integer,
  numeric,
  pgEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ── Enums ──────────────────────────────────────────────────

export const tripStatusEnum = pgEnum("trip_status", [
  "draft",
  "onboarding",
  "intake",
  "generating",
  "reviewing",
  "finalized",
]);

export const participantStatusEnum = pgEnum("participant_status", [
  "invited",
  "in_progress",
  "completed",
]);

export const participantRoleEnum = pgEnum("participant_role", [
  "owner",
  "participant",
]);

export const onboardingPathEnum = pgEnum("onboarding_path", [
  "brainstorm",
  "draft",
  "research",
]);

export const itineraryStatusEnum = pgEnum("itinerary_status", [
  "skeleton",
  "specifics",
  "final_details",
  "finalized",
]);

export const blockTypeEnum = pgEnum("block_type", [
  "activity",
  "meal",
  "transport",
  "lodging",
  "free_time",
  "note",
]);

export const reactionTypeEnum = pgEnum("reaction_type", [
  "love",
  "fine",
  "rather_not",
  "hard_no",
]);

export const researchCategoryEnum = pgEnum("research_category", [
  "restaurant",
  "activity",
  "lodging",
  "transport",
  "other",
]);

// ── Users ──────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }).notNull(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 255 }).notNull(),
    provider: varchar("provider", { length: 255 }).notNull(),
    providerAccountId: varchar("provider_account_id", {
      length: 255,
    }).notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: varchar("token_type", { length: 255 }),
    scope: varchar("scope", { length: 255 }),
    id_token: text("id_token"),
    session_state: varchar("session_state", { length: 255 }),
  },
  (table) => [
    uniqueIndex("accounts_provider_provider_account_id_idx").on(
      table.provider,
      table.providerAccountId
    ),
  ]
);

export const sessions = pgTable(
  "sessions",
  {
    sessionToken: varchar("session_token", { length: 255 })
      .notNull()
      .primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)]
);

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: varchar("identifier", { length: 255 }).notNull(),
    token: varchar("token", { length: 255 }).notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (table) => [
    uniqueIndex("verification_tokens_identifier_token_idx").on(
      table.identifier,
      table.token
    ),
  ]
);

// ── Trips ──────────────────────────────────────────────────

export const trips = pgTable(
  "trips",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 500 }).notNull(),
    destination: varchar("destination", { length: 500 }),
    startDate: timestamp("start_date", { mode: "date" }),
    endDate: timestamp("end_date", { mode: "date" }),
    status: tripStatusEnum("status").notNull().default("draft"),
    onboardingPath: onboardingPathEnum("onboarding_path"),
    onboardingConversation: jsonb("onboarding_conversation")
      .$type<{ role: string; content: string }[]>()
      .default([]),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("trips_owner_id_idx").on(table.ownerId)]
);

// ── Participants ───────────────────────────────────────────

export const participants = pgTable(
  "participants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    email: varchar("email", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }),
    role: participantRoleEnum("role").notNull().default("participant"),
    status: participantStatusEnum("status").notNull().default("invited"),
    inviteToken: varchar("invite_token", { length: 255 }),
    intakeConversation: jsonb("intake_conversation")
      .$type<{ role: string; content: string }[]>()
      .default([]),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("participants_trip_id_idx").on(table.tripId),
    uniqueIndex("participants_invite_token_idx").on(table.inviteToken),
    uniqueIndex("participants_trip_email_idx").on(table.tripId, table.email),
  ]
);

// ── Preferences ────────────────────────────────────────────

export const preferences = pgTable(
  "preferences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    budgetMin: numeric("budget_min", { precision: 10, scale: 2 }),
    budgetMax: numeric("budget_max", { precision: 10, scale: 2 }),
    dietaryRestrictions: jsonb("dietary_restrictions").$type<string[]>(),
    activityPreferences: jsonb("activity_preferences").$type<string[]>(),
    hardNos: jsonb("hard_nos").$type<string[]>(),
    mustHaves: jsonb("must_haves").$type<string[]>(),
    pacePreference: varchar("pace_preference", { length: 50 }),
    additionalNotes: text("additional_notes"),
    rawData: jsonb("raw_data"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("preferences_participant_id_idx").on(table.participantId),
  ]
);

// ── Research Items ─────────────────────────────────────────

export const researchItems = pgTable(
  "research_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    addedBy: uuid("added_by").references(() => users.id),
    title: varchar("title", { length: 500 }).notNull(),
    url: text("url"),
    category: researchCategoryEnum("category").notNull().default("other"),
    description: text("description"),
    metadata: jsonb("metadata"),
    aiScore: numeric("ai_score", { precision: 3, scale: 2 }),
    aiNotes: text("ai_notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("research_items_trip_id_idx").on(table.tripId)]
);

// ── Itineraries ────────────────────────────────────────────

export const itineraries = pgTable(
  "itineraries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    version: integer("version").notNull().default(1),
    status: itineraryStatusEnum("status").notNull().default("skeleton"),
    feedbackDeadline: timestamp("feedback_deadline", { mode: "date" }),
    aiReasoning: text("ai_reasoning"),
    comments: jsonb("comments")
      .$type<Array<{ participantId: string; text: string; createdAt: string }>>()
      .default([]),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("itineraries_trip_id_idx").on(table.tripId),
    uniqueIndex("itineraries_trip_version_idx").on(
      table.tripId,
      table.version
    ),
  ]
);

// ── Itinerary Blocks ───────────────────────────────────────

export const itineraryBlocks = pgTable(
  "itinerary_blocks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    itineraryId: uuid("itinerary_id")
      .notNull()
      .references(() => itineraries.id, { onDelete: "cascade" }),
    dayNumber: integer("day_number").notNull(),
    sortOrder: integer("sort_order").notNull(),
    type: blockTypeEnum("type").notNull(),
    title: varchar("title", { length: 500 }).notNull(),
    description: text("description"),
    startTime: varchar("start_time", { length: 10 }),
    endTime: varchar("end_time", { length: 10 }),
    location: varchar("location", { length: 500 }),
    estimatedCost: numeric("estimated_cost", { precision: 10, scale: 2 }),
    aiReasoning: text("ai_reasoning"),
    pinned: boolean("pinned").notNull().default(false),
    metadata: jsonb("metadata"),
  },
  (table) => [
    index("itinerary_blocks_itinerary_id_idx").on(table.itineraryId),
  ]
);

// ── Reactions ──────────────────────────────────────────────

export const reactions = pgTable(
  "reactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    blockId: uuid("block_id")
      .notNull()
      .references(() => itineraryBlocks.id, { onDelete: "cascade" }),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    reaction: reactionTypeEnum("reaction").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("reactions_block_participant_idx").on(
      table.blockId,
      table.participantId
    ),
    index("reactions_block_id_idx").on(table.blockId),
  ]
);

// ── Relations ──────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  trips: many(trips),
  participants: many(participants),
}));

export const tripsRelations = relations(trips, ({ one, many }) => ({
  owner: one(users, { fields: [trips.ownerId], references: [users.id] }),
  participants: many(participants),
  researchItems: many(researchItems),
  itineraries: many(itineraries),
}));

export const participantsRelations = relations(
  participants,
  ({ one, many }) => ({
    trip: one(trips, {
      fields: [participants.tripId],
      references: [trips.id],
    }),
    user: one(users, {
      fields: [participants.userId],
      references: [users.id],
    }),
    preferences: one(preferences),
    reactions: many(reactions),
  })
);

export const preferencesRelations = relations(preferences, ({ one }) => ({
  participant: one(participants, {
    fields: [preferences.participantId],
    references: [participants.id],
  }),
}));

export const researchItemsRelations = relations(researchItems, ({ one }) => ({
  trip: one(trips, {
    fields: [researchItems.tripId],
    references: [trips.id],
  }),
}));

export const itinerariesRelations = relations(itineraries, ({ one, many }) => ({
  trip: one(trips, {
    fields: [itineraries.tripId],
    references: [trips.id],
  }),
  blocks: many(itineraryBlocks),
}));

export const itineraryBlocksRelations = relations(
  itineraryBlocks,
  ({ one, many }) => ({
    itinerary: one(itineraries, {
      fields: [itineraryBlocks.itineraryId],
      references: [itineraries.id],
    }),
    reactions: many(reactions),
  })
);

export const reactionsRelations = relations(reactions, ({ one }) => ({
  block: one(itineraryBlocks, {
    fields: [reactions.blockId],
    references: [itineraryBlocks.id],
  }),
  participant: one(participants, {
    fields: [reactions.participantId],
    references: [participants.id],
  }),
}));
