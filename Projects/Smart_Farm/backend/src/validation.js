/**
 * Data Validation Module
 * Validates incoming sensor data payloads from Arduino nodes
 */

const Joi = require('joi');

/**
 * Schema for sensor data payload from Arduino
 */
const sensorDataSchema = Joi.object({
  sensor_id: Joi.string()
    .pattern(/^\d{3}$/)
    .required()
    .messages({
      'string.pattern.base': 'sensor_id must be 3 digits (001-999)',
      'any.required': 'sensor_id is required'
    }),
  
  location: Joi.string()
    .min(3)
    .max(100)
    .required()
    .messages({
      'any.required': 'location is required'
    }),
  
  temperature: Joi.number()
    .min(-10)
    .max(60)
    .required()
    .messages({
      'number.min': 'temperature must be >= -10°C',
      'number.max': 'temperature must be <= 60°C',
      'any.required': 'temperature is required'
    }),
  
  humidity: Joi.number()
    .min(0)
    .max(100)
    .required()
    .messages({
      'number.min': 'humidity must be >= 0%',
      'number.max': 'humidity must be <= 100%',
      'any.required': 'humidity is required'
    }),
  
  light_level: Joi.number()
    .integer()
    .min(0)
    .max(100000)
    .required()
    .messages({
      'number.min': 'light_level must be >= 0',
      'number.max': 'light_level must be <= 100000',
      'any.required': 'light_level is required'
    }),
  
  is_daytime: Joi.boolean()
    .required()
    .messages({
      'any.required': 'is_daytime is required'
    }),
  
  timestamp: Joi.string()
    .isoDate()
    .required()
    .messages({
      'string.isoDate': 'timestamp must be ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ)',
      'any.required': 'timestamp is required'
    })
});

/**
 * Validate sensor payload
 * @param {Object} payload - The incoming data from Arduino
 * @returns {Object} - { valid: boolean, error: string | null, value: sanitized_payload }
 */
function validateSensorPayload(payload) {
  const { error, value } = sensorDataSchema.validate(payload, { abortEarly: false });
  
  if (error) {
    const messages = error.details.map(d => d.message).join('; ');
    return {
      valid: false,
      error: messages,
      value: null
    };
  }
  
  return {
    valid: true,
    error: null,
    value: value
  };
}

/**
 * Additional validation: check if sensor_id exists
 * @param {string} sensor_id - The sensor ID to validate
 * @param {Array} registered_sensors - List of registered sensor IDs
 * @returns {Object} - { valid: boolean, error: string | null }
 */
function validateSensorExists(sensor_id, registered_sensors) {
  if (!registered_sensors.includes(sensor_id)) {
    return {
      valid: false,
      error: `sensor_id '${sensor_id}' not registered in system`
    };
  }
  return {
    valid: true,
    error: null
  };
}

/**
 * Validate timestamp is recent (not too old or in future)
 * @param {string} timestamp - ISO 8601 timestamp
 * @returns {Object} - { valid: boolean, error: string | null }
 */
function validateTimestampRecency(timestamp) {
  const now = new Date();
  const dataTime = new Date(timestamp);
  const diffMinutes = Math.abs((now - dataTime) / (1000 * 60));
  
  // Allow data up to 1 hour old or up to 1 minute in the future
  if (diffMinutes > 60 && dataTime > now) {
    return {
      valid: false,
      error: `timestamp is too far in past or future (diff: ${diffMinutes.toFixed(1)} minutes)`
    };
  }
  
  return {
    valid: true,
    error: null
  };
}

/**
 * Check for impossible readings (edge case detection)
 * @param {Object} data - Validated sensor data
 * @returns {Object} - { valid: boolean, warning: string | null }
 */
function checkPlausibleReadings(data) {
  const warnings = [];
  
  // Check light level vs is_daytime consistency
  if (data.is_daytime && data.light_level < 200) {
    warnings.push('is_daytime=true but light_level is low (possible miscalibration)');
  }
  if (!data.is_daytime && data.light_level > 700) {
    warnings.push('is_daytime=false but light_level is high (possible miscalibration)');
  }
  
  // Check for extreme temperature swings (likely sensor error)
  if (data.temperature < 0 || data.temperature > 50) {
    warnings.push('temperature is extreme (< 0 or > 50°C)');
  }
  
  return {
    valid: warnings.length === 0,
    warnings: warnings.length > 0 ? warnings : null
  };
}

module.exports = {
  validateSensorPayload,
  validateSensorExists,
  validateTimestampRecency,
  checkPlausibleReadings,
  sensorDataSchema
};
