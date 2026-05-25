-- Seed Data for Development
-- Person B: Sample Data

-- Insert sample users
INSERT INTO users (id, email, name, avatar_url) VALUES
  ('11111111-1111-1111-1111-111111111111', 'sarah@example.com', 'Sarah Johnson', 'https://i.pravatar.cc/150?img=1'),
  ('22222222-2222-2222-2222-222222222222', 'mike@example.com', 'Mike Chen', 'https://i.pravatar.cc/150?img=2'),
  ('33333333-3333-3333-3333-333333333333', 'chloe@example.com', 'Chloe Martinez', 'https://i.pravatar.cc/150?img=3');

-- Insert sample trip
INSERT INTO trips (id, name, destination, start_date, end_date, created_by) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Barcelona Group Trip', 'Barcelona, Spain', '2025-07-12', '2025-07-19', '11111111-1111-1111-1111-111111111111');

-- Add trip members
INSERT INTO trip_members (trip_id, user_id, role) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'organizer'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'member'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'member');

-- Insert sample itinerary items
INSERT INTO itinerary_items (trip_id, title, location, start_time, notes, category_icon, created_by) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Sagrada Familia Tour', 'Carrer de Mallorca', '2025-07-12 10:00:00+00', 'Booked tickets in advance', 'activity', '11111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tapas Lunch at El Xampanyet', 'El Born', '2025-07-12 14:00:00+00', '', 'food', '11111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Airport Bus to City Center', 'T1 Terminal', '2025-07-13 09:30:00+00', 'Aerobus — Line A1', 'transport', '22222222-2222-2222-2222-222222222222'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Jazz Club Jamboree', 'Plaça Reial 17', '2025-07-14 21:00:00+00', 'Dress code: smart casual', 'music', '33333333-3333-3333-3333-333333333333');

-- Insert sample expenses
INSERT INTO expenses (trip_id, description, amount, category, paid_by) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Sagrada Familia Tickets', 110.00, 'Activities', '11111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Hotel Vila Olímpica (3 nights)', 630.00, 'Accommodation', '22222222-2222-2222-2222-222222222222'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Aerobus Passes x3', 45.00, 'Transport', '33333333-3333-3333-3333-333333333333'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Dinner at Tickets Restaurant', 210.00, 'Food & Drinks', '11111111-1111-1111-1111-111111111111');

-- Insert expense splits (split equally among 3 people)
INSERT INTO expense_splits (expense_id, user_id, amount) 
SELECT e.id, u.id, e.amount / 3.0
FROM expenses e
CROSS JOIN users u
WHERE e.trip_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
AND u.id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333'
);
