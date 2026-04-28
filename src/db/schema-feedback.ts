import {
  pgTable,
  text,
  timestamp,
  uuid,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { trips, participants, itineraryBlocks } from "./schema";

// ── Feedback Enums ────────────────────────────────────────

export const feedbackTypeEnum = pgEnum("feedback_type", [
  "love",
  "propose_alternative",
  "different_time",
  "skip",
  "note",
]);

export const feedbackStatusEnum = pgEnum("feedback_status", [
  "pending",
  "accepted",
  "dismissed",
]);

export const signOffStatusEnum = pgEnum("sign_off_status", [
  "approved",
  "has_feedback",
]);

export const rsvpStatusEnum = pgEnum("rsvp_status", ["yes", "maybe", "no"]);

// ── Feedback Items ────────────────────────────────────────

export const feedbackItems = pgTable(
  "feedback_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    blockId: uuid("block_id")
      .references(() => itineraryBlocks.id, { onDelete: "cascade" }),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    type: feedbackTypeEnum("type").notNull(),
    text: text("text"),
    status: feedbackStatusEnum("status").notNull().default("pending"),
    adminNote: text("admin_note"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("feedback_items_trip_id_idx").on(table.tripId),
    index("feedback_items_block_id_idx").on(table.blockId),
    index("feedback_items_participant_id_idx").on(table.participantId),
  ]
);

// ── Sign Offs ─────────────────────────────────────────────

export const signOffs = pgTable(
  "sign_offs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    status: signOffStatusEnum("status").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("sign_offs_trip_id_idx").on(table.tripId),
    uniqueIndex("sign_offs_trip_participant_idx").on(
      table.tripId,
      table.participantId
    ),
  ]
);

// ── Relations ─────────────────────────────────────────────

export const feedbackItemsRelations = relations(feedbackItems, ({ one }) => ({
  trip: one(trips, {
    fields: [feedbackItems.tripId],
    references: [trips.id],
  }),
  block: one(itineraryBlocks, {
    fields: [feedbackItems.blockId],
    references: [itineraryBlocks.id],
  }),
  participant: one(participants, {
    fields: [feedbackItems.participantId],
    references: [participants.id],
  }),
}));

export const signOffsRelations = relations(signOffs, ({ one }) => ({
  trip: one(trips, {
    fields: [signOffs.tripId],
    references: [trips.id],
  }),
  participant: one(participants, {
    fields: [signOffs.participantId],
    references: [participants.id],
  }),
}));

// ── Block RSVPs ───────────────────────────────────────────
// One RSVP per (block, participant). Used for activity blocks where
// attendance varies — drives host-side headcount + booking decisions.

export const blockRsvps = pgTable(
  "block_rsvps",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    blockId: uuid("block_id")
      .notNull()
      .references(() => itineraryBlocks.id, { onDelete: "cascade" }),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    status: rsvpStatusEnum("status").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("block_rsvps_trip_id_idx").on(table.tripId),
    index("block_rsvps_block_id_idx").on(table.blockId),
    uniqueIndex("block_rsvps_block_participant_idx").on(
      table.blockId,
      table.participantId
    ),
  ]
);

export const blockRsvpsRelations = relations(blockRsvps, ({ one }) => ({
  trip: one(trips, {
    fields: [blockRsvps.tripId],
    references: [trips.id],
  }),
  block: one(itineraryBlocks, {
    fields: [blockRsvps.blockId],
    references: [itineraryBlocks.id],
  }),
  participant: one(participants, {
    fields: [blockRsvps.participantId],
    references: [participants.id],
  }),
}));
