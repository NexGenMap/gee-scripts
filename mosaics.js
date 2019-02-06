/**
 * @name mosaic-production-1
 * @author nextgenmap team 
 * @version 1
 */
 
// //-----------------------------------------------------------------------------
// // Project parameters
// //-----------------------------------------------------------------------------

var planetTools      = require('users/nexgenmap/packages:planetTools');
var intercalibration = require('users/nexgenmap/packages:intercalibration');
var gui              = require('users/nexgenmap/packages:gui');

var planetCollection = 'projects/nexgenmap/PSScene4Band';
var subGridsFc = ee.FeatureCollection('projects/nexgenmap/ANCILLARY/nextgenmap_subgrids');
var references = ee.ImageCollection("projects/nexgenmap/AGRICULTURE/REFERENCES/mosaics");

var subgridIds = [0, 1, 2, 3, 4, 5];
var bands = ['R', 'G', 'B', 'N'];
var version = 'production-1';
var currentGrid = null

/**
* @function cloudMask
* @param {*} image 
*/

var cloudMask = function (image) {

    image = ee.Image(image);

    var cloud = image.select('B').gte(2200);

    cloud = cloud.select([0], ["cloud"]);

    return cloud;
};

/**
 * @function shadowMask
 * @param {*} image 
*/

var shadowMask = function (image) {

    image = ee.Image(image);

    var exp = "b('B') >= b('G') && b('B') >= b('R') && b('B') <= 1500 && b('N') <= 2200";

    var shadow = image.expression(exp)
        .rename("shadow");

    shadow = shadow.clip(image.geometry());

    return shadow;
};


/**
 * @function getCollection
 * @param {*} grid 
 * @param {*} cloudCover
 */
var getCollection = function (grid, cloudCover) {

    var collection = ee.ImageCollection(planetCollection)
        .filterMetadata("cloud_cover", "less_than", cloudCover)
        .filterBounds(grid)
        .map(planetTools.planetScopeTOA);

    return collection;
};


/**
 * @function maskCollection
 * @param {*} image
*/
var maskCollection = function (image) {

    var image1 = image;

    var geometry = image.geometry();

    image = image.multiply(10000).int16();

    var shadow = shadowMask(image);

    var cloud = cloudMask(image);

    image = image.addBands(shadow).addBands(cloud);

    var image2 = ee.Image(image.clip(geometry).set("system:footprint", geometry));

    image2 = image2.copyProperties(image1);

    return image2;

};

/**
 * @function reduceImage
 * @param {*} image
*/

var reduceImage = function (image, mosaicReference, statistics) {
    var image1 = image;

    var geo = image.geometry();
    
    var imageReference = mosaicReference.clip(geo).set("system:footprint", geo);
    
    var stats = statistics.clip(geo).set("system:footprint", geo);

    var water_mask = stats
        .select("shadow_sum")
        .gte(stats.select("shadow_count")
            .divide(2))
        .select([0], ["water"]);

    var infra_mask = stats
        .select("cloud_sum")
        .gte(stats.select("cloud_count")
            .divide(2))
        .and(stats.select("cloud_count")
            .gt(2))
        .select([0], ["infra"]);

    var shadow_mask = ee.Image(image
        .select("shadow")
        .multiply(water_mask.not()));

    var cloud_mask = ee.Image(image
        .select("cloud")
        .multiply(infra_mask.not()));

    var mask = shadow_mask
        .add(cloud_mask)
        .gte(1).not();
    
    var imageMasked = image.updateMask(mask).set("system:footprint", geo);
    
    var imageNormalized = ee.Image(intercalibration.intercalibrate(imageMasked, imageReference));

    return imageNormalized;
};

/**
 * @function setMetadata
 * @param {*} image 
 * @param {*} dateStart
 * @param {*} dateEnd
 * @param {*} type
 * @param {*} gridName
 * @param {*} version
 * @param {*} nImages
 * @param {*} subgridId
 * @param {*} cloudCover
 * @param {*} itemType
 * @param {*} provider
 * @param {*} provider
 * @param {*} gridGeometry
 * @param {*} pixelResolution
 */


var setMetadata = function (
    image, dateStart, dateEnd, type, gridName,
    version, nImages, subgridId, cloudCover,itemType,provider,gridGeometry,pixelResolution) {

    image = image
        .set("system:time_start", ee.Date(dateStart).millis())
        .set("system:time_end", ee.Date(dateEnd).millis())
        .set("cadence", type)
        .set("grid_name", gridName)
        .set("version", version)
        .set("subgrid_id", subgridId)
        .set("n_images", ee.Number(nImages))
        .set("cloud_cover_threshold", ee.Number(cloudCover).float())
        .set("item_type",itemType)
        .set("provider", provider)
        .set('system:footprint', gridGeometry)
        .set("pixel_resolution", 4);
        
        

    return image;
};


/**
 * @function exportImage
 * @param {*} image 
 * @param {*} collectionId 
 * @param {*} imageName 
 * @param {*} geometry 
 */
