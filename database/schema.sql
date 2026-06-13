-- ============================================================================
-- GROUP TRAVEL PLANNER — DATABASE SCHEMA
-- ============================================================================
-- Author: Person B (Database Architect)
-- Purpose: Complete PostgreSQL schema for collaborative trip planning
-- Dependencies: Supabase (PostgreSQL 15+)
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLE: users
-- ============================================================================
-- Public profile mapping auth.users metadata
-- Synchronized automatically via database triggers on signup and profile edit

CREATE TABLE public.users (
    id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email        VARCHAR(255) NOT NULL,
    name         VARCHAR(255) NOT NULL,
    created_at   TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE users IS 'Publicly accessible profile info for application users';

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, name)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run handle_new_user on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to handle user updates
CREATE OR REPLACE FUNCTION public.handle_update_user()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.users
    SET 
        name = COALESCE(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'username', public.users.name),
        email = COALESCE(new.email, public.users.email)
    WHERE id = new.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run handle_update_user on user metadata updates
CREATE OR REPLACE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_update_user();

-- ============================================================================
-- TABLE: trips
-- ============================================================================
-- Stores high-level trip information including destination and budget
-- Each trip has one creator (owner) and multiple members via trip_members

CREATE TABLE trips (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name         VARCHAR(255) NOT NULL,
    destination  VARCHAR(255) NOT NULL,
    start_date   DATE NOT NULL,
    end_date     DATE NOT NULL,
    total_budget DECIMAL(10,2) DEFAULT 0 CHECK (total_budget >= 0),
    created_by   UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ DEFAULT now(),
    updated_at   TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

COMMENT ON TABLE trips IS 'Core trip metadata including dates and budget';
COMMENT ON COLUMN trips.total_budget IS 'Planned budget in USD (or primary currency)';
COMMENT ON COLUMN trips.created_by IS 'User who created the trip (trip owner)';

-- ============================================================================
-- TABLE: trip_members
-- ============================================================================
-- Many-to-many relationship between users and trips
-- Tracks who belongs to which trip and their role

CREATE TABLE trip_members (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id    UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role       VARCHAR(50) DEFAULT 'member' CHECK (role IN ('owner', 'member')),
    joined_at  TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    UNIQUE(trip_id, user_id)
);

COMMENT ON TABLE trip_members IS 'Junction table for user membership in trips';
COMMENT ON COLUMN trip_members.role IS 'User role: owner (full control) or member (can contribute)';

-- ============================================================================
-- TABLE: itinerary_items
-- ============================================================================
-- Individual activities, meals, and events in the trip timeline
-- Powers the vertical timeline view with chronological ordering

CREATE TABLE itinerary_items (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id       UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    title         VARCHAR(255) NOT NULL,
    location      VARCHAR(255),
    start_time    TIMESTAMPTZ NOT NULL,
    end_time      TIMESTAMPTZ,
    notes         TEXT,
    category_icon VARCHAR(50) DEFAULT 'activity' 
                  CHECK (category_icon IN ('activity', 'food', 'transport', 'music', 'accommodation')),
    created_by    UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ DEFAULT now(),
    updated_at    TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    CONSTRAINT valid_time_range CHECK (end_time IS NULL OR end_time >= start_time)
);

COMMENT ON TABLE itinerary_items IS 'Timeline activities for each trip';
COMMENT ON COLUMN itinerary_items.category_icon IS 'Icon category: activity, food, transport, music, accommodation';
COMMENT ON COLUMN itinerary_items.start_time IS 'When the activity begins (includes date and time)';

-- ============================================================================
-- TABLE: expenses
-- ============================================================================
-- Individual bills/payments made during the trip
-- Each expense is paid by one person but may be split among multiple people

CREATE TABLE expenses (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id      UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    description  VARCHAR(255) NOT NULL,
    amount       DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    category     VARCHAR(50) NOT NULL 
                 CHECK (category IN ('Accommodation', 'Food & Drinks', 'Activities', 'Transport')),
    paid_by      UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    created_at   TIMESTAMPTZ DEFAULT now(),
    updated_at   TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE expenses IS 'Individual expenses/bills for a trip';
COMMENT ON COLUMN expenses.category IS 'Expense category: Accommodation, Food & Drinks, Activities, Transport';
COMMENT ON COLUMN expenses.paid_by IS 'User who paid this expense upfront';
COMMENT ON COLUMN expenses.amount IS 'Total amount paid in USD (or primary currency)';

-- ============================================================================
-- TABLE: expense_splits
-- ============================================================================
-- Tracks how each expense is divided among trip members
-- Powers the balance sheet calculation (who owes whom)

CREATE TABLE expense_splits (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id  UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    owed_amount DECIMAL(10,2) NOT NULL CHECK (owed_amount > 0),
    is_settled  BOOLEAN DEFAULT FALSE,
    settled_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    UNIQUE(expense_id, user_id),
    CONSTRAINT settled_timestamp CHECK (
        (is_settled = TRUE AND settled_at IS NOT NULL) OR 
        (is_settled = FALSE AND settled_at IS NULL)
    )
);

COMMENT ON TABLE expense_splits IS 'How each expense is divided among users';
COMMENT ON COLUMN expense_splits.owed_amount IS 'Amount this user owes for this expense';
COMMENT ON COLUMN expense_splits.is_settled IS 'Whether this user has paid back their share';

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Fast timeline queries (ordered by time)
CREATE INDEX idx_itinerary_trip_time 
    ON itinerary_items(trip_id, start_time ASC);

-- Fast expense aggregations for pie chart
CREATE INDEX idx_expenses_trip_category 
    ON expenses(trip_id, category);

-- Fast balance calculation queries
CREATE INDEX idx_splits_user_settled 
    ON expense_splits(user_id, is_settled);

CREATE INDEX idx_splits_expense 
    ON expense_splits(expense_id);

-- Fast membership lookups
CREATE INDEX idx_trip_members_user 
    ON trip_members(user_id);

CREATE INDEX idx_trip_members_trip 
    ON trip_members(trip_id);

-- Fast expense lookup by payer
CREATE INDEX idx_expenses_paid_by 
    ON expenses(paid_by);

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
CREATE TRIGGER update_trips_updated_at 
    BEFORE UPDATE ON trips
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_itinerary_updated_at 
    BEFORE UPDATE ON itinerary_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at 
    BEFORE UPDATE ON expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View: Trip summary with member count and total spent
CREATE OR REPLACE VIEW trip_summary AS
SELECT 
    t.id,
    t.name,
    t.destination,
    t.start_date,
    t.end_date,
    t.total_budget,
    COUNT(DISTINCT tm.user_id) as member_count,
    COALESCE(SUM(e.amount), 0) as total_spent,
    t.created_by,
    t.created_at
FROM trips t
LEFT JOIN trip_members tm ON t.id = tm.trip_id
LEFT JOIN expenses e ON t.id = e.trip_id
GROUP BY t.id;

COMMENT ON VIEW trip_summary IS 'Trip overview with member count and spending totals';

-- ============================================================================
-- SCHEMA COMPLETE
-- ============================================================================
-- Next steps:
-- 1. Run rls_policies.sql to enable Row Level Security
-- 2. Run seed.sql to load sample Barcelona trip data
-- ============================================================================
