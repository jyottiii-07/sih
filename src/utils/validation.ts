import { z } from 'zod';
import { SensorReading } from '../types/sensor';

/**
 * Strict Classification Schema Enum
 */
export const ClassificationSchema = z.enum(['normal', 'weak_anomaly', 'strong_anomaly']);

/**
 * ISO-8601 Timestamp Validation Helper
 */
const IsoTimestampSchema = z.string().refine((val) => !isNaN(Date.parse(val)), {
  message: 'Invalid ISO-8601 timestamp string',
});

/**
 * Locked 10-Field Sensor Reading Schema
 * Uses `.strict()` to explicitly REJECT any unauthorized fields (e.g. depth, temp, GPS, lat, long, etc.)
 */
export const SensorReadingSchema = z
  .object({
    sensor_id: z.string().min(1, 'sensor_id cannot be empty').regex(/^[A-Za-z0-9_-]+$/, 'Invalid sensor_id format'),
    timestamp: IsoTimestampSchema,
    x: z.number().finite('x coordinate must be a finite number'),
    y: z.number().finite('y coordinate must be a finite number'),
    bx: z.number().finite('bx must be a finite number'),
    by: z.number().finite('by must be a finite number'),
    bz: z.number().finite('bz must be a finite number'),
    magnetic_signal: z.number().finite('magnetic_signal must be a finite number').nonnegative('magnetic_signal cannot be negative'),
    anomaly_score: z
      .number()
      .finite('anomaly_score must be a finite number')
      .min(0.0, 'anomaly_score cannot be less than 0.0')
      .max(1.0, 'anomaly_score cannot exceed 1.0'),
    classification: ClassificationSchema,
  })
  .strict();

export const SensorReadingBatchSchema = z.array(SensorReadingSchema);

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
}

/**
 * Validates a single sensor reading record
 */
export function validateSensorReading(input: unknown): ValidationResult<SensorReading> {
  const result = SensorReadingSchema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data as SensorReading };
  }
  return {
    success: false,
    errors: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
  };
}

/**
 * Validates an array of sensor readings, collecting valid entries and reporting validation errors
 */
export function validateSensorReadingsBatch(input: unknown): {
  valid: SensorReading[];
  invalidCount: number;
  errors: string[];
} {
  if (!Array.isArray(input)) {
    return {
      valid: [],
      invalidCount: 1,
      errors: ['Expected an array of sensor reading objects'],
    };
  }

  const valid: SensorReading[] = [];
  const errors: string[] = [];
  let invalidCount = 0;

  input.forEach((item, index) => {
    const result = SensorReadingSchema.safeParse(item);
    if (result.success) {
      valid.push(result.data as SensorReading);
    } else {
      invalidCount++;
      const issueSummary = result.error.errors.map((e) => `${e.path.join('.') || 'root'}: ${e.message}`).join(', ');
      errors.push(`Record [${index}]: ${issueSummary}`);
    }
  });

  return { valid, invalidCount, errors };
}
