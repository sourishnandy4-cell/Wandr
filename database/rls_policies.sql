-- ============================================================================
-- GROUP TRAVEL PLANNER — ROW LEVEL SECURITY POLICIES
-- ============================================================================
-- Author: Person B (Database Architect)
-- Purpose: Secure data access so users only see trips they belong to
-- Dependencies: schema.sql must be run first
-- ============================================================================

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE trips           ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_members    ENABLE ROW LEVEL SECURITY;
ALTER TABLE itinerary_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses        ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_splits  ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Check if current user is a member of a given trip
CREATE OR REPLACE FUNCTION is_trip_member(trip_uuid UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM trip_members
        WHERE trip_id = trip_uuid
          AND user_id = auth.uid()
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION is_trip_member IS 'Returns true if current user is a member of the specified trip';

-- Check if current user is the owner of a given trip
CREATE OR REPLACE FUNCTION is_trip_owner(trip_uuid UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM trip_members
        WHERE trip_id = trip_uuid
          AND user_id = auth.uid()
          AND role = 'owner'
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION is_trip_owner IS 'Returns true if current user is the owner of the specified trip';

-- ============================================================================
-- POLICIES: trips
-- ============================================================================

-- Members can view trips they belong to (or if they created it)
DROP POLICY IF EXISTS "Members can view their trips" ON trips;
CREATE POLICY "Members can view their trips"
    ON trips
    FOR SELECT
    USING (is_trip_member(id) OR created_by = auth.uid());

-- Any authenticated user can create a trip
DROP POLICY IF EXISTS "Authenticated users can create trips" ON trips;
CREATE POLICY "Authenticated users can create trips"
    ON trips
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

-- Only trip owners can update trip details
DROP POLICY IF EXISTS "Owners can update their trips" ON trips;
CREATE POLICY "Owners can update their trips"
    ON trips
    FOR UPDATE
    USING (is_trip_owner(id))
    WITH CHECK (is_trip_owner(id));

-- Only trip owners can delete trips
DROP POLICY IF EXISTS "Owners can delete their trips" ON trips;
CREATE POLICY "Owners can delete their trips"
    ON trips
    FOR DELETE
    USING (is_trip_owner(id));

-- ============================================================================
-- POLICIES: trip_members
-- ============================================================================

-- Members can view other members of their trips
DROP POLICY IF EXISTS "Members can view trip membership" ON trip_members;
CREATE POLICY "Members can view trip membership"
    ON trip_members
    FOR SELECT
    USING (is_trip_member(trip_id));

-- Trip owners can add members (or creators can add the first members/owners)
DROP POLICY IF EXISTS "Owners can add members" ON trip_members;
CREATE POLICY "Owners can add members"
    ON trip_members
    FOR INSERT
    WITH CHECK (
        is_trip_owner(trip_id) 
        OR EXISTS (
            SELECT 1 FROM trips 
            WHERE id = trip_id 
              AND created_by = auth.uid()
        )
    );

-- Anyone can join a trip as a member
DROP POLICY IF EXISTS "Anyone can join a trip" ON trip_members;
CREATE POLICY "Anyone can join a trip"
    ON trip_members
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id 
        AND role = 'member'
    );

-- Trip owners can remove members (except themselves)
DROP POLICY IF EXISTS "Owners can remove members" ON trip_members;
CREATE POLICY "Owners can remove members"
    ON trip_members
    FOR DELETE
    USING (is_trip_owner(trip_id) AND user_id != auth.uid());

-- Members can remove themselves from trips
DROP POLICY IF EXISTS "Members can leave trips" ON trip_members;
CREATE POLICY "Members can leave trips"
    ON trip_members
    FOR DELETE
    USING (user_id = auth.uid());

-- ============================================================================
-- POLICIES: itinerary_items
-- ============================================================================

-- Members can view itinerary items for their trips
DROP POLICY IF EXISTS "Members can view itinerary" ON itinerary_items;
CREATE POLICY "Members can view itinerary"
    ON itinerary_items
    FOR SELECT
    USING (is_trip_member(trip_id));

-- Members can add itinerary items to their trips
DROP POLICY IF EXISTS "Members can add itinerary items" ON itinerary_items;
CREATE POLICY "Members can add itinerary items"
    ON itinerary_items
    FOR INSERT
    WITH CHECK (is_trip_member(trip_id) AND created_by = auth.uid());

-- Creators can update their own itinerary items
DROP POLICY IF EXISTS "Creators can update their items" ON itinerary_items;
CREATE POLICY "Creators can update their items"
    ON itinerary_items
    FOR UPDATE
    USING (created_by = auth.uid())
    WITH CHECK (created_by = auth.uid());

-- Creators can delete their own itinerary items
DROP POLICY IF EXISTS "Creators can delete their items" ON itinerary_items;
CREATE POLICY "Creators can delete their items"
    ON itinerary_items
    FOR DELETE
    USING (created_by = auth.uid());

-- Trip owners can delete any itinerary item in their trips
DROP POLICY IF EXISTS "Owners can delete any itinerary item" ON itinerary_items;
CREATE POLICY "Owners can delete any itinerary item"
    ON itinerary_items
    FOR DELETE
    USING (is_trip_owner(trip_id));

-- ============================================================================
-- POLICIES: expenses
-- ============================================================================

-- Members can view expenses for their trips
DROP POLICY IF EXISTS "Members can view expenses" ON expenses;
CREATE POLICY "Members can view expenses"
    ON expenses
    FOR SELECT
    USING (is_trip_member(trip_id));

-- Members can add expenses to their trips
DROP POLICY IF EXISTS "Members can add expenses" ON expenses;
CREATE POLICY "Members can add expenses"
    ON expenses
    FOR INSERT
    WITH CHECK (is_trip_member(trip_id) AND paid_by = auth.uid());

-- Payers can update their own expenses
DROP POLICY IF EXISTS "Payers can update their expenses" ON expenses;
CREATE POLICY "Payers can update their expenses"
    ON expenses
    FOR UPDATE
    USING (paid_by = auth.uid())
    WITH CHECK (paid_by = auth.uid());

-- Payers can delete their own expenses
DROP POLICY IF EXISTS "Payers can delete their expenses" ON expenses;
CREATE POLICY "Payers can delete their expenses"
    ON expenses
    FOR DELETE
    USING (paid_by = auth.uid());

-- Trip owners can delete any expense in their trips
DROP POLICY IF EXISTS "Owners can delete any expense" ON expenses;
CREATE POLICY "Owners can delete any expense"
    ON expenses
    FOR DELETE
    USING (is_trip_owner(trip_id));

-- ============================================================================
-- POLICIES: expense_splits
-- ============================================================================

-- Members can view splits for expenses in their trips
DROP POLICY IF EXISTS "Members can view splits" ON expense_splits;
CREATE POLICY "Members can view splits"
    ON expense_splits
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 
            FROM expenses e
            WHERE e.id = expense_splits.expense_id
              AND is_trip_member(e.trip_id)
        )
    );

