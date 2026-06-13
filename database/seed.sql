-- ============================================================================
-- GROUP TRAVEL PLANNER — SEED DATA
-- ============================================================================
-- Author: Person B (Database Architect)
-- Purpose: Sample Barcelona trip matching Person A's mock data exactly
-- Dependencies: schema.sql and rls_policies.sql must be run first
-- ============================================================================

-- Note: This seed file uses placeholder UUIDs for demo purposes.
-- In production, you'll need to replace these with actual auth.users IDs
-- from your Supabase Auth system.

-- ============================================================================
-- DEMO USER IDs (Replace with real Supabase Auth user IDs)
-- ============================================================================
-- For testing, create 3 users in Supabase Auth, then update these IDs:

-- Ensure mock users exist in auth.users to satisfy foreign key constraints
INSERT INTO auth.users (id, email, raw_app_meta_data, raw_user_meta_data, aud, role, email_confirmed_at)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'sarah@example.com', '{"provider":"email","providers":["email"]}', '{"name":"Sarah"}', 'authenticated', 'authenticated', now()),
    ('22222222-2222-2222-2222-222222222222', 'mike@example.com', '{"provider":"email","providers":["email"]}', '{"name":"Mike"}', 'authenticated', 'authenticated', now()),
    ('33333333-3333-3333-3333-333333333333', 'chloe@example.com', '{"provider":"email","providers":["email"]}', '{"name":"Chloe"}', 'authenticated', 'authenticated', now())
ON CONFLICT (id) DO NOTHING;

-- Ensure mock users exist in public.users to satisfy foreign key constraints
INSERT INTO public.users (id, email, name)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'sarah@example.com', 'Sarah'),
    ('22222222-2222-2222-2222-222222222222', 'mike@example.com', 'Mike'),
    ('33333333-3333-3333-3333-333333333333', 'chloe@example.com', 'Chloe')
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE
    demo_user_1 UUID := '11111111-1111-1111-1111-111111111111';
    demo_user_2 UUID := '22222222-2222-2222-2222-222222222222';
    demo_user_3 UUID := '33333333-3333-3333-3333-333333333333';
    barcelona_trip_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    expense_1_id UUID;
    expense_2_id UUID;
    expense_3_id UUID;
    expense_4_id UUID;
BEGIN

-- Clean up existing data to ensure seed idempotency
DELETE FROM expense_splits;
DELETE FROM expenses;
DELETE FROM itinerary_items;
DELETE FROM trip_members;
DELETE FROM trips;

-- ============================================================================
-- INSERT: Barcelona Trip
-- ============================================================================

INSERT INTO trips (id, name, destination, start_date, end_date, total_budget, created_by)
VALUES (
    barcelona_trip_id,
    'Barcelona Summer Trip',
    'Barcelona, Spain',
    '2024-07-15',
    '2024-07-22',
    3000.00,
    demo_user_1
);

-- ============================================================================
-- INSERT: Trip Members
-- ============================================================================

INSERT INTO trip_members (trip_id, user_id, role) VALUES
    (barcelona_trip_id, demo_user_1, 'owner'),
    (barcelona_trip_id, demo_user_2, 'member'),
    (barcelona_trip_id, demo_user_3, 'member');


-- ============================================================================
-- INSERT: Itinerary Items (Timeline Activities)
-- ============================================================================
-- These match Person A's mockData exactly for seamless transition

INSERT INTO itinerary_items (trip_id, title, location, start_time, end_time, category_icon, created_by)
VALUES
    -- Day 1: July 15, 2024
    (barcelona_trip_id, 'Arrival at Barcelona Airport', 'El Prat Airport', 
     '2024-07-15 10:00:00+00', '2024-07-15 11:30:00+00', 'transport', demo_user_1),
    
    (barcelona_trip_id, 'Check-in at Hotel', 'Hotel Arts Barcelona', 
     '2024-07-15 14:00:00+00', '2024-07-15 15:00:00+00', 'accommodation', demo_user_1),
    
    (barcelona_trip_id, 'Lunch at La Boqueria Market', 'La Rambla, 91', 
     '2024-07-15 13:00:00+00', '2024-07-15 14:30:00+00', 'food', demo_user_2),
    
    (barcelona_trip_id, 'Walk through Gothic Quarter', 'Barri Gòtic', 
     '2024-07-15 16:00:00+00', '2024-07-15 18:00:00+00', 'activity', demo_user_1),
    
    -- Day 2: July 16, 2024
    (barcelona_trip_id, 'Visit Sagrada Familia', 'Carrer de Mallorca, 401', 
     '2024-07-16 09:00:00+00', '2024-07-16 11:30:00+00', 'activity', demo_user_1),
    
    (barcelona_trip_id, 'Brunch at Federal Café', 'Carrer del Parlament, 39', 
     '2024-07-16 12:00:00+00', '2024-07-16 13:30:00+00', 'food', demo_user_3),
    
    (barcelona_trip_id, 'Park Güell Tour', 'Carrer d''Olot, s/n', 
     '2024-07-16 15:00:00+00', '2024-07-16 17:00:00+00', 'activity', demo_user_2),
    
    (barcelona_trip_id, 'Flamenco Show', 'Tablao Flamenco Cordobes', 
     '2024-07-16 20:00:00+00', '2024-07-16 22:00:00+00', 'music', demo_user_1),
    
    -- Day 3: July 17, 2024
    (barcelona_trip_id, 'Beach Day at Barceloneta', 'Platja de la Barceloneta', 
     '2024-07-17 10:00:00+00', '2024-07-17 16:00:00+00', 'activity', demo_user_2),
    
    (barcelona_trip_id, 'Seafood Dinner', 'Can Solé Restaurant', 
     '2024-07-17 19:00:00+00', '2024-07-17 21:00:00+00', 'food', demo_user_1),
    
    -- Day 4: July 18, 2024
    (barcelona_trip_id, 'Casa Batlló Visit', 'Passeig de Gràcia, 43', 
     '2024-07-18 10:00:00+00', '2024-07-18 12:00:00+00', 'activity', demo_user_3),
    
    (barcelona_trip_id, 'Shopping on Passeig de Gràcia', 'Passeig de Gràcia', 
     '2024-07-18 13:00:00+00', '2024-07-18 17:00:00+00', 'activity', demo_user_2);


