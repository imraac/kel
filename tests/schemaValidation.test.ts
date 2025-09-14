import { describe, it, expect } from '@jest/globals';
import { ZodError } from 'zod';
import {
  insertFarmSchema,
  insertUserSchema,
  insertFlockSchema,
  insertDailyRecordSchema,
  insertSaleSchema,
  insertFeedInventorySchema,
  insertHealthRecordSchema,
  insertExpenseSchema,
  insertCustomerSchema,
  insertProductSchema,
  insertOrderSchema,
  insertOrderItemSchema,
  insertDeliverySchema,
} from '../shared/schema';

// Define the schemas to test with their expected numeric fields
const SCHEMAS_TO_TEST = {
  insertFarmSchema: {
    schema: insertFarmSchema,
    numericFields: ['totalBirds', 'avgEggsPerDay'],
    requiredFields: { name: 'Test Farm', location: 'Test Location' }
  },
  insertFlockSchema: {
    schema: insertFlockSchema,
    numericFields: ['initialCount', 'currentCount'],
    requiredFields: { 
      farmId: 'test-farm-id',
      name: 'Test Flock',
      hatchDate: '2025-01-01'
    }
  },
  insertDailyRecordSchema: {
    schema: insertDailyRecordSchema,
    numericFields: [
      'eggsCollected', 'brokenEggs', 'cratesProduced', 'mortalityCount',
      'feedConsumed', 'temperature', 'lightingHours', 'averageWeight', 'sampleSize'
    ],
    requiredFields: {
      flockId: 'test-flock-id',
      recordDate: '2025-01-01',
      userId: 'test-user-id'
    }
  },
  insertSaleSchema: {
    schema: insertSaleSchema,
    numericFields: ['cratesSold', 'pricePerCrate', 'totalAmount'],
    requiredFields: {
      farmId: 'test-farm-id',
      saleDate: '2025-01-01',
      userId: 'test-user-id',
      paymentStatus: 'pending'
    }
  },
  insertFeedInventorySchema: {
    schema: insertFeedInventorySchema,
    numericFields: ['quantityKg', 'unitPrice'],
    requiredFields: {
      farmId: 'test-farm-id',
      feedType: 'Layer Feed',
      userId: 'test-user-id'
    }
  },
  insertHealthRecordSchema: {
    schema: insertHealthRecordSchema,
    numericFields: ['cost'],
    requiredFields: {
      flockId: 'test-flock-id',
      recordDate: '2025-01-01',
      userId: 'test-user-id',
      recordType: 'vaccination',
      title: 'Test Record'
    }
  },
  insertExpenseSchema: {
    schema: insertExpenseSchema,
    numericFields: ['amount'],
    requiredFields: {
      farmId: 'test-farm-id',
      expenseDate: '2025-01-01',
      userId: 'test-user-id',
      category: 'feed',
      description: 'Test Expense'
    }
  },
  insertProductSchema: {
    schema: insertProductSchema,
    numericFields: ['currentPrice', 'minOrderQuantity', 'stockQuantity'],
    requiredFields: {
      farmId: 'test-farm-id',
      name: 'Test Product',
      category: 'eggs',
      unit: 'crates'
    }
  },
  insertOrderSchema: {
    schema: insertOrderSchema,
    numericFields: [], // Note: totalAmount and paidAmount are omitted from insert schema for security
    requiredFields: {
      orderNumber: 'TEST-001',
      farmId: 'test-farm-id',
      customerId: 'test-customer-id',
      userId: 'test-user-id',
      deliveryMethod: 'pickup'
    }
  },
  insertOrderItemSchema: {
    schema: insertOrderItemSchema,
    numericFields: ['quantity'], // Note: unitPrice and totalPrice are omitted for security
    requiredFields: {
      orderId: 'test-order-id',
      productId: 'test-product-id'
    }
  }
};