-- Expense payers can create splits when adding an expense
DROP POLICY IF EXISTS "Payers can create splits" ON expense_splits;
CREATE POLICY "Payers can create splits"
    ON expense_splits
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM expenses e
            WHERE e.id = expense_splits.expense_id
              AND e.paid_by = auth.uid()
        )
    );

-- Users can mark their own splits as settled
DROP POLICY IF EXISTS "Users can settle their own splits" ON expense_splits;
CREATE POLICY "Users can settle their own splits"
    ON expense_splits
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Expense payers can update splits for their expenses
DROP POLICY IF EXISTS "Payers can update splits" ON expense_splits;
CREATE POLICY "Payers can update splits"
    ON expense_splits
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 
            FROM expenses e
            WHERE e.id = expense_splits.expense_id
              AND e.paid_by = auth.uid()
        )
    );

-- Expense payers can delete splits for their expenses
DROP POLICY IF EXISTS "Payers can delete splits" ON expense_splits;
CREATE POLICY "Payers can delete splits"
    ON expense_splits
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 
            FROM expenses e
            WHERE e.id = expense_splits.expense_id
              AND e.paid_by = auth.uid()
        )
    );

-- ============================================================================
-- POLICIES: users
-- ============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Allow public read access to users (so profiles are visible to all members)
DROP POLICY IF EXISTS "Allow public read access" ON public.users;
CREATE POLICY "Allow public read access"
    ON public.users
    FOR SELECT
    USING (true);

-- Allow individual insert
DROP POLICY IF EXISTS "Allow individual insert" ON public.users;
CREATE POLICY "Allow individual insert"
    ON public.users
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Allow individual update
DROP POLICY IF EXISTS "Allow individual update" ON public.users;
CREATE POLICY "Allow individual update"
    ON public.users
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant authenticated users access to tables
GRANT SELECT, INSERT, UPDATE, DELETE ON trips TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON trip_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON itinerary_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON expenses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON expense_splits TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO anon;

-- Grant access to sequences (for any serial columns in future)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================================
-- RLS POLICIES COMPLETE
-- ============================================================================