var exportImage = function (image, collectionId, geometry, imageName) {
    Export.image.toAsset({
        "image": image,
        "description": imageName,
        "assetId": collectionId + "/" + imageName,
        "pyramidingPolicy": {
            ".default": "mean"
        },
        "region": geometry,
        "scale": 4,
        "maxPixels": 1e13
    });
};

/**
 * @function exportMosaics
 * @param {*} grid_name 
 * @param {*} startDate
 * @param {*} endDate
 * @param {*} cadence
 * @param {*} assetExport
 * @param {*} cloudCover
 */
var exportMosaics = function(grid_name, startDate, endDate, cadence, assetExport, cloudCover){

  var mosaicReference = references.filterMetadata("grid_name", "equals", grid_name).mosaic();

  Map.addLayer(mosaicReference, {bands: ["R", "G", "B"], min:  500, max: 2035}, "Reference", false);
  
  if(currentGrid != grid_name){
    Map.centerObject(references.filterMetadata("grid_name", "equals", grid_name).geometry());  
  }
  
  currentGrid = grid_name;
  
  for (var i = 0; i < subgridIds.length; i++) {

      var grids = subGridsFc.filterMetadata("grid", "equals", grid_name);

      var gridGeometry = grids.filterMetadata('subgrid_id', 'equals', subgridIds[i]).geometry();

      var collection = ee.ImageCollection(getCollection(gridGeometry, cloudCover))
          .select(bands)
          .filterDate(startDate, endDate)
          .limit(350, "cloud_cover")
    
      var size =  collection.size();
      
      print(grid_name + "-"+ i, size);

      var collectionMasks = collection
          .map(maskCollection);

      var statistics = collectionMasks
          .select(["shadow", "cloud"])
          .reduce(ee.Reducer.sum()
              .combine(ee.Reducer.count(), null, true), 16);

      var image_reduced = collectionMasks
          .map(function(image){
            return reduceImage(image, mosaicReference, statistics)
          })
          .median()
          .select(bands)
          .clip(gridGeometry);

      var availability = statistics
          .select("shadow_count")
          .rename("AVAILABILITY");

      image_reduced = image_reduced
          .addBands(availability);

      var nodata = image_reduced
          .eq(0).not();

      image_reduced = image_reduced.updateMask(nodata);
    
       var mosaic = setMetadata(
          image_reduced.int16(),
          startDate,
          endDate,
          cadence,
          grid_name,
          version,
          size,
          subgridIds[i],
          cloudCover,
          "PSScene4Band",
          "planetscope",
          gridGeometry,
          4
      );

      var outputName = grid_name + "-" + startDate + "-" + endDate + "-" + subgridIds[i];
      
      Map.addLayer(mosaic, {bands: ["R", "G", "B"], min: 500, max: 1500}, outputName, false);
      
      exportImage(mosaic, assetExport, gridGeometry, outputName);
  }  
}

/**
 * @function getCollection
 * @param {*} grid 
 * @param {*} cloudCover
 */
var visualizeMosaics = function(grid_name, startDate, endDate, cadence, assetExport, cloudCover){
  var collection = ee.ImageCollection(assetExport)
  .filterMetadata("grid_name", "equals", grid_name)
  .filterMetadata("cadence", "equals", cadence)
  .filterDate(startDate)
  
  if(currentGrid != grid_name){
    Map.centerObject(collection.geometry());  
  }
  
  currentGrid = grid_name;
    
  var mosaic = collection.mosaic()
  var outputName = grid_name + "-" + startDate + "-" + endDate;
  Map.addLayer(mosaic, {bands: ["R", "G", "B"], min: 500, max: 1500}, outputName);
}

var getParameters = function(gui){
    var grid_name = gui.grid.getValue();
    var period = gui.period()
    var startDate = period[0]
    var endDate = period[1]
    var cadence = period[2]
    var assetExport = gui.asset.getValue()
    var cloudCover = gui.cloud_cover.getValue();    
    return {
      "grid_name": grid_name, 
      "startDate": startDate, 
      "endDate": endDate, 
      "cadence": cadence, 
      "assetExport": assetExport,
      "cloudCover": cloudCover
    }
}

gui.export.onClick(function(){
    Map.layers().reset()
    
    var parameters = getParameters(gui)
    
    var grid_name = parameters["grid_name"]
    var startDate = parameters["startDate"]
    var endDate = parameters["endDate"]
    var cadence = parameters["cadence"]
    var assetExport = parameters["assetExport"]
    var cloudCover = parameters["cloudCover"]
    
    exportMosaics(grid_name, startDate, endDate, cadence, assetExport, cloudCover)
});


gui.visualize.onClick(function(){
    Map.layers().reset()
    
    var parameters = getParameters(gui)
    
    var grid_name = parameters["grid_name"]
    var startDate = parameters["startDate"]
    var endDate = parameters["endDate"]
    var cadence = parameters["cadence"]
    var assetExport = parameters["assetExport"]
    var cloudCover = parameters["cloudCover"]

    visualizeMosaics(grid_name, startDate, endDate, cadence, assetExport, cloudCover)
});

