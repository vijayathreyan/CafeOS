-- Migration 003: Insert snack items into item_master with Tamil names,
-- then link snack_entries.item_id to the new records.

-- Insert snack items into item_master
INSERT INTO item_master (name_en, name_ta, item_type, category) VALUES
  ('Medu Vada',      'மேது வடை',        'snack', 'snack'),
  ('Onion Samosa',   'வெங்காய சமோசா',  'snack', 'snack'),
  ('Aloo Samosa',    'உருளை சமோசா',    'snack', 'snack'),
  ('Cutlet',         'கட்லெட்',        'snack', 'snack'),
  ('Elai Adai',      'இலை அடை',        'snack', 'snack'),
  ('Kozhukattai',    'கொழுக்கட்டை',   'snack', 'snack'),
  ('Bajji',          'பஜ்ஜி',          'snack', 'snack'),
  ('Masala Bonda',   'மசாலா போண்டா',  'snack', 'snack'),
  ('Cauliflower 65', 'காலிஃப்ளவர் 65', 'snack', 'snack'),
  ('Chinese Bonda',  'சைனீஸ் போண்டா', 'snack', 'snack'),
  ('Veg Momos',      'வெஜ் மோமோஸ்',   'snack', 'snack'),
  ('Chicken Momos',  'சிக்கன் மோமோஸ்', 'snack', 'snack')
ON CONFLICT DO NOTHING;

-- Link snack_entries.item_id to the newly inserted item_master records
UPDATE snack_entries se
SET item_id = im.id
FROM item_master im
WHERE se.item_name = im.name_en
  AND se.item_id IS NULL;
