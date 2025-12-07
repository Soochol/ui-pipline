/**
 * Type Utilities - Helper functions for data types
 */

import React from 'react';
import {
  NumberIcon,
  TextIcon,
  CheckIcon,
  ZapIcon,
  ListIcon,
  PackageIcon,
  PaletteIcon,
  FolderIcon,
  CalendarIcon,
  DiamondIcon,
} from '../components/icons/Icons';

/**
 * Get icon component for data type
 */
export function getTypeIcon(type: string, size: number = 14): React.ReactElement {
  const lowerType = type.toLowerCase();

  if (lowerType === 'number' || lowerType === 'float' || lowerType === 'int' || lowerType === 'integer') {
    return React.createElement(NumberIcon, { size });
  }
  if (lowerType === 'string' || lowerType === 'text') {
    return React.createElement(TextIcon, { size });
  }
  if (lowerType === 'boolean' || lowerType === 'bool') {
    return React.createElement(CheckIcon, { size });
  }
  if (lowerType === 'trigger') {
    return React.createElement(ZapIcon, { size });
  }
  if (lowerType === 'array' || lowerType === 'list') {
    return React.createElement(ListIcon, { size });
  }
  if (lowerType === 'object' || lowerType === 'dict' || lowerType === 'dictionary') {
    return React.createElement(PackageIcon, { size });
  }
  if (lowerType === 'color') {
    return React.createElement(PaletteIcon, { size });
  }
  if (lowerType === 'file' || lowerType === 'path') {
    return React.createElement(FolderIcon, { size });
  }
  if (lowerType === 'date' || lowerType === 'datetime' || lowerType === 'time') {
    return React.createElement(CalendarIcon, { size });
  }

  return React.createElement(DiamondIcon, { size }); // Default icon
}

/**
 * Get description for data type
 */
export function getTypeDescription(type: string): string {
  const lowerType = type.toLowerCase();

  const descriptions: Record<string, string> = {
    number: 'Numeric value (integer or decimal)',
    float: 'Floating-point number',
    int: 'Integer number',
    integer: 'Integer number',
    string: 'Text string',
    text: 'Text string',
    boolean: 'True or False value',
    bool: 'True or False value',
    trigger: 'Trigger signal for execution flow',
    array: 'Array/list of values',
    list: 'Array/list of values',
    object: 'Key-value object/dictionary',
    dict: 'Key-value object/dictionary',
    dictionary: 'Key-value object/dictionary',
    color: 'Color value (hex, rgb, etc.)',
    file: 'File path or file object',
    path: 'File system path',
    date: 'Date value',
    datetime: 'Date and time value',
    time: 'Time value',
  };

  return descriptions[lowerType] || `${type} data type`;
}

/**
 * Validate value based on type
 */
export function validateValue(value: any, type: string): { valid: boolean; error?: string } {
  const lowerType = type.toLowerCase();

  if (value === undefined || value === null || value === '') {
    return { valid: true }; // Allow empty values
  }

  if (lowerType === 'number' || lowerType === 'float' || lowerType === 'int' || lowerType === 'integer') {
    const num = Number(value);
    if (isNaN(num)) {
      return { valid: false, error: 'Must be a valid number' };
    }
    if ((lowerType === 'int' || lowerType === 'integer') && !Number.isInteger(num)) {
      return { valid: false, error: 'Must be an integer' };
    }
    return { valid: true };
  }

  if (lowerType === 'string' || lowerType === 'text') {
    return { valid: true }; // Any value can be converted to string
  }

  if (lowerType === 'boolean' || lowerType === 'bool') {
    if (typeof value === 'boolean') {
      return { valid: true };
    }
    if (value === 'true' || value === 'false' || value === '0' || value === '1') {
      return { valid: true };
    }
    return { valid: false, error: 'Must be true or false' };
  }

  if (lowerType === 'array' || lowerType === 'list') {
    if (Array.isArray(value)) {
      return { valid: true };
    }
    // Try to parse JSON
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return { valid: true };
        }
        return { valid: false, error: 'Must be a valid array (use JSON format)' };
      } catch {
        return { valid: false, error: 'Must be a valid JSON array' };
      }
    }
    return { valid: false, error: 'Must be an array' };
  }

  if (lowerType === 'object' || lowerType === 'dict' || lowerType === 'dictionary') {
    if (typeof value === 'object' && !Array.isArray(value)) {
      return { valid: true };
    }
    // Try to parse JSON
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (typeof parsed === 'object' && !Array.isArray(parsed)) {
          return { valid: true };
        }
        return { valid: false, error: 'Must be a valid object (use JSON format)' };
      } catch {
        return { valid: false, error: 'Must be a valid JSON object' };
      }
    }
    return { valid: false, error: 'Must be an object' };
  }

  // Default: always valid
  return { valid: true };
}