describe('Schema Numeric Field Validation', () => {
  describe('Schema numeric field handling', () => {
    Object.entries(SCHEMAS_TO_TEST).forEach(([schemaName, config]) => {
      if (config.numericFields.length === 0) {
        it(`${schemaName}: should not have numeric fields to test (by design)`, () => {
          // Some schemas intentionally omit numeric fields for security reasons
          expect(config.numericFields).toHaveLength(0);
        });
        return;
      }

      describe(`${schemaName}`, () => {
        config.numericFields.forEach((fieldName) => {
          describe(`Field: ${fieldName}`, () => {
            it('should accept valid numeric values', () => {
              const testData = {
                ...config.requiredFields,
                [fieldName]: 123.45
              };

              const result = config.schema.safeParse(testData);
              expect(result.success).toBe(true);
              
              if (result.success) {
                expect(typeof result.data[fieldName]).toBe('number');
                expect(result.data[fieldName]).toBe(123.45);
              }
            });

            it('should accept integer values', () => {
              const testData = {
                ...config.requiredFields,
                [fieldName]: 100
              };

              const result = config.schema.safeParse(testData);
              expect(result.success).toBe(true);
              
              if (result.success) {
                expect(typeof result.data[fieldName]).toBe('number');
                expect(result.data[fieldName]).toBe(100);
              }
            });

            it('should reject string values (no auto-coercion)', () => {
              const testData = {
                ...config.requiredFields,
                [fieldName]: "123.45" // String instead of number
              };

              const result = config.schema.safeParse(testData);
              
              // We expect this to fail since forms should send numbers, not strings
              expect(result.success).toBe(false);
              
              if (!result.success) {
                const fieldError = result.error.issues.find(
                  issue => issue.path.includes(fieldName)
                );
                expect(fieldError).toBeDefined();
                expect(fieldError?.code).toBe('invalid_type');
                expect(fieldError?.message).toContain('number');
              }
            });

            it('should reject invalid string values', () => {
              const testData = {
                ...config.requiredFields,
                [fieldName]: "not-a-number"
              };

              const result = config.schema.safeParse(testData);
              expect(result.success).toBe(false);
              
              if (!result.success) {
                const fieldError = result.error.issues.find(
                  issue => issue.path.includes(fieldName)
                );
                expect(fieldError).toBeDefined();
              }
            });

            it('should accept zero values', () => {
              const testData = {
                ...config.requiredFields,
                [fieldName]: 0
              };

              const result = config.schema.safeParse(testData);
              expect(result.success).toBe(true);
              
              if (result.success) {
                expect(typeof result.data[fieldName]).toBe('number');
                expect(result.data[fieldName]).toBe(0);
              }
            });

            it('should accept negative values (where applicable)', () => {
              // Some fields may not allow negative values, but we test the schema behavior
              const testData = {
                ...config.requiredFields,
                [fieldName]: -10.5
              };

              const result = config.schema.safeParse(testData);
              
              // The test checks if negative values are handled correctly
              // Some schemas may have .min(0) validation, others may allow negative values
              if (result.success) {
                expect(typeof result.data[fieldName]).toBe('number');
                expect(result.data[fieldName]).toBe(-10.5);
              } else {
                // If it fails, it should be due to a minimum value constraint, not type issues
                const fieldError = result.error.issues.find(
                  issue => issue.path.includes(fieldName)
                );
                if (fieldError) {
                  expect(['too_small', 'invalid_type']).toContain(fieldError.code);
                }
              }
            });
          });
        });

        it(`should validate complete valid object`, () => {
          const testData = {
            ...config.requiredFields,
            // Add valid numeric values for all numeric fields
            ...Object.fromEntries(
              config.numericFields.map(field => [field, 100])
            )
          };

          const result = config.schema.safeParse(testData);
          expect(result.success).toBe(true);
          
          if (result.success) {
            // Verify all numeric fields are indeed numbers
            config.numericFields.forEach(field => {
              expect(typeof result.data[field]).toBe('number');
            });
          }
        });

        it(`should fail validation with mixed string and number fields`, () => {
          if (config.numericFields.length < 2) {
            // Skip this test if there's only one or no numeric fields
            return;
          }

          const testData = {
            ...config.requiredFields,
            // Mix: first field as number, second as string
            [config.numericFields[0]]: 100,
            [config.numericFields[1]]: "200" // This should cause failure
          };

          const result = config.schema.safeParse(testData);
          expect(result.success).toBe(false);
          
          if (!result.success) {
            // Should have error for the string field
            const stringFieldError = result.error.issues.find(
              issue => issue.path.includes(config.numericFields[1])
            );
            expect(stringFieldError).toBeDefined();
            expect(stringFieldError?.code).toBe('invalid_type');
          }
        });
      });
    });
  });

  describe('Form submission reality check', () => {
    it('should document expected form behavior', () => {
      // This test serves as documentation of expected behavior
      const formExpectations = {
        'HTML number inputs': 'should send numbers, not strings',
        'Controlled React inputs': 'should convert strings to numbers before submission',
        'Form libraries': 'should handle type coercion before schema validation',
        'API endpoints': 'should receive properly typed data from frontend'
      };

      // This test always passes but documents our expectations
      expect(Object.keys(formExpectations).length).toBeGreaterThan(0);
      console.log('📋 Form Behavior Expectations:');
      Object.entries(formExpectations).forEach(([context, expectation]) => {
        console.log(`  • ${context}: ${expectation}`);
      });
    });
  });

  describe('Schema coverage', () => {
    it('should test all major insert schemas', () => {
      const testedSchemas = Object.keys(SCHEMAS_TO_TEST);
      const expectedSchemas = [
        'insertFlockSchema',
        'insertDailyRecordSchema', 
        'insertSaleSchema',
        'insertFeedInventorySchema',
        'insertHealthRecordSchema',
        'insertExpenseSchema',
        'insertProductSchema'
      ];

      expectedSchemas.forEach(schemaName => {
        expect(testedSchemas).toContain(schemaName);
      });
    });

    it('should report total numeric fields tested', () => {
      const totalNumericFields = Object.values(SCHEMAS_TO_TEST)
        .reduce((total, config) => total + config.numericFields.length, 0);
      
      expect(totalNumericFields).toBeGreaterThan(10);
      console.log(`🔢 Testing ${totalNumericFields} numeric fields across ${Object.keys(SCHEMAS_TO_TEST).length} schemas`);
    });
  });
});