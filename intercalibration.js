/**
 * @function getFC
 * @param {*} image 
 * @param {*} band 
 */
 
var getFC = function (image, band) {

    var histogram = image.reduceRegion({
        reducer: ee.Reducer.histogram({
            maxBuckets: Math.pow(2, 12),
        }),
        geometry: image.geometry(),
        scale: 300,
        maxPixels: 13e9,
        tileScale:10,
    });

    var valDict = ee.Dictionary(histogram.get(band));
    
    
    var valsList = ee.List(
      ee.Algorithms.If(
        valDict.contains('bucketMeans'),
        valDict.get('bucketMeans'),
        [1]
      )
    );

    var freqsList = ee.List(
      ee.Algorithms.If(
        valDict.contains('histogram'),
        valDict.get('histogram'),
        [1]
      )  
    );
    
    var cdfArray = ee.Array(freqsList).accum(0);
    var total = cdfArray.get([-1]);
    var normalizedCdf = cdfArray.divide(total);

    var array = ee.Array.cat([valsList, normalizedCdf], 1);

    return ee.FeatureCollection(array.toList().map(
        function (list) {
            return ee.Feature(null, {
                dn: ee.List(list).get(0),
                probability: ee.List(list).get(1)
            });
        }));
};

/**
 * @function equalize
 * @param {*} image1 
 * @param {*} image2 
 * @param {*} band 
 */
var equalize = function (image, reference, band) {
    var fc_reference = getFC(reference, band);
    var fc_image     = getFC(image, band);
 
    
    var classifier1 = ee.Classifier.randomForest(10)
        .setOutputMode('REGRESSION')
        .train({
            features: fc_reference,
            classProperty: 'dn',
            inputProperties: ['probability']
        });

    var classifier2 = ee.Classifier.randomForest(10)
        .setOutputMode('REGRESSION')
        .train({
            features: fc_image,
            classProperty: 'probability',
            inputProperties: ['dn']
        });

    // Do the shuffle: DN -> probability -> DN. Return the result.
    var b = image.select(band).rename('dn');

    return b
        .classify(classifier2, 'probability') // DN -> probability
        .classify(classifier1, band); // probability -> DN
};

/**
 * @function match
 * @param {*} image1 
 * @param {*} image2 
 */
var match = function (image, reference) {

    var bands = ['R', 'G', 'B', 'N'];

    var intercalibrated = bands.map(
        function (band) {
            return equalize(image, reference, band);
        });

    return ee.Image.cat(intercalibrated)
        .copyProperties(image)
        .copyProperties(image, ['system:time_start']);
};

/**
 * @function intercalibrate
 * @param {*} image 
 */
var intercalibrate = function (image, imageReference) {
  var geometry = image.geometry();
  
  var normalized  = match(image, imageReference);
  
  return ee.Image(normalized).clip(geometry).set("system:footprint", geometry);
  
};



exports.intercalibrate = intercalibrate;
