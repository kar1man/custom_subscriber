-- ============================================
-- Smart Agriculture IoT Backend - Seed Data
-- Pre-register 5 sensor nodes
-- ============================================

-- Delete existing seed data (if re-running script)
DELETE FROM sensor_data WHERE sensor_id IN ('001', '002', '003', '004', '005');
DELETE FROM sensors WHERE sensor_id IN ('001', '002', '003', '004', '005');

-- Insert 5 pre-registered sensor nodes
INSERT INTO sensors (sensor_id, location, created_at, is_active, last_transmission, total_transmissions)
VALUES
  ('001', 'North_Field', NOW() - INTERVAL '90 days', true, NOW() - INTERVAL '5 minutes', 0),
  ('002', 'Tomato_Greenhouse', NOW() - INTERVAL '90 days', true, NOW() - INTERVAL '5 minutes', 0),
  ('003', 'East_Garage', NOW() - INTERVAL '90 days', true, NOW() - INTERVAL '5 minutes', 0),
  ('004', 'South_Storage', NOW() - INTERVAL '90 days', true, NOW() - INTERVAL '5 minutes', 0),
  ('005', 'West_Shed', NOW() - INTERVAL '90 days', true, NOW() - INTERVAL '5 minutes', 0);

-- Insert sample historical data for testing (last 24 hours)
-- Node 001: North_Field
INSERT INTO sensor_data (time, sensor_id, temperature, humidity, light_level, is_daytime)
VALUES
  (NOW() - INTERVAL '23 hours', '001', 22.1, 58, 150, false),
  (NOW() - INTERVAL '22 hours', '001', 22.5, 60, 780, true),
  (NOW() - INTERVAL '21 hours', '001', 23.2, 62, 850, true),
  (NOW() - INTERVAL '20 hours', '001', 24.1, 65, 920, true),
  (NOW() - INTERVAL '19 hours', '001', 24.8, 63, 890, true),
  (NOW() - INTERVAL '18 hours', '001', 25.3, 62, 750, true),
  (NOW() - INTERVAL '4 hours', '001', 24.5, 65, 850, true),
  (NOW() - INTERVAL '3 hours', '001', 24.3, 64, 800, true),
  (NOW() - INTERVAL '2 hours', '001', 24.1, 63, 750, true),
  (NOW() - INTERVAL '1 hours', '001', 23.9, 62, 650, true);

-- Node 002: Tomato_Greenhouse
INSERT INTO sensor_data (time, sensor_id, temperature, humidity, light_level, is_daytime)
VALUES
  (NOW() - INTERVAL '23 hours', '002', 24.5, 68, 200, false),
  (NOW() - INTERVAL '22 hours', '002', 25.1, 70, 820, true),
  (NOW() - INTERVAL '21 hours', '002', 26.2, 72, 900, true),
  (NOW() - INTERVAL '20 hours', '002', 27.1, 74, 950, true),
  (NOW() - INTERVAL '19 hours', '002', 27.8, 73, 920, true),
  (NOW() - INTERVAL '18 hours', '002', 28.3, 72, 880, true),
  (NOW() - INTERVAL '4 hours', '002', 26.1, 72, 900, true),
  (NOW() - INTERVAL '3 hours', '002', 25.9, 71, 880, true),
  (NOW() - INTERVAL '2 hours', '002', 25.7, 70, 820, true),
  (NOW() - INTERVAL '1 hours', '002', 25.5, 69, 750, true);

-- Node 003: East_Garage
INSERT INTO sensor_data (time, sensor_id, temperature, humidity, light_level, is_daytime)
VALUES
  (NOW() - INTERVAL '23 hours', '003', 20.2, 52, 120, false),
  (NOW() - INTERVAL '22 hours', '003', 20.8, 54, 760, true),
  (NOW() - INTERVAL '21 hours', '003', 21.5, 56, 820, true),
  (NOW() - INTERVAL '20 hours', '003', 22.3, 58, 900, true),
  (NOW() - INTERVAL '19 hours', '003', 23.1, 59, 870, true),
  (NOW() - INTERVAL '18 hours', '003', 23.8, 60, 810, true),
  (NOW() - INTERVAL '4 hours', '003', 22.3, 60, 820, true),
  (NOW() - INTERVAL '3 hours', '003', 22.1, 59, 800, true),
  (NOW() - INTERVAL '2 hours', '003', 21.9, 58, 760, true),
  (NOW() - INTERVAL '1 hours', '003', 21.7, 57, 680, true);

-- Node 004: South_Storage
INSERT INTO sensor_data (time, sensor_id, temperature, humidity, light_level, is_daytime)
VALUES
  (NOW() - INTERVAL '23 hours', '004', 21.5, 55, 140, false),
  (NOW() - INTERVAL '22 hours', '004', 22.1, 57, 790, true),
  (NOW() - INTERVAL '21 hours', '004', 22.8, 59, 860, true),
  (NOW() - INTERVAL '20 hours', '004', 23.6, 61, 930, true),
  (NOW() - INTERVAL '19 hours', '004', 24.3, 62, 900, true),
  (NOW() - INTERVAL '18 hours', '004', 24.9, 61, 840, true),
  (NOW() - INTERVAL '4 hours', '004', 23.8, 68, 880, true),
  (NOW() - INTERVAL '3 hours', '004', 23.6, 67, 860, true),
  (NOW() - INTERVAL '2 hours', '004', 23.4, 66, 810, true),
  (NOW() - INTERVAL '1 hours', '004', 23.2, 65, 720, true);

-- Node 005: West_Shed
INSERT INTO sensor_data (time, sensor_id, temperature, humidity, light_level, is_daytime)
VALUES
  (NOW() - INTERVAL '23 hours', '005', 19.8, 50, 100, false),
  (NOW() - INTERVAL '22 hours', '005', 20.4, 52, 740, true),
  (NOW() - INTERVAL '21 hours', '005', 21.1, 54, 800, true),
  (NOW() - INTERVAL '20 hours', '005', 21.9, 56, 880, true),
  (NOW() - INTERVAL '19 hours', '005', 22.6, 57, 850, true),
  (NOW() - INTERVAL '18 hours', '005', 23.3, 58, 790, true),
  (NOW() - INTERVAL '4 hours', '005', 21.5, 55, 760, true),
  (NOW() - INTERVAL '3 hours', '005', 21.3, 54, 740, true),
  (NOW() - INTERVAL '2 hours', '005', 21.1, 53, 700, true),
  (NOW() - INTERVAL '1 hours', '005', 20.9, 52, 620, true);

-- Output confirmation
SELECT 'Database seeded successfully!' as status,
       COUNT(*) as total_sensors,
       (SELECT COUNT(*) FROM sensor_data) as total_data_points;
