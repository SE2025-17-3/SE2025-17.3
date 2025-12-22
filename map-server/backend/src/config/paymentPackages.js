// map-server/backend/src/config/paymentPackages.js

// Payment package configurations
const PAYMENT_PACKAGES = {
  DROPLET_5: {
    id: 'DROPLET_5',
    name: '$5 Droplet Pack',
    price: 500, // $5.00 in cents
    baseDroplets: 25000,
    bonusDroplets: 0,
    bonusPercentage: 0,
    description: 'Starter pack',
  },
  DROPLET_15: {
    id: 'DROPLET_15',
    name: '$15 Droplet Pack',
    price: 1500, // $15.00 in cents
    baseDroplets: 75000,
    bonusDroplets: 3750,
    bonusPercentage: 5,
    description: 'Popular choice - 5% bonus!',
  },
  DROPLET_30: {
    id: 'DROPLET_30',
    name: '$30 Droplet Pack',
    price: 3000, // $30.00 in cents
    baseDroplets: 150000,
    bonusDroplets: 15000,
    bonusPercentage: 10,
    description: 'Best value - 10% bonus!',
  },
  DROPLET_50: {
    id: 'DROPLET_50',
    name: '$50 Droplet Pack',
    price: 5000, // $50.00 in cents
    baseDroplets: 250000,
    bonusDroplets: 37500,
    bonusPercentage: 15,
    description: 'Premium pack - 15% bonus!',
  },
  DROPLET_75: {
    id: 'DROPLET_75',
    name: '$75 Droplet Pack',
    price: 7500, // $75.00 in cents
    baseDroplets: 375000,
    bonusDroplets: 75000,
    bonusPercentage: 20,
    description: 'Mega pack - 20% bonus!',
  },
  DROPLET_100: {
    id: 'DROPLET_100',
    name: '$100 Droplet Pack',
    price: 10000, // $100.00 in cents
    baseDroplets: 500000,
    bonusDroplets: 125000,
    bonusPercentage: 25,
    description: 'Ultimate pack - 25% bonus!',
  },
};

const getPackageById = (packageId) => {
  return PAYMENT_PACKAGES[packageId] || null;
};

const getAllPackages = () => {
  return Object.values(PAYMENT_PACKAGES);
};

const getTotalDroplets = (packageId) => {
  const pkg = getPackageById(packageId);
  if (!pkg) return 0;
  return pkg.baseDroplets + pkg.bonusDroplets;
};

export {
  PAYMENT_PACKAGES,
  getPackageById,
  getAllPackages,
  getTotalDroplets,
};
