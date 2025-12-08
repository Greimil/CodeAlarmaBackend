// src/@types/express/index.d.ts
import 'express';

// Define the shape of your custom event type if it's not already global
// You might need to import EventEvaluated from its actual file if it's not global
// type EventEvaluated = { ... }; 

declare global {
  namespace Express {
    // Merge the custom properties into the existing Request interface
    interface Request {
      filteredEvents?: EventEvaluated[]; // Mark as optional initially
    }
  }
}

// Make sure this file is included in your tsconfig.json
