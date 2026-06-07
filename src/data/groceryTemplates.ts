export interface GroceryTemplateItem {
  name: string;
  category: string;
  quantity: number;
  estimatedUnitPrice: number;
}

export const GROCERY_STARTER: GroceryTemplateItem[] = [
  // Breakfast
  { name: 'Instant Oatmeal Packets', category: 'breakfast', quantity: 12, estimatedUnitPrice: 0.50 },
  { name: 'Granola Bars', category: 'breakfast', quantity: 12, estimatedUnitPrice: 0.75 },
  { name: 'Pop-Tarts', category: 'breakfast', quantity: 8, estimatedUnitPrice: 0.60 },
  { name: 'Mini Muffins', category: 'breakfast', quantity: 1, estimatedUnitPrice: 4.99 },
  { name: 'Coffee Pods (K-Cup)', category: 'breakfast', quantity: 12, estimatedUnitPrice: 0.75 },
  { name: 'Creamer Singles', category: 'breakfast', quantity: 12, estimatedUnitPrice: 0.20 },

  // Snacks
  { name: 'Trail Mix Packs', category: 'snacks', quantity: 8, estimatedUnitPrice: 1.50 },
  { name: 'Chips (individual bags)', category: 'snacks', quantity: 10, estimatedUnitPrice: 1.00 },
  { name: 'Pretzels', category: 'snacks', quantity: 2, estimatedUnitPrice: 3.99 },
  { name: 'Cheese Crackers', category: 'snacks', quantity: 2, estimatedUnitPrice: 3.99 },
  { name: 'Protein Bars', category: 'snacks', quantity: 8, estimatedUnitPrice: 1.75 },
  { name: 'Fruit Snacks', category: 'snacks', quantity: 12, estimatedUnitPrice: 0.50 },
  { name: 'Peanut Butter Crackers', category: 'snacks', quantity: 8, estimatedUnitPrice: 0.75 },

  // Drinks
  { name: 'Water Bottles (24pk)', category: 'drinks', quantity: 1, estimatedUnitPrice: 5.99 },
  { name: 'Gatorade / Sports Drinks', category: 'drinks', quantity: 8, estimatedUnitPrice: 1.25 },
  { name: 'Juice Boxes', category: 'drinks', quantity: 8, estimatedUnitPrice: 0.75 },
  { name: 'Soda (2-liter)', category: 'drinks', quantity: 2, estimatedUnitPrice: 2.49 },
  { name: 'Sparkling Water (12pk)', category: 'drinks', quantity: 1, estimatedUnitPrice: 7.99 },

  // Kids
  { name: 'Goldfish Crackers', category: 'kids', quantity: 2, estimatedUnitPrice: 4.99 },
  { name: 'Applesauce Pouches', category: 'kids', quantity: 8, estimatedUnitPrice: 1.00 },
  { name: 'String Cheese', category: 'kids', quantity: 12, estimatedUnitPrice: 0.75 },
  { name: 'Fruit Cups', category: 'kids', quantity: 6, estimatedUnitPrice: 1.00 },
  { name: 'Pudding Cups', category: 'kids', quantity: 6, estimatedUnitPrice: 0.75 },
  { name: 'Mini Pretzels', category: 'kids', quantity: 1, estimatedUnitPrice: 3.99 },

  // Paper Goods
  { name: 'Paper Plates', category: 'paper-goods', quantity: 1, estimatedUnitPrice: 3.99 },
  { name: 'Plastic Cups', category: 'paper-goods', quantity: 1, estimatedUnitPrice: 2.99 },
  { name: 'Plastic Utensils (set)', category: 'paper-goods', quantity: 1, estimatedUnitPrice: 3.49 },
  { name: 'Paper Towels', category: 'paper-goods', quantity: 1, estimatedUnitPrice: 4.99 },
  { name: 'Napkins', category: 'paper-goods', quantity: 1, estimatedUnitPrice: 2.49 },
  { name: 'Resealable Bags (quart)', category: 'paper-goods', quantity: 1, estimatedUnitPrice: 3.99 },
];