-- ============================================================================
-- INSERT: Expenses (Matching Person A's mock data)
-- ============================================================================

-- Expense 1: Hotel Accommodation
expense_1_id := gen_random_uuid();
INSERT INTO expenses (id, trip_id, description, amount, category, paid_by)
VALUES (
    expense_1_id,
    barcelona_trip_id,
    'Hotel Arts Barcelona - 7 nights',
    1200.00,
    'Accommodation',
    demo_user_1
);

-- Split equally among 3 members
INSERT INTO expense_splits (expense_id, user_id, owed_amount, is_settled, settled_at)
VALUES
    (expense_1_id, demo_user_1, 400.00, TRUE, now()),
    (expense_1_id, demo_user_2, 400.00, FALSE, NULL),
    (expense_1_id, demo_user_3, 400.00, FALSE, NULL);

-- Expense 2: Sagrada Familia Tickets
expense_2_id := gen_random_uuid();
INSERT INTO expenses (id, trip_id, description, amount, category, paid_by)
VALUES (
    expense_2_id,
    barcelona_trip_id,
    'Sagrada Familia entrance tickets',
    90.00,
    'Activities',
    demo_user_2
);

INSERT INTO expense_splits (expense_id, user_id, owed_amount, is_settled, settled_at)
VALUES
    (expense_2_id, demo_user_1, 30.00, TRUE, now()),
    (expense_2_id, demo_user_2, 30.00, TRUE, now()),
    (expense_2_id, demo_user_3, 30.00, FALSE, NULL);

-- Expense 3: Group Dinner
expense_3_id := gen_random_uuid();
INSERT INTO expenses (id, trip_id, description, amount, category, paid_by)
VALUES (
    expense_3_id,
    barcelona_trip_id,
    'Seafood dinner at Can Solé',
    180.00,
    'Food & Drinks',
    demo_user_3
);

INSERT INTO expense_splits (expense_id, user_id, owed_amount, is_settled, settled_at)
VALUES
    (expense_3_id, demo_user_1, 60.00, FALSE, NULL),
    (expense_3_id, demo_user_2, 60.00, FALSE, NULL),
    (expense_3_id, demo_user_3, 60.00, TRUE, now());

-- Expense 4: Airport Transfer
expense_4_id := gen_random_uuid();
INSERT INTO expenses (id, trip_id, description, amount, category, paid_by)
VALUES (
    expense_4_id,
    barcelona_trip_id,
    'Taxi from El Prat Airport',
    45.00,
    'Transport',
    demo_user_1
);

INSERT INTO expense_splits (expense_id, user_id, owed_amount, is_settled, settled_at)
VALUES
    (expense_4_id, demo_user_1, 15.00, TRUE, now()),
    (expense_4_id, demo_user_2, 15.00, TRUE, now()),
    (expense_4_id, demo_user_3, 15.00, FALSE, NULL);

END $$;

-- ============================================================================
-- SEED DATA COMPLETE
-- ============================================================================
-- Summary:
-- - 1 trip (Barcelona Summer Trip)
-- - 3 members (1 owner, 2 members)
-- - 12 itinerary items across 4 days
-- - 4 expenses totaling $1,515.00
-- - 12 expense splits (some settled, some pending)
--
-- Next steps:
-- 1. Create 3 test users in Supabase Auth
-- 2. Update the demo_user_* UUIDs at the top of this file
-- 3. Re-run this seed file
-- ============================================================================
