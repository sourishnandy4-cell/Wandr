-- Row Level Security Policies
-- Person B: Security Policies

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE itinerary_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Trips policies
CREATE POLICY "Users can view trips they are members of"
  ON trips FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trip_members
      WHERE trip_members.trip_id = trips.id
      AND trip_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create trips"
  ON trips FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Trip organizers can update trips"
  ON trips FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM trip_members
      WHERE trip_members.trip_id = trips.id
      AND trip_members.user_id = auth.uid()
      AND trip_members.role = 'organizer'
    )
  );

CREATE POLICY "Trip organizers can delete trips"
  ON trips FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM trip_members
      WHERE trip_members.trip_id = trips.id
      AND trip_members.user_id = auth.uid()
      AND trip_members.role = 'organizer'
    )
  );

-- Trip members policies
CREATE POLICY "Users can view trip members for their trips"
  ON trip_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trip_members tm
      WHERE tm.trip_id = trip_members.trip_id
      AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Trip organizers can add members"
  ON trip_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trip_members
      WHERE trip_members.trip_id = trip_members.trip_id
      AND trip_members.user_id = auth.uid()
      AND trip_members.role = 'organizer'
    )
  );

CREATE POLICY "Trip organizers can remove members"
  ON trip_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM trip_members tm
      WHERE tm.trip_id = trip_members.trip_id
      AND tm.user_id = auth.uid()
      AND tm.role = 'organizer'
    )
  );

-- Itinerary items policies
CREATE POLICY "Trip members can view itinerary items"
  ON itinerary_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trip_members
      WHERE trip_members.trip_id = itinerary_items.trip_id
      AND trip_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Trip members can create itinerary items"
  ON itinerary_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trip_members
      WHERE trip_members.trip_id = itinerary_items.trip_id
      AND trip_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Trip members can update itinerary items"
  ON itinerary_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM trip_members
      WHERE trip_members.trip_id = itinerary_items.trip_id
      AND trip_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Trip members can delete itinerary items"
  ON itinerary_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM trip_members
      WHERE trip_members.trip_id = itinerary_items.trip_id
      AND trip_members.user_id = auth.uid()
    )
  );

-- Expenses policies
CREATE POLICY "Trip members can view expenses"
  ON expenses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trip_members
      WHERE trip_members.trip_id = expenses.trip_id
      AND trip_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Trip members can create expenses"
  ON expenses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trip_members
      WHERE trip_members.trip_id = expenses.trip_id
      AND trip_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Trip members can update expenses"
  ON expenses FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM trip_members
      WHERE trip_members.trip_id = expenses.trip_id
      AND trip_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Trip members can delete expenses"
  ON expenses FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM trip_members
      WHERE trip_members.trip_id = expenses.trip_id
      AND trip_members.user_id = auth.uid()
    )
  );

-- Expense splits policies
CREATE POLICY "Trip members can view expense splits"
  ON expense_splits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM expenses
      JOIN trip_members ON trip_members.trip_id = expenses.trip_id
      WHERE expenses.id = expense_splits.expense_id
      AND trip_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Trip members can create expense splits"
  ON expense_splits FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM expenses
      JOIN trip_members ON trip_members.trip_id = expenses.trip_id
      WHERE expenses.id = expense_splits.expense_id
      AND trip_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own expense splits"
  ON expense_splits FOR UPDATE
  USING (auth.uid() = user_id);
