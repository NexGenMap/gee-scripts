// Exo-atmospheric irradiance (EAI) values (W/m²/μm) corresponding to the
// four PlanetScope bands (B, G, R, N).
// NOTE: These are currently notreal values, but rather approximations
// borrowed from Landsat 7.
var planetScopeEAI = [1997, 1812, 1533, 1039];
// Computes approximate TOA reflectance for a PlanetScope image.
//
//               radiance * pi * solar_distance^2
// reflectance = --------------------------------
//                  EAI * sin(solar_elevation)
//
exports.planetScopeTOA = function(image) {
  // Compute sin(solar_elevation)
  var sun_elevation = ee.Number(image.get('sun_elevation'));
  var elevation_sin = sun_elevation.multiply(Math.PI/180).sin();
  // Compute solar_distance (in AU) using a simple first-order Fourier
  // model fit to the standard NASA table of solar distances, as published
  // in e.g. Chander 2006. This model is as accurate as the table is in the
  // first place, which is to say not especially accurate, but at least
  // good to 12 bits or so.
  //
  var day_of_year = image.date().getRelative('day', 'year');
  var solar_phase = day_of_year.multiply(2 * Math.PI / 365.24).subtract(0.0388);
  var solar_distance = solar_phase.cos().multiply(-0.0167).add(1);
  return ee.Image(image.float()
    .select(['B', 'G', 'R', 'N'])
    .multiply(solar_distance.pow(2).multiply(Math.PI / 100))
    .divide(planetScopeEAI)
    .divide(elevation_sin)
    .addBands(image.select('UDM'))
    .copyProperties(image)
    .copyProperties(image, ['system:id', 'system:time_start']));
};

