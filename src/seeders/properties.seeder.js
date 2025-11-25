/**
 * Properties Seeder
 * Sample properties for testing
 */
const Property = require('../models/Property');

const properties = [
  {
    title: 'Luxury Apartment Downtown',
    address: '123 Main Street, Apt 4B, New York, NY 10001',
    size: 1200,
    type: 'apartment',
    status: 'occupied',
    monthlyRent: 2500,
    notes: 'Modern apartment with city views, renovated kitchen',
  },
  {
    title: 'Cozy Studio Near University',
    address: '456 College Ave, Boston, MA 02115',
    size: 500,
    type: 'studio',
    status: 'occupied',
    monthlyRent: 1200,
    notes: 'Perfect for students, close to campus',
  },
  {
    title: 'Family House with Garden',
    address: '789 Oak Lane, Portland, OR 97202',
    size: 2000,
    type: 'house',
    status: 'available',
    monthlyRent: 3200,
    notes: '3 bedroom, 2 bath, large backyard',
  },
  {
    title: 'Commercial Office Space',
    address: '321 Business Blvd, Suite 200, Seattle, WA 98101',
    size: 1500,
    type: 'commercial',
    status: 'occupied',
    monthlyRent: 4500,
    notes: 'Prime location, high-speed internet included',
  },
  {
    title: 'Modern Loft Downtown',
    address: '555 Industrial Way, Chicago, IL 60601',
    size: 900,
    type: 'apartment',
    status: 'maintenance',
    monthlyRent: 1800,
    notes: 'Currently under renovation, available next month',
  },
];

const seed = async () => {
  console.log('Seeding properties...');
  const inserted = await Property.insertMany(properties);
  console.log(`✅ Seeded ${inserted.length} properties`);
  return inserted;
};

const clean = async () => {
  await Property.deleteMany({});
  console.log('✅ Cleaned properties');
};

module.exports = { seed, clean, data: properties };
