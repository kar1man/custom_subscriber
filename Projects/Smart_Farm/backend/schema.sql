-- ============================================
-- Smart Agriculture IoT Backend Database Schema
-- PostgreSQL with TimescaleDB for time-series data
-- ============================================

-- Create sensors metadata table
CREATE TABLE IF NOT EXISTS sensors (
  id SERIAL PRIMARY KEY,
  sensor_id VARCHAR(50) UNIQUE NOT NULL,
  location VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  
  -- For monitoring
  last_transmission TIMESTAMP,
  total_transmissions INT DEFAULT 0,
  
  CONSTRAINT sensor_id_format CHECK (sensor_id ~ '^\d{3}$')
);

-- Create index for sensor_id lookups
CREATE INDEX IF NOT EXISTS idx_sensors_id ON sensors(sensor_id);
CREATE INDEX IF NOT EXISTS idx_sensors_location ON sensors(location);

-- Create time-series data table
CREATE TABLE IF NOT EXISTS sensor_data (
  time TIMESTAMP NOT NULL,
  sensor_id VARCHAR(50) NOT NULL,
  temperature DECIMAL(5, 2),    -- -10 to 60°C
  humidity DECIMAL(5, 2),       -- 0 to 100%
  light_level INT,              -- 0 to 1023 (ADC) or 0 to 100000 (LUX)
  is_daytime BOOLEAN,
  
  -- For integrity
  PRIMARY KEY (time, sensor_id),
  CONSTRAINT fk_sensor_id FOREIGN KEY (sensor_id) REFERENCES sensors(sensor_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

-- Create index for fast queries
CREATE INDEX IF NOT EXISTS idx_sensor_data_sensor_id ON sensor_data(sensor_id);
CREATE INDEX IF NOT EXISTS idx_sensor_data_time ON sensor_data(time DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_data_sensor_time ON sensor_data(sensor_id, time DESC);

-- Enable TimescaleDB hypertable (if extension available)
-- Run this after enabling TimescaleDB extension:
-- CREATE EXTENSION IF NOT EXISTS timescaledb;
-- SELECT create_hypertable('sensor_data', 'time', if_not_exists => TRUE);

-- Create data validation log table (for debugging)
CREATE TABLE IF NOT EXISTS data_validation_log (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sensor_id VARCHAR(50),
  request_body JSONB,
  validation_error VARCHAR(500),
  rejected BOOLEAN,
  
  CONSTRAINT fk_log_sensor_id FOREIGN KEY (sensor_id) REFERENCES sensors(sensor_id)
    ON DELETE SET NULL
);

-- Create index for recent logs
CREATE INDEX IF NOT EXISTS idx_validation_log_timestamp ON data_validation_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_validation_log_sensor_id ON data_validation_log(sensor_id);

-- Add comments for documentation
COMMENT ON TABLE sensors IS 'Metadata for all 5 sensor nodes in the star topology network';
COMMENT ON COLUMN sensors.sensor_id IS 'Unique identifier for Arduino node (001-005)';
COMMENT ON COLUMN sensors.location IS 'Farm location name (North_Field, Tomato_Greenhouse, etc.)';
COMMENT ON COLUMN sensors.last_transmission IS 'Timestamp of most recent data received from this node';
COMMENT ON COLUMN sensors.total_transmissions IS 'Cumulative count of successful transmissions from this node';

COMMENT ON TABLE sensor_data IS 'Time-series data from all 5 sensor nodes, consolidated in one database';
COMMENT ON COLUMN sensor_data.time IS 'UTC timestamp when data was collected by Arduino node';
COMMENT ON COLUMN sensor_data.sensor_id IS 'Foreign key reference to sensors table';
COMMENT ON COLUMN sensor_data.temperature IS 'Temperature in Celsius (-10 to 60 range)';
COMMENT ON COLUMN sensor_data.humidity IS 'Relative humidity percentage (0-100)';
COMMENT ON COLUMN sensor_data.light_level IS 'Raw ADC reading from LDR sensor (0-1023)';
COMMENT ON COLUMN sensor_data.is_daytime IS 'Boolean indicating if data was collected during daytime (edge computing flag)';

COMMENT ON TABLE data_validation_log IS 'Audit trail of validation errors for debugging data quality issues';
