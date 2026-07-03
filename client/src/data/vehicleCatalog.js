export const VEHICLE_TYPES = [
  { label: 'Car', value: 'car' },
  { label: 'Truck', value: 'truck' },
  { label: 'Motorcycle', value: 'motorcycle' },
  { label: 'Bus', value: 'bus' },
  { label: 'Bicycle', value: 'bicycle' },
];

export const VEHICLE_TYPE_LABELS = VEHICLE_TYPES.map((t) => t.label);

export const VEHICLE_TYPE_VALUE_BY_LABEL = Object.fromEntries(
  VEHICLE_TYPES.map((t) => [t.label, t.value])
);

export const VEHICLE_TYPE_LABEL_BY_VALUE = Object.fromEntries(
  VEHICLE_TYPES.map((t) => [t.value, t.label])
);

export const VEHICLE_MAKES_BY_TYPE = {
  car: [
    'Maruti Suzuki',
    'Hyundai',
    'Tata',
    'Mahindra',
    'Toyota',
    'Honda',
    'Kia',
    'MG',
    'Renault',
    'Nissan',
    'Skoda',
    'Volkswagen',
    'BMW',
    'Mercedes-Benz',
    'Audi',
  ],
  truck: [
    'Tata',
    'Ashok Leyland',
    'Eicher',
    'BharatBenz',
    'Mahindra',
    'Volvo',
    'SML Isuzu',
  ],
  motorcycle: [
    'Hero',
    'Honda',
    'TVS',
    'Bajaj',
    'Yamaha',
    'Suzuki',
    'KTM',
    'Royal Enfield',
    'Jawa',
  ],
  bus: [
    'Tata',
    'Ashok Leyland',
    'Eicher',
    'BharatBenz',
    'Volvo',
    'Scania',
  ],
  bicycle: [
    'Hero Cycles',
    'Hercules',
    'Firefox',
    'Btwin',
    'Montra',
    'Atlas',
    'Avon',
    'Giant',
    'Trek',
  ],
};

export const VEHICLE_MODELS_BY_TYPE_AND_MAKE = {
  car: {
    'Maruti Suzuki': ['Swift', 'Baleno', 'Brezza', 'WagonR'],
    Hyundai: ['Creta', 'Venue', 'i20'],
    Tata: ['Nexon', 'Punch', 'Harrier'],
    Mahindra: ['Scorpio N', 'Thar', 'XUV700'],
    Toyota: ['Fortuner', 'Innova Hycross'],
    Honda: ['City', 'Amaze'],
    Kia: ['Seltos'],
    MG: ['Hector'],
    Renault: [],
    Nissan: [],
    Skoda: [],
    Volkswagen: [],
    BMW: [],
    'Mercedes-Benz': [],
    Audi: [],
  },
  truck: {
    Tata: ['Tata Prima', 'Tata Signa', 'Tata Ultra'],
    'Ashok Leyland': ['Ashok Leyland Boss', 'Ashok Leyland AVTR'],
    Eicher: ['Eicher Pro 3015', 'Eicher Pro 6048'],
    BharatBenz: ['BharatBenz 2823R', 'BharatBenz 3528C'],
    Mahindra: ['Mahindra Blazo X'],
    Volvo: ['Volvo FMX'],
    'SML Isuzu': [],
  },
  motorcycle: {
    Hero: ['Splendor Plus', 'Passion Pro'],
    Honda: ['Shine', 'Unicorn'],
    TVS: ['Apache RTR 160', 'Raider 125'],
    Bajaj: ['Pulsar N160', 'Dominar 400'],
    Yamaha: ['FZ-S', 'MT-15'],
    Suzuki: ['Gixxer'],
    KTM: ['Duke 200', 'Duke 390'],
    'Royal Enfield': ['Classic 350', 'Hunter 350', 'Meteor 350'],
    Jawa: ['Jawa 42'],
  },
  bus: {
    Tata: ['Tata Starbus', 'Tata LPO'],
    'Ashok Leyland': ['Ashok Leyland Lynx', 'Ashok Leyland Viking'],
    Eicher: ['Eicher Skyline Pro'],
    BharatBenz: ['BharatBenz Staff Bus'],
    Volvo: ['Volvo 9400', 'Volvo 9600'],
    Scania: ['Scania Metrolink'],
  },
  bicycle: {
    'Hero Cycles': ['Hero Sprint', 'Hero Ranger'],
    Hercules: ['Hercules Roadeo', 'Hercules Top Gear'],
    Firefox: ['Firefox Bad Attitude', 'Firefox Fusion'],
    Btwin: ['Btwin Rockrider ST30', 'Btwin My Bike'],
    Montra: ['Montra Downtown', 'Montra Trance'],
    Atlas: ['Atlas Goldline'],
    Avon: ['Avon Rider'],
    Giant: ['Giant Escape 3'],
    Trek: ['Trek Marlin 5'],
  },
};

export function getMakesForType(type) {
  return VEHICLE_MAKES_BY_TYPE[type] || [];
}

export function getModelsForTypeAndMake(type, make) {
  if (!type || !make) return [];
  return VEHICLE_MODELS_BY_TYPE_AND_MAKE[type]?.[make] || [];
}

/** Example plates shown when no registered vehicle matches the selected combination */
export const SAMPLE_PLATE_NUMBERS = [
  'KA01AB1234',
  'KA19MC5678',
  'KA21XY9090',
  'KA05MN4321',
  'KA09HT8765',
];

export function getPlateOptions(registeredPlates = []) {
  const unique = [...new Set([...registeredPlates, ...SAMPLE_PLATE_NUMBERS].filter(Boolean))];
  return unique.sort();
}
