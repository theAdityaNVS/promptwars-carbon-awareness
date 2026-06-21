export const EMISSION_FACTORS = {
  car_solo: 0.192,       // kg CO2e/km, average ICE passenger car, single occupant (DEFRA 2023)
  car_shared: 0.096,     // kg CO2e/km, halved for 2-occupant carpool approximation
  bus: 0.105,            // kg CO2e/km, average urban bus per passenger (DEFRA 2023)
  train: 0.041,          // kg CO2e/km, average rail per passenger (DEFRA 2023)
  bike: 0,               // Zero direct tailpipe emissions
  walk: 0,               // Zero direct tailpipe emissions
  ev: 0.053,             // kg CO2e/km, average grid-charged electric vehicle
  beef_meal: 6.0,        // kg CO2e per meal, beef-based diet footprint average
  chicken_meal: 1.5,     // kg CO2e per meal, poultry-based diet footprint average
  vegetarian_meal: 0.6,  // kg CO2e per meal, plant-based diet footprint average
  kwh_grid: 0.45,        // kg CO2e/kWh, average global/national grid mix
} as const;

export const AVERAGE_COMMUTER_BENCHMARKS = {
  weekly_km: 120,        // Typical weekly commuting distance (km)
  weekly_kwh: 50,        // Typical weekly household grid energy usage (kWh)
  weekly_beef: 2,        // Typical beef meals per week
  weekly_chicken: 3,     // Typical poultry/fish meals per week
  weekly_veg: 16,        // Typical vegetarian/vegan meals per week
  weekly_co2e: 65,       // Combined baseline target (kg CO2e per week)
} as const;
